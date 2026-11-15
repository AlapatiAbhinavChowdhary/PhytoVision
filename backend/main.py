import re
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from pydantic import BaseModel

# Load environment variables from backend/.env or root .env
load_dotenv(Path(__file__).resolve().parent / ".env")
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from backend.multi_model import multi_model_service, ENABLE_MULTI_MODEL
from backend.gemini_service import gemini_service
from backend.constants import DISEASE_INFO, parse_class_name

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("plant-disease-api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load all 4 models once from backend/newmodels/
    logger.info("Initializing PhytoVision 4-model backend...")
    try:
        multi_model_service.load_models()
        logger.info("All models loaded and ready to accept requests.")
    except Exception as e:
        logger.error(f"Failed to load models on startup: {e}", exc_info=True)
    yield
    logger.info("Shutting down PhytoVision backend.")


app = FastAPI(
    title="Explainable Plant Disease Classifier API",
    description="FastAPI service for 38-class plant disease classification across 4 CNN/ConvNeXt models with Ensemble and Grad-CAM.",
    version="2.0.0",
    lifespan=lifespan
)


@app.middleware("http")
async def normalize_slashes(request, call_next):
    raw_path = request.scope.get("path", "")
    if "//" in raw_path:
        request.scope["path"] = re.sub(r"/+", "/", raw_path)
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    "application/octet-stream"
}

METRICS_PATH = Path(__file__).resolve().parent / "model_metrics.json"


@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {
        "status": "online",
        "service": "Explainable Plant Disease Classifier API",
        "endpoints": ["/predict", "/predict/all", "/models/info", "/explain", "/disease-info/{class_name}", "/classes", "/model-metrics"]
    }


@app.api_route("/model-metrics", methods=["GET", "HEAD"])
def get_model_metrics():
    if not METRICS_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="Model evaluation metrics file not found."
        )
    return FileResponse(METRICS_PATH, media_type="application/json")


@app.api_route("/health", methods=["GET", "HEAD"])
def health_check():
    any_loaded = any(status == "ok" for status in multi_model_service.load_status.values())
    return {
        "status": "healthy" if any_loaded else "loading",
        "model_loaded": any_loaded,
        "models_loaded": multi_model_service.load_status
    }


@app.get("/classes")
def list_classes():
    class_names = multi_model_service.class_names
    return {
        "total": len(class_names),
        "classes": [
            {
                "raw_class": c,
                "crop_name": parse_class_name(c)[0],
                "disease_name": parse_class_name(c)[1],
                "is_healthy": parse_class_name(c)[2]
            }
            for c in class_names
        ]
    }


async def _read_and_validate_image(file: UploadFile) -> bytes:
    if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{file.content_type}'. Please upload a valid image (JPEG, PNG, WEBP)."
        )
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    return contents


@app.post("/predict")
async def predict_image(file: UploadFile = File(...)):
    """
    Runs all 4 models (EfficientNetB0, DenseNet121, MobileNetV3Large, ConvNeXtTiny)
    with model-specific preprocessing, returning:
    - models: top-3 classes with confidence and inference latency per model
    - ensemble: mean of the four softmax probability vectors
    - agreement: all_agree flag (true if all four models predict the same top class) and vote counts
    - primary ensemble diagnosis fields
    """
    contents = await _read_and_validate_image(file)
    try:
        return multi_model_service.predict_all(contents)
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


@app.post("/predict/all")
async def predict_all_models(file: UploadFile = File(...)):
    if not ENABLE_MULTI_MODEL:
        raise HTTPException(
            status_code=503,
            detail="Multi-model comparison feature is currently disabled via ENABLE_MULTI_MODEL config."
        )
    contents = await _read_and_validate_image(file)
    try:
        return multi_model_service.predict_all(contents)
    except ValueError as ve:
        logger.warning(f"Bad image payload in predict/all: {ve}")
        raise HTTPException(
            status_code=400,
            detail="The file provided could not be processed as an image. Please ensure you upload a valid, uncorrupted leaf photo."
        )
    except Exception as e:
        logger.error(f"Multi-model prediction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing the plant image with multiple models."
        )


@app.get("/models/info")
def get_models_info():
    return multi_model_service.get_info()


@app.post("/explain")
async def explain_image(
    file: UploadFile = File(...),
    model_name: str = Query("ConvNeXtTiny", description="Model to explain (EfficientNetB0, DenseNet121, MobileNetV3Large, ConvNeXtTiny)"),
    target_class: Optional[str] = Query(None, description="Optional raw class name to explain. Defaults to top predicted class.")
):
    """
    Computes approximate coarse 7x7 Grad-CAM overlay using the selected model's backbone output
    and pre-softmax Dense logits head.
    """
    contents = await _read_and_validate_image(file)
    try:
        target_idx = None
        if target_class:
            if target_class in multi_model_service.class_names:
                target_idx = multi_model_service.class_names.index(target_class)
            else:
                logger.warning(f"Target class '{target_class}' not recognized; defaulting to top prediction.")

        overlay_data_url, used_model = multi_model_service.compute_gradcam(
            contents,
            model_name=model_name,
            target_class_idx=target_idx
        )

        return {
            "heatmap_overlay": overlay_data_url,
            "model_name": used_model,
            "note": "The heatmap is approximate (coarse 7x7) and does not prove that the model looks at the lesion."
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


class AskAgronomistRequest(BaseModel):
    question: str
    crop_name: str
    disease_name: str
    raw_class: str
    is_healthy: Optional[bool] = False


@app.get("/gemini-status")
def gemini_status():
    return {
        "configured": gemini_service.is_configured
    }


@app.get("/disease-info/{class_name}")
def get_disease_info(class_name: str, use_ai: bool = Query(True, description="Whether to include Gemini AI agronomist insights")):
    matched_raw = None
    info = None

    if class_name in DISEASE_INFO:
        matched_raw = class_name
        info = DISEASE_INFO[class_name]
    else:
        cleaned = class_name.strip().lower()
        for raw_k, inf in DISEASE_INFO.items():
            if raw_k.lower() == cleaned:
                matched_raw = raw_k
                info = inf
                break

    if not matched_raw or not info:
        raise HTTPException(
            status_code=404,
            detail=f"Disease information for '{class_name}' not found. Please provide a valid PlantVillage class name."
        )

    crop, disease, is_healthy = parse_class_name(matched_raw)

    response_data = {
        "raw_class": matched_raw,
        "crop_name": crop,
        "disease_name": disease,
        "is_healthy": is_healthy,
        **info
    }

    if use_ai:
        ai_insights = gemini_service.explain_disease(
            raw_class=matched_raw,
            crop_name=crop,
            disease_name=disease,
            is_healthy=is_healthy,
            fallback_info=info
        )
        response_data["ai_insights"] = ai_insights

    return response_data


@app.post("/ask-gemini")
def ask_gemini_agronomist(req: AskAgronomistRequest):
    if not req.question or not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    return gemini_service.ask_agronomist(
        question=req.question.strip(),
        crop_name=req.crop_name,
        disease_name=req.disease_name,
        raw_class=req.raw_class,
        is_healthy=bool(req.is_healthy)
    )
