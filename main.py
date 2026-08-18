import os
import re
import json
import uuid
import time
import base64
import logging
import threading
import concurrent.futures
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

import requests
from fastapi import FastAPI, HTTPException, Query, Response, status, BackgroundTasks, Request
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
    description="Web service and API for CapCut Text-to-Speech (TTS) with multi-threading, smart text chunking and real-time progress tracking",
    version="1.2.0",
)

# Enable CORS for web clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Chunks", "X-Audio-Duration", "Content-Disposition"],
)

# Base directory
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
VOICE_JSON_PATH = BASE_DIR / "Voice.json"

# Shared client instance & lock for device operations
client = CapCutClient()
device_lock = threading.Lock()

# Task management for real-time progress
tasks_lock = threading.Lock()
TASKS: Dict[str, Dict[str, Any]] = {}


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Nội dung văn bản cần chuyển thành giọng nói")
    voice: Optional[str] = Field("BV074_streaming", description="Mã voice_type")
    resource_id: Optional[str] = Field(None, description="Resource ID của voice")
    rate: Optional[float] = Field(1.0, ge=0.5, le=2.0, description="Tốc độ giọng đọc (0.5 đến 2.0)")
    threads: Optional[int] = Field(50, ge=1, le=200, description="Số luồng xử lý đa luồng đồng thời (mặc định 50, tối đa 200)")
    auto_split: Optional[bool] = Field(True, description="Tự động tách văn bản dài thành các đoạn nhỏ và ghép lại")


class ResetDeviceResponse(BaseModel):
    status: str
    device_id: str
    message: str


def cleanup_old_tasks():
    """Dọn dẹp các task cũ đã tạo hơn 30 phút trước để giải phóng bộ nhớ."""
    now = time.time()
    with tasks_lock:
        expired_ids = [tid for tid, t in TASKS.items() if now - t.get("created_at", 0) > 1800]
        for tid in expired_ids:
            del TASKS[tid]


def calculate_mp3_duration(data: bytes) -> float:
    """
    Tính toán chính xác thời lượng (giây) của file âm thanh MP3
    bằng cách duyệt qua các MPEG Audio Frames.
    """
    if not data:
        return 0.0

    bitrates_v1_l3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
    bitrates_v2_l3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
    sample_rates_v1 = [44100, 48000, 32000, 0]
    sample_rates_v2 = [22050, 24000, 16000, 0]
    sample_rates_v25 = [11025, 12000, 8000, 0]

    offset = 0
    total_samples = 0
    sample_rate = 24000
    n = len(data)

    while offset < n - 4:
        if data[offset] == 0xFF and (data[offset + 1] & 0xE0) == 0xE0:
            header = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3]
            version_bits = (header >> 19) & 3
            layer_bits = (header >> 17) & 3
            bitrate_idx = (header >> 12) & 15
            sr_idx = (header >> 10) & 3
            padding = (header >> 9) & 1

            if layer_bits == 1:  # Layer 3 (MP3)
                if version_bits == 3:  # MPEG-1
                    samples_per_frame = 1152
                    sr = sample_rates_v1[sr_idx]
                    br = bitrates_v1_l3[bitrate_idx] * 1000
                elif version_bits == 2:  # MPEG-2
                    samples_per_frame = 576
                    sr = sample_rates_v2[sr_idx]
                    br = bitrates_v2_l3[bitrate_idx] * 1000
                elif version_bits == 0:  # MPEG-2.5
                    samples_per_frame = 576
                    sr = sample_rates_v25[sr_idx]
                    br = bitrates_v2_l3[bitrate_idx] * 1000
                else:
                    offset += 1
                    continue

                if sr > 0 and br > 0:
                    sample_rate = sr
                    frame_len = int((samples_per_frame // 8 * br) / sr + padding)
                    if frame_len <= 0:
                        offset += 1
                        continue
                    total_samples += samples_per_frame
                    offset += frame_len
                    continue
        offset += 1

    return round(total_samples / sample_rate, 2) if sample_rate else 0.0


def split_text_into_chunks(text: str, max_chars: int = 250) -> List[str]:
    """
    Tách văn bản dài thành các đoạn nhỏ vừa vặn với giới hạn API CapCut,
    bảo toàn câu văn và ngắt nghỉ tự nhiên theo dấu chấm, chấm phẩy, xuống dòng.
    """
    cleaned = text.strip()
    if not cleaned:
        return []

    paragraphs = [p.strip() for p in cleaned.split("\n") if p.strip()]
    chunks: List[str] = []

    for para in paragraphs:
        if len(para) <= max_chars:
            chunks.append(para)
            continue

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

            logger.warning(f"Chunk #{chunk_index + 1} retry {attempt + 1}/{max_attempts} due to: {exc}")
            with device_lock:
                client.device.randomize()
                local_client.device = client.device
            time.sleep(1.0 * (attempt + 1))

    raise CapCutError(f"Không thể tạo âm thanh cho đoạn #{chunk_index + 1}")


def background_tts_worker(task_id: str, chunks: List[str], voice: str, resource_id: Optional[str], rate_str: str, num_threads: int):
    """Worker chạy nền xử lý đa luồng từng đoạn và cập nhật tiến trình trực tiếp."""
    total_chunks = len(chunks)
    workers = min(num_threads, total_chunks)
    results: Dict[int, bytes] = {}

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
            future_to_idx = {
                executor.submit(
                    process_single_chunk,
                    idx,
                    chunk,
                    voice,
                    resource_id,
                    rate_str,
                ): idx
                for idx, chunk in enumerate(chunks)
            }

            for future in concurrent.futures.as_completed(future_to_idx):
                idx, audio_data = future.result()
                results[idx] = audio_data

                with tasks_lock:
                    if task_id in TASKS:
                        TASKS[task_id]["completed_chunks"] = len(results)
                        TASKS[task_id]["percent"] = int((len(results) / total_chunks) * 100)

        with tasks_lock:
            if task_id in TASKS:
                TASKS[task_id]["status"] = "merging"

        ordered_parts = [results[i] for i in range(total_chunks)]
        merged_audio = b"".join(ordered_parts)
        duration_sec = calculate_mp3_duration(merged_audio)

        with tasks_lock:
            if task_id in TASKS:
                TASKS[task_id]["status"] = "completed"
                TASKS[task_id]["completed_chunks"] = total_chunks
                TASKS[task_id]["percent"] = 100
                TASKS[task_id]["audio_bytes"] = merged_audio
                TASKS[task_id]["audio_size"] = len(merged_audio)
                TASKS[task_id]["duration_seconds"] = duration_sec

        logger.info(f"Task {task_id} COMPLETED: {total_chunks} chunks, {len(merged_audio)} bytes, {duration_sec}s")

    except Exception as e:
        logger.error(f"Task {task_id} FAILED: {e}")
        with tasks_lock:
            if task_id in TASKS:
                TASKS[task_id]["status"] = "error"
                TASKS[task_id]["error_message"] = str(e)


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


@app.post("/api/tts/start")
def start_tts_task(req: TTSRequest, background_tasks: BackgroundTasks):
    """
    Bắt đầu task tạo TTS bất đồng bộ với tính năng theo dõi tiến trình thực tế.
    Trả về task_id ngay lập tức để frontend cập nhật thanh tiến trình theo thời gian thực.
    """
    cleanup_old_tasks()
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Văn bản không được để trống.")

    rate_str = f"{req.rate:.1f}" if req.rate else "1.0"
    num_threads = min(max(req.threads or 50, 1), 200)

    if req.auto_split and (len(text) > 200 or "\n" in text):
        chunks = split_text_into_chunks(text, max_chars=250)
    else:
        chunks = [text]

    total_chunks = len(chunks)
    if total_chunks == 0:
        raise HTTPException(status_code=400, detail="Không có nội dung hợp lệ để xử lý.")

    task_id = uuid.uuid4().hex

    with tasks_lock:
        TASKS[task_id] = {
            "task_id": task_id,
            "status": "processing",
            "total_chunks": total_chunks,
            "completed_chunks": 0,
            "percent": 0,
            "voice": req.voice,
            "text_length": len(text),
            "created_at": time.time(),
            "audio_bytes": None,
            "audio_size": 0,
            "duration_seconds": 0.0,
            "error_message": None,
        }

    background_tasks.add_task(
        background_tts_worker,
        task_id,
        chunks,
        req.voice,
        req.resource_id,
        rate_str,
        num_threads,
    )

    return {
        "task_id": task_id,
        "total_chunks": total_chunks,
        "status": "processing",
        "message": f"Bắt đầu xử lý {total_chunks} đoạn với {num_threads} luồng.",
    }


@app.get("/api/tts/status/{task_id}")
def get_tts_status(task_id: str):
    """Lấy trạng thái và tiến độ chi tiết của task tạo TTS."""
    with tasks_lock:
        task = TASKS.get(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task không tồn tại hoặc đã hết hạn.")

        return {
            "task_id": task_id,
            "status": task["status"],
            "total_chunks": task["total_chunks"],
            "completed_chunks": task["completed_chunks"],
            "percent": task["percent"],
            "audio_size": task["audio_size"],
            "duration_seconds": task["duration_seconds"],
            "error_message": task["error_message"],
        }


@app.get("/api/tts/audio/{task_id}")
def get_tts_audio(task_id: str, request: Request = None):
    """Tải hoặc nghe stream file MP3 hoàn chỉnh của task đã hoàn thành (hỗ trợ Range 206)."""
    with tasks_lock:
        task = TASKS.get(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Audio không tồn tại hoặc đã hết hạn.")

        if task["status"] != "completed" or not task.get("audio_bytes"):
            raise HTTPException(status_code=400, detail="Audio chưa được xử lý xong.")

        audio_data = task["audio_bytes"]
        duration = task.get("duration_seconds", 0.0)
        total_chunks = task.get("total_chunks", 1)

    file_size = len(audio_data)

    # Handle Range header for fast media seeking in HTML5 audio
    range_header = request.headers.get("Range") if request else None
    if range_header:
        try:
            h_range = range_header.replace("bytes=", "").split("-")
            start = int(h_range[0]) if h_range[0] else 0
            end = int(h_range[1]) if len(h_range) > 1 and h_range[1] else file_size - 1
            if end >= file_size:
                end = file_size - 1
            content_length = (end - start) + 1
            chunk_data = audio_data[start : end + 1]
            return Response(
                content=chunk_data,
                status_code=206,
                headers={
                    "Content-Range": f"bytes {start}-{end}/{file_size}",
                    "Accept-Ranges": "bytes",
                    "Content-Length": str(content_length),
                    "Content-Type": "audio/mpeg",
                    "X-Audio-Duration": str(duration),
                    "X-Total-Chunks": str(total_chunks),
                },
            )
        except Exception as e:
            logger.warning(f"Error handling Range request: {e}")

    return Response(
        content=audio_data,
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": f'attachment; filename="audio_story_{task_id[:8]}.mp3"',
            "Content-Type": "audio/mpeg",
            "Content-Length": str(len(audio_data)),
            "X-Audio-Duration": str(duration),
            "X-Total-Chunks": str(total_chunks),
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
        },
    )


@app.post("/api/tts")
def generate_tts(req: TTSRequest):
    """
    Endpoint tạo TTS trực tiếp (đồng bộ).
    """
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Văn bản không được để trống.")

    rate_str = f"{req.rate:.1f}" if req.rate else "1.0"
    num_threads = min(max(req.threads or 50, 1), 200)


    if req.auto_split and (len(text) > 200 or "\n" in text):
        chunks = split_text_into_chunks(text, max_chars=250)
    else:
        chunks = [text]

    total_chunks = len(chunks)
    if total_chunks == 0:
        raise HTTPException(status_code=400, detail="Không có nội dung hợp lệ để xử lý.")

    try:
        if total_chunks == 1:
            _, audio_bytes = process_single_chunk(0, chunks[0], req.voice, req.resource_id, rate_str)
            duration_sec = calculate_mp3_duration(audio_bytes)
            return Response(
                content=audio_bytes,
                media_type="audio/mpeg",
                headers={
                    "Content-Disposition": 'inline; filename="speech.mp3"',
                    "Content-Type": "audio/mpeg",
                    "X-Total-Chunks": "1",
                    "X-Audio-Duration": str(duration_sec),
                },
            )

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

        ordered_parts = [results[i] for i in range(total_chunks)]
        merged_audio = b"".join(ordered_parts)
        duration_sec = calculate_mp3_duration(merged_audio)

        return Response(
            content=merged_audio,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": 'inline; filename="speech.mp3"',
                "Content-Type": "audio/mpeg",
                "Content-Length": str(len(merged_audio)),
                "X-Total-Chunks": str(total_chunks),
                "X-Audio-Duration": str(duration_sec),
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
