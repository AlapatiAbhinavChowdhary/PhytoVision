import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SampleGallery from './components/SampleGallery';
import ImageUploader from './components/ImageUploader';
import LoadingState from './components/LoadingState';
import ResultCard from './components/ResultCard';
import {
  checkBackendHealth,
  predictImage,
  explainImage,
  fetchDiseaseInfo
} from './api';
import { AlertTriangle, RefreshCw, Leaf, HelpCircle, ShieldCheck } from 'lucide-react';

export default function App() {
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [activeSampleId, setActiveSampleId] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [prediction, setPrediction] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [diseaseInfo, setDiseaseInfo] = useState(null);

  // Monitor backend health
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

  // Cleanup object URLs to prevent memory leaks
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
    setError(null);
  };

  const handleSelectSample = async (sample) => {
    handleClear();
    setActiveSampleId(sample.id);
    setPreviewUrl(sample.url);

    try {
      setIsLoading(true);
      setError(null);

      // Fetch the sample image asset and convert to a File object
      const res = await fetch(sample.url);
      if (!res.ok) throw new Error('Could not load sample image file.');
      const blob = await res.blob();
      const file = new File([blob], `${sample.id}.jpg`, { type: 'image/jpeg' });
      setSelectedFile(file);

      // Trigger full diagnostic pipeline
      await runDiagnosis(file, sample.url);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to process sample image.');
      setIsLoading(false);
    }
  };

  const runDiagnosis = async (file, displayUrl) => {
    setIsLoading(true);
    setError(null);
    setPrediction(null);
    setExplanation(null);
    setDiseaseInfo(null);

    try {
      // Step 1: Predict
      const predResult = await predictImage(file);
      setPrediction(predResult);

      // Step 2 & 3: Run Grad-CAM Explain and Disease Info concurrently
      const [explainResult, infoResult] = await Promise.all([
        explainImage(file, predResult.raw_class).catch((e) => {
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

      // Scroll smoothly to results
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedFile) return;
    runDiagnosis(selectedFile, previewUrl);
  };

  return (
    <div className="min-h-screen flex flex-col glass-shell">
      {/* Top Navigation */}
      <Navbar isBackendOnline={isBackendOnline} />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 pt-8 pb-16">
        
        {/* Hero Section */}
        <div className="glass-panel glass-enter text-center max-w-3xl mx-auto mb-8 px-6 py-8 sm:px-12 sm:py-10 rounded-[2rem]">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-semibold mb-3 border border-emerald-200">
            <Leaf className="w-3.5 h-3.5" />
            <span>Plant pathology intelligence</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight leading-tight">
            Diagnose Crop Diseases with <span className="text-emerald-700 underline decoration-emerald-300">Visual Evidence</span>
          </h1>
          <p className="text-sm text-stone-600 mt-2.5 leading-relaxed">
            Upload an affected leaf or pick a test sample below. PhytoVision compares your image across 38 crop disease categories and surfaces the visual evidence behind its result.
          </p>
        </div>

        {/* Backend offline warning if server unreachable */}
        {!isBackendOnline && (
          <div className="glass-panel mb-6 p-4 rounded-2xl bg-amber-50/45 border-amber-200/70 text-amber-900 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Backend server is connecting (default: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">http://127.0.0.1:8000</code>). Ensure Uvicorn is running.
              </span>
            </div>
            <button
              onClick={() => checkBackendHealth().then((h) => setIsBackendOnline(h.healthy))}
              className="px-2.5 py-1 bg-white rounded-lg border border-amber-300 font-medium hover:bg-amber-100 flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* 1. Quick Sample Gallery */}
        <SampleGallery
          onSelectSample={handleSelectSample}
          activeSampleId={activeSampleId}
          isLoading={isLoading}
        />

        {/* 2. Image Upload Box */}
        <ImageUploader
          selectedFile={selectedFile}
          previewUrl={previewUrl}
          onFileSelect={handleFileSelect}
          onClear={handleClear}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />

        {/* Error Display */}
        {error && (
          <div className="p-4 mb-8 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold text-sm mb-0.5">Diagnostic Error</strong>
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-600 hover:text-rose-800 font-bold px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 3. Loading Skeleton */}
        {isLoading && <LoadingState />}

        {/* 4. Diagnostic Results */}
        {prediction && !isLoading && (
          <div id="results-section">
            <ResultCard
              prediction={prediction}
              explanation={explanation}
              diseaseInfo={diseaseInfo}
              originalImageUrl={previewUrl}
            />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="glass-panel border-x-0 border-b-0 rounded-t-3xl py-6 text-center text-xs text-stone-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
              PV
            </div>
            <span className="font-semibold text-stone-700">PhytoVision AI</span>
            <span>· PlantVillage Fine-Tuned EfficientNetB0</span>
          </div>
          <div className="text-stone-400 text-[11px]">
            Visual evidence from a fine-tuned EfficientNetB0 model
          </div>
        </div>
      </footer>
    </div>
  );
}
