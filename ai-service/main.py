import os
import logging
from typing import List
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np

# Load environment variables from root .env if running locally
parent_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(parent_env):
    with open(parent_env, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip()

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Public Infrastructure AI Service",
    description="YOLOv8-based image classification for infrastructure incidents",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")
CONFIDENCE_THRESHOLD = float(os.getenv("AI_CONFIDENCE_THRESHOLD", "0.5"))
model = None

INCIDENT_CLASSES = {
    0: "littering",
    1: "pothole",
    2: "broken_lamp",
    3: "vandalism",
    4: "flooding",
    5: "crowd",
}


def get_model():
    """Lazy-load YOLO model with fallback."""
    global model
    if model is None:
        try:
            from ultralytics import YOLO
            model = YOLO(MODEL_PATH)
            logger.info(f"Loaded YOLO model from {MODEL_PATH}")
        except Exception as e:
            logger.warning(f"Failed to load YOLO model: {e}. Using mock mode.")
            model = "mock"
    return model


def classify_bytes(contents: bytes) -> dict:
    m = get_model()
    if m == "mock":
        import random
        mock_class = random.choice(list(INCIDENT_CLASSES.values()))
        mock_confidence = round(random.uniform(0.6, 0.95), 3)
        return {
            "detections": [{"class": mock_class, "confidence": mock_confidence, "bbox": [100, 100, 300, 300]}],
            "primary_class": mock_class,
            "confidence": mock_confidence,
            "is_valid_report": True,
            "above_threshold": mock_confidence >= CONFIDENCE_THRESHOLD,
            "threshold": CONFIDENCE_THRESHOLD,
            "mock": True,
        }

    import cv2
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    results = m(img, conf=max(0.1, CONFIDENCE_THRESHOLD - 0.2))
    detections = []
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            detections.append({
                "class": INCIDENT_CLASSES.get(cls_id, "unknown"),
                "confidence": round(float(box.conf[0]), 3),
                "bbox": [round(x, 1) for x in box.xyxy[0].tolist()],
            })

    primary = max(detections, key=lambda x: x["confidence"]) if detections else None
    confidence = primary["confidence"] if primary else 0.0
    return {
        "detections": detections,
        "primary_class": primary["class"] if primary else "unknown",
        "confidence": confidence,
        "is_valid_report": len(detections) > 0,
        "above_threshold": confidence >= CONFIDENCE_THRESHOLD,
        "threshold": CONFIDENCE_THRESHOLD,
        "mock": False,
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    m = get_model()
    return {
        "status": "healthy",
        "model_loaded": m != "mock",
        "model_path": MODEL_PATH,
        "confidence_threshold": CONFIDENCE_THRESHOLD,
    }


@app.post("/classify")
async def classify_image(file: UploadFile = File(...)):
    """Classify a single image."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    contents = await file.read()
    return classify_bytes(contents)


@app.post("/classify_batch")
async def classify_batch(files: List[UploadFile] = File(...)):
    """Classify multiple images in one request."""
    results = []
    for f in files:
        if not f.content_type or not f.content_type.startswith("image/"):
            results.append({"filename": f.filename, "error": "Not an image"})
            continue
        contents = await f.read()
        try:
            r = classify_bytes(contents)
            r["filename"] = f.filename
            results.append(r)
        except Exception as e:
            results.append({"filename": f.filename, "error": str(e)})
    return {"results": results, "count": len(results)}


@app.post("/analyze-video")
async def analyze_video(camera_id: str = "cam-001", video_url: str = ""):
    """Analyze video frames for incident detection (placeholder).

    TODO: needs ffmpeg + frame sampling + YOLO inference per frame.
    """
    return {
        "camera_id": camera_id,
        "events": [],
        "frames_processed": 0,
        "message": "Video analysis endpoint placeholder. Implement frame sampling.",
    }
