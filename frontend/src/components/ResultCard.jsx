import React, { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Info,
  HelpCircle,
  Sparkles,
  Layers,
  Eye,
  ShieldCheck,
  TrendingDown,
  ArrowUpRight,
  ShieldAlert,
  Sliders,
  Target
} from 'lucide-react';

export default function ResultCard({
  prediction,
  explanation,
  diseaseInfo,
  originalImageUrl,
  modelMetrics,
  onViewPerformanceTab
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [activeTab, setActiveTab] = useState('side-by-side'); // 'side-by-side' | 'original' | 'heatmap'

  if (!prediction) return null;

  const {
    crop_name,
    predicted_class,
    confidence,
    is_healthy,
    top_3_predictions = []
  } = prediction;

  const confPercent = Math.round(confidence * 100);

  // Color-coded confidence
  // green >85%, yellow 60-85%, red <60%
  let confColorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  let confBarColor = 'bg-emerald-500';
  let confBadgeText = 'High Confidence';

  if (confPercent < 60) {
    confColorClass = 'text-rose-700 bg-rose-50 border-rose-200';
    confBarColor = 'bg-rose-500';
    confBadgeText = 'Low Confidence';
  } else if (confPercent <= 85) {
    confColorClass = 'text-amber-700 bg-amber-50 border-amber-200';
    confBarColor = 'bg-amber-500';
    confBadgeText = 'Moderate Confidence';
  }

  // Low confidence second prediction warning (< 65%)
  const showLowConfWarning = confPercent < 65 && top_3_predictions.length > 1;
  const secondPrediction = top_3_predictions[1]?.class_name || 'an alternate condition';

  // Faithfulness score
  const faithfulnessPercent = explanation?.faithfulness_score != null
    ? Math.round(explanation.faithfulness_score * 100)
    : null;

  // Class reliability metrics from pre-computed model_metrics.json
  const classMetrics = prediction?.raw_class && modelMetrics?.per_class_metrics
    ? modelMetrics.per_class_metrics[prediction.raw_class]
    : null;

  return (
    <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden mb-12 transition-all">
      
      {/* 1. Header Banner */}
      <div className="p-6 sm:p-8 border-b border-stone-200/80 bg-gradient-to-r from-stone-50 via-white to-emerald-50/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200">
                Host Crop: {crop_name}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                  is_healthy
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : diseaseInfo?.severity === 'high'
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}
              >
                {is_healthy ? 'Vibrant & Clean' : `Severity: ${diseaseInfo?.severity || 'Alert'}`}
              </span>
            </div>

            {/* Plain language Header: e.g. "🌿 Late Blight — Tomato" */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
              <span>{is_healthy ? '🌱' : '🌿'}</span>
              <span>{predicted_class} — {crop_name}</span>
            </h1>
          </div>

          {/* Visual Confidence Gauge / Badge */}
          <div className="flex items-center space-x-4 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-xs">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-stone-200"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={
                    confPercent > 85
                      ? 'text-emerald-500'
                      : confPercent >= 60
                      ? 'text-amber-500'
                      : 'text-rose-500'
                  }
                  strokeDasharray={`${confPercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-bold text-sm text-stone-800">
                {confPercent}%
              </span>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
                Diagnosis Confidence
              </div>
              <div className={`text-xs font-bold px-2 py-0.5 rounded-md inline-block mt-0.5 border ${confColorClass}`}>
                {confBadgeText}
              </div>
            </div>
          </div>

        </div>

        {/* 2. Low Confidence Warning Banner (< 65%) */}
        {showLowConfWarning && (
          <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 flex items-start space-x-3 text-xs leading-relaxed">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block text-sm mb-0.5">
                Low Confidence Caution
              </strong>
              We're not fully sure — this could also be{' '}
              <span className="font-semibold underline decoration-amber-400">{secondPrediction}</span>.
              Consider taking a clearer photo in indirect sunlight with the symptoms centered.
            </div>
          </div>
        )}
      </div>

      {/* 3. Visual Explanation Section: Side-by-Side Images & Faithfulness */}
      <div className="p-6 sm:p-8 border-b border-stone-200/80">
        
        {/* Section Title & Faithfulness Trust Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded-md bg-emerald-100 text-emerald-800">
                <Eye className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-stone-900">
                Visual Attention & Explainability (Grad-CAM)
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Gradient-weighted Class Activation Mapping computed from EfficientNetB0's last conv layer (<code className="font-mono text-[11px] bg-stone-100 px-1 py-0.5 rounded">top_conv</code>).
            </p>
          </div>

          {/* Faithfulness Score Trust Badge with Tooltip */}
          {faithfulnessPercent !== null && (
            <div className="relative inline-block">
              <div
                onClick={() => setShowTooltip(!showTooltip)}
                className="cursor-pointer flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-emerald-50/60 border border-stone-200 hover:border-emerald-300 transition-colors shadow-2xs"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <div className="text-left">
                  <div className="text-[10px] uppercase font-semibold tracking-wider text-stone-500">
                    Faithfulness Metric
                  </div>
                  <div className="text-xs font-bold text-stone-900 flex items-center space-x-1">
                    <span>Explanation reliability:</span>
                    <span className="text-emerald-700 font-extrabold">{faithfulnessPercent}%</span>
                    <HelpCircle className="w-3 h-3 text-stone-400 ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Tooltip Popover */}
              {showTooltip && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 p-4 bg-stone-900 text-stone-100 text-xs rounded-2xl shadow-xl z-30 border border-stone-700 leading-relaxed">
                  <div className="flex items-center space-x-1.5 font-bold text-emerald-400 mb-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>How Faithfulness is Measured</span>
                  </div>
                  <p className="text-stone-300">
                    The model identified the top 30% most activated regions in the Grad-CAM heatmap, masked them out, and re-evaluated the leaf.
                  </p>
                  <p className="mt-1.5 text-stone-400">
                    The reliability score (<span className="text-emerald-300 font-semibold">{faithfulnessPercent}%</span>) represents the drop in model confidence when those salient visual regions were removed. Higher scores confirm the model truly relied on this evidence.
                  </p>
                  <button
                    onClick={() => setShowTooltip(false)}
                    className="mt-2.5 text-[11px] text-emerald-400 font-medium hover:underline block text-right"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Model reliability for this class (pulled from per_class_metrics in model_metrics.json) */}
        {classMetrics && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 mt-0.5 shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Model reliability for this class
                    </span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full font-semibold bg-emerald-200/70 text-emerald-900 border border-emerald-300">
                      {classMetrics.support} validation samples
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900 mt-1 font-medium">
                    This model correctly identifies <strong>{predicted_class || crop_name}</strong> {Math.round(classMetrics.f1_score * 100)}% of the time (F1: {classMetrics.f1_score}).
                  </p>
                </div>
              </div>

              {/* Metric Breakdown Badges */}
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <div className="px-2.5 py-1.5 rounded-xl bg-white border border-emerald-200 text-center shadow-2xs min-w-[70px]">
                  <div className="text-[10px] font-semibold text-stone-400 uppercase">Precision</div>
                  <div className="text-xs font-bold text-stone-800 font-mono">
                    {(classMetrics.precision * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="px-2.5 py-1.5 rounded-xl bg-white border border-emerald-200 text-center shadow-2xs min-w-[70px]">
                  <div className="text-[10px] font-semibold text-stone-400 uppercase">Recall</div>
                  <div className="text-xs font-bold text-stone-800 font-mono">
                    {(classMetrics.recall * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="px-2.5 py-1.5 rounded-xl bg-emerald-700 text-white text-center shadow-2xs min-w-[70px]">
                  <div className="text-[10px] font-semibold text-emerald-200 uppercase">F1-Score</div>
                  <div className="text-xs font-bold font-mono">
                    {classMetrics.f1_score}
                  </div>
                </div>

                {onViewPerformanceTab && (
                  <button
                    onClick={() => onViewPerformanceTab(prediction.raw_class)}
                    title="Inspect in 38x38 confusion matrix"
                    className="px-2.5 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors shadow-2xs cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                  >
                    <span>Matrix</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Image Display Grid (Side-by-Side) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* Original Image */}
          <div className="flex flex-col">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 shadow-xs group">
              <img
                src={originalImageUrl}
                alt="Original Foliage Upload"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-stone-900/70 text-white text-xs font-semibold backdrop-blur-xs">
                Original Photo
              </div>
            </div>
            <p className="text-xs text-stone-500 mt-2 text-center font-medium">
              Uploaded leaf photo (224 × 224 input space)
            </p>
          </div>

          {/* Grad-CAM Overlay */}
          <div className="flex flex-col">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-emerald-300/80 bg-stone-900 shadow-xs group">
              {explanation?.heatmap_overlay ? (
                <img
                  src={explanation.heatmap_overlay}
                  alt="Grad-CAM Heatmap Overlay"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 p-6 text-center text-xs">
                  <Layers className="w-8 h-8 mb-2 animate-spin text-emerald-500" />
                  Generating Grad-CAM overlay...
                </div>
              )}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 text-xs font-semibold backdrop-blur-xs border border-emerald-700/50 flex items-center space-x-1.5">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Grad-CAM Activation Map</span>
              </div>
            </div>
            
            {/* Required Caption */}
            <p className="text-xs text-emerald-800 bg-emerald-50/70 p-2 rounded-xl mt-2 text-center font-medium border border-emerald-100">
              💡 Highlighted areas show what the model focused on to make this decision.
            </p>
          </div>

        </div>

      </div>

      {/* 4. Pathology Description & Action Section */}
      <div className="p-6 sm:p-8 bg-stone-50/50">
        
        {is_healthy ? (
          /* Healthy Reassuring Card */
          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/30">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-950">
                All Clear! Healthy Foliage Detected
              </h3>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                Your {crop_name} foliage displays clean cell structure, uniform pigmentation, and no significant symptoms of bacterial spots, fungal blights, or viral chlorosis. Maintain your regular watering schedule and standard soil care.
              </p>
            </div>
          </div>
        ) : (
          /* Disease Explanation Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* What this means card */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs">
              <div className="flex items-center space-x-2 text-stone-900 font-bold text-sm mb-2">
                <div className="p-1 rounded-md bg-stone-100 text-stone-700">
                  <Info className="w-4 h-4" />
                </div>
                <h3>What This Means</h3>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                {diseaseInfo?.what_it_means ||
                  'The diagnostic model identified characteristic morphological patterns consistent with this plant disease.'}
              </p>
            </div>

            {/* Recommended action card */}
            <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs">
              <div className="flex items-center space-x-2 text-stone-900 font-bold text-sm mb-2">
                <div className="p-1 rounded-md bg-emerald-100 text-emerald-800">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <h3>Recommended Action</h3>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                {diseaseInfo?.recommended_action ||
                  'Prune affected leaves, avoid overhead watering, and consult a local agricultural extension office for targeted organic or chemical treatments.'}
              </p>
            </div>

          </div>
        )}

        {/* 5. Top 3 Predictions Breakdown for Transparent Decision-Making */}
        {top_3_predictions.length > 0 && (
          <div className="mt-6 pt-6 border-t border-stone-200/70">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center justify-between">
              <span>Top Model Candidates & Probabilities</span>
              <span className="text-[11px] font-normal text-stone-400">Softmax distribution</span>
            </h4>

            <div className="space-y-2.5">
              {top_3_predictions.map((item, idx) => {
                const itemPercent = Math.round(item.confidence * 100);
                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white border border-stone-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center space-x-2.5 min-w-[200px]">
                      <span className="font-mono text-stone-400 font-semibold text-[11px]">
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="font-semibold text-stone-900">
                          {item.disease_name}
                        </span>{' '}
                        <span className="text-stone-500 text-[11px]">
                          ({item.crop_name})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 flex-1 sm:max-w-xs">
                      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            idx === 0
                              ? confBarColor
                              : 'bg-stone-300'
                          }`}
                          style={{ width: `${Math.max(itemPercent, 4)}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-stone-700 min-w-[38px] text-right">
                        {itemPercent}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
