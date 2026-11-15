# PhytoVision AI — Plant Health Diagnosis 🌿

PhytoVision AI is a full-stack plant pathology application. Upload a leaf image or choose a realistic preloaded sample to classify it across 38 PlantVillage crop and disease classes, inspect the visual focus behind the result, and read practical care guidance.

---

## Architecture Overview

- **Backend (`/backend`)**:
  - **Framework**: FastAPI (Python 3.12)
  - **Inference Engine**: TensorFlow / Keras 3 with fine-tuned EfficientNetB0 (`backend/models/best_model_final.keras`)
   - **Visual evidence**:
      - Produces a visual focus overlay from the backbone's last convolutional layer (`top_conv`).
      - Compares confidence before and after masking highlighted regions to provide an evidence score.
  - **Pathology Knowledge Base**: Layman explanations, practical recommended actions, and severity ratings for all 38 classes.
  - **Google Gemini AI Agronomist Layer (`gemini_service.py`)**:
    - Generates comprehensive, deep pathology breakdowns, environmental spread drivers, field scouting symptoms, dual-column treatment protocols (Organic vs. Chemical), and expert farmer tips.
    - Interactive Q&A consultation endpoint allowing farmers to ask real-time questions about their crops.
    - Graceful zero-downtime fallback to local agricultural knowledge base when offline or without API key.
  - **Endpoints**:
   - `POST /predict`: Upload image, get predicted class, host crop, confidence, model validation metrics, and top-3 candidates.
   - `GET /metrics`: Returns aggregate weighted accuracy, precision, recall, and F1 score from the final model's validation report.
    - `POST /explain`: Returns Grad-CAM overlay (base64 PNG) and faithfulness reliability score.
    - `GET /disease-info/{class_name}`: Returns pathology details and Gemini AI treatment insights.
    - `POST /ask-gemini`: Interactive consultation with Gemini for custom plant questions.
    - `GET /gemini-status`: Checks if Gemini API key is configured.
    - `GET /health`: Health status & model warmup check.
    - `GET /classes`: All 38 supported classes.

- **Frontend (`/frontend`)**:
  - **Framework**: React + Vite + Tailwind CSS + Lucide Icons
  - **UI/UX**:
    - **Gemini AI Agronomist Protocol**: Live treatment plan, interactive symptom checklist, organic vs. chemical remedies, long-term cultural prevention, and live Q&A consultation chat.

    - Drag-and-drop file uploader with live preview and validation.
   - 6 authentic PlantVillage sample cards (`Tomato Late Blight`, `Tomato Healthy`, `Apple Scab`, `Corn Rust`, `Bell Pepper Bacterial Spot`, `Grape Black Rot`).
   - Side-by-side comparison between the uploaded leaf and its visual focus overlay.
    - Color-coded circular confidence gauge (>85% green, 60–85% yellow, <60% red).
    - Low-confidence warning banner (<65%) suggesting alternate predictions.
   - Evidence score badge with an interactive measurement tooltip.
    - Plain-language disease impact and practical treatment advice.
    - Positive reassurance card for healthy foliage.
   - Top 3 candidate probability breakdown bars.
   - Translucent liquid-glass interface with a real foliage background image.

---

## Project Structure

```
deeplearning_proj/
├── backend/
│   ├── models/
│   │   └── best_model_final.keras    # Trained Keras model
│   ├── venv/                         # Python virtual environment
│   ├── main.py                       # FastAPI application & endpoints
│   ├── model_service.py              # Model loading, inference, Grad-CAM, faithfulness
│   ├── constants.py                  # 38 classes & pathology knowledge base
│   ├── requirements.txt              # Backend dependencies
│   ├── test_backend.py               # Model & Grad-CAM unit tests
│   └── test_api_endpoints.py         # HTTP endpoint integration tests
├── frontend/
│   ├── public/
│   │   └── samples/                  # Preloaded sample leaf images
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Header & system status indicator
│   │   │   ├── ImageUploader.jsx     # Drag & drop upload component
│   │   │   ├── SampleGallery.jsx     # Quick-try sample cards
│   │   │   ├── ResultCard.jsx        # Diagnosis, Grad-CAM, and advice
│   │   │   └── LoadingState.jsx      # Shimmer & progress indicators
│   │   ├── App.jsx                   # Main layout and diagnostic workflow
│   │   ├── api.js                    # API client
│   │   └── index.css                 # Tailwind CSS & custom styling
│   ├── package.json
│   └── vite.config.js
├── .gitignore                        # Ignores archive.zip, venvs, and cache
└── README.md
```

---

## Setup & Running Locally

### Prerequisites
- **Python 3.12** installed
- **Node.js 18+** and **npm** installed

---

### 1. Start the Backend Server (FastAPI)

1. Open a terminal in the project root:
   ```bash
   cd d:/deeplearning_proj
   ```

2. Create a virtual environment (if not already created):
   ```bash
   py -3.12 -m venv backend/venv
   ```

3. Activate the virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     backend\venv\Scripts\Activate.ps1
     ```
   - **Windows (Command Prompt)**:
     ```cmd
     backend\venv\Scripts\activate.bat
     ```
   - **Linux / macOS**:
     ```bash
     source backend/venv/bin/activate
     ```

4. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

5. Configure your Google Gemini API Key:
   Create or edit [backend/.env](file:///d:/deeplearning_proj/backend/.env) (or copy from `.env.example`):
   ```ini
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *(Get your free key from [Google AI Studio](https://aistudio.google.com/app/apikey). If omitted, the system seamlessly falls back to the built-in 38-class agronomic knowledge base without crashing).*

6. Start the FastAPI server using Uvicorn:
   ```bash
   uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
   ```


   The backend will be live at `http://127.0.0.1:8000`. You can test health at:
   `http://127.0.0.1:8000/health` or view interactive API docs at `http://127.0.0.1:8000/docs`.

---

### 2. Start the Frontend Application (React + Vite)

1. Open a second terminal window and navigate to `/frontend`:
   ```bash
   cd d:/deeplearning_proj/frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5173/
   ```

---

## Multi-Model Architecture Comparison & Ensemble 🔬

PhytoVision supports simultaneous comparative inference across four deep vision architectures fine-tuned on the 38 PlantVillage classes:

1. **ConvNeXtTiny** (`ConvNeXtTiny_final.keras`): Top validation accuracy (99.19%) and F1 (0.9919), modern vision backbone.
2. **EfficientNetB0** (`best_model_final.keras`): Production baseline (99.12% validation accuracy, 4.1M params).
3. **MobileNetV3Large** (`MobileNetV3Large_final.keras`): High-speed, lightweight edge model (1.65ms latency, 3.03M params, 98.83% accuracy).
4. **DenseNet121** (`DenseNet121_final.keras`): Feature reuse via dense skip connections (98.17% accuracy, 7.08M params).

### Key Features
- **Strict Preprocessing Isolation**: Each model uses its dedicated preprocessing function (`tf.keras.applications.*.preprocess_input`) on a distinct array copy.
- **Ensemble Consensus**: Computes the mean probability vector across all available models to derive an ensemble prediction.
- **Agreement Voting**: Determines whether models reach unanimous consensus (`all_agree`) with a vote distribution breakdown.
- **Resilient Fallback**: Independent `try/except` model loading ensures a missing model never impedes other models or the core EfficientNetB0 pipeline.
- **Configurable Toggle**: Controlled via `ENABLE_MULTI_MODEL` environment variable (default: `true`). When set to `false`, the backend runs purely in single-model mode identical to the original application.

### Multi-Model Endpoints
- `POST /predict/all`: Uploads leaf photo and returns predictions across all 4 models, the ensemble decision, agreement metrics, and inference latency.
- `GET /models/info`: Returns runtime validation metrics dynamically read from `leaderboard.csv` along with model availability statuses.

---

## Running Automated Tests

To verify backend inference, Grad-CAM on `top_conv`, and HTTP endpoints:

1. Run model and Grad-CAM verification:
   ```bash
   backend\venv\Scripts\python backend/test_backend.py
   ```

2. Run HTTP API integration tests (with backend running):
   ```bash
   backend\venv\Scripts\python backend/test_api_endpoints.py
   ```

## Deploying to Render

The repository includes `render.yaml` for a two-service Render Blueprint:

- `phytovision-api`: Python 3.12 FastAPI service running on Uvicorn from the repository root.
- `phytovision-frontend`: Static Vite build configured automatically with the backend service host.

In Render, choose **New > Blueprint**, connect this repository, and apply the Blueprint. The backend model file under `backend/models/` is included in the repository and is loaded during service startup. The frontend uses the local API URL when developing locally and the Render backend URL after deployment.

For a manually created backend service, leave **Root Directory** empty and add this environment variable: `PYTHON_VERSION=3.12.8`. Render uses this variable to select Python; `render.yaml` is only applied when deploying as a Blueprint. Use `pip install -r backend/requirements.txt` as the build command and `uvicorn backend.main:app --host 0.0.0.0 --port $PORT` as the start command.

## Deploying the Frontend to Vercel

The recommended production setup hosts the FastAPI model service on Render and the React frontend on Vercel.

In Vercel, import this repository and use:

- **Framework preset**: Vite
- **Root directory**: `frontend`
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Install command**: `npm install`
- **Environment variable**: `VITE_API_URL=https://phytovision-1.onrender.com`

The frontend includes authentic PlantVillage crop images in `frontend/public/samples/` and a botanical background image at `frontend/public/leaf-background.jpg`. The interface uses translucent liquid-glass panels so the foliage remains visible behind the application.

---

## Supported Plant Classes (38 Total)

- **Apple**: Apple Scab, Black Rot, Cedar Apple Rust, Healthy
- **Blueberry**: Healthy
- **Cherry**: Powdery Mildew, Healthy
- **Corn (Maize)**: Cercospora / Gray Leaf Spot, Common Rust, Northern Leaf Blight, Healthy
- **Grape**: Black Rot, Esca (Black Measles), Leaf Blight (Isariopsis), Healthy
- **Orange / Citrus**: Huanglongbing (Citrus Greening)
- **Peach**: Bacterial Spot, Healthy
- **Bell Pepper**: Bacterial Spot, Healthy
- **Potato**: Early Blight, Late Blight, Healthy
- **Raspberry**: Healthy
- **Soybean**: Healthy
- **Squash**: Powdery Mildew
- **Strawberry**: Leaf Scorch, Healthy
- **Tomato**: Bacterial Spot, Early Blight, Late Blight, Leaf Mold, Septoria Leaf Spot, Spider Mites, Target Spot, Tomato Yellow Leaf Curl Virus, Tomato Mosaic Virus, Healthy
