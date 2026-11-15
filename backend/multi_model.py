import os
import io
import csv
import json
import time
import base64
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, Callable

from PIL import Image
import numpy as np
import tensorflow as tf
from tensorflow import keras
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from backend.constants import parse_class_name

logger = logging.getLogger("multi-model-service")

ENABLE_MULTI_MODEL = os.getenv("ENABLE_MULTI_MODEL", "true").strip().lower() in ("true", "1", "yes")

BASE_DIR = Path(__file__).resolve().parent
NEWMODELS_DIR = BASE_DIR / "newmodels"
LEGACY_MODELS_DIR = BASE_DIR / "models"
CLASS_NAMES_JSON = NEWMODELS_DIR / "class_names.json"
LEADERBOARD_CSV = LEGACY_MODELS_DIR / "leaderboard.csv"

# Research paper test accuracy (%, test set, mean of 3 seeds)
TEST_ACCURACY_BENCHMARK = [
    {"model": "Ensemble", "test_acc": 99.02, "params_m": "42.06", "note": "Mean of 4 softmax vectors (3 seeds mean)"},
    {"model": "ConvNeXtTiny", "test_acc": 98.93, "params_m": "27.85", "note": "Best single model (3 seeds mean)"},
    {"model": "EfficientNetB0", "test_acc": 97.93, "params_m": "4.10", "note": "Test set, mean of 3 seeds"},
    {"model": "MobileNetV3Large", "test_acc": 97.86, "params_m": "3.03", "note": "Test set, mean of 3 seeds"},
    {"model": "DenseNet121", "test_acc": 97.28, "params_m": "7.08", "note": "Test set, mean of 3 seeds"},
]

MODEL_SPECS: Dict[str, Tuple[str, Callable]] = {
    "EfficientNetB0": ("EfficientNetB0_s42_final.keras", tf.keras.applications.efficientnet.preprocess_input),
    "DenseNet121": ("DenseNet121_s42_final.keras", tf.keras.applications.densenet.preprocess_input),
    "MobileNetV3Large": ("MobileNetV3Large_s42_final.keras", tf.keras.applications.mobilenet_v3.preprocess_input),
    "ConvNeXtTiny": ("ConvNeXtTiny_s42_final.keras", tf.keras.applications.convnext.preprocess_input),
}


def load_class_names() -> list[str]:
    path = CLASS_NAMES_JSON if CLASS_NAMES_JSON.exists() else (LEGACY_MODELS_DIR / "class_names.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


class MultiModelService:
    def __init__(self):
        self.class_names: list[str] = load_class_names()
        self.models: Dict[str, Optional[keras.Model]] = {name: None for name in MODEL_SPECS}
        self.logits_heads: Dict[str, Optional[keras.layers.Dense]] = {name: None for name in MODEL_SPECS}
        self.load_status: Dict[str, str] = {name: "not_loaded" for name in MODEL_SPECS}
        self.load_errors: Dict[str, str] = {}

    def _build_logits_head(self, model_name: str, model: keras.Model) -> keras.layers.Dense:
        """
        Creates a copy of the last Dense layer without softmax activation
        for pre-softmax Grad-CAM gradient computation.
        """
        backbone = model.layers[1]
        dense_layer = model.layers[-1]
        feature_dim = backbone.output_shape[-1]

        logits_dense = keras.layers.Dense(
            units=dense_layer.units,
            activation=None,
            use_bias=dense_layer.use_bias,
            name=f"{model_name}_pre_softmax_dense",
        )
        logits_dense.build((None, feature_dim))
        logits_dense.set_weights(dense_layer.get_weights())
        return logits_dense

    def load_models(self, existing_effnet: Optional[keras.Model] = None):
        """
        Loads all 4 s42 Keras models once at startup from backend/newmodels/.
        Each model is loaded inside its own try/except block.
        """
        self.class_names = load_class_names()

        for name, (filename, _) in MODEL_SPECS.items():
            if self.load_status.get(name) == "ok" and self.models.get(name) is not None:
                continue

            model_path = NEWMODELS_DIR / filename
            try:
                logger.info(f"Loading {name} from {model_path}...")
                model = keras.models.load_model(str(model_path))
                self.models[name] = model
                self.logits_heads[name] = self._build_logits_head(name, model)
                self.load_status[name] = "ok"
                logger.info(f"{name} loaded successfully (backbone={model.layers[1].name}, fmap={model.layers[1].output_shape}).")
            except Exception as e:
                logger.error(f"Failed to load {name} from {model_path}: {e}", exc_info=True)
                self.models[name] = None
                self.logits_heads[name] = None
                self.load_status[name] = "unavailable"
                self.load_errors[name] = str(e)

        self.warmup()

    def warmup(self):
        """Warm up each loaded model once at startup with a dummy batch."""
        dummy_input = np.zeros((1, 224, 224, 3), dtype=np.float32)
        for name, model in self.models.items():
            if model is not None and self.load_status.get(name) == "ok":
                try:
                    _ = model(dummy_input, training=False)
                    logger.info(f"Warm-up complete for {name}.")
                except Exception as e:
                    logger.warning(f"Warm-up failed for {name}: {e}")

    def decode_image(self, image_bytes: bytes) -> Tuple[np.ndarray, Image.Image]:
        """
        Validates and decodes image bytes to RGB, resized to 224x224.
        Returns:
            - float32 numpy array of shape (224, 224, 3) in [0, 255]
            - resized 224x224 RGB PIL Image
        """
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            if pil_img.mode != "RGB":
                pil_img = pil_img.convert("RGB")
        except Exception as err:
            raise ValueError(f"Invalid or corrupt image: {err}")

        resized_img = pil_img.resize((224, 224), Image.Resampling.BILINEAR)
        arr = np.array(resized_img, dtype=np.float32)
        return arr, resized_img

    def preprocess_for_model(self, model_name: str, base_arr: np.ndarray) -> np.ndarray:
        """
        Applies the model's own tf.keras.applications preprocess_input on a fresh copy.
        """
        fresh_arr = base_arr.copy()
        batched = np.expand_dims(fresh_arr, axis=0)
        _, preprocess_fn = MODEL_SPECS[model_name]
        return preprocess_fn(batched)

    def _extract_top3(self, prob_vector: np.ndarray) -> list[Dict[str, Any]]:
        sorted_indices = np.argsort(prob_vector)[::-1][:3]
        return [
            {
                "label": self.class_names[idx],
                "confidence": round(float(prob_vector[idx]) * 100.0, 2),
            }
            for idx in sorted_indices
        ]

    def _format_top3_legacy(self, prob_vector: np.ndarray) -> list[Dict[str, Any]]:
        sorted_indices = np.argsort(prob_vector)[::-1][:3]
        top_3 = []
        for idx in sorted_indices:
            raw_c = self.class_names[idx]
            crop_n, disease_n, healthy_flag = parse_class_name(raw_c)
            top_3.append({
                "raw_class": raw_c,
                "crop_name": crop_n,
                "disease_name": disease_n,
                "class_name": f"{disease_n} ({crop_n})" if not healthy_flag else f"Healthy {crop_n}",
                "confidence": round(float(prob_vector[idx]), 4),
                "is_healthy": healthy_flag,
            })
        return top_3

    def predict_all(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Runs inference across all 4 models, computes the ensemble (mean of softmax vectors),
        and checks unanimous top-1 class agreement.
        """
        base_arr, _ = self.decode_image(image_bytes)

        model_results: Dict[str, Any] = {}
        successful_prob_vectors = []
        top1_votes: Dict[str, int] = {}

        for name in MODEL_SPECS:
            model = self.models.get(name)
            status = self.load_status.get(name, "unavailable")

            if model is None or status != "ok":
                model_results[name] = {
                    "status": "unavailable",
                    "error": self.load_errors.get(name, "Model not loaded"),
                    "top3": [],
                    "inference_ms": 0,
                }
                continue

            try:
                tensor_input = self.preprocess_for_model(name, base_arr)
                start_t = time.perf_counter()
                preds = model(tensor_input, training=False).numpy()[0]
                elapsed_ms = round((time.perf_counter() - start_t) * 1000)

                top3 = self._extract_top3(preds)
                top1_label = top3[0]["label"]

                model_results[name] = {
                    "status": "ok",
                    "top3": top3,
                    "inference_ms": max(1, elapsed_ms),
                }
                successful_prob_vectors.append(preds)
                top1_votes[top1_label] = top1_votes.get(top1_label, 0) + 1
            except Exception as e:
                logger.error(f"Inference failed for {name}: {e}", exc_info=True)
                model_results[name] = {
                    "status": "error",
                    "error": str(e),
                    "top3": [],
                    "inference_ms": 0,
                }

        if not successful_prob_vectors:
            raise RuntimeError("No models are currently loaded to run prediction.")

        # Ensemble: mean of the four softmax probability vectors
        ensemble_probs = np.mean(successful_prob_vectors, axis=0)
        ensemble_top3 = self._extract_top3(ensemble_probs)
        top_idx = int(np.argmax(ensemble_probs))
        top_raw_class = self.class_names[top_idx]
        top_conf_01 = float(ensemble_probs[top_idx])
        top_crop, top_disease, is_healthy = parse_class_name(top_raw_class)

        num_successful = len(successful_prob_vectors)
        all_agree = (num_successful > 0 and len(top1_votes) == 1 and list(top1_votes.values())[0] == num_successful)

        return {
            # Primary ensemble diagnosis fields (compatible with ResultCard)
            "predicted_class": top_disease if not is_healthy else "Healthy",
            "crop_name": top_crop,
            "raw_class": top_raw_class,
            "confidence": round(top_conf_01, 4),
            "is_healthy": is_healthy,
            "top_3_predictions": self._format_top3_legacy(ensemble_probs),
            # Per-model, ensemble & agreement payload
            "models": model_results,
            "ensemble": {
                "label": ensemble_top3[0]["label"],
                "confidence": ensemble_top3[0]["confidence"],
                "top3": ensemble_top3,
            },
            "agreement": {
                "all_agree": all_agree,
                "votes": top1_votes,
            },
            "all_agree": all_agree,
            "best_model": "ConvNeXtTiny",
        }

    def compute_gradcam(
        self,
        image_bytes: bytes,
        model_name: str = "ConvNeXtTiny",
        target_class_idx: Optional[int] = None,
    ) -> Tuple[str, str]:
        """
        Computes coarse 7x7 Grad-CAM using the selected model's backbone output (model.layers[1]):
        1. Run backbone first without gradient recording -> (1, 7, 7, C) feature maps.
        2. Record only the head (GlobalAveragePooling2D -> Dropout -> pre-softmax Dense copy).
        3. Take gradient of pre-softmax class score w.r.t. the 7x7 feature maps.
        4. Weight feature maps by mean gradient, ReLU, normalise to 0-1, resize to 224x224, overlay.
        """
        if model_name not in MODEL_SPECS or self.models.get(model_name) is None:
            # Fall back to the first available model if requested model isn't loaded
            available = [n for n, m in self.models.items() if m is not None]
            if not available:
                raise RuntimeError("No models are loaded for Grad-CAM.")
            model_name = "ConvNeXtTiny" if "ConvNeXtTiny" in available else available[0]

        model = self.models[model_name]
        logits_dense = self.logits_heads[model_name]
        if logits_dense is None:
            logits_dense = self._build_logits_head(model_name, model)
            self.logits_heads[model_name] = logits_dense

        base_arr, resized_pil = self.decode_image(image_bytes)
        tensor_input = self.preprocess_for_model(model_name, base_arr)

        backbone = model.layers[1]
        gap_layer = model.layers[2]
        dropout_layer = model.layers[3]

        # Step 1: Run backbone first WITHOUT gradient recording
        feature_maps = backbone(tensor_input, training=False)  # shape (1, 7, 7, C)

        # Step 2: Record ONLY the head and take gradient of pre-softmax class score
        feature_maps_tensor = tf.cast(feature_maps, tf.float32)
        with tf.GradientTape() as tape:
            tape.watch(feature_maps_tensor)
            pooled = gap_layer(feature_maps_tensor)
            dropped = dropout_layer(pooled, training=False)
            logits = logits_dense(dropped)
            if target_class_idx is None:
                target_class_idx = int(tf.argmax(logits[0]).numpy())
            target_score = logits[:, target_class_idx]

        grads = tape.gradient(target_score, feature_maps_tensor)  # shape (1, 7, 7, C)

        # Step 3: Weight feature maps by mean gradient, apply ReLU, normalise 0-1
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))  # shape (C,)
        fmaps_np = feature_maps_tensor[0].numpy()              # shape (7, 7, C)
        weights_np = pooled_grads.numpy()                      # shape (C,)

        cam = np.tensordot(fmaps_np, weights_np, axes=([2], [0]))  # shape (7, 7)
        cam = np.maximum(cam, 0.0)
        max_val = float(np.max(cam))
        if max_val > 1e-7:
            cam = cam / max_val
        else:
            cam = np.zeros_like(cam, dtype=np.float32)

        # Step 4: Resize to 224x224 and overlay
        cam_img = Image.fromarray(np.uint8(255 * cam)).resize((224, 224), Image.Resampling.BILINEAR)
        cam_resized = np.array(cam_img, dtype=np.float32) / 255.0

        cmap = plt.get_cmap("jet")
        colored_cam = np.uint8(255 * cmap(cam_resized)[:, :, :3])
        orig_np = np.array(resized_pil)
        blended = (0.55 * orig_np + 0.45 * colored_cam).astype(np.uint8)

        overlay_pil = Image.fromarray(blended)
        buffered = io.BytesIO()
        overlay_pil.save(buffered, format="PNG")
        b64_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{b64_str}", model_name

    def get_info(self) -> Dict[str, Any]:
        """Returns research-paper test accuracy metrics and loaded model status."""
        extra_stats: Dict[str, Dict[str, str]] = {}
        if LEADERBOARD_CSV.exists():
            try:
                with open(LEADERBOARD_CSV, mode="r", encoding="utf-8") as f:
                    for row in csv.DictReader(f):
                        m_name = row.get("model")
                        if m_name:
                            extra_stats[m_name] = {
                                "params_m": row.get("params_m", ""),
                                "inf_ms_per_img": row.get("inf_ms_per_img", ""),
                                "train_min": row.get("train_min", ""),
                            }
            except Exception as e:
                logger.warning(f"Could not read leaderboard.csv: {e}")

        test_leaderboard = []
        for entry in TEST_ACCURACY_BENCHMARK:
            m_name = entry["model"]
            merged = dict(entry)
            if m_name in extra_stats:
                merged.update({k: v for k, v in extra_stats[m_name].items() if v})
            test_leaderboard.append(merged)

        loaded_models = {
            name: (self.load_status.get(name) == "ok")
            for name in MODEL_SPECS
        }

        return {
            "feature_enabled": ENABLE_MULTI_MODEL,
            "best_model": "ConvNeXtTiny",
            "evaluation_protocol": "Test set, mean of 3 seeds",
            "loaded_models": loaded_models,
            "load_status": self.load_status,
            "leaderboard": test_leaderboard,
        }


multi_model_service = MultiModelService()
