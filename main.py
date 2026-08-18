import os
import re
import json
import base64
import logging
import threading
import concurrent.futures
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

import requests
from fastapi import FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from capcut_tts_api import CapCutClient, CapCutError, CapCutTaskError

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("capcut-tts-web")

app = FastAPI(
    title="CapCut Text-to-Speech Web API",
    description="Web service and API for CapCut Text-to-Speech (TTS) with multi-threading and smart text chunking",
    version="1.1.0",
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

# Shared client instance & lock for device operations
client = CapCutClient()
device_lock = threading.Lock()


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Nội dung văn bản cần chuyển thành giọng nói")
    voice: Optional[str] = Field("BV074_streaming", description="Mã voice_type")
    resource_id: Optional[str] = Field(None, description="Resource ID của voice")
    rate: Optional[float] = Field(1.0, ge=0.5, le=2.0, description="Tốc độ giọng đọc (0.5 đến 2.0)")
    threads: Optional[int] = Field(10, ge=1, le=50, description="Số luồng xử lý đa luồng đồng thời")
    auto_split: Optional[bool] = Field(True, description="Tự động tách văn bản dài thành các đoạn nhỏ và ghép lại")


class ResetDeviceResponse(BaseModel):
    status: str
    device_id: str
    message: str


def split_text_into_chunks(text: str, max_chars: int = 250) -> List[str]:
    """
    Tách văn bản dài thành các đoạn nhỏ vừa vặn với giới hạn API CapCut,
    bảo toàn câu văn và ngắt nghỉ tự nhiên theo dấu chấm, chấm phẩy, xuống dòng.
    """
    cleaned = text.strip()
    if not cleaned:
        return []

    # Tách theo dòng trước
    paragraphs = [p.strip() for p in cleaned.split("\n") if p.strip()]
    chunks: List[str] = []

    for para in paragraphs:
        if len(para) <= max_chars:
            chunks.append(para)
            continue

        # Tách theo dấu câu . ! ? … ;
        sentences = re.split(r'(?<=[.!?…;])\s+', para)
        current = ""

        for s in sentences:
            s = s.strip()
            if not s:
                continue

            if len(current) + len(s) + 1 <= max_chars:
                current = (current + " " + s).strip() if current else s
            else:
                if current:
                    chunks.append(current)
                    current = ""

                # Nếu bản thân 1 câu vẫn dài hơn max_chars, tách theo dấu phẩy hoặc từ ngữ
                if len(s) > max_chars:
                    comma_parts = re.split(r'(?<=[,:\-])\s+', s)
                    sub_curr = ""
                    for cp in comma_parts:
                        cp = cp.strip()
                        if not cp:
                            continue
                        if len(sub_curr) + len(cp) + 1 <= max_chars:
                            sub_curr = (sub_curr + " " + cp).strip() if sub_curr else cp
                        else:
                            if sub_curr:
                                chunks.append(sub_curr)
                                sub_curr = ""
                            # Trường hợp từ đơn lẻ quá dài
                            if len(cp) > max_chars:
                                words = cp.split()
                                w_curr = ""
                                for w in words:
                                    if len(w_curr) + len(w) + 1 <= max_chars:
                                        w_curr = (w_curr + " " + w).strip() if w_curr else w
                                    else:
                                        if w_curr:
                                            chunks.append(w_curr)
                                        w_curr = w
                                if w_curr:
                                    chunks.append(w_curr)
                            else:
                                sub_curr = cp
                    if sub_curr:
                        chunks.append(sub_curr)
                else:
                    current = s

        if current:
            chunks.append(current)

    return [c for c in chunks if c.strip()]


def extract_audio_bytes(api_result: Dict[str, Any]) -> bytes:
    """Trích xuất dữ liệu âm thanh MP3 từ phản hồi CapCut task."""
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
        resp = requests.get(video_url, timeout=60)
        resp.raise_for_status()
        return resp.content
    elif audio_base64:
        return base64.b64decode(audio_base64)
    else:
        raise CapCutError("Không tìm thấy URL hoặc dữ liệu âm thanh trong phản hồi.")


def process_single_chunk(
    chunk_index: int,
    chunk_text: str,
    voice_type: str,
    resource_id: Optional[str],
    rate_str: str,
) -> Tuple[int, bytes]:
    """
    Xử lý tạo TTS cho một đoạn văn bản với cơ chế tự động thử lại (retry)
    và đổi Device ID an toàn khi bị giới hạn.
    """
    local_client = CapCutClient(device=client.device)
    max_attempts = 4

    for attempt in range(max_attempts):
        try:
            result = local_client.generate_speech(
                texts=chunk_text,
                voice=voice_type,
                resource_id=resource_id,
                rate=rate_str,
                wait=True,
                timeout=45.0,
            )
            audio_bytes = extract_audio_bytes(result)
            return chunk_index, audio_bytes
        except Exception as exc:
            if attempt == max_attempts - 1:
                logger.error(f"Chunk #{chunk_index + 1} failed after {max_attempts} attempts: {exc}")
                raise exc

            # Randomize device ID on failure & wait backoff
            logger.warning(f"Chunk #{chunk_index + 1} retry {attempt + 1}/{max_attempts} due to: {exc}")
            with device_lock:
                client.device.randomize()
                local_client.device = client.device
            import time
            time.sleep(1.0 * (attempt + 1))

    raise CapCutError(f"Không thể tạo âm thanh cho đoạn #{chunk_index + 1}")


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
    with device_lock:
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
    Chuyển văn bản thành giọng nói (TTS):
    - Tự động tách đoạn văn dài thành các phần nhỏ (Smart Chunking).
    - Xử lý đa luồng (Multi-threading) song song tăng tốc tối đa.
    - Tự động ghép nối các phần âm thanh thành một file MP3 hoàn chỉnh.
    """
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Văn bản không được để trống.")

    rate_str = f"{req.rate:.1f}" if req.rate else "1.0"
    num_threads = min(max(req.threads or 10, 1), 50)

    # 1. Tách văn bản thành các đoạn nhỏ nếu bật auto_split hoặc văn bản dài
    if req.auto_split and (len(text) > 200 or "\n" in text):
        chunks = split_text_into_chunks(text, max_chars=250)
    else:
        chunks = [text]

    total_chunks = len(chunks)
    logger.info(
        f"Processing TTS | Voice: {req.voice} | Rate: {rate_str} | "
        f"Total chars: {len(text)} | Chunks: {total_chunks} | Threads: {num_threads}"
    )

    if total_chunks == 0:
        raise HTTPException(status_code=400, detail="Không có nội dung hợp lệ để xử lý.")

    try:
        # Nếu chỉ có 1 đoạn duy nhất -> xử lý trực tiếp
        if total_chunks == 1:
            _, audio_bytes = process_single_chunk(0, chunks[0], req.voice, req.resource_id, rate_str)
            return Response(
                content=audio_bytes,
                media_type="audio/mpeg",
                headers={
                    "Content-Disposition": 'inline; filename="speech.mp3"',
                    "Content-Type": "audio/mpeg",
                    "X-Total-Chunks": "1",
                },
            )

        # Xử lý đa luồng cho nhiều đoạn (Multi-threading)
        workers = min(num_threads, total_chunks)
        results: Dict[int, bytes] = {}

        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
            future_to_idx = {
                executor.submit(
                    process_single_chunk,
                    idx,
                    chunk,
                    req.voice,
                    req.resource_id,
                    rate_str,
                ): idx
                for idx, chunk in enumerate(chunks)
            }

            for future in concurrent.futures.as_completed(future_to_idx):
                idx, audio_data = future.result()
                results[idx] = audio_data

        # Ghép nối các đoạn audio theo đúng thứ tự ban đầu
        ordered_audio_parts = [results[i] for i in range(total_chunks)]
        merged_audio = b"".join(ordered_audio_parts)

        logger.info(f"Successfully generated & merged {total_chunks} chunks ({len(merged_audio)} bytes)")

        return Response(
            content=merged_audio,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": 'inline; filename="speech.mp3"',
                "Content-Type": "audio/mpeg",
                "X-Total-Chunks": str(total_chunks),
            },
        )

    except CapCutTaskError as e:
        logger.error(f"CapCut Task Error: {e}")
        with device_lock:
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
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
