import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SampleGallery from './components/SampleGallery';
import ImageUploader from './components/ImageUploader';
import LoadingState from './components/LoadingState';
import ResultCard from './components/ResultCard';
import ModelMetricsPanel from './components/ModelMetricsPanel';
import ModelPerformance from './components/ModelPerformance';
import MultiModelComparison from './components/MultiModelComparison';
import {
  checkBackendHealth,
  predictImage,
  fetchModelMetrics,
  explainImage,
  fetchDiseaseInfo,
  fetchModelMetrics,
  predictAllModels,
  fetchModelsInfo,
  API_BASE_URL
} from './api';
import { AlertTriangle, RefreshCw, Leaf, ArrowRight, FlaskConical } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('diagnosis');
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [modelMetrics, setModelMetrics] = useState(null);
  const [selectedClassFocus, setSelectedClassFocus] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [activeSampleId, setActiveSampleId] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [prediction, setPrediction] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [diseaseInfo, setDiseaseInfo] = useState(null);
  const [gradCamModel, setGradCamModel] = useState('ConvNeXtTiny');
  const [isExplainLoading, setIsExplainLoading] = useState(false);

  // Multi-model comparison states
  const [multiModelData, setMultiModelData] = useState(null);
  const [modelsInfo, setModelsInfo] = useState(null);
  const [isMultiModelLoading, setIsMultiModelLoading] = useState(false);
  const [multiModelError, setMultiModelError] = useState(null);

  const updateBackendStatus = async () => {
    const { healthy, modelLoaded } = await checkBackendHealth();
    setIsBackendOnline(healthy && modelLoaded);
  };

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      const { healthy, modelLoaded } = await checkBackendHealth();
      if (isMounted) {
        setIsBackendOnline(healthy && modelLoaded);
      }
    };

    check();
    const interval = setInterval(check, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchModelMetrics()
      .then((data) => {
        if (isMounted) {
          setModelMetrics(data);
        }
      })
      .catch((err) => {
        console.warn('Could not load model metrics:', err);
      });

    fetchModelsInfo()
      .then((info) => {
        if (isMounted && info) {
          setModelsInfo(info);
        }
      })
      .catch((err) => {
        console.warn('Could not load models info:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (file) => {
    setError(null);
    setSelectedFile(file);
    setActiveSampleId(null);

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setActiveSampleId(null);
    setPrediction(null);
    setExplanation(null);
    setDiseaseInfo(null);
    setMultiModelData(null);
    setMultiModelError(null);
    setIsMultiModelLoading(false);
    setIsExplainLoading(false);
    setError(null);
  };

  const runDiagnosis = async (file) => {
    setIsLoading(true);
    setError(null);
    setPrediction(null);
    setExplanation(null);
    setDiseaseInfo(null);

    try {
      const predResult = await predictImage(file);
      setPrediction(predResult);

      const metricsResult = await fetchModelMetrics().catch((e) => {
        console.warn('Metrics lookup failed:', e);
        return predResult.validation_metrics || predResult.model_metrics || null;
      });

      setModelMetrics(metricsResult || predResult.validation_metrics || predResult.model_metrics || null);

      const [explainResult, infoResult] = await Promise.all([
        explainImage(file, predResult.raw_class).catch((e) => {
          console.warn('Explain failed:', e);
          return null;
        }),
        fetchDiseaseInfo(predResult.raw_class).catch((e) => {
          console.warn('Info lookup failed:', e);
          return null;
        }),
      ]);

      setExplanation(explainResult);
      setDiseaseInfo(infoResult);

      setTimeout(() => {
        const resultsElement = document.getElementById('results-section');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err) {
      console.error('Diagnosis error:', err);
      setError(err.message || 'Unable to complete diagnosis. Please ensure the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) return;
    runDiagnosis(selectedFile);
  };

  const handleSelectSample = async (sample) => {
    handleClear();
    setActiveSampleId(sample.id);
    setPreviewUrl(sample.url);

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch(sample.url);
      if (!res.ok) throw new Error('Could not load sample image file.');
      const blob = await res.blob();
      const file = new File([blob], `${sample.id}.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);

      await runDiagnosis(file);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to process sample image.');
      setIsLoading(false);
    }
  };

  const runDiagnosis = async (file) => {
    setIsLoading(true);
    setError(null);
    setPrediction(null);
    setExplanation(null);
    setDiseaseInfo(null);
    setMultiModelData(null);
    setMultiModelError(null);
    setIsMultiModelLoading(false);

    try {
      // Step 1: /predict runs all 4 models + Ensemble + Agreement
      const predResult = await predictImage(file);
      setPrediction(predResult);
      setMultiModelData(predResult);

      // Step 2 & 3: Run 7x7 Grad-CAM Explain for selected model and Disease Info concurrently
      setIsExplainLoading(true);
      const [explainResult, infoResult] = await Promise.all([
        explainImage(file, predResult.raw_class, gradCamModel).catch((e) => {
          console.warn('Explain failed:', e);
          return null;
        }),
        fetchDiseaseInfo(predResult.raw_class).catch((e) => {
          console.warn('Info lookup failed:', e);
          return null;
        })
      ]);

      setExplanation(explainResult);
      setDiseaseInfo(infoResult);
      setIsExplainLoading(false);

      setTimeout(() => {
        const resultsElement = document.getElementById('results-section');
        if (resultsElement) {
          resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);

    } catch (err) {
      console.error('Diagnosis error:', err);
      setError(
        err.message ||
        'Unable to complete diagnosis. Please ensure the backend server is running.'
      );
      setIsExplainLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeGradCamModel = async (newModelName) => {
    setGradCamModel(newModelName);
    if (!selectedFile || !prediction) return;

    setIsExplainLoading(true);
    try {
      const explainResult = await explainImage(selectedFile, prediction.raw_class, newModelName);
      setExplanation(explainResult);
    } catch (e) {
      console.warn('Grad-CAM model switch failed:', e);
    } finally {
      setIsExplainLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) return;
    runDiagnosis(selectedFile);
  };

  const handleViewPerformanceForClass = (rawClass) => {
    setSelectedClassFocus(rawClass);
    setActiveTab('performance');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col glass-shell">
      <Navbar
        isBackendOnline={isBackendOnline}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        modelMetrics={modelMetrics}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-8 pb-16">

        {/* Backend offline warning if server unreachable */}
        {!isBackendOnline && (
          <div className="glass-panel mb-6 p-4 rounded-2xl bg-amber-50/45 border-amber-200/70 text-amber-900 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Backend server is connecting (target: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">{API_BASE_URL}</code>).
              </span>
            </div>
            <button
              onClick={updateBackendStatus}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-300 px-2 py-1 text-[11px] font-semibold hover:bg-amber-100"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {activeTab === 'diagnosis' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center max-w-2xl mx-auto mb-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-semibold mb-3 border border-emerald-200">
                <Leaf className="w-3.5 h-3.5" />
                <span>4-Model Ensemble · Test Accuracy 99.02% (mean of 3 seeds)</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight leading-tight">
                Diagnose Crop Diseases with <span className="text-emerald-700 underline decoration-emerald-300">Visual Evidence</span>
              </h1>
              <p className="text-sm text-stone-600 mt-2.5 leading-relaxed">
                Upload an affected leaf or pick a sample below. Four vision models predict across 38 crop disease classes, form a softmax-averaged Ensemble, and render an approximate 7×7 Grad-CAM heatmap.
              </p>

              {/* Scope notice */}
              <div className="mt-3 inline-flex items-center space-x-1.5 text-[11px] font-medium text-stone-600 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                <FlaskConical className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                <span>Trained on laboratory images. Not tested on field photos. Decision support only.</span>
              </div>

              {/* Quick Model Performance banner button */}
              <div className="mt-3">
                <button
                  onClick={() => setActiveTab('performance')}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-200/80 transition-colors cursor-pointer"
                >
                  <span>Explore test-set benchmark (Ensemble 99.02% · ConvNeXtTiny 98.93%) & 38×38 matrix</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <SampleGallery
              onSelectSample={handleSelectSample}
              activeSampleId={activeSampleId}
              isLoading={isLoading}
            />

            <ImageUploader
              selectedFile={selectedFile}
              previewUrl={previewUrl}
              onFileSelect={handleFileSelect}
              onClear={handleClear}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />

            {isLoading && <LoadingState />}

            {error && (
              <div className="glass-panel p-4 rounded-2xl border border-rose-300 bg-rose-50 text-rose-900 text-sm">
                {error}
              </div>
            )}

            {prediction && !isLoading && (
              <div id="results-section">
                <ResultCard
                  prediction={prediction}
                  explanation={explanation}
                  diseaseInfo={diseaseInfo}
                  originalImageUrl={previewUrl}
                  modelMetrics={modelMetrics}
                  onViewPerformanceTab={handleViewPerformanceForClass}
                  gradCamModel={gradCamModel}
                  onChangeGradCamModel={handleChangeGradCamModel}
                  isExplainLoading={isExplainLoading}
                />

                {/* All Models Comparative Results (Directly rendered at the bottom) */}
                <div id="all-models-results" className="mt-8 mb-12">
                  <MultiModelComparison
                    data={multiModelData}
                    modelsInfo={modelsInfo}
                    isLoading={isMultiModelLoading}
                    error={multiModelError}
                    previewUrl={previewUrl}
                    onRetry={() => {
                      if (selectedFile) {
                        setIsMultiModelLoading(true);
                        setMultiModelError(null);
                        predictAllModels(selectedFile)
                          .then(setMultiModelData)
                          .catch((e) => setMultiModelError(e.message))
                          .finally(() => setIsMultiModelLoading(false));
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'performance' && (
          <ModelPerformance
            metrics={modelMetrics}
            modelsInfo={modelsInfo}
            selectedClassFocus={selectedClassFocus}
            onSelectClassFocus={setSelectedClassFocus}
          />
        )}
      </main>

      <footer className="glass-panel border-x-0 border-b-0 rounded-t-3xl py-6 text-center text-xs text-stone-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
              PV
            </div>
            <span className="font-semibold text-stone-700">PhytoVision AI</span>
            <span>· Test Acc (3-seed mean): Ensemble 99.02% · ConvNeXtTiny 98.93%</span>
          </div>
          <div className="text-stone-400 text-[11px]">
            Trained on laboratory images. Not tested on field photos. Decision support only.
          </div>
        </div>
      </footer>
    </div>
  );
}
