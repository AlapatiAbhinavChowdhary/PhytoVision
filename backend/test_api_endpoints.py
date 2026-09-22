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
    print("Disease Info:", info)

    # 5. Test error handling on bad file
    bad_file = {"file": ("test.txt", io.BytesIO(b"not an image"), "text/plain")}
    r = requests.post("http://127.0.0.1:8000/predict", files=bad_file)
    print("Bad file status (expected 400):", r.status_code)
    assert r.status_code == 400

    print("\nALL HTTP API TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_api()
