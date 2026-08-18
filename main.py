import os
import json
import base64
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

import requests
from fastapi import FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from capcut_tts_api import CapCutClient, CapCutError, CapCutTaskError

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("capcut-tts-web")

app = FastAPI(
    title="CapCut Text-to-Speech Web API",
    description="Web service and API for CapCut Text-to-Speech (TTS)",
    version="1.0.0",
)

# Enable CORS for web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base directory
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
VOICE_JSON_PATH = BASE_DIR / "Voice.json"

# Initialize single client instance
client = CapCutClient()


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Nội dung văn bản cần chuyển thành giọng nói")
    voice: Optional[str] = Field("BV074_streaming", description="Mã voice_type (ví dụ: BV074_streaming, BV421_vivn_streaming)")
    resource_id: Optional[str] = Field(None, description="Resource ID của voice (nếu có)")
    rate: Optional[float] = Field(1.0, ge=0.5, le=2.0, description="Tốc độ giọng đọc (0.5 đến 2.0)")


class ResetDeviceResponse(BaseModel):
    status: str
    device_id: str
    message: str


def extract_audio_bytes(api_result: Dict[str, Any]) -> bytes:
    """Extracts raw MP3 audio bytes from CapCut task result."""
    tasks = (api_result.get("data") or {}).get("tasks") or []
    if not tasks:
        raise CapCutError("Không tìm thấy dữ liệu task từ phản hồi CapCut API.")

    task_data = tasks[0]
    video_url = None
    audio_base64 = None

    payload_str = task_data.get("payload", "")
    if payload_str:
        try:
            payload_json = json.loads(payload_str)
            audio_subtitles = payload_json.get("audio_subtitles", [])
            if audio_subtitles and len(audio_subtitles) > 0:
                video_url = audio_subtitles[0].get("speech_url")
        except Exception as e:
            logger.warning(f"Error parsing payload JSON: {e}")

    if not video_url:
        if "video_url" in task_data:
            video_url = task_data["video_url"]
        elif "audio" in task_data:
            audio_base64 = task_data["audio"]

    if video_url:
        logger.info(f"Downloading audio from speech URL: {video_url}")
        resp = requests.get(video_url, timeout=60)
        resp.raise_for_status()
        return resp.content
    elif audio_base64:
        logger.info("Decoding audio from base64 payload")
        return base64.b64decode(audio_base64)
    else:
        raise CapCutError("Không tìm thấy URL hoặc dữ liệu âm thanh trong phản hồi.")


@app.get("/health")
def health_check():
    """Health check endpoint for Render monitoring."""
    return {"status": "ok", "service": "capcut-tts-web", "device_id": client.device.device_id}


@app.get("/api/device")
def get_device_info():
    """Get current device config information."""
    return {
        "device_id": client.device.device_id,
        "region": client.device.region,
        "lan": client.device.lan,
    }


@app.post("/api/reset-device", response_model=ResetDeviceResponse)
def reset_device():
    """Randomize the device ID to bypass rate-limits or bans."""
    client.device.randomize()
    new_id = client.device.device_id
    logger.info(f"Device ID rotated to: {new_id}")
    return ResetDeviceResponse(
        status="success",
        device_id=new_id,
        message=f"Đã đổi Device ID thành công sang: {new_id}",
    )


@app.get("/api/voices")
def get_voices(
    lang: Optional[str] = Query(None, description="Lọc theo mã ngôn ngữ (ví dụ: vi-VN, en-US)"),
    search: Optional[str] = Query(None, description="Tìm kiếm theo tên hoặc mã voice"),
):
    """Retrieve list of available voices from Voice.json catalog."""
    try:
        voices = client.list_voices(catalog_path=VOICE_JSON_PATH)
        
        # Collect all unique languages
        languages = sorted(list({v.lang for v in voices if v.lang}))

        results = []
        for v in voices:
            if lang and v.lang.lower() != lang.lower() and v.lan.lower() != lang.lower():
                continue
            if search:
                s = search.lower()
                if s not in v.display_name.lower() and s not in v.voice_type.lower():
                    continue
            results.append({
                "voice_type": v.voice_type,
                "display_name": v.display_name,
                "resource_id": v.resource_id,
                "lang": v.lang,
                "lan": v.lan,
            })

        return {
            "total": len(results),
            "languages": languages,
            "voices": results,
        }
    except Exception as e:
        logger.error(f"Failed to load voices: {e}")
        raise HTTPException(status_code=500, detail=f"Không thể tải danh sách giọng đọc: {str(e)}")


@app.post("/api/tts")
def generate_tts(req: TTSRequest):
    """
    Generate speech from input text and return MP3 audio stream directly.
    """
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Văn bản không được để trống.")

    rate_str = f"{req.rate:.1f}" if req.rate else "1.0"
    logger.info(f"Generating TTS | Voice: {req.voice} | Rate: {rate_str} | Text length: {len(text)}")

    try:
        result = client.generate_speech(
            texts=text,
            voice=req.voice,
            resource_id=req.resource_id,
            rate=rate_str,
            wait=True,
            timeout=60.0,
        )
        audio_bytes = extract_audio_bytes(result)
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": 'inline; filename="speech.mp3"',
                "Content-Type": "audio/mpeg",
                "Cache-Control": "no-cache",
            },
        )
    except CapCutTaskError as e:
        logger.error(f"CapCut Task Error: {e}")
        # Try auto-rotating device ID if task fails
        client.device.randomize()
        raise HTTPException(
            status_code=502,
            detail=f"Lỗi từ CapCut API (đã tự động đổi Device ID): {str(e)}",
        )
    except Exception as e:
        logger.error(f"Error generating TTS: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Có lỗi xảy ra khi tạo giọng nói: {str(e)}",
        )


# Mount static assets
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
def serve_index():
    """Serve web application UI."""
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {"message": "CapCut TTS Web API is running. Place frontend files in static/ directory."}


if __name__ == "__main__":
    import uvicorn
    # Render provides PORT environment variable
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
