"""
Backend verification script:
Tests model loading, forward pass, Grad-CAM on top_conv, faithfulness score, and disease info lookup.
"""
import os
import sys
import numpy as np
from PIL import Image

# Add current workspace to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.model_service import model_service
from backend.constants import CLASS_NAMES, DISEASE_INFO, parse_class_name

def test_model_loading_and_inference():
    print("1. Testing Model Loading...")
    model_service.load_model()
    assert model_service.is_loaded, "Model failed to load!"
    print("[OK] Model successfully loaded into memory.")

    print("\n2. Testing Preprocessing & Prediction with a synthetic leaf image...")
    # Create a test synthetic green leaf-like RGB image
    img_data = np.zeros((256, 256, 3), dtype=np.uint8)
    # Green background with some brown spots
    img_data[:, :] = [34, 139, 34]  # Forest green
    img_data[80:140, 90:150] = [139, 69, 19]  # Saddle brown spot
    
    test_pil = Image.fromarray(img_data)
    import io
    buf = io.BytesIO()
    test_pil.save(buf, format="JPEG")
    raw_bytes = buf.getvalue()

    tensor, pil_img = model_service.preprocess_image(raw_bytes)
    assert tensor.shape == (1, 224, 224, 3), f"Unexpected tensor shape: {tensor.shape}"

    pred_res = model_service.predict(tensor)
    print(f"[OK] Prediction result:")
    print(f"   Crop: {pred_res['crop_name']}")
    print(f"   Predicted class: {pred_res['predicted_class']}")
    print(f"   Raw class: {pred_res['raw_class']}")
    print(f"   Confidence: {pred_res['confidence']:.4f}")
    print(f"   Is Healthy: {pred_res['is_healthy']}")
    print(f"   Top 3 count: {len(pred_res['top_3_predictions'])}")
    for i, p in enumerate(pred_res['top_3_predictions']):
        print(f"     #{i+1}: {p['class_name']} ({p['confidence']*100:.2f}%)")

    print("\n3. Testing Grad-CAM Heatmap & Faithfulness Metric...")
    overlay_b64, faithfulness = model_service.compute_gradcam(tensor, pil_img)
    assert overlay_b64.startswith("data:image/png;base64,"), "Invalid overlay data URL!"
    assert 0.0 <= faithfulness <= 1.0, f"Faithfulness score out of bounds: {faithfulness}"
    print(f"[OK] Grad-CAM overlay generated (base64 length: {len(overlay_b64)} chars)")
    print(f"[OK] Faithfulness reliability score: {faithfulness * 100:.2f}%")

    print("\n4. Testing Disease Knowledge Base Coverage (all 38 classes)...")
    assert len(CLASS_NAMES) == 38, f"Expected 38 classes, got {len(CLASS_NAMES)}"
    for idx, c in enumerate(CLASS_NAMES):
        assert c in DISEASE_INFO, f"Missing pathology info for class {c}"
        info = DISEASE_INFO[c]
        assert "what_it_means" in info and len(info["what_it_means"]) > 10
        assert "recommended_action" in info and len(info["recommended_action"]) > 10
        assert info["severity"] in ["low", "medium", "high"]
        crop, disease, is_h = parse_class_name(c)
        assert len(crop) > 0 and len(disease) > 0
    print(f"[OK] All 38 classes have verified descriptions, actions, and severity levels.")

    print("\n==========================================")
    print("ALL BACKEND VERIFICATION TESTS PASSED!")
    print("==========================================")

if __name__ == "__main__":
    test_model_loading_and_inference()
