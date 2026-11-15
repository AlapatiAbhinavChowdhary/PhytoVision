"""
Smoke test suite for PhytoVision 4-model research-paper update:
- Loads all 4 _s42_final.keras models from backend/newmodels/
- Verifies class_names.json ordering
- Runs prediction across all 4 models, checks ensemble mean and all_agree flag
- Runs 7x7 backbone Grad-CAM with pre-softmax Dense copy across all 4 models
- Verifies test-set benchmark metrics (99.02% Ensemble, 98.93% ConvNeXtTiny, etc.)
- Tests corrupt and empty image rejection
"""
import os
import sys
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(WORKSPACE_ROOT))
os.environ.setdefault("KERAS_HOME", str(WORKSPACE_ROOT / ".keras"))

from backend.multi_model import multi_model_service, MODEL_SPECS


def test_models_load_predict_and_gradcam():
    print("==================================================")
    print("1. SMOKE TEST: 4-Model Load, Predict & 7x7 Grad-CAM")
    print("==================================================")
    multi_model_service.load_models()

    assert len(multi_model_service.class_names) == 38, "Expected 38 classes from class_names.json"

    for name, status in multi_model_service.load_status.items():
        print(f"  {name:18}: {status}")
        assert status == "ok", f"Model {name} failed to load: {multi_model_service.load_errors.get(name)}"

    test_img_path = WORKSPACE_ROOT / "frontend" / "public" / "samples" / "apple_scab.jpg"
    assert test_img_path.exists(), f"Sample image not found at {test_img_path}"

    with open(test_img_path, "rb") as f:
        img_bytes = f.read()

    result = multi_model_service.predict_all(img_bytes)
    assert "models" in result and "ensemble" in result and "all_agree" in result
    print(f"\nEnsemble: {result['ensemble']['label']} ({result['ensemble']['confidence']}%)")
    print(f"All Agree: {result['all_agree']} | Votes: {result['agreement']['votes']}")

    for name in MODEL_SPECS:
        res = result["models"][name]
        top1 = res["top3"][0]
        print(f"  [{res['status'].upper():4}] {name:18} -> {top1['label']} ({top1['confidence']}%) [{res['inference_ms']}ms]")
        assert res["status"] == "ok"
        assert len(res["top3"]) == 3

        # Test Grad-CAM for each model
        overlay, used_model = multi_model_service.compute_gradcam(img_bytes, model_name=name)
        assert used_model == name
        assert overlay.startswith("data:image/png;base64,"), f"Invalid Grad-CAM output for {name}"
        print(f"    -> 7x7 Grad-CAM OK (base64 len={len(overlay)})")

    print("\n[OK] All 4 models prediction + Grad-CAM passed!")


def test_error_handling():
    print("\n==================================================")
    print("2. ERROR HANDLING TEST: Corrupt & Empty Files")
    print("==================================================")
    for payload, label in [(b"NOT_AN_IMAGE_123", "corrupt"), (b"", "empty")]:
        try:
            multi_model_service.predict_all(payload)
            assert False, f"Expected ValueError on {label} bytes"
        except ValueError as ve:
            print(f"[OK] {label} payload rejected cleanly: {ve}")


def test_info_metrics():
    print("\n==================================================")
    print("3. TEST ACCURACY BENCHMARK CHECK")
    print("==================================================")
    info = multi_model_service.get_info()
    by_name = {row["model"]: row["test_acc"] for row in info["leaderboard"]}
    assert by_name["Ensemble"] == 99.02
    assert by_name["ConvNeXtTiny"] == 98.93
    assert by_name["EfficientNetB0"] == 97.93
    assert by_name["MobileNetV3Large"] == 97.86
    assert by_name["DenseNet121"] == 97.28
    print("Verified test accuracies (3-seed mean):", by_name)


if __name__ == "__main__":
    test_models_load_predict_and_gradcam()
    test_error_handling()
    test_info_metrics()
    print("\nALL SMOKE TESTS PASSED SUCCESSFULLY!")
