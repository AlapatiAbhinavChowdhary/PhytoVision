# PhytoVision: Explainable AI for Plant Leaf Disease Diagnosis
## Comprehensive Project Presentation Deck & Technical Defense Guide

---

## Slide 1: Title & Executive Summary

### Slide Title:
**PhytoVision: Multi-Model Deep Learning and Explainable AI (XAI) for Crop Disease Diagnosis**

### Subtitle:
*Comparative Analysis of 4 Deep Learning Architectures, Softmax Ensemble, and 7x7 Grad-CAM Heatmaps on 38 PlantVillage Classes*

### Executive Overview (In Simple Words):
- **What is PhytoVision?** A full-stack artificial intelligence application that diagnoses crop leaf diseases from photos in real time.
- **Scale:** Identifies **38 distinct classes** (26 diseases + 12 healthy states) across **14 major agricultural crops**.
- **Core Innovation:** Rather than trusting a single "black-box" model, PhytoVision compares **four diverse vision backbones** simultaneously, combines them into an **ensemble**, checks for **model agreement**, highlights diseased regions with **coarse 7x7 Grad-CAM visual heatmaps**, and provides **actionable agronomist treatment advice** via Gemini AI.
- **Top Performance:** Reaches **99.02% test accuracy** (Ensemble) and **98.93% test accuracy** (ConvNeXt-Tiny).

> **Speaker Notes:**  
> "Good morning/afternoon. Today, I am presenting PhytoVision. In agriculture, early and accurate disease detection can mean the difference between a harvested crop and total crop failure. However, deep learning models often act as 'black boxes' that farmers cannot verify. In PhytoVision, we trained and benchmarked 4 diverse deep learning models, combined them with an ensemble mechanism, added transparent Grad-CAM explainability, and built a production-ready web application for real-time diagnosis."

---

## Slide 2: Problem Statement & Motivation

### Key Points:
1. **The Global Agricultural Threat:**
   - Plant diseases cause an estimated **20% to 40% loss in global crop yield** each year (FAO estimates).
   - Smallholder farmers often lack immediate access to expert agronomists or plant pathologists.
2. **The Limitation of Traditional Inspection:**
   - Manual visual scouting is slow, subjective, and prone to human misdiagnosis (e.g., confusing Early Blight with Late Blight).
3. **The AI Trust Deficit:**
   - Standard neural networks provide a single label without evidence. If an AI predicts "Tomato Late Blight" with 95% confidence, a farmer has no way of knowing whether the model looked at the leaf lesion or a watermark, shadow, or background speck.
4. **The PhytoVision Mission:**
   - Provide an accessible, instant, multi-model consensus system that shows **visual proof (Grad-CAM heatmaps)** and **confidence metrics** before recommending treatment.

> **Speaker Notes:**  
> "Why did we build this? Farmers lose up to 40% of their yields to fungal, bacterial, and viral infections. Existing AI apps usually give one answer without explaining why. PhytoVision solves this by combining multi-model voting with explainable visual attention maps, so agriculturalists can see exactly what the model noticed."

---

## Slide 3: The Dataset (PlantVillage)

### Key Points:
- **Dataset Source:** The internationally recognized **PlantVillage Dataset** (augmented collection by *vipoooool* via Kaggle).
- **Scale & Volume:**
  - **87,000+ total leaf images**.
  - **38 balanced classes**.
  - **14 agricultural crop hosts**: Apple, Blueberry, Cherry, Corn (Maize), Grape, Orange, Peach, Bell Pepper, Potato, Raspberry, Soybean, Squash, Strawberry, and Tomato.
- **Class Breakdown:**
  - **26 Diseased Categories:** Fungal spots, bacterial blights, rusts, mildews, and viral curl diseases.
  - **12 Healthy Categories:** Healthy foliage samples ensuring the model learns to identify normal crop physiology.
- **Data Splitting & Reproducibility:**
  - Training Set: **70,295 images** (~80%).
  - Validation/Test Set: **17,572 images** (~20%).
  - Seed pinning (`seed=42`) across data loaders and model initializations for strict scientific reproducibility.
- **Critical Real-World Observation (Honest Science):**
  - All images were collected under **controlled laboratory conditions** (uniform backgrounds, artificial lighting). We explicitly display a disclaimer in our app noting this limitation.

> **Speaker Notes:**  
> "Our dataset consists of over 87,000 images covering 38 classes across 14 crops. We split this into an 80-20 train and validation split, maintaining uniform seed 42 across all experiments. A crucial scientific point we emphasize in our research paper and web UI is that PlantVillage images are taken under laboratory lighting against plain backgrounds, which requires careful decision support disclaimers."

---

## Slide 4: Data Pipeline & Strict Preprocessing Rules

### The Golden Rule of Preprocessing:
> **"Never treat all deep learning architectures with the same generic preprocessing."**

### Preprocessing Pipeline:
1. **Input Standard:** All raw image uploads are decoded as **RGB** and resized to standard resolution: **$224 \times 224 \times 3$**.
2. **Float32 In-Memory Range:** Images are converted to `float32` arrays in the raw $[0, 255]$ range. **We do NOT divide by 255 globally.**
3. **Architecture-Specific Native Transforms:**
   - **DenseNet-121:** Requires zero-mean centering and scaling:
     $$\text{preprocess\_input}(x) \rightarrow \text{Zero-mean with ImageNet channel standard deviation}$$
     *(Uses `tf.keras.applications.densenet.preprocess_input`)*
   - **MobileNetV3-Large:** Normalizes pixel values strictly between $[-1, 1]$:
     $$x_{\text{norm}} = \frac{x}{127.5} - 1.0$$
     *(Uses `tf.keras.applications.mobilenet_v3.preprocess_input`)*
   - **ConvNeXt-Tiny:** Applies PyTorch-style ImageNet mean subtraction and standard deviation scaling:
     $$\mu = [123.675, 116.28, 103.53], \quad \sigma = [58.395, 57.12, 57.375]$$
     *(Uses `tf.keras.applications.convnext.preprocess_input`)*
   - **EfficientNet-B0:** Uses internal scaling layers that expect raw $[0, 255]$ inputs:
     *(Uses `tf.keras.applications.efficientnet.preprocess_input`)*
4. **Memory Isolation:** Every model receives its own **isolated, independent preprocessed array copy** to prevent cross-model memory contamination.

> **Speaker Notes:**  
> "A major engineering pitfall in multi-model vision systems is using a single preprocessing function for all models. For example, dividing by 255 before passing into DenseNet causes silent, catastrophic drops in accuracy. We built a strict pipeline where raw 224x224 RGB tensors in the 0-255 range are passed into each model's native preprocessing function on independent array copies."

---

## Slide 5: The 4 Deep Learning Architectures

### Why 4 Different Models?
Instead of testing minor variations of the same architecture, we selected **four fundamentally different vision paradigms**:

```
+-------------------------------------------------------------------------------+
|                       PHYTOVISION MODEL TAXONOMY                              |
+---------------------+-------------------+-------------------+-----------------+
|   ConvNeXt-Tiny     |  EfficientNet-B0  | MobileNetV3-Large |  DenseNet-121   |
| (Modern ConvNet)    | (Compound Scaled) | (Edge & Mobile)   | (Feature Reuse) |
|   27.85M params     |    4.10M params   |    3.03M params   |   7.08M params  |
+---------------------+-------------------+-------------------+-----------------+
```

1. **ConvNeXt-Tiny (Modernized Pure Convolutional Network):**
   - Incorporates modern Vision Transformer (ViT) design principles (7x7 depthwise convolutions, inverted bottlenecks, GeLU activations, LayerNorm) into a pure CNN.
   - **Role:** Our highest-accuracy backbone.
2. **EfficientNet-B0 (Compound Scaling Pioneer):**
   - Balances network depth, width, and resolution using neural architecture search (NAS) and compound scaling coefficients.
   - **Role:** Balanced benchmark and baseline model.
3. **MobileNetV3-Large (Hardware-Aware Edge Architecture):**
   - Utilizes depthwise separable convolutions, hard-swish non-linearities, and Squeeze-and-Excitation (SE) attention blocks.
   - **Role:** Ultra-fast, lightweight inference designed for field smartphones and low-power devices.
4. **DenseNet-121 (Dense Feature Connectivity):**
   - Connects each layer to every subsequent layer in a feed-forward fashion, reusing multi-scale features and mitigating vanishing gradients.
   - **Role:** Robust feature extraction across intricate leaf lesion textures.

> **Speaker Notes:**  
> "We intentionally evaluated four distinct structural philosophies: ConvNeXt brings modern transformer-era design to convolutions; EfficientNet optimizes compound depth-width scaling; MobileNetV3 is built for low-latency mobile edge inference; and DenseNet maximizes feature reuse through direct layer-to-layer connections."

---

## Slide 6: Model Architecture & Head Design

### Transfer Learning Architecture:
Every single model follows an identical, uniform classification head structure:

```
[ Input: 224 x 224 x 3 RGB Tensor ]
                │
                ▼
[ Backbone Feature Extractor (model.layers[1]) ]
  (Pre-trained on ImageNet-1k, include_top=False)
                │
                ▼ 7x7 Spatial Feature Maps (Channel Dim: C)
[ GlobalAveragePooling2D() ]
  (Reduces spatial dimensions (7, 7, C) -> (C,))
                │
                ▼
[ Dropout(0.3) ]
  (Regularization to prevent overfitting on background artifacts)
                │
                ▼
[ Dense(38, activation='softmax') ]
  (Output probability distribution across 38 PlantVillage classes)
```

### Architectural Benefits:
- **Consistent Feature Maps:** All four backbones output a spatial feature map of **$7 \times 7$** prior to global pooling, making them directly comparable.
- **Lightweight Classification Head:** GAP replaces heavy fully-connected layers, drastically reducing parameters and eliminating spatial positioning bias.
- **Dropout Regularization:** 30% dropout prevents co-adaptation of features on laboratory backgrounds.

> **Speaker Notes:**  
> "Each model uses ImageNet pre-trained weights with the original head removed. We pass the backbone's 7x7 feature output through a Global Average Pooling layer, followed by a 30% Dropout layer for regularization, and a final 38-unit Softmax Dense layer. Because each backbone ends in a 7x7 spatial resolution, our explainability pipeline behaves identically across all four architectures."

---

## Slide 7: Two-Phase Progressive Training Strategy

### Why Two Phases?
Training pre-trained backbones from scratch or unfreezing all layers immediately destroys the valuable low-level ImageNet feature representations (edges, textures, shapes). We utilized a **two-phase transfer learning schedule**:

```
+─────────────────────────────────────────────────────────────────────────────+
| PHASE 1: Feature Extraction (Frozen Backbone)                               |
| • Backbone: Trainable = FALSE (All ImageNet weights locked)                 |
| • Head: Trainable = TRUE (GlobalAveragePooling2D + Dense(38))               |
| • Learning Rate: 1e-3 (0.001) with Adam Optimizer                           |
| • Epochs: 3 epochs                                                          |
| • Goal: Let the classification head adapt to 38 plant classes               |
+─────────────────────────────────────────────────────────────────────────────+
                                       │
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
| PHASE 2: Fine-Tuning (Selective Unfreezing)                                 |
| • Backbone: Unfreeze the LAST 30 LAYERS only (layers[:-30] remain frozen)   |
| • Head: Trainable = TRUE                                                    |
| • Learning Rate: 1e-5 (0.00001) — 100x smaller to protect trained features   |
| • Epochs: 4 epochs                                                          |
| • Goal: Adapt high-level disease pattern filters to leaf symptoms           |
+─────────────────────────────────────────────────────────────────────────────+
```

### Training Callbacks:
- **`EarlyStopping`:** Monitored `val_accuracy` with patience of 2 epochs and automatic restoration of the best weights (`restore_best_weights=True`).
- **`ReduceLROnPlateau`:** Monitored `val_loss` with factor 0.5 and patience of 1 epoch to smoothly converge near the local minimum.

> **Speaker Notes:**  
> "In Phase 1, we freeze the entire backbone and train only the head with an initial learning rate of 0.001 for 3 epochs. In Phase 2, we unfreeze only the top 30 layers of the backbone and fine-tune with a very gentle learning rate of 0.00001 for 4 epochs. This progressive unfreezing prevents catastrophic forgetting and allows the network to adapt fine lesion details."

---

## Slide 8: The Softmax Ensemble Mechanism

### How PhytoVision Combines Predictions:
In addition to individual model predictions, PhytoVision runs a **Softmax Probability Vector Ensemble**:

$$P_{\text{ensemble}}(c) = \frac{1}{K} \sum_{k=1}^{K} P_{k}(c), \quad \text{for } c \in [1, 38]$$

Where:
- $K = 4$ (the number of models loaded: ConvNeXt, EfficientNet, MobileNet, DenseNet).
- $P_k(c)$ is the probability assigned to class $c$ by model $k$.

```
[ EfficientNet-B0 ] ──> [ 38-class Prob Vector ] ──┐
[ DenseNet-121    ] ──> [ 38-class Prob Vector ] ──┼──> [ Arithmetic Mean ] ──> Top-1 Class &
[ MobileNetV3-Lg  ] ──> [ 38-class Prob Vector ] ──┤    (Softmax Vector)       Ensemble Conf
[ ConvNeXt-Tiny   ] ──> [ 38-class Prob Vector ] ──┘
```

### The Model Agreement Engine:
- **All Agree (`true`):** All 4 models independently vote the exact same class as Top-1 $\rightarrow$ Shows **"All models agree (High Trust)"** green badge.
- **Disagreement (`false`):** Top-1 votes differ across models $\rightarrow$ Shows **"Models disagree (Mixed Consensus)"** amber badge and displays the exact vote tally (e.g., `Tomato___Late_blight: 3`, `Tomato___Early_blight: 1`).

> **Speaker Notes:**  
> "Our ensemble calculates the unweighted arithmetic mean of the softmax probability vectors across all active models. This reduces the variance of individual models. Furthermore, our agreement engine calculates whether all 4 models unanimously agreed on the top prediction. If there is a split vote, the system flags it for the user."

---

## Slide 9: Evaluation & Experimental Results

### Validation Benchmark (Full 17,572 Validation Images):
The comprehensive evaluation table recorded in `leaderboard.csv`:

| Model Architecture | Parameters (M) | Training Time | Inf. Latency (ms/img) | Validation Acc | Precision | Recall | F1-Score |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **ConvNeXt-Tiny** *(Best Single)* | **27.85 M** | 50.2 min | 4.568 ms | **99.19%** | **0.9920** | **0.9919** | **0.9919** |
| **EfficientNet-B0** | 4.10 M | Baseline | 4.214 ms | **99.12%** | **0.9913** | **0.9912** | **0.9912** |
| **MobileNetV3-Large** *(Fastest)* | **3.03 M** | **21.8 min** | **1.650 ms** | **98.83%** | **0.9883** | **0.9883** | **0.9883** |
| **DenseNet-121** | 7.08 M | 50.1 min | 4.663 ms | **98.17%** | **0.9817** | **0.9817** | **0.9816** |

---

### Research Paper Test Accuracy Benchmark (Mean of 3 Seeds):
Evaluating stability across multiple random seeds on the held-out test set:

| Model / Ensemble Configuration | Test Set Accuracy (3-Seed Mean) | Parameter Footprint | Efficiency Category |
| :--- | :---: | :---: | :--- |
| **Softmax Ensemble (4 Models)** | **99.02%** | 42.06 M (Combined) | **Highest Overall Performance** |
| **ConvNeXt-Tiny** | **98.93%** | 27.85 M | **Top Individual Backbone** |
| **EfficientNet-B0** | **97.93%** | 4.10 M | High Efficiency / Small Size |
| **MobileNetV3-Large** | **97.86%** | 3.03 M | **Ultra-Low Latency Edge Leader** |
| **DenseNet-121** | **97.28%** | 7.08 M | Dense Feature Baseline |

> **Speaker Notes:**  
> "Notice the trade-offs on this slide. ConvNeXt-Tiny achieved the highest individual validation accuracy at 99.19% and F1 score of 0.9919. MobileNetV3-Large achieved 98.83% accuracy while running in just 1.65 milliseconds per image—nearly three times faster than any other model. Across 3 seeds on the test set, the 4-model Ensemble reached an industry-leading 99.02% accuracy."

---

## Slide 10: Speed vs Accuracy Trade-off Analysis

### Practical Insights for Real-World Deployment:

```
    Accuracy (Val %)
      100% ┤                                 ● ConvNeXtTiny (99.19%, 4.57ms)
           │                        ● EfficientNetB0 (99.12%, 4.21ms)
       99% ┤
           │      ● MobileNetV3Large (98.83%, 1.65ms)  <-- BEST FOR MOBILE/EDGE
           │
       98% ┤                                 ● DenseNet121 (98.17%, 4.66ms)
           │
       97% ┼──────────────┬──────────────┬──────────────┬──────────────►
          0ms            1ms            2ms            3ms            4ms+ Latency
```

1. **The Edge Deployment Champion:**
   - **MobileNetV3-Large** is the clear winner for resource-constrained edge deployments (e.g., Raspberry Pi, offline mobile apps, agricultural drones). It trains in only **21.8 minutes** and infers in **1.65 ms** with negligible loss in accuracy (98.83% vs 99.19%).
2. **The Cloud / Enterprise Champion:**
   - **ConvNeXt-Tiny** and the **Ensemble** are ideal for cloud backend deployment where server GPUs process images with maximal precision.

> **Speaker Notes:**  
> "If you are deploying on an offline Android device or a field drone with limited battery and compute, MobileNetV3-Large is the superior choice. If you are hosting a cloud-based agricultural advisory service, ConvNeXt-Tiny or the full Ensemble provides maximum diagnostic certainty."

---

## Slide 11: Explainable AI (XAI) with Coarse 7x7 Grad-CAM

### What is Grad-CAM?
**Grad-CAM (Gradient-weighted Class Activation Mapping)** calculates which spatial regions of the input leaf image contributed most heavily to the final disease prediction.

### Mathematical Formulation:
1. Compute the gradient of the predicted class score $y^c$ with respect to the feature map activations $A^k$ of the backbone:
   $$\alpha_k^c = \frac{1}{Z} \sum_{i} \sum_{j} \frac{\partial y^c}{\partial A_{i, j}^k}$$
2. Take the weighted combination of forward activation maps and apply ReLU:
   $$L_{\text{Grad-CAM}}^c = \text{ReLU}\left( \sum_{k} \alpha_k^c A^k \right)$$

### PhytoVision's Exact Implementation:
```
[ Input Leaf ] ──> [ Backbone (model.layers[1]) ] ──> 7x7 Feature Maps (A^k)
                                                               │
                                         ┌─────────────────────┘
                                         ▼
                 [ Head: Dense layer WITHOUT Softmax ]  <-- Pre-softmax Logits Head
                                         │
                                         ▼
                      Compute Gradients (dy^c / dA^k)
                                         │
                                         ▼
             Pool Gradients + Linear Combination + ReLU
                                         │
                                         ▼
             Normalize [0, 1] + Upsample to 224x224 + Jet Colormap
                                         │
                                         ▼
           Alpha Blend (45% Heatmap + 55% Original Leaf Image)
```

### Critical Innovations in Our Implementation:
1. **Architecture-Agnostic Feature Hooking:** We target `model.layers[1]` (the backbone) directly, rather than searching for hardcoded names like `top_conv` which fail across different architectures.
2. **Pre-Softmax Gradient Extraction:** Computing gradients through the final Softmax activation causes **gradient vanishing** when the model is highly confident (e.g., 99%). We dynamically construct an unactivated linear logits head to calculate pure gradients.

> **Speaker Notes:**  
> "Standard Grad-CAM tutorials often take gradients through the Softmax function. When a model is 99% confident, the softmax gradient saturates and goes to zero. In PhytoVision, we extract the gradient of the pre-softmax logits from a cloned Dense head without softmax. We also hook model.layers[1] directly, which works cleanly across all four model architectures."

---

## Slide 12: Scientific Transparency & Research Disclaimers

### Why Transparency is Essential in AI:
Overhyped medical and agricultural AI systems often claim "perfect explainability." PhytoVision takes a rigorous, scientifically grounded approach by explicitly displaying two prominent disclaimers in the UI:

### 1. Coarse 7x7 Heatmap Disclaimer:
> *"The heatmap is approximate (coarse 7x7) and does not prove that the model looks at the lesion."*
- **Technical Reason:** The backbone downsamples a $224 \times 224$ image by a factor of 32 down to a $7 \times 7$ grid. When bilinearly upsampled back to $224 \times 224$, the heatmap highlights general leaf lobes, not individual microscopic fungal spores or lesions.

### 2. Laboratory vs. Field Scope Notice:
> *"Trained on laboratory images. Not tested on field photos. Decision support only."*
- **Technical Reason:** The PlantVillage dataset features leaves excised and placed on plain gray, white, or black laboratory paper under controlled lighting. Real field photos have complex backgrounds (soil, weeds, shadows, dew). Acknowledging this boundary protects agronomists from over-relying on laboratory-trained models in raw field settings.

> **Speaker Notes:**  
> "A core strength of our research paper is honesty. We removed arbitrary 'explanation reliability' percentages. Instead, we clarify that a 7x7 feature map upsampled to 224x224 provides coarse regional localization, not lesion-level proof. We also explicitly remind users that laboratory-trained models are for decision support and require field validation."

---

## Slide 13: Full-Stack Web Application Architecture

### System Architecture Overview:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             FRONTEND (React + Vite)                         │
│  • Modern Single-Page App (Tailwind CSS, Lucide icons, responsive layout)   │
│  • Diagnostic View: Drag-and-drop upload, sample gallery, confidence alerts │
│  • Multi-Model Comparison Panel: All 4 models + Ensemble + Agreement Badge  │
│  • Explainability: Side-by-side original leaf vs Grad-CAM overlay           │
│  • Gemini Insights: Plain-language cause, cure & prevention advisory        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / REST (Multipart & JSON)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                             BACKEND (FastAPI API)                           │
│  • Python 3.12, Uvicorn asynchronous server                                 │
│  • Lifespan Startup: Pre-loads all 4 models once, runs warm-up inferences   │
│  • Endpoints:                                                               │
│    - POST /predict      : Backward-compatible single-model diagnosis        │
│    - POST /predict/all  : Multi-model comparative prediction & ensemble     │
│    - POST /explain      : 7x7 pre-softmax Grad-CAM heatmap generation       │
│    - GET  /models/info  : Dynamic model leaderboard & system status         │
│    - POST /ask-gemini   : Real-time agronomist generative advisory          │
│    - GET  /health       : Backend & model availability monitor              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DEEP LEARNING ENGINE                             │
│  • TensorFlow 2.21.0 / Keras 3                                              │
│  • Models: EfficientNetB0, DenseNet121, MobileNetV3Large, ConvNeXtTiny      │
│  • Git LFS Storage: Seamless tracking of .keras weights on GitHub           │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **Speaker Notes:**  
> "PhytoVision is not just a Jupyter Notebook—it is a complete, production-grade application. The backend is built with FastAPI for asynchronous performance, with model warm-up at startup. The frontend is built in React and Vite with clean responsive design, featuring quick sample cards, multi-model comparison tabs, and Gemini AI-driven treatment insights."

---

## Slide 14: Key User Features of PhytoVision

### 1. Instant Leaf Diagnosis:
- Farmers can upload a photo via drag-and-drop or select one of **6 preloaded sample leaves** (Apple Scab, Bell Pepper Bacterial Spot, Corn Common Rust, Grape Black Rot, Tomato Healthy, Tomato Late Blight).

### 2. Multi-Model Consensus View:
- Displays individual cards for **ConvNeXtTiny, EfficientNetB0, MobileNetV3Large, DenseNet121**, and the **Ensemble**.
- Each card shows the predicted plant, disease, top-3 ranked labels, and inference latency in milliseconds.

### 3. Model Agreement Indicator:
- Evaluates if all models agree on the diagnosis.
- Unanimous consensus shows a green badge; a split decision alerts the farmer to examine the leaf more closely.

### 4. Low-Confidence Safety Alerts:
- If diagnosis confidence drops below **60%**, the app surfaces an amber alert:
  > *"Low Confidence Caution: We're not fully sure — consider taking a clearer photo in indirect sunlight with symptoms centered."*

### 5. Gemini AI Agronomist Consultation:
- Integrates Google Gemini API to translate raw pathology labels (`Tomato___Early_blight`) into natural, plain-language guidance:
  - **What caused it:** Fungal pathogen *Alternaria solani*.
  - **Immediate actions:** Remove affected lower foliage, avoid overhead watering.
  - **Chemical & organic treatments:** Copper fungicide, neem oil, crop rotation.

> **Speaker Notes:**  
> "Our user experience focuses on safety and utility. If an image is blurry and confidence falls below 60%, the app warns the user instead of guessing. If all models agree, a trust badge appears. And through our Gemini integration, farmers get immediate, actionable chemical and organic treatment steps."

---

## Slide 15: Engineering Challenges & Solutions

### 1. The GitHub 100 MB Limit:
- **Challenge:** ConvNeXt-Tiny weights (`ConvNeXtTiny_s42_final.keras`) are **245.5 MB**, strictly blocked by GitHub's 100 MB limit.
- **Solution:** Configured **Git Large File Storage (Git LFS)** with `.gitattributes` to track all `.keras` models as pointers in Git while storing binaries in LFS storage.

### 2. Zero-Breakage Backward Compatibility:
- **Challenge:** The initial app only served single-model predictions on `/predict`. Adding 3 new models could not break existing routes.
- **Solution:** Encapsulated all multi-model logic in `backend/multi_model.py`. The legacy `/predict` and new `/predict/all` routes coexist smoothly.

### 3. Asymmetric Preprocessing:
- **Challenge:** Accidental sharing of preprocessed arrays caused severe model prediction degradation.
- **Solution:** Enforced isolated deep copies of raw float32 RGB arrays, dispatching each copy to its architecture-specific preprocessing function.

### 4. Cold-Start Latency:
- **Challenge:** The first user inference took 2-3 seconds due to TensorFlow graph initialization.
- **Solution:** Implemented dummy batch warm-up at startup inside FastAPI's async lifespan handler.

> **Speaker Notes:**  
> "During the engineering phase, we overcame several key hurdles: we solved the 100MB GitHub limit using Git LFS; we ensured zero-breakage backward compatibility by adding multi-model endpoints alongside legacy routes; and we eliminated initial inference lag by running warmup cycles at server startup."

---

## Slide 16: Summary, Conclusions & Future Roadmap

### Project Conclusions:
1. **Multi-Model Consensus Works:** Combining modern vision backbones achieves higher test accuracy (**99.02%**) than any single model alone.
2. **ConvNeXt-Tiny is the Top Individual Backbone:** Reached **98.93% test accuracy** and **99.19% validation accuracy**, proving the value of modern convolutional architectures.
3. **MobileNetV3-Large Delivers Unmatched Edge Efficiency:** Running at **1.65 ms/image** with **98.83% accuracy**, making real-time mobile disease diagnosis practical.
4. **Honest Explainable AI Builds Trust:** Coarse 7x7 Grad-CAM provides visual verification while transparent disclaimers prevent overreliance.

### Future Roadmap:
- **Field Data Fine-Tuning:** Collect and fine-tune on in-the-wild smartphone photos with complex backgrounds and varied lighting.
- **Offline Mobile App (TensorFlow Lite / ONNX):** Convert MobileNetV3-Large to TFLite for completely offline edge deployment in rural areas without internet.
- **Multi-Modal Agronomy:** Combine leaf imagery with weather data (humidity, rainfall, temperature) to forecast disease spread before symptoms appear.

> **Speaker Notes:**  
> "In conclusion, PhytoVision proves that multi-model consensus combined with explainable AI provides a reliable, transparent plant pathology tool. For our next steps, we plan to convert MobileNetV3 to TensorFlow Lite for offline rural deployment and fine-tune on in-field smartphone photography."

---

## Slide 17: Comprehensive Viva / Defense Q&A Cheat Sheet

*(Anticipated questions from professors/evaluators and exact answers in simple English)*

### Q1: Why did you use 4 models instead of just choosing the best one?
> **Answer:**  
> "Different models have different strengths and error patterns. For instance, ConvNeXt-Tiny provides our highest accuracy (98.93%), but MobileNetV3-Large is nearly 3x faster (1.65 ms vs 4.57 ms). By evaluating all 4 models, we discover the optimal model for cloud vs edge deployment, and our ensemble combines their probability vectors to achieve an even higher accuracy of 99.02%."

### Q2: Why is your Grad-CAM called 'coarse 7x7'?
> **Answer:**  
> "In convolutional backbones, successive pooling and strided convolutions downsample a 224x224 image by a factor of 32 down to a 7x7 feature map. When we compute the gradient weights and upscale this 7x7 grid back to 224x224, the resolution is coarse. It highlights general leaf lobes and symptomatic areas, but cannot pinpoint microscopic fungal structures. We state this explicitly to remain scientifically honest."

### Q3: Why did you use pre-softmax logits for Grad-CAM instead of softmax outputs?
> **Answer:**  
> "When a model is very confident (e.g., 99.5%), the softmax function saturates. The mathematical derivative of a saturated softmax approaches zero, causing the computed gradients to vanish. By taking the gradient of the pre-softmax linear score from a cloned Dense layer, we obtain clean, informative gradients that reflect the true class activation."

### Q4: Why can't we use standard `x / 255.0` normalization for all models?
> **Answer:**  
> "Because each architecture was pre-trained on ImageNet with a specific scaling convention. DenseNet-121 requires zero-mean normalization using ImageNet channel means and standard deviations; MobileNetV3 scales pixels between -1 and 1; and ConvNeXt uses channel-specific normalization. Dividing by 255 beforehand causes a distribution shift that degrades prediction accuracy."

### Q5: What is the main limitation of the PlantVillage dataset?
> **Answer:**  
> "PlantVillage images were captured in controlled laboratory settings with detached leaves placed on uniform backgrounds under artificial lighting. Real farm photos have occlusions, background soil, weeds, shadows, and varying sunlight. That is why our application explicitly displays a disclaimer: 'Trained on laboratory images. Not tested on field photos. Decision support only.'"

---

*PhytoVision — Explainable Plant Disease Classification System*  
*Developed with TensorFlow 2.21, Keras 3, FastAPI, React & Vite*
