import io
import base64
import logging
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
from PIL import Image
import numpy as np
import tensorflow as tf
from tensorflow import keras
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from backend.constants import CLASS_NAMES, parse_class_name

logger = logging.getLogger(__name__)

DEFAULT_MODEL_PATH = str(Path(__file__).resolve().parent / "newmodels" / "EfficientNetB0_s42_final.keras")


class ModelService:
    def __init__(self, model_path: str = DEFAULT_MODEL_PATH):
        self.model_path = model_path
        self.model: Optional[keras.Model] = None
        self.logits_dense: Optional[keras.layers.Dense] = None
        self.is_loaded = False

    def load_model(self):
        """Loads the Keras model and caches a pre-softmax Dense copy for Grad-CAM."""
        if self.is_loaded:
            return

        logger.info(f"Loading model from {self.model_path}...")
        self.model = keras.models.load_model(self.model_path)
        logger.info("Model loaded successfully.")

        backbone = self.model.layers[1]
        dense_layer = self.model.layers[-1]
        self.logits_dense = keras.layers.Dense(
            units=dense_layer.units,
            activation=None,
            use_bias=dense_layer.use_bias,
            name="pre_softmax_dense",
        )
        self.logits_dense.build((None, backbone.output_shape[-1]))
        self.logits_dense.set_weights(dense_layer.get_weights())

        dummy_input = np.zeros((1, 224, 224, 3), dtype=np.float32)
        _ = self.model(dummy_input, training=False)
        self.is_loaded = True
        logger.info("Model warmup complete.")

    def preprocess_image(self, image_bytes: bytes) -> Tuple[np.ndarray, Image.Image]:
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            if pil_img.mode != "RGB":
                pil_img = pil_img.convert("RGB")
        except Exception as err:
            raise ValueError(f"Invalid or corrupted image file: {err}")

        resized_img = pil_img.resize((224, 224), Image.Resampling.BILINEAR)
        img_array = np.array(resized_img, dtype=np.float32)
        preprocessed = tf.keras.applications.efficientnet.preprocess_input(img_array)
        preprocessed_tensor = np.expand_dims(preprocessed, axis=0)
        return preprocessed_tensor, pil_img

    def predict(self, preprocessed_tensor: np.ndarray) -> Dict[str, Any]:
        if not self.is_loaded or self.model is None:
            raise RuntimeError("Model is not loaded.")

        preds = self.model(preprocessed_tensor, training=False).numpy()[0]
        top_idx = int(np.argmax(preds))
        top_raw_class = CLASS_NAMES[top_idx]
        top_conf = float(preds[top_idx])
        top_crop, top_disease, is_healthy = parse_class_name(top_raw_class)

        sorted_indices = np.argsort(preds)[::-1][:3]
        top_3 = []
        for idx in sorted_indices:
            raw_c = CLASS_NAMES[idx]
            crop_n, disease_n, healthy_flag = parse_class_name(raw_c)
            top_3.append({
                "raw_class": raw_c,
                "crop_name": crop_n,
                "disease_name": disease_n,
                "class_name": f"{disease_n} ({crop_n})" if not healthy_flag else f"Healthy {crop_n}",
                "confidence": round(float(preds[idx]), 4),
                "is_healthy": healthy_flag
            })

        return {
            "predicted_class": top_disease if not is_healthy else "Healthy",
            "crop_name": top_crop,
            "raw_class": top_raw_class,
            "confidence": round(top_conf, 4),
            "is_healthy": is_healthy,
            "top_3_predictions": top_3
        }

    def compute_gradcam(
        self,
        preprocessed_tensor: np.ndarray,
        original_pil_img: Image.Image,
        target_class_idx: Optional[int] = None
    ) -> str:
        """
        Computes coarse 7x7 Grad-CAM using backbone (model.layers[1]) output
        and pre-softmax logits head without gradient recording on the backbone.
        """
        if not self.is_loaded or self.model is None or self.logits_dense is None:
            raise RuntimeError("Model is not loaded.")

        backbone = self.model.layers[1]
        gap_layer = self.model.layers[2]
        dropout_layer = self.model.layers[3]

        tensor_input = tf.convert_to_tensor(preprocessed_tensor, dtype=tf.float32)
        feature_maps = backbone(tensor_input, training=False)

        feature_maps_tensor = tf.cast(feature_maps, tf.float32)
        with tf.GradientTape() as tape:
            tape.watch(feature_maps_tensor)
            pooled = gap_layer(feature_maps_tensor)
            dropped = dropout_layer(pooled, training=False)
            logits = self.logits_dense(dropped)
            if target_class_idx is None:
                target_class_idx = int(tf.argmax(logits[0]).numpy())
            loss = logits[:, target_class_idx]

        grads = tape.gradient(loss, feature_maps_tensor)
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        conv_outputs_np = feature_maps_tensor[0].numpy()
        pooled_grads_np = pooled_grads.numpy()

        cam = np.tensordot(conv_outputs_np, pooled_grads_np, axes=([2], [0]))
        cam = np.maximum(cam, 0.0)
        max_val = float(np.max(cam))
        if max_val > 1e-7:
            cam = cam / max_val
        else:
            cam = np.zeros_like(cam, dtype=np.float32)

        cam_img = Image.fromarray(np.uint8(255 * cam)).resize((224, 224), Image.Resampling.BILINEAR)
        cam_resized = np.array(cam_img, dtype=np.float32) / 255.0

        cmap = plt.get_cmap("jet")
        colored_cam = np.uint8(255 * cmap(cam_resized)[:, :, :3])
        orig_224 = original_pil_img.resize((224, 224), Image.Resampling.BILINEAR)
        blended = (0.55 * np.array(orig_224) + 0.45 * colored_cam).astype(np.uint8)

        overlay_pil = Image.fromarray(blended)
        buffered = io.BytesIO()
        overlay_pil.save(buffered, format="PNG")
        b64_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{b64_str}"


model_service = ModelService()
