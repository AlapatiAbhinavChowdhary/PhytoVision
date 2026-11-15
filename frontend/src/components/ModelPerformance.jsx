import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Info,
  Maximize2,
  Minimize2,
  Layers,
  ShieldCheck,
  Filter,
  Award,
  Zap,
  Scale,
  Cpu,
  Clock,
  Sparkles
} from 'lucide-react';

function parseClassName(raw) {
  if (!raw) return { crop: 'Unknown', disease: 'Unknown', isHealthy: false };
  const parts = raw.split('___');
  let crop = parts[0].replace(/_/g, ' ');
  crop = crop.replace(/\s*\([^)]*\)/g, '');
  const disease = parts[1] ? parts[1].replace(/_/g, ' ') : 'Unknown';
  const isHealthy = disease.toLowerCase().includes('healthy');
  return { crop, disease, isHealthy };
}

// Research paper test accuracy metrics (%, test set, mean of 3 seeds)
const DEFAULT_LEADERBOARD = [
  {
    model: 'Ensemble',
    params_m: '42.06',
    train_min: '—',
    inf_ms_per_img: '~15.1',
    test_acc: 99.02,
    badge: 'Best Overall (Ensemble) 🏆',
    highlight: 'Mean of 4 Softmax Vectors',
    description: 'Unweighted mean probability consensus across ConvNeXtTiny, EfficientNetB0, MobileNetV3Large, and DenseNet121.'
  },
  {
    model: 'ConvNeXtTiny',
    params_m: '27.85',
    train_min: '50.2',
    inf_ms_per_img: '4.568',
    test_acc: 98.93,
    badge: 'Best Single Model 🌟',
    highlight: 'Highest Single-Model Test Accuracy',
    description: 'Modern vision architecture featuring 7×7 depthwise convolutions, inverted bottlenecks, and LayerNorm.'
  },
  {
    model: 'EfficientNetB0',
    params_m: '4.10',
    train_min: '—',
    inf_ms_per_img: '4.214',
    test_acc: 97.93,
    badge: 'Compound Scaled CNN 🌿',
    highlight: 'Balanced Scaling & Efficiency',
    description: 'Compound scaling method optimizing network depth, width, and resolution with MBConv inverted residual blocks.'
  },
  {
    model: 'MobileNetV3Large',
    params_m: '3.03',
    train_min: '21.8',
    inf_ms_per_img: '1.650',
    test_acc: 97.86,
    badge: 'Fastest Edge / Mobile ⚡',
    highlight: 'Lowest Inference Latency',
    description: 'Hardware-aware Neural Architecture Search (NAS) model tailored for ultra-low latency mobile & edge deployment.'
  },
  {
    model: 'DenseNet121',
    params_m: '7.08',
    train_min: '50.1',
    inf_ms_per_img: '4.663',
    test_acc: 97.28,
    badge: 'Dense Feature Reuse 🔗',
    highlight: 'Maximum Gradient Propagation',
    description: 'Densely connected convolutional layers connecting all layers directly to maximize feature reuse and reduce vanishing gradients.'
  }
];

export default function ModelPerformance({
  metrics,
  modelsInfo,
  selectedClassFocus,
  onSelectClassFocus
}) {
  const [selectedModel, setSelectedModel] = useState('ALL'); // 'ALL' | 'ConvNeXtTiny' | 'EfficientNetB0' | 'MobileNetV3Large' | 'DenseNet121'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCropFilter, setSelectedCropFilter] = useState('ALL');
  const [sortField, setSortField] = useState('f1_score');
  const [sortDirection, setSortDirection] = useState('desc');

  // Matrix controls
  const [hoveredCell, setHoveredCell] = useState(null);
  const [matrixFilterMode, setMatrixFilterMode] = useState('all');
  const [highlightedClassIdx, setHighlightedClassIdx] = useState(null);
  const [cellSize, setCellSize] = useState('standard');

  useEffect(() => {
    if (selectedClassFocus) {
      setSearchTerm(selectedClassFocus);
      if (onSelectClassFocus) {
        onSelectClassFocus(null);
      }
    }
  }, [selectedClassFocus, onSelectClassFocus]);

  // Merge runtime leaderboard data from /models/info with metadata
  const leaderboardData = useMemo(() => {
    if (modelsInfo?.leaderboard && modelsInfo.leaderboard.length > 0) {
      return modelsInfo.leaderboard.map((row) => {
        const fallback = DEFAULT_LEADERBOARD.find((d) => d.model.toLowerCase() === (row.model || '').toLowerCase()) || {};
        return {
          ...fallback,
          ...row
        };
      });
    }
    return DEFAULT_LEADERBOARD;
  }, [modelsInfo]);

  // Active model metrics object
  const activeModelMeta = useMemo(() => {
    if (selectedModel === 'ALL') {
      return leaderboardData.find((m) => m.model === 'Ensemble') || leaderboardData[0];
    }
    return leaderboardData.find((m) => m.model === selectedModel) || leaderboardData[0];
  }, [selectedModel, leaderboardData]);

  const {
    per_class_metrics = {},
    confusion_matrix = [],
    class_names = []
  } = metrics || {};

  // Aggregate stats from per_class_metrics
  const summaryStats = useMemo(() => {
    const classKeys = Object.keys(per_class_metrics);
    const count = classKeys.length || 1;
    let totalSupport = 0;
    let sumPrecision = 0;
    let sumRecall = 0;
    let sumF1 = 0;

    classKeys.forEach((k) => {
      const item = per_class_metrics[k];
      totalSupport += item.support || 0;
      sumPrecision += item.precision || 0;
      sumRecall += item.recall || 0;
      sumF1 += item.f1_score || 0;
    });

    return {
      totalClasses: count,
      totalSupport,
      macroPrecision: sumPrecision / count,
      macroRecall: sumRecall / count,
      macroF1: sumF1 / count
    };
  }, [per_class_metrics]);

  const availableCrops = useMemo(() => {
    const crops = new Set();
    class_names.forEach((cn) => {
      const { crop } = parseClassName(cn);
      crops.add(crop);
    });
    return Array.from(crops).sort();
  }, [class_names]);

  const tableRows = useMemo(() => {
    return class_names.map((raw, idx) => {
      const metric = per_class_metrics[raw] || { precision: 0, recall: 0, f1_score: 0, support: 0 };
      const parsed = parseClassName(raw);
      return {
        idx,
        rawClass: raw,
        ...parsed,
        ...metric
      };
    });
  }, [class_names, per_class_metrics]);

  const filteredRows = useMemo(() => {
    return tableRows
      .filter((row) => {
        if (selectedCropFilter !== 'ALL' && row.crop.toLowerCase() !== selectedCropFilter.toLowerCase()) {
          return false;
        }
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          return (
            row.rawClass.toLowerCase().includes(q) ||
            row.crop.toLowerCase().includes(q) ||
            row.disease.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [tableRows, selectedCropFilter, searchTerm, sortField, sortDirection]);

  const maxDiagonalVal = useMemo(() => {
    let maxVal = 1;
    for (let i = 0; i < confusion_matrix.length; i++) {
      if (confusion_matrix[i] && confusion_matrix[i][i] > maxVal) {
        maxVal = confusion_matrix[i][i];
      }
    }
    return maxVal;
  }, [confusion_matrix]);

  if (!metrics) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-stone-900">Loading Multi-Model Performance Data...</h3>
        <p className="text-stone-500 text-xs mt-1">Retrieving validation benchmark metrics for all 4 models.</p>
      </div>
    );
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const exportCSV = () => {
    const headers = ['Class Name', 'Crop', 'Condition', 'Is Healthy', 'Precision', 'Recall', 'F1-Score', 'Support'];
    const rows = tableRows.map((r) => [
      `"${r.rawClass}"`,
      `"${r.crop}"`,
      `"${r.disease}"`,
      r.isHealthy ? 'Yes' : 'No',
      r.precision,
      r.recall,
      r.f1_score,
      r.support
    ]);
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'phytovision_model_metrics.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cellPixelSize = cellSize === 'compact' ? 14 : cellSize === 'large' ? 26 : 20;

  // Active stats depending on selected model (test set, mean of 3 seeds)
  const activeAcc = Number(activeModelMeta.test_acc || 0).toFixed(2);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header & Architecture Selector */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-6 mb-6">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200/60 inline-flex mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>4 Models + Ensemble · Test Set (Mean of 3 Seeds)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Multi-Model Test Evaluation & Architecture Benchmark
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 leading-relaxed max-w-2xl">
              Test-set accuracy (mean of 3 random seeds) across Ensemble (99.02%), ConvNeXtTiny (98.93%), EfficientNetB0 (97.93%), MobileNetV3Large (97.86%), and DenseNet121 (97.28%).
            </p>
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 mt-2 inline-block font-medium">
              Trained on laboratory images. Not tested on field photos. Decision support only.
            </p>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={exportCSV}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-semibold transition-colors shadow-2xs self-start md:self-auto cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Export Metrics CSV</span>
          </button>
        </div>

        {/* Model Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-6 p-1.5 rounded-2xl bg-stone-50 border border-stone-200/80">
          <button
            onClick={() => setSelectedModel('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              selectedModel === 'ALL'
                ? 'bg-white text-emerald-900 shadow-xs border border-emerald-200 font-extrabold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>All Models + Ensemble</span>
          </button>

          {leaderboardData.map((m) => {
            const isEnsemble = m.model === 'Ensemble';
            const isConvNeXt = m.model === 'ConvNeXtTiny';
            const isSelected = selectedModel === m.model;
            const accStr = Number(m.test_acc || 0).toFixed(2);
            return (
              <button
                key={m.model}
                onClick={() => setSelectedModel(m.model)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-white text-emerald-900 shadow-xs border border-emerald-200 font-extrabold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                }`}
              >
                <span>{m.model}</span>
                {(isEnsemble || isConvNeXt) ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-600 text-white font-extrabold">
                    {accStr}%
                  </span>
                ) : (
                  <span className="text-[10px] text-stone-500 font-semibold">
                    {accStr}%
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 4 Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Test Accuracy */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
            <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-100 flex items-center justify-between">
              <span>{selectedModel === 'ALL' ? 'Ensemble Test Accuracy' : `${selectedModel} Test Accuracy`}</span>
              <Award className="w-3.5 h-3.5 text-emerald-200" />
            </span>
            <div className="text-3xl sm:text-4xl font-black mt-1 tracking-tight">
              {activeAcc}%
            </div>
            <p className="text-[11px] text-emerald-100/90 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 inline shrink-0" />
              <span>Test set · mean of 3 seeds</span>
            </p>
          </div>

          {/* Best Single Model */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 shadow-2xs">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
              Best Single Architecture
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-stone-900 mt-1 tracking-tight">
              98.93%
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              ConvNeXtTiny (test set, 3-seed mean)
            </p>
          </div>

          {/* Evaluation Protocol */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 shadow-2xs">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
              Evaluation Protocol
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 tracking-tight">
              38 Classes
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              PlantVillage lab test split · 3 seeds
            </p>
          </div>

          {/* Model Footprint & Latency */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 shadow-2xs">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500 flex items-center justify-between">
              <span>Footprint & Speed</span>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 tracking-tight">
              {activeModelMeta.params_m || '—'}M <span className="text-base text-stone-400 font-normal">/ {activeModelMeta.inf_ms_per_img || '—'}ms</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Parameters & inference latency per image
            </p>
          </div>
        </div>
      </div>

      {/* 2. Side-by-Side Comparative Cards Grid */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div className="flex items-center space-x-2">
            <div className="p-1 rounded-md bg-emerald-100 text-emerald-800">
              <Scale className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-stone-900">
              Test Set Comparison (4 Models + Ensemble)
            </h2>
          </div>
          <span className="text-xs text-stone-500 font-medium">
            Percent, test set, mean of 3 seeds
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {leaderboardData.map((m) => {
            const isEnsemble = m.model === 'Ensemble';
            const isWinner = m.model === 'ConvNeXtTiny';
            const isFastest = m.model === 'MobileNetV3Large';
            const isSelected = selectedModel === m.model;
            const testAccNum = Number(m.test_acc || 0).toFixed(2);

            return (
              <div
                key={m.model}
                onClick={() => setSelectedModel(m.model)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/30 ring-2 ring-emerald-600/20 shadow-xs'
                    : isEnsemble || isWinner
                    ? 'border-emerald-300 bg-emerald-50/10 hover:border-emerald-500'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <div>
                      <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-1.5">
                        <span>{m.model}</span>
                      </h3>
                      <span className="text-[10px] font-bold text-emerald-700 block mt-0.5">
                        {m.badge || ''}
                      </span>
                    </div>
                    {isEnsemble && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-700 text-white shadow-2xs">
                        99.02%
                      </span>
                    )}
                    {isWinner && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-2xs">
                        98.93%
                      </span>
                    )}
                    {isFastest && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-2xs">
                        Fastest
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-stone-500 leading-snug my-2.5 line-clamp-3">
                    {m.description}
                  </p>

                  {/* Test Accuracy Bar */}
                  <div className="space-y-1 my-3 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-500 text-[10px] uppercase font-bold">Test Acc (3 seeds)</span>
                      <span className="font-extrabold text-emerald-700">{testAccNum}%</span>
                    </div>
                    <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${testAccNum}%` }}
                      />
                    </div>
                  </div>

                  {/* Spec Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-stone-100">
                    <div>
                      <span className="text-stone-400 block text-[10px] font-medium">Latency</span>
                      <span className="font-bold text-stone-800 font-mono">{m.inf_ms_per_img || '—'} ms</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] font-medium">Params</span>
                      <span className="font-bold text-stone-800 font-mono">{m.params_m || '—'} M</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-stone-100 text-[11px] font-bold text-emerald-700 flex items-center justify-between">
                  <span>{isSelected ? 'Currently Viewing' : 'Select Model'}</span>
                  <span>→</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scope & Deployment Guide Bar */}
        <div className="mt-6 p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-600 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Scope Notice:</strong> Trained on laboratory images. Not tested on field photos. Decision support only.
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[11px] font-mono text-stone-500 shrink-0">
            <span>Ensemble averages 4 softmax vectors (99.02%)</span>
          </div>
        </div>
      </div>

      {/* 3. Confusion Matrix Heatmap Section (38x38) */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-100 pb-5 mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded-md bg-emerald-100 text-emerald-800">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-stone-900">
                Confusion Matrix Heatmap (38 × 38)
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Rows represent ground truth classes; columns represent predicted classes. Diagonal cells indicate correct classifications.
            </p>
          </div>

          {/* Matrix Interactive Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Toggle */}
            <div className="flex items-center bg-stone-100 rounded-xl p-1 text-xs">
              <button
                onClick={() => setMatrixFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  matrixFilterMode === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                All Cells
              </button>
              <button
                onClick={() => setMatrixFilterMode('errors_only')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  matrixFilterMode === 'errors_only'
                    ? 'bg-white text-rose-700 shadow-2xs font-semibold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Errors Only
              </button>
            </div>

            {/* Cell Size Toggle */}
            <div className="flex items-center bg-stone-100 rounded-xl p-1 text-xs">
              <button
                onClick={() => setCellSize('compact')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  cellSize === 'compact' ? 'bg-white text-stone-900 font-bold shadow-2xs' : 'text-stone-500'
                }`}
                title="Compact view"
              >
                S
              </button>
              <button
                onClick={() => setCellSize('standard')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  cellSize === 'standard' ? 'bg-white text-stone-900 font-bold shadow-2xs' : 'text-stone-500'
                }`}
                title="Standard view"
              >
                M
              </button>
              <button
                onClick={() => setCellSize('large')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  cellSize === 'large' ? 'bg-white text-stone-900 font-bold shadow-2xs' : 'text-stone-500'
                }`}
                title="Expanded view"
              >
                L
              </button>
            </div>
          </div>
        </div>

        {/* Active Inspection Inspector Banner */}
        <div className="h-10 mb-4 px-4 bg-stone-50 border border-stone-200/80 rounded-xl flex items-center justify-between text-xs text-stone-600">
          {hoveredCell ? (
            <div className="flex items-center space-x-2 truncate">
              <span className="font-semibold text-stone-900">
                True: <span className="text-emerald-700">{hoveredCell.trueClass}</span>
              </span>
              <span className="text-stone-400">→</span>
              <span className="font-semibold text-stone-900">
                Pred: <span className={hoveredCell.row === hoveredCell.col ? 'text-emerald-700' : 'text-rose-600'}>{hoveredCell.predClass}</span>
              </span>
              <span className="text-stone-300">•</span>
              <span className="font-bold text-stone-800">
                Count: {hoveredCell.count} samples
              </span>
            </div>
          ) : (
            <span className="text-stone-400 italic">
              Hover over any matrix cell to inspect exact class pair prediction counts.
            </span>
          )}

          {highlightedClassIdx !== null && (
            <button
              onClick={() => setHighlightedClassIdx(null)}
              className="text-[11px] text-stone-500 hover:text-stone-800 underline cursor-pointer"
            >
              Clear row highlight
            </button>
          )}
        </div>

        {/* Scrollable Matrix */}
        <div className="overflow-x-auto overflow-y-auto max-h-[560px] border border-stone-200 rounded-2xl relative bg-stone-950/2">
          <table className="border-collapse text-[10px]">
            <thead className="sticky top-0 z-20 bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="sticky left-0 z-30 bg-stone-100 p-2 font-mono text-[9px] text-stone-500 min-w-[140px] text-left border-r border-stone-200">
                  True \ Pred (38)
                </th>
                {class_names.map((name, colIdx) => {
                  const { crop, disease } = parseClassName(name);
                  const isHighlighted = highlightedClassIdx === colIdx;
                  return (
                    <th
                      key={colIdx}
                      style={{ width: `${cellPixelSize}px`, minWidth: `${cellPixelSize}px` }}
                      className={`p-1 font-mono text-[8px] text-center truncate border-r border-stone-100 select-none ${
                        isHighlighted ? 'bg-emerald-100 text-emerald-900 font-bold' : 'text-stone-400'
                      }`}
                      title={`Pred #${colIdx}: ${crop} - ${disease}`}
                    >
                      {colIdx + 1}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {confusion_matrix.map((row, rowIdx) => {
                const trueName = class_names[rowIdx] || `Class ${rowIdx}`;
                const { crop, disease } = parseClassName(trueName);
                const isRowHighlighted = highlightedClassIdx === rowIdx;

                return (
                  <tr
                    key={rowIdx}
                    className={`border-b border-stone-100 transition-colors ${
                      isRowHighlighted ? 'bg-emerald-50/50' : 'hover:bg-stone-50/60'
                    }`}
                  >
                    {/* Sticky Row Label */}
                    <td
                      onClick={() => setHighlightedClassIdx(rowIdx)}
                      className={`sticky left-0 z-10 p-2 font-medium truncate text-left border-r border-stone-200 cursor-pointer select-none ${
                        isRowHighlighted
                          ? 'bg-emerald-100 text-emerald-950 font-bold'
                          : 'bg-stone-50 text-stone-700 hover:text-stone-900'
                      }`}
                      title={`Click to focus class #${rowIdx + 1}: ${trueName}`}
                    >
                      <span className="font-mono text-stone-400 text-[9px] mr-1.5">
                        #{rowIdx + 1}
                      </span>
                      <span className="text-[11px]">{crop}</span>
                      <span className="text-stone-400 mx-1">·</span>
                      <span className="text-stone-500 text-[10px]">{disease}</span>
                    </td>

                    {/* Matrix Cells */}
                    {row.map((val, colIdx) => {
                      const isDiagonal = rowIdx === colIdx;
                      const isError = !isDiagonal && val > 0;

                      if (matrixFilterMode === 'errors_only' && !isError) {
                        return (
                          <td
                            key={colIdx}
                            style={{ height: `${cellPixelSize}px`, width: `${cellPixelSize}px` }}
                            className="p-0 border-r border-stone-100 bg-stone-50/20"
                          />
                        );
                      }

                      let bgColor = 'bg-stone-50/30';
                      if (isDiagonal) {
                        const intensity = maxDiagonalVal > 0 ? val / maxDiagonalVal : 1;
                        if (intensity > 0.8) bgColor = 'bg-emerald-700 text-white font-bold';
                        else if (intensity > 0.5) bgColor = 'bg-emerald-600 text-white font-bold';
                        else if (intensity > 0.25) bgColor = 'bg-emerald-500 text-white';
                        else bgColor = 'bg-emerald-300 text-emerald-950';
                      } else if (val > 0) {
                        if (val > 5) bgColor = 'bg-rose-600 text-white font-bold';
                        else if (val > 2) bgColor = 'bg-rose-400 text-white';
                        else bgColor = 'bg-rose-200 text-rose-950 font-medium';
                      }

                      const predName = class_names[colIdx] || `Class ${colIdx}`;
                      const predParsed = parseClassName(predName);

                      return (
                        <td
                          key={colIdx}
                          onMouseEnter={() =>
                            setHoveredCell({
                              row: rowIdx,
                              col: colIdx,
                              count: val,
                              trueClass: `${crop} - ${disease}`,
                              predClass: `${predParsed.crop} - ${predParsed.disease}`
                            })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                          style={{ height: `${cellPixelSize}px`, width: `${cellPixelSize}px` }}
                          className={`p-0 text-center font-mono border-r border-stone-100 transition-transform ${bgColor} cursor-pointer hover:ring-2 hover:ring-stone-900 hover:z-10`}
                        >
                          {cellSize === 'large' ? val : val > 0 ? (isDiagonal ? '✓' : val) : ''}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Per-Class Precision / Recall / F1 Table (All 38 Classes) */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5 mb-6">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded-md bg-emerald-100 text-emerald-800">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-stone-900">
                Per-Class Performance Breakdown (38 Classes)
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Precision, recall, and F1 harmonic scores for all 38 individual crop disease and healthy foliage classes.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search crop or disease..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-stone-50/50"
            />
          </div>
        </div>

        {/* Crop Filter Badges */}
        <div className="flex flex-wrap gap-1.5 mb-5 pb-2">
          <button
            onClick={() => setSelectedCropFilter('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              selectedCropFilter === 'ALL'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Crops ({tableRows.length})
          </button>
          {availableCrops.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCropFilter(c)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedCropFilter === c
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Per-Class Table */}
        <div className="overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Class Identification</th>
                <th className="py-3 px-3">Crop</th>
                <th
                  onClick={() => handleSort('precision')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-stone-100 transition-colors"
                >
                  <span className="inline-flex items-center space-x-1">
                    <span>Precision</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('recall')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-stone-100 transition-colors"
                >
                  <span className="inline-flex items-center space-x-1">
                    <span>Recall</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('f1_score')}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-stone-100 transition-colors"
                >
                  <span className="inline-flex items-center space-x-1">
                    <span>F1-Score</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </span>
                </th>
                <th
                  onClick={() => handleSort('support')}
                  className="py-3 px-4 text-right cursor-pointer hover:bg-stone-100 transition-colors"
                >
                  <span className="inline-flex items-center space-x-1">
                    <span>Support</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
              {filteredRows.map((r) => (
                <tr key={r.idx} className="hover:bg-stone-50/80 transition-colors">
                  <td className="py-3 px-4 flex items-center space-x-2">
                    <span className="font-mono text-stone-400 text-[10px]">#{r.idx + 1}</span>
                    <span className="font-semibold text-stone-900">{r.disease}</span>
                    {r.isHealthy && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Healthy
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-stone-600">{r.crop}</td>
                  <td className="py-3 px-3 text-right font-mono text-stone-900">
                    {(r.precision * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-stone-900">
                    {(r.recall * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold font-mono ${
                        r.f1_score >= 0.98
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.f1_score >= 0.95
                          ? 'bg-stone-100 text-stone-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {(r.f1_score * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-stone-500">
                    {r.support}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
