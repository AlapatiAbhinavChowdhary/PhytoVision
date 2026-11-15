import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Zap,
  Award,
  Layers,
  Sparkles,
  BarChart3,
  Clock,
  ShieldCheck,
  Scale
} from 'lucide-react';

function parseRawLabel(raw) {
  if (!raw) return { crop: 'Unknown', disease: 'Unknown', isHealthy: false, cleanLabel: 'Unknown' };
  const parts = raw.split('___');
  const crop = parts[0] ? parts[0].replace(/_/g, ' ') : 'Unknown';
  let disease = parts[1] ? parts[1].replace(/_/g, ' ') : 'Healthy';
  const isHealthy = disease.toLowerCase().includes('healthy');

  // Format label like "Tomato - Late blight"
  const cleanLabel = isHealthy ? `${crop} - Healthy` : `${crop} - ${disease}`;
  return { crop, disease: isHealthy ? 'Healthy' : disease, isHealthy, cleanLabel };
}

export default function MultiModelComparison({
  data,
  modelsInfo,
  isLoading,
  error,
  previewUrl,
  onRetry
}) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-xs animate-pulse space-y-6">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 rounded-full bg-emerald-100" />
          <div className="h-6 w-48 bg-stone-200 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-56 bg-stone-100 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-800 text-xs flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-sm font-bold mb-1">Multi-Model Comparison Unavailable</strong>
            <span>{error}</span>
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 bg-white border border-rose-300 rounded-lg font-semibold hover:bg-rose-100 transition-colors cursor-pointer text-xs"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!data) return null;

  const { models = {}, ensemble = {}, agreement = {}, best_model = 'ConvNeXtTiny' } = data;
  const isAllAgree = agreement?.all_agree;

  // Check if top confidence is below 60%
  const ensembleConf = ensemble?.confidence || 0;
  const isLowConfidence = ensembleConf < 60;

  // Model keys in preferred display order
  const modelKeys = ['ConvNeXtTiny', 'EfficientNetB0', 'MobileNetV3Large', 'DenseNet121'];

  const modelDescriptions = {
    ConvNeXtTiny: 'Best Single Model · 98.93% Test Acc (3-seed mean)',
    EfficientNetB0: 'Compound-Scaled CNN · 97.93% Test Acc (3-seed mean)',
    MobileNetV3Large: 'Ultra-Lightweight Edge · 97.86% Test Acc (3-seed mean)',
    DenseNet121: 'Dense Feature Reuse · 97.28% Test Acc (3-seed mean)'
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-200/80">
        <div>
          <div className="flex items-center space-x-2.5 mb-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
              <Scale className="w-3.5 h-3.5" />
              <span>4-Model Test Set Comparison</span>
            </span>

            {/* Agreement Badge */}
            {isAllAgree ? (
              <span className="text-xs font-bold px-3 py-0.5 rounded-full uppercase tracking-wider bg-emerald-500 text-white flex items-center space-x-1.5 shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>All Models Agree</span>
              </span>
            ) : (
              <span className="text-xs font-bold px-3 py-0.5 rounded-full uppercase tracking-wider bg-amber-500 text-white flex items-center space-x-1.5 shadow-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Models Disagree</span>
              </span>
            )}
          </div>

          <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            4-Model Comparative Analysis & Ensemble
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Simultaneous inference comparing DenseNet121, MobileNetV3Large, EfficientNetB0, and ConvNeXtTiny with ensemble consensus voting.
          </p>
        </div>

        {/* Uploaded Leaf Thumbnail */}
        {previewUrl && (
          <div className="flex items-center space-x-3 shrink-0 bg-stone-50 p-2 rounded-2xl border border-stone-200">
            <img
              src={previewUrl}
              alt="Analyzed Leaf"
              className="w-14 h-14 object-cover rounded-xl border border-stone-200"
            />
            <div className="text-[11px] text-stone-500 pr-2">
              <span className="font-semibold text-stone-700 block">Tested Leaf Image</span>
              <span>224×224 Normalization</span>
            </div>
          </div>
        )}
      </div>

      {/* Low Confidence Warning */}
      {isLowConfidence && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span className="font-medium">
            Low confidence - use a clear, single-leaf photo.
          </span>
        </div>
      )}

      {/* 1. Ensemble Consensus Card */}
      {ensemble && ensemble.label && ensemble.label !== 'None' && (
        <div className="bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/50 rounded-2xl border-2 border-emerald-500/40 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <span>Ensemble Consensus</span>
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    Mean Probability Vector
                  </span>
                </h3>
                <span className="text-xs text-stone-500">
                  Synthesized decision across all active models
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-2xl font-black text-emerald-800 tracking-tight">
                {ensemble.confidence}%
              </span>
              <span className="text-xs text-stone-500 font-medium">Confidence</span>
            </div>
          </div>

          {/* Parsed Diagnosis */}
          {(() => {
            const parsed = parseRawLabel(ensemble.label);
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/80 p-4 rounded-xl border border-emerald-100 mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                    Host Plant
                  </span>
                  <span className="text-sm font-extrabold text-stone-900">
                    {parsed.crop}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                    Diagnosed Condition
                  </span>
                  <span className="text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
                    {parsed.isHealthy ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        🌱 Healthy
                      </span>
                    ) : (
                      <span>{parsed.disease}</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">
                    Standardized Code
                  </span>
                  <span className="text-xs font-semibold text-stone-600 font-mono">
                    {parsed.cleanLabel}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Top 3 Ensemble Predictions */}
          {ensemble.top3 && ensemble.top3.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Top Ensemble Ranking
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {ensemble.top3.map((pred, idx) => {
                  const p = parseRawLabel(pred.label);
                  return (
                    <div
                      key={idx}
                      className="bg-white p-2.5 rounded-xl border border-stone-200/80 flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <span className="text-stone-400 font-bold mr-1.5">#{idx + 1}</span>
                        <span className="font-semibold text-stone-800">{p.cleanLabel}</span>
                      </div>
                      <span className="font-bold text-emerald-700 shrink-0">
                        {pred.confidence}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Individual Model Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Individual Model Predictions</span>
          </h3>
          <span className="text-xs text-stone-500">
            Click any model for layer breakdown
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modelKeys.map((name) => {
            const mData = models[name];
            const isAvailable = mData && mData.status === 'ok';
            const isWinner = name === best_model;
            const top1 = isAvailable && mData.top3 && mData.top3.length > 0 ? mData.top3[0] : null;
            const parsed = top1 ? parseRawLabel(top1.label) : null;
            const infTime = mData?.inference_ms ?? 0;

            return (
              <div
                key={name}
                className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                  isWinner
                    ? 'border-emerald-500 bg-emerald-50/20 ring-1 ring-emerald-500/20 shadow-xs'
                    : isAvailable
                    ? 'border-stone-200 bg-white hover:border-stone-300'
                    : 'border-rose-200 bg-rose-50/30'
                }`}
              >
                <div>
                  {/* Model Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-sm font-extrabold text-stone-900 flex items-center gap-1.5">
                        <span>{name}</span>
                        {isWinner && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white shadow-xs">
                            <Award className="w-3 h-3" />
                            <span>Best Model</span>
                          </span>
                        )}
                        {name === 'EfficientNetB0' && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                            Baseline
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-stone-500 leading-tight mt-0.5">
                        {modelDescriptions[name] || ''}
                      </p>
                    </div>

                    {isAvailable ? (
                      <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200 shrink-0">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>{infTime} ms</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                        Unavailable
                      </span>
                    )}
                  </div>

                  {/* Body / Top Prediction */}
                  {isAvailable && parsed ? (
                    <div className="my-3 space-y-2.5">
                      <div className="p-3 bg-stone-50 rounded-xl border border-stone-100">
                        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">
                          {parsed.crop}
                        </div>
                        <div className="text-sm font-bold text-stone-900 flex items-center justify-between">
                          <span className="truncate pr-1">{parsed.disease}</span>
                          {parsed.isHealthy && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                              Healthy
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Confidence Bar */}
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span className="text-stone-500 text-[11px]">Confidence</span>
                          <span className="text-stone-900 font-bold">{top1.confidence}%</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              top1.confidence >= 85
                                ? 'bg-emerald-500'
                                : top1.confidence >= 60
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, top1.confidence)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="my-6 text-center text-xs text-stone-400 italic">
                      {mData?.error || 'Model not loaded into memory'}
                    </div>
                  )}
                </div>

                {/* Top 3 List */}
                {isAvailable && mData.top3 && mData.top3.length > 0 && (
                  <div className="border-t border-stone-100 pt-2.5 mt-2 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-stone-400 block tracking-wider mb-1">
                      Top 3 Candidates
                    </span>
                    {mData.top3.map((cand, idx) => {
                      const cParsed = parseRawLabel(cand.label);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] text-stone-600"
                        >
                          <span className="truncate pr-1 text-stone-700">
                            #{idx + 1} {cParsed.cleanLabel}
                          </span>
                          <span className="font-semibold text-stone-900 shrink-0">
                            {cand.confidence}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Test Accuracy Benchmark (Test set, mean of 3 seeds) */}
      {modelsInfo?.leaderboard && modelsInfo.leaderboard.length > 0 && (
        <div className="border-t border-stone-200/80 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-stone-100 text-stone-700">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wider">
                Test Accuracy Benchmark (Test Set · Mean of 3 Seeds)
              </h3>
            </div>
            <span className="text-xs text-stone-500">
              Trained on laboratory images. Not tested on field photos. Decision support only.
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-stone-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Model Architecture</th>
                  <th className="py-3 px-4 text-center">Test Accuracy (3-seed mean)</th>
                  <th className="py-3 px-4 text-center">Parameters (M)</th>
                  <th className="py-3 px-4 text-center">Inference Latency</th>
                  <th className="py-3 px-4 text-left">Protocol Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                {modelsInfo.leaderboard.map((row, idx) => {
                  const isHighlight = row.model === 'Ensemble' || row.model === 'ConvNeXtTiny';
                  const testAccPercent = Number(row.test_acc || 0).toFixed(2);

                  return (
                    <tr
                      key={idx}
                      className={isHighlight ? 'bg-emerald-50/40 font-bold text-stone-900' : 'hover:bg-stone-50/50'}
                    >
                      <td className="py-3 px-4 flex items-center space-x-2">
                        <span>{row.model}</span>
                        {row.model === 'Ensemble' && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-700 text-white">
                            Best Overall
                          </span>
                        )}
                        {row.model === 'ConvNeXtTiny' && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-600 text-white">
                            Best Single
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-emerald-700 font-extrabold">
                        {testAccPercent}%
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {row.params_m ? `${row.params_m} M` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {row.inf_ms_per_img ? `${row.inf_ms_per_img} ms` : '—'}
                      </td>
                      <td className="py-3 px-4 text-stone-500 font-normal">
                        {row.note || 'Test set, mean of 3 seeds'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

