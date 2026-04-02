# MirroXD AI Backend
# FastAPI server for AI-powered video analysis and clipping

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import tempfile

app = FastAPI(
    title="MirroXD AI Backend",
    description="AI-powered video analysis: scene detection, audio peaks, OCR, auto-clipping",
    version="0.1.0",
)

# CORS — allow Tauri frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Models ──────────────────────────────────────────────────────────────────

class Timestamp(BaseModel):
    time_sec: float
    label: str
    confidence: float = 1.0
    type: str = "scene"  # "scene", "audio", "ocr", "ai"


class AnalysisResult(BaseModel):
    video_path: str
    timestamps: List[Timestamp]
    duration_sec: float
    total_highlights: int


class ClipRequest(BaseModel):
    video_path: str
    timestamps: List[Timestamp]
    padding_sec: float = 3.0
    output_dir: Optional[str] = None


class ClipResult(BaseModel):
    clips: List[str]  # paths to generated clips
    total: int


class OCRKeyword(BaseModel):
    keywords: List[str]
    video_path: str
    sample_rate: int = 30  # check every N frames


# ─── Health check ────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "ok", "service": "MirroXD AI Backend", "version": "0.1.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


# ─── Scene Detection ────────────────────────────────────────────────────────

@app.post("/detect-scenes", response_model=AnalysisResult)
async def detect_scenes(video_path: str, threshold: float = 30.0):
    """
    Detect scene changes using histogram difference between frames.
    Large histogram differences indicate scene transitions.
    """
    try:
        import cv2
        import numpy as np
    except ImportError:
        raise HTTPException(status_code=500, detail="OpenCV not installed. Run: pip install opencv-python")

    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail=f"Video not found: {video_path}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise HTTPException(status_code=400, detail="Cannot open video file")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps

    timestamps = []
    prev_hist = None
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Convert to HSV and calculate histogram
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv], [0, 1], None, [50, 60], [0, 180, 0, 256])
        cv2.normalize(hist, hist)

        if prev_hist is not None:
            # Compare histograms using correlation
            diff = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_BHATTACHARYYA)

            # Bhattacharyya distance > threshold = scene change
            if diff > threshold / 100.0:
                time_sec = frame_idx / fps
                timestamps.append(Timestamp(
                    time_sec=round(time_sec, 2),
                    label=f"Scene change (diff: {diff:.2f})",
                    confidence=min(diff * 2, 1.0),
                    type="scene",
                ))

        prev_hist = hist.copy()
        frame_idx += 1

        # Skip frames for speed (analyze every 5th frame)
        for _ in range(4):
            cap.read()
            frame_idx += 1

    cap.release()

    return AnalysisResult(
        video_path=video_path,
        timestamps=timestamps,
        duration_sec=round(duration, 2),
        total_highlights=len(timestamps),
    )


# ─── Audio Peak Detection ───────────────────────────────────────────────────

@app.post("/detect-audio-peaks", response_model=AnalysisResult)
async def detect_audio_peaks(video_path: str, threshold: float = 0.8):
    """
    Extract audio and detect energy peaks using librosa.
    High-amplitude spikes indicate exciting moments (cheers, reactions).
    """
    try:
        import librosa
        import numpy as np
    except ImportError:
        raise HTTPException(status_code=500, detail="librosa not installed. Run: pip install librosa")

    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail=f"Video not found: {video_path}")

    # Extract audio from video using ffmpeg
    audio_tmp = tempfile.mktemp(suffix=".wav")
    os.system(f'ffmpeg -y -i "{video_path}" -vn -acodec pcm_s16le -ar 22050 -ac 1 "{audio_tmp}" 2>/dev/null')

    if not os.path.exists(audio_tmp):
        raise HTTPException(status_code=400, detail="Could not extract audio from video")

    try:
        # Load audio
        y, sr = librosa.load(audio_tmp, sr=22050)
        duration = librosa.get_duration(y=y, sr=sr)

        # Calculate RMS energy
        rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]

        # Normalize
        rms_norm = rms / (rms.max() + 1e-6)

        # Find peaks above threshold
        timestamps = []
        hop_duration = 512 / sr  # duration of each hop

        for i, energy in enumerate(rms_norm):
            if energy > threshold:
                time_sec = i * hop_duration
                # Avoid duplicates within 2 seconds
                if not timestamps or (time_sec - timestamps[-1].time_sec) > 2.0:
                    timestamps.append(Timestamp(
                        time_sec=round(time_sec, 2),
                        label=f"Audio peak (energy: {energy:.2f})",
                        confidence=float(energy),
                        type="audio",
                    ))

    finally:
        # Cleanup temp file
        if os.path.exists(audio_tmp):
            os.remove(audio_tmp)

    return AnalysisResult(
        video_path=video_path,
        timestamps=timestamps,
        duration_sec=round(duration, 2),
        total_highlights=len(timestamps),
    )


# ─── OCR Tagging ────────────────────────────────────────────────────────────

@app.post("/ocr-tag", response_model=AnalysisResult)
async def ocr_tag(request: OCRKeyword):
    """
    Use EasyOCR to read text from video frames.
    Match text with user-defined keywords to create markers.
    """
    try:
        import cv2
        import easyocr
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="Dependencies not installed. Run: pip install easyocr opencv-python"
        )

    if not os.path.exists(request.video_path):
        raise HTTPException(status_code=404, detail=f"Video not found: {request.video_path}")

    # Initialize EasyOCR reader
    reader = easyocr.Reader(['en', 'id'], gpu=False)

    cap = cv2.VideoCapture(request.video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps

    timestamps = []
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % request.sample_rate == 0:
            # Run OCR on frame
            results = reader.readtext(frame)

            for (bbox, text, conf) in results:
                text_lower = text.lower()
                for keyword in request.keywords:
                    if keyword.lower() in text_lower:
                        time_sec = frame_idx / fps
                        timestamps.append(Timestamp(
                            time_sec=round(time_sec, 2),
                            label=f"OCR: '{text}' (keyword: {keyword})",
                            confidence=float(conf),
                            type="ocr",
                        ))

        frame_idx += 1

    cap.release()

    return AnalysisResult(
        video_path=request.video_path,
        timestamps=timestamps,
        duration_sec=round(duration, 2),
        total_highlights=len(timestamps),
    )


# ─── Generate Clips ─────────────────────────────────────────────────────────

@app.post("/generate-clips", response_model=ClipResult)
async def generate_clips(request: ClipRequest):
    """
    Cut video at timestamp positions with configurable padding.
    Uses FFmpeg with -c copy for fast, lossless cutting.
    """
    if not os.path.exists(request.video_path):
        raise HTTPException(status_code=404, detail=f"Video not found: {request.video_path}")

    output_dir = request.output_dir or os.path.join(
        os.path.dirname(request.video_path), "clips"
    )
    os.makedirs(output_dir, exist_ok=True)

    clips = []
    for i, ts in enumerate(request.timestamps):
        start = max(0, ts.time_sec - request.padding_sec)
        end = ts.time_sec + request.padding_sec

        output_file = os.path.join(
            output_dir,
            f"clip_{i+1:03d}_{ts.type}_{ts.time_sec:.0f}s.mp4"
        )

        cmd = (
            f'ffmpeg -y -i "{request.video_path}" '
            f'-ss {start:.2f} -to {end:.2f} '
            f'-c copy "{output_file}"'
        )
        os.system(cmd)

        if os.path.exists(output_file):
            clips.append(output_file)

    return ClipResult(clips=clips, total=len(clips))


# ─── Full Analysis (combo of all methods) ────────────────────────────────────

@app.post("/analyze", response_model=AnalysisResult)
async def full_analysis(
    video_path: str,
    scene_threshold: float = 30.0,
    audio_threshold: float = 0.8,
    keywords: Optional[List[str]] = None,
):
    """
    Run full analysis pipeline: scene detection + audio peaks + OCR.
    Combines all timestamps and sorts by time.
    """
    all_timestamps = []

    # Scene detection
    try:
        scene_result = await detect_scenes(video_path, scene_threshold)
        all_timestamps.extend(scene_result.timestamps)
    except Exception as e:
        print(f"Scene detection failed: {e}")

    # Audio peak detection
    try:
        audio_result = await detect_audio_peaks(video_path, audio_threshold)
        all_timestamps.extend(audio_result.timestamps)
    except Exception as e:
        print(f"Audio detection failed: {e}")

    # OCR tagging (if keywords provided)
    if keywords:
        try:
            ocr_result = await ocr_tag(OCRKeyword(
                keywords=keywords,
                video_path=video_path,
            ))
            all_timestamps.extend(ocr_result.timestamps)
        except Exception as e:
            print(f"OCR failed: {e}")

    # Sort by time
    all_timestamps.sort(key=lambda t: t.time_sec)

    # Deduplicate (merge timestamps within 2 seconds)
    deduped = []
    for ts in all_timestamps:
        if not deduped or (ts.time_sec - deduped[-1].time_sec) > 2.0:
            deduped.append(ts)
        elif ts.confidence > deduped[-1].confidence:
            deduped[-1] = ts

    # Calculate duration
    try:
        import cv2
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps
        cap.release()
    except Exception:
        duration = 0.0

    return AnalysisResult(
        video_path=video_path,
        timestamps=deduped,
        duration_sec=round(duration, 2),
        total_highlights=len(deduped),
    )


# ─── Entry point ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8765)
