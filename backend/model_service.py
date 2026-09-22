import io
import base64
import logging
from typing import Dict, Any, Tuple, Optional
from PIL import Image
import numpy as np
import tensorflow as tf
from tensorflow import keras
import matplotlib.pyplot as plt

from backend.constants import CLASS_NAMES, parse_class_name, DISEASE_INFO
from backend.constants import CLASS_NAMES, parse_class_name, DISEASE_INFO, MODEL_METRICS

logger = logging.getLogger(__name__)

class ModelService:
    def __init__(self, model_path: str = "backend/models/best_model_final.keras"):
        self.model_path = model_path
        self.model: Optional[keras.Model] = None
        self.feature_extractor: Optional[keras.Model] = None
        self.is_loaded = False

    def load_model(self):
        """Loads the Keras model and prepares the Grad-CAM sub-model."""
        if self.is_loaded:
            return

        logger.info(f"Loading model from {self.model_path}...")
        self.model = keras.models.load_model(self.model_path)
        logger.info("Model loaded successfully.")

        # Build feature extractor for Grad-CAM
        # Model architecture:
        # Outer model: input_layer_1 -> efficientnetb0 (Functional) -> global_average_pooling2d -> dropout -> dense
        try:
            base_model = self.model.get_layer("efficientnetb0")
            target_conv_layer = base_model.get_layer("top_conv")
            # Sub-model extracting both target conv layer outputs and base model final output
            self.feature_extractor = keras.Model(
                inputs=base_model.input,
                outputs=[target_conv_layer.output, base_model.output],
                name="gradcam_feature_extractor"
            )
            logger.info("Grad-CAM feature extractor initialized with layer 'top_conv'.")
        except Exception as e:
            logger.warning(f"Could not build nested feature extractor: {e}. Trying fallback inspection.")
            self.feature_extractor = None

        # Warm up model with dummy input
        dummy_input = np.zeros((1, 224, 224, 3), dtype=np.float32)
        _ = self.model(dummy_input, training=False)
        self.is_loaded = True
        logger.info("Model warmup complete.")

    def preprocess_image(self, image_bytes: bytes) -> Tuple[np.ndarray, Image.Image]:
        """
        Validates, decodes, and preprocesses an image file.
        Returns:
            - preprocessed_tensor: np.ndarray of shape (1, 224, 224, 3)
            - original_pil_image: PIL Image object
        """
        try:
            pil_img = Image.open(io.BytesIO(image_bytes))
            # Convert any color mode (RGBA, grayscale, CMYK, etc.) to RGB
            if pil_img.mode != "RGB":
                pil_img = pil_img.convert("RGB")
        except Exception as err:
            raise ValueError(f"Invalid or corrupted image file: {err}")

        # Resize to 224x224 for model input
        resized_img = pil_img.resize((224, 224), Image.Resampling.BILINEAR)
        img_array = np.array(resized_img, dtype=np.float32)

        # EfficientNet preprocess_input
        preprocessed = tf.keras.applications.efficientnet.preprocess_input(img_array)
        preprocessed_tensor = np.expand_dims(preprocessed, axis=0)

        return preprocessed_tensor, pil_img

    def predict(self, preprocessed_tensor: np.ndarray) -> Dict[str, Any]:
        """
        Runs inference on preprocessed tensor and returns prediction breakdown.
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError("Model is not loaded.")

        preds = self.model(preprocessed_tensor, training=False).numpy()[0]

        top_idx = int(np.argmax(preds))
        top_raw_class = CLASS_NAMES[top_idx]
        top_conf = float(preds[top_idx])

        top_crop, top_disease, is_healthy = parse_class_name(top_raw_class)

        # Top 3 predictions
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
            "validation_metrics": MODEL_METRICS.copy(),
            "top_3_predictions": top_3
        }

    def compute_gradcam(
        self,
        preprocessed_tensor: np.ndarray,
        original_pil_img: Image.Image,
        target_class_idx: Optional[int] = None
    ) -> Tuple[str, float]:
        """
        Computes Grad-CAM heatmap overlay for target class and faithfulness score.
        Returns:
            - base64_overlay_png: data:image/png;base64,...
            - faithfulness_score: float in [0, 1]
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError("Model is not loaded.")

        # Determine target class if not explicitly passed
        initial_preds = self.model(preprocessed_tensor, training=False).numpy()[0]
        if target_class_idx is None:
            target_class_idx = int(np.argmax(initial_preds))
        original_confidence = float(initial_preds[target_class_idx])

        # Step 1: Forward pass with GradientTape targeting top_conv inside efficientnetb0
        tensor_input = tf.convert_to_tensor(preprocessed_tensor, dtype=tf.float32)

        gap_layer = self.model.get_layer("global_average_pooling2d")
        dropout_layer = self.model.get_layer("dropout")
        dense_layer = self.model.get_layer("dense")

        with tf.GradientTape() as tape:
            if self.feature_extractor is not None:
                conv_outputs, eff_output = self.feature_extractor(tensor_input)
            else:
                base_model = self.model.get_layer("efficientnetb0")
                eff_output = base_model(tensor_input)
                conv_outputs = eff_output

            tape.watch(conv_outputs)
            x = gap_layer(eff_output)
            x = dropout_layer(x, training=False)
            preds = dense_layer(x)
            loss = preds[:, target_class_idx]

        # Gradients of target class output w.r.t. conv_outputs
        grads = tape.gradient(loss, conv_outputs)

        # Global average pooling on gradients across spatial dimensions (height, width)
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

        # Weight conv feature maps by pooled gradients
        conv_outputs_np = conv_outputs[0].numpy()
        pooled_grads_np = pooled_grads.numpy()

        cam = np.zeros(conv_outputs_np.shape[:2], dtype=np.float32)
        for i, w in enumerate(pooled_grads_np):
            cam += w * conv_outputs_np[:, :, i]

        # Apply ReLU and normalize to [0, 1]
        cam = np.maximum(cam, 0)
        max_val = np.max(cam)
        if max_val > 1e-7:
            cam = cam / max_val
        else:
            cam = np.zeros_like(cam)

        # Resize heatmap to 224x224
        cam_img = Image.fromarray(np.uint8(255 * cam)).resize((224, 224), Image.Resampling.BILINEAR)
        cam_resized = np.array(cam_img, dtype=np.float32) / 255.0

        # Step 2: Compute Faithfulness Score
        # Mask top 30% activated region of the heatmap
        threshold = np.percentile(cam_resized, 70)  # 70th percentile corresponds to top 30%
        high_activation_mask = (cam_resized >= threshold)

        # Mask the original 224x224 image: fill top 30% regions with neutral gray (128)
        orig_224 = original_pil_img.resize((224, 224), Image.Resampling.BILINEAR)
        orig_224_arr = np.array(orig_224).copy()
        orig_224_arr[high_activation_mask] = [128, 128, 128]

        # Preprocess masked image and re-predict
        masked_preprocessed = tf.keras.applications.efficientnet.preprocess_input(
            orig_224_arr.astype(np.float32)
        )
        masked_tensor = np.expand_dims(masked_preprocessed, axis=0)
        masked_preds = self.model(masked_tensor, training=False).numpy()[0]
        masked_confidence = float(masked_preds[target_class_idx])

        # Faithfulness = original_confidence - masked_confidence
        # Normalized and bounded between 0.0 and 1.0
        raw_faithfulness = original_confidence - masked_confidence
        faithfulness_score = round(float(np.clip(raw_faithfulness, 0.0, 1.0)), 4)

        # Step 3: Generate Base64 Heatmap Overlay Image
        # Colormap 'jet'
        cmap = plt.get_cmap("jet")
        colored_cam = cmap(cam_resized)[:, :, :3]  # drop alpha channel, float [0, 1]
        colored_cam = np.uint8(255 * colored_cam)

        orig_resized_np = np.array(orig_224)
        # Alpha blending: 0.45 heatmap + 0.55 original image
        blended = (0.55 * orig_resized_np + 0.45 * colored_cam).astype(np.uint8)

        # Encode to PNG Base64
        overlay_pil = Image.fromarray(blended)
        buffered = io.BytesIO()
        overlay_pil.save(buffered, format="PNG")
        b64_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        overlay_data_url = f"data:image/png;base64,{b64_str}"

        return overlay_data_url, faithfulness_score


# Singleton instance
model_service = ModelService()
