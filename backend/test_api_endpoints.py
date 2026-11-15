import io
import json
import requests
import numpy as np
from PIL import Image

def test_api():
    print("Testing FastAPI Endpoints...")

    # Create dummy leaf image
    img_data = np.zeros((224, 224, 3), dtype=np.uint8)
    img_data[:, :] = [34, 139, 34]
    img = Image.fromarray(img_data)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    # 1. Test POST /predict
    files = {"file": ("leaf.jpg", buf, "image/jpeg")}
    r = requests.post("http://127.0.0.1:8000/predict", files=files)
    print("POST /predict status:", r.status_code)
    pred = r.json()
    print("Prediction:", pred)
    assert r.status_code == 200
    assert "predicted_class" in pred
    assert "confidence" in pred
    assert {"accuracy", "precision", "recall", "f1_score"}.issubset(pred["validation_metrics"])
    assert "top_3_predictions" in pred

    # 2. Test GET /metrics
    r = requests.get("http://127.0.0.1:8000/metrics")
    print("GET /metrics status:", r.status_code)
    metrics = r.json()
    assert r.status_code == 200
    assert {"accuracy", "precision", "recall", "f1_score"}.issubset(metrics)

    # 3. Test POST /explain
    buf.seek(0)
    files = {"file": ("leaf.jpg", buf, "image/jpeg")}
    r = requests.post("http://127.0.0.1:8000/explain", files=files)
    print("POST /explain status:", r.status_code)
    explain = r.json()
    assert r.status_code == 200
    assert "heatmap_overlay" in explain
    assert "faithfulness_score" in explain
    print("Heatmap prefix:", explain["heatmap_overlay"][:40])
    print("Faithfulness:", explain["faithfulness_score"])

    # 4. Test GET /disease-info/{class_name}
    r = requests.get(f"http://127.0.0.1:8000/disease-info/{pred['raw_class']}")
    print("GET /disease-info status:", r.status_code)
    info = r.json()
    assert r.status_code == 200
    assert "ai_insights" in info
    print("Disease Info:", info["raw_class"])
    print("AI Insights Source:", info["ai_insights"].get("source"))

    # 4. Test GET /gemini-status
    r = requests.get("http://127.0.0.1:8000/gemini-status")
    print("GET /gemini-status:", r.status_code, r.json())
    assert r.status_code == 200

    # 5. Test POST /ask-gemini
    r = requests.post("http://127.0.0.1:8000/ask-gemini", json={
        "question": "What is the best immediate remedy?",
        "crop_name": pred["crop_name"],
        "disease_name": pred["predicted_class"],
        "raw_class": pred["raw_class"],
        "is_healthy": pred["is_healthy"]
    })
    print("POST /ask-gemini status:", r.status_code)
    assert r.status_code == 200
    assert "answer" in r.json()

    # 6. Test GET /model-metrics
    r = requests.get("http://127.0.0.1:8000/model-metrics")
    print("GET /model-metrics status:", r.status_code)
    assert r.status_code == 200
    metrics = r.json()
    assert "overall_accuracy" in metrics
    assert "per_class_metrics" in metrics
    assert "confusion_matrix" in metrics
    assert "class_names" in metrics
    print(f"Loaded metrics for {len(metrics['class_names'])} classes. Overall accuracy: {metrics['overall_accuracy']}")

    # 7. Test error handling on bad file
    bad_file = {"file": ("test.txt", io.BytesIO(b"not an image"), "text/plain")}
    r = requests.post("http://127.0.0.1:8000/predict", files=bad_file)
    print("Bad file status (expected 400):", r.status_code)
    assert r.status_code == 400

    # 8. Test POST /predict/all
    buf.seek(0)
    files = {"file": ("leaf.jpg", buf, "image/jpeg")}
    r = requests.post("http://127.0.0.1:8000/predict/all", files=files)
    print("POST /predict/all status:", r.status_code)
    assert r.status_code == 200
    all_pred = r.json()
    assert "models" in all_pred
    assert "ensemble" in all_pred
    assert "agreement" in all_pred
    assert "best_model" in all_pred
    assert "EfficientNetB0" in all_pred["models"]
    assert "DenseNet121" in all_pred["models"]
    assert "MobileNetV3Large" in all_pred["models"]
    assert "ConvNeXtTiny" in all_pred["models"]
    print("Multi-model ensemble prediction:", all_pred["ensemble"]["label"], f"{all_pred['ensemble']['confidence']}%")

    # 9. Test GET /models/info
    r = requests.get("http://127.0.0.1:8000/models/info")
    print("GET /models/info status:", r.status_code)
    assert r.status_code == 200
    models_info = r.json()
    assert "leaderboard" in models_info
    assert "loaded_models" in models_info
    assert "best_model" in models_info
    print(f"Loaded {len(models_info['leaderboard'])} leaderboard models. Best: {models_info['best_model']}")

    # 10. Test error handling on bad file for /predict/all
    r = requests.post("http://127.0.0.1:8000/predict/all", files=bad_file)
    print("Bad file on /predict/all status:", r.status_code)
    assert r.status_code == 400

    print("\nALL HTTP API TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    test_api()
