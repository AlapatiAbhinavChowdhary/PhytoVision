import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse

from backend.model_service import model_service
from backend.constants import DISEASE_INFO, parse_class_name, CLASS_NAMES

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("plant-disease-api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load the model once
    logger.info("Initializing Plant Disease Classifier backend...")
    try:
        model_service.load_model()
        logger.info("Plant Disease Classifier ready to accept requests.")
    except Exception as e:
        logger.error(f"Failed to load model on startup: {e}", exc_info=True)
    yield
    # Shutdown
    logger.info("Shutting down Plant Disease Classifier backend.")

app = FastAPI(
    title="Explainable Plant Disease Classifier API",
    description="FastAPI service for 38-class plant disease classification with Grad-CAM and faithfulness explanations.",
    version="1.0.0",
    lifespan=lifespan
)

import re

# Normalize duplicate slashes in incoming request URLs (e.g. //health -> /health)
@app.middleware("http")
async def normalize_slashes(request, call_next):
    raw_path = request.scope.get("path", "")
    if "//" in raw_path:
        request.scope["path"] = re.sub(r"/+", "/", raw_path)
    return await call_next(request)

# CORS middleware for frontend (e.g., Vite on localhost:5173 or other dev ports)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development and production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/bmp",
    "application/octet-stream"  # Fallback for some clients
}

METRICS_PATH = Path(__file__).resolve().parent / "model_metrics.json"

@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {
        "status": "online",
        "service": "Explainable Plant Disease Classifier API",
        "endpoints": ["/predict", "/explain", "/disease-info/{class_name}", "/classes", "/model-metrics"]
    }

@app.api_route("/model-metrics", methods=["GET", "HEAD"])
def get_model_metrics():
    """
    Returns pre-computed evaluation metrics from the model training pipeline:
    overall accuracy, per-class precision/recall/F1/support, confusion matrix, and class names.
    """
    if not METRICS_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="Model evaluation metrics file not found."
        )
    return FileResponse(METRICS_PATH, media_type="application/json")

@app.api_route("/health", methods=["GET", "HEAD"])
def health_check():
    return {
        "status": "healthy" if model_service.is_loaded else "loading",
        "model_loaded": model_service.is_loaded
    }

@app.get("/classes")
def list_classes():
    return {
        "total": len(CLASS_NAMES),
        "classes": [
            {
                "raw_class": c,
                "crop_name": parse_class_name(c)[0],
                "disease_name": parse_class_name(c)[1],
                "is_healthy": parse_class_name(c)[2]
            }
            for c in CLASS_NAMES
        ]
    }

@app.post("/predict")
async def predict_image(file: UploadFile = File(...)):
    """
    Accepts an uploaded image file, processes it, and returns:
    - predicted_class: human-readable disease name
    - crop_name: host crop name
    - confidence: float (0 - 1)
    - is_healthy: boolean flag
    - raw_class: exact dataset class identifier
    - top_3_predictions: list of top 3 predictions
    """
    if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{file.content_type}'. Please upload a valid image (JPEG, PNG, WEBP)."
        )

    try:
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="The uploaded file is empty.")

        preprocessed_tensor, _ = model_service.preprocess_image(contents)
        result = model_service.predict(preprocessed_tensor)
        return result

    except ValueError as ve:
        logger.warning(f"Bad image payload: {ve}")
        raise HTTPException(
            status_code=400,
            detail="The file provided could not be processed as an image. Please ensure you upload a valid, uncorrupted leaf photo."
        )
    except Exception as e:
        logger.error(f"Prediction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing the plant image."
        )

@app.post("/explain")
async def explain_image(
    file: UploadFile = File(...),
    target_class: Optional[str] = Query(None, description="Optional raw class name to explain. Defaults to top predicted class.")
):
    """
    Accepts an image file and returns:
    - heatmap_overlay: base64 PNG data URL of Grad-CAM overlay on top_conv
    - faithfulness_score: float (0 - 1), drop in confidence when top-30% activated region is masked
    """
    if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{file.content_type}'. Please upload a valid image (JPEG, PNG, WEBP)."
        )

    try:
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="The uploaded file is empty.")

        preprocessed_tensor, pil_img = model_service.preprocess_image(contents)

        target_idx = None
        if target_class:
            if target_class in CLASS_NAMES:
                target_idx = CLASS_NAMES.index(target_class)
            else:
                logger.warning(f"Target class '{target_class}' not recognized; defaulting to top prediction.")

        overlay_data_url, faithfulness = model_service.compute_gradcam(
            preprocessed_tensor,
            pil_img,
            target_class_idx=target_idx
        )

        return {
            "heatmap_overlay": overlay_data_url,
            "faithfulness_score": faithfulness
        }

    except ValueError as ve:
        logger.warning(f"Bad image in explain: {ve}")
        raise HTTPException(
            status_code=400,
            detail="Could not decode image for Grad-CAM explanation. Please upload a valid leaf photo."
        )
    except Exception as e:
        logger.error(f"Grad-CAM explanation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to compute Grad-CAM explanation for the image."
        )

@app.get("/disease-info/{class_name}")
def get_disease_info(class_name: str):
    """
    Returns layman explanation, recommended actions, and severity for any of the 38 classes.
    Accepts raw class name (e.g. 'Tomato___Late_blight') or matches normalized name.
    """
    # Direct match
    if class_name in DISEASE_INFO:
        info = DISEASE_INFO[class_name]
        crop, disease, is_healthy = parse_class_name(class_name)
        return {
            "raw_class": class_name,
            "crop_name": crop,
            "disease_name": disease,
            "is_healthy": is_healthy,
            **info
        }

    # Case-insensitive or partial match fallback
    cleaned = class_name.strip().lower()
    for raw_k, info in DISEASE_INFO.items():
        if raw_k.lower() == cleaned:
            crop, disease, is_healthy = parse_class_name(raw_k)
            return {
                "raw_class": raw_k,
                "crop_name": crop,
                "disease_name": disease,
                "is_healthy": is_healthy,
                **info
            }

    # If not found, return friendly default
    raise HTTPException(
        status_code=404,
        detail=f"Disease information for '{class_name}' not found. Please provide a valid PlantVillage class name."
    )
