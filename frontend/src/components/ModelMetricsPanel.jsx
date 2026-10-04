import React from 'react';
import { BarChart3, CheckCircle2, Info } from 'lucide-react';

export default function ModelMetricsPanel({ prediction, metrics }) {
  const confidence = prediction?.confidence == null
    ? null
    : Math.round(prediction.confidence * 100);

  const metricCards = [
    ['Accuracy', metrics?.accuracy],
    ['Precision', metrics?.precision],
    ['Recall', metrics?.recall],
    ['F1 score', metrics?.f1_score]
  ];

  return (
    <section className="glass-panel glass-enter rounded-3xl mb-12 p-6 sm:p-8 border border-emerald-200/80 bg-white/90 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-stone-900">Model Metrics</h2>
            <p className="text-xs text-stone-600 mt-1">
              Validation performance for the deployed classifier.
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-full">
          {metrics?.sample_count ? `${metrics.sample_count.toLocaleString()} labeled images` : 'Validation set'}
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map(([label, value]) => {
          const percentage = value == null ? 0 : Math.round(value * 100);
          return (
            <div key={label} className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-600">{label}</div>
              <div className="text-3xl font-extrabold text-emerald-700 mt-2">
                {value == null ? 'N/A' : `${percentage}%`}
              </div>
              <div className="h-2 w-full rounded-full bg-emerald-100 mt-3 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
        <div className="flex items-start gap-2.5 rounded-xl bg-stone-50 border border-stone-200 p-3 text-xs text-stone-600">
          <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
          <span>These four values are aggregate validation results, not scores calculated from the current upload.</span>
        </div>
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Current upload confidence: <strong>{confidence == null ? 'N/A' : `${confidence}%`}</strong>. Per-image accuracy, precision, recall, and F1 require a confirmed true class.
          </span>
        </div>
      </div>
    </section>
  );
}
