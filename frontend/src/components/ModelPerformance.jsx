import React, { useState, useMemo } from 'react';
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
  Eye,
  SlidersHorizontal,
  Layers,
  Sparkles,
  ShieldCheck,
  Filter
} from 'lucide-react';

function parseClassName(raw) {
  if (!raw) return { crop: 'Unknown', disease: 'Unknown', isHealthy: false };
  const parts = raw.split('___');
  let crop = parts[0].replace(/_/g, ' ');
  // Clean special naming like Cherry_(including_sour)
  crop = crop.replace(/\s*\([^)]*\)/g, '');
  const disease = parts[1] ? parts[1].replace(/_/g, ' ') : 'Unknown';
  const isHealthy = disease.toLowerCase().includes('healthy');
  return { crop, disease, isHealthy };
}

export default function ModelPerformance({ metrics, selectedClassFocus, onSelectClassFocus }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCropFilter, setSelectedCropFilter] = useState('ALL');
  const [sortField, setSortField] = useState('f1_score');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  
  // Matrix controls
  const [hoveredCell, setHoveredCell] = useState(null); // { row, col, count, trueClass, predClass }
  const [matrixFilterMode, setMatrixFilterMode] = useState('all'); // 'all' | 'errors_only'
  const [highlightedClassIdx, setHighlightedClassIdx] = useState(null);
  const [cellSize, setCellSize] = useState('standard'); // 'compact' | 'standard' | 'large'

  if (!metrics) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-stone-900">Loading Model Performance Data...</h3>
        <p className="text-stone-500 text-xs mt-1">Retrieving validation benchmark metrics and confusion matrix.</p>
      </div>
    );
  }

  const {
    overall_accuracy = 0.9912,
    per_class_metrics = {},
    confusion_matrix = [],
    class_names = []
  } = metrics;

  // Aggregate stats
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

  // Unique crop categories for filter pills
  const availableCrops = useMemo(() => {
    const crops = new Set();
    class_names.forEach((cn) => {
      const { crop } = parseClassName(cn);
      crops.add(crop);
    });
    return Array.from(crops).sort();
  }, [class_names]);

  // Prepared per-class rows for table
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

  // Filtered & Sorted rows
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

  // Max support count in confusion matrix diagonal for relative coloring
  const maxDiagonalVal = useMemo(() => {
    let maxVal = 1;
    for (let i = 0; i < confusion_matrix.length; i++) {
      if (confusion_matrix[i] && confusion_matrix[i][i] > maxVal) {
        maxVal = confusion_matrix[i][i];
      }
    }
    return maxVal;
  }, [confusion_matrix]);

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

  // Cell dimensions based on toggle
  const cellPixelSize = cellSize === 'compact' ? 14 : cellSize === 'large' ? 26 : 20;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header & Primary KPI Cards */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-6 mb-6">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200/60 inline-flex mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Independent Validation Benchmark</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
              Model Performance & Evaluation Metrics
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 leading-relaxed max-w-2xl">
              Comprehensive statistical evaluation of the fine-tuned EfficientNetB0 architecture across 38 distinct crop categories and foliar pathologies on 17,572 unseen test samples.
            </p>
          </div>

          {/* Download CSV Button */}
          <button
            onClick={exportCSV}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-semibold transition-colors shadow-2xs self-start md:self-auto cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* 4 Summary Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Overall Accuracy */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />
            <span className="text-[11px] uppercase tracking-wider font-semibold text-emerald-100">
              Overall Accuracy
            </span>
            <div className="text-3xl sm:text-4xl font-black mt-1 tracking-tight">
              {(overall_accuracy * 100).toFixed(2)}%
            </div>
            <p className="text-[11px] text-emerald-100/90 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 inline shrink-0" />
              <span>Top-1 Exact Categorical Match</span>
            </p>
          </div>

          {/* Macro F1-Score */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 shadow-2xs">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
              Macro F1-Score
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-stone-900 mt-1 tracking-tight">
              {(summaryStats.macroF1 * 100).toFixed(2)}%
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Balanced harmonic mean across all 38 classes
            </p>
          </div>

          {/* Macro Precision & Recall */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 shadow-2xs">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
              Precision / Recall
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-stone-900 mt-1 tracking-tight">
              {(summaryStats.macroPrecision * 100).toFixed(1)}% / {(summaryStats.macroRecall * 100).toFixed(1)}%
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Macro unweighted class averages
            </p>
          </div>

          {/* Total Test Support */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 shadow-2xs">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-stone-500">
              Test Support
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-stone-900 mt-1 tracking-tight">
              {summaryStats.totalSupport.toLocaleString()}
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Annotated images across 38 categories
            </p>
          </div>
        </div>
      </div>

      {/* 2. Confusion Matrix Heatmap Section (38x38) */}
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
              Rows represent ground truth classes; columns represent predicted classes. Diagonal cells represent true positives.
            </p>
          </div>

          {/* Matrix Interactive Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Error filter toggle */}
            <div className="flex items-center rounded-xl bg-stone-100 p-1 border border-stone-200 text-xs font-medium">
              <button
                onClick={() => setMatrixFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  matrixFilterMode === 'all'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All Cells
              </button>
              <button
                onClick={() => setMatrixFilterMode('errors_only')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                  matrixFilterMode === 'errors_only'
                    ? 'bg-rose-500 text-white shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span>Spot Confusions Only</span>
              </button>
            </div>

            {/* Cell Size Zoom */}
            <div className="flex items-center space-x-1 px-2.5 py-1 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600">
              <span className="text-[11px] font-medium text-stone-400 mr-1">Scale:</span>
              <button
                onClick={() => setCellSize('compact')}
                className={`px-2 py-0.5 rounded cursor-pointer ${cellSize === 'compact' ? 'bg-stone-200 font-bold text-stone-900' : 'hover:bg-stone-100'}`}
              >
                S
              </button>
              <button
                onClick={() => setCellSize('standard')}
                className={`px-2 py-0.5 rounded cursor-pointer ${cellSize === 'standard' ? 'bg-stone-200 font-bold text-stone-900' : 'hover:bg-stone-100'}`}
              >
                M
              </button>
              <button
                onClick={() => setCellSize('large')}
                className={`px-2 py-0.5 rounded cursor-pointer ${cellSize === 'large' ? 'bg-stone-200 font-bold text-stone-900' : 'hover:bg-stone-100'}`}
              >
                L
              </button>
            </div>

            {/* Clear highlight button */}
            {highlightedClassIdx !== null && (
              <button
                onClick={() => setHighlightedClassIdx(null)}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200 cursor-pointer"
              >
                Clear Focus (#{highlightedClassIdx + 1})
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Hover Inspector / Tooltip Bar */}
        <div className="mb-4 p-3 rounded-2xl bg-stone-50 border border-stone-200/80 min-h-[44px] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          {hoveredCell ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-stone-500 uppercase text-[10px]">Actual (Row {hoveredCell.row + 1}):</span>
                <span className="font-bold text-stone-900">
                  {hoveredCell.trueClass.replace(/___/g, ' → ')}
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-stone-500 uppercase text-[10px]">Predicted (Col {hoveredCell.col + 1}):</span>
                <span className="font-bold text-stone-900">
                  {hoveredCell.predClass.replace(/___/g, ' → ')}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                  hoveredCell.isDiagonal
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {hoveredCell.isDiagonal ? '✓ Correct (TP)' : '⚠ Misclassification'}
                </span>
                <span className="font-mono font-bold text-stone-800">
                  Count: {hoveredCell.count} sample{hoveredCell.count === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-stone-500">
              <Info className="w-3.5 h-3.5 text-stone-400" />
              <span>Hover over any of the 1,444 matrix cells to inspect exact actual vs predicted sample counts.</span>
            </div>
          )}

          {/* Matrix Legend */}
          <div className="flex items-center space-x-3 text-[11px] text-stone-500 shrink-0">
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
              <span>True Positive</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
              <span>Confusion Error</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-stone-100 border border-stone-200 inline-block" />
              <span>Zero</span>
            </div>
          </div>
        </div>

        {/* Scrollable Matrix Container */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] border border-stone-200 rounded-2xl bg-stone-900/5 p-3 scrollbar-thin">
          <div
            className="inline-block"
            style={{
              minWidth: `${(class_names.length + 1) * cellPixelSize + 140}px`
            }}
          >
            {/* Top axis label indicator */}
            <div className="flex items-center text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 pl-36">
              <span>Predicted Class (Columns 1 → 38)</span>
            </div>

            {/* Matrix Rows */}
            {confusion_matrix.map((row, rowIdx) => {
              const trueClassName = class_names[rowIdx] || `Class ${rowIdx + 1}`;
              const parsedTrue = parseClassName(trueClassName);
              const isRowFocused = highlightedClassIdx === rowIdx;

              return (
                <div
                  key={rowIdx}
                  className={`flex items-center ${isRowFocused ? 'bg-emerald-50/80 -mx-1 px-1 rounded-sm' : ''}`}
                >
                  {/* Left row header: index + name */}
                  <div
                    onClick={() => setHighlightedClassIdx(highlightedClassIdx === rowIdx ? null : rowIdx)}
                    title={`Row ${rowIdx + 1}: ${trueClassName}`}
                    className="w-36 shrink-0 text-right pr-2 text-[10px] truncate font-medium text-stone-600 hover:text-emerald-700 cursor-pointer select-none"
                  >
                    <span className="font-mono text-stone-400 mr-1">#{rowIdx + 1}</span>
                    <span>{parsedTrue.crop} {parsedTrue.disease}</span>
                  </div>

                  {/* 38 Cells in this row */}
                  <div className="flex items-center">
                    {row.map((val, colIdx) => {
                      const predClassName = class_names[colIdx] || `Class ${colIdx + 1}`;
                      const isDiagonal = rowIdx === colIdx;
                      const isColFocused = highlightedClassIdx === colIdx;
                      const isCellFocused = isRowFocused || isColFocused;

                      // Filter out zero / diagonal if in 'errors_only' mode
                      const isHiddenInErrorMode = matrixFilterMode === 'errors_only' && (isDiagonal || val === 0);

                      // Compute color
                      let bgColor = 'bg-stone-50';
                      let textColor = 'text-stone-300';

                      if (isDiagonal) {
                        // Emerald intensity gradient
                        const intensity = Math.min(Math.max(val / maxDiagonalVal, 0.4), 1);
                        if (intensity > 0.85) bgColor = 'bg-emerald-700 text-white';
                        else if (intensity > 0.6) bgColor = 'bg-emerald-600 text-white';
                        else bgColor = 'bg-emerald-500 text-white';
                      } else if (val > 0) {
                        // Off-diagonal confusion error: amber/rose
                        if (val >= 10) bgColor = 'bg-rose-600 text-white font-extrabold animate-pulse';
                        else if (val >= 4) bgColor = 'bg-rose-500 text-white font-bold';
                        else bgColor = 'bg-amber-400 text-amber-950 font-semibold';
                      }

                      if (isHiddenInErrorMode) {
                        bgColor = 'bg-stone-100 opacity-20';
                      }

                      return (
                        <div
                          key={colIdx}
                          onMouseEnter={() =>
                            setHoveredCell({
                              row: rowIdx,
                              col: colIdx,
                              count: val,
                              trueClass: trueClassName,
                              predClass: predClassName,
                              isDiagonal
                            })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                          onClick={() => setHighlightedClassIdx(rowIdx)}
                          style={{
                            width: `${cellPixelSize}px`,
                            height: `${cellPixelSize}px`
                          }}
                          className={`flex items-center justify-center text-[8px] sm:text-[9px] cursor-pointer transition-transform duration-75 m-[0.5px] rounded-[2px] ${bgColor} ${
                            isCellFocused ? 'ring-1.5 ring-emerald-400 z-10' : ''
                          } hover:ring-2 hover:ring-stone-900 hover:scale-125 hover:z-20`}
                        >
                          {cellSize !== 'compact' && val > 0 ? val : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Bottom column indices */}
            <div className="flex items-center mt-2 pl-36">
              {class_names.map((_, colIdx) => (
                <div
                  key={colIdx}
                  style={{ width: `${cellPixelSize}px` }}
                  title={`Col ${colIdx + 1}: ${class_names[colIdx]}`}
                  className="text-center text-[7px] font-mono text-stone-400 overflow-hidden"
                >
                  {colIdx + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-stone-400 mt-2 text-center">
          💡 Click any row name or class cell to highlight its cross-axial predictions across all 38 categories.
        </p>
      </div>

      {/* 3. Sortable & Filterable Per-Class Metrics Table */}
      <div className="bg-white rounded-3xl border border-stone-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5 mb-5">
          <div>
            <h2 className="text-lg font-bold text-stone-900">
              Per-Class Diagnostic Precision, Recall & F1-Score
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Click any column header to sort. Use search or quick crop filters to investigate specific cultivars.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by crop, disease, or status..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Crop Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-none text-xs">
          <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Crop:</span>
          </span>
          <button
            onClick={() => setSelectedCropFilter('ALL')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedCropFilter === 'ALL'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Crops ({tableRows.length})
          </button>
          {availableCrops.map((crop) => {
            const count = tableRows.filter((r) => r.crop.toLowerCase() === crop.toLowerCase()).length;
            const isSelected = selectedCropFilter.toLowerCase() === crop.toLowerCase();
            return (
              <button
                key={crop}
                onClick={() => setSelectedCropFilter(isSelected ? 'ALL' : crop)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-2xs font-semibold'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {crop} ({count})
              </button>
            );
          })}
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto border border-stone-200/80 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3 w-12 text-center text-stone-400">#</th>
                <th
                  onClick={() => handleSort('rawClass')}
                  className="py-3 px-4 cursor-pointer hover:text-emerald-800 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Cultivar & Condition</span>
                    {sortField === 'rawClass' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-stone-300" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('precision')}
                  className="py-3 px-4 cursor-pointer hover:text-emerald-800 select-none text-right"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Precision</span>
                    {sortField === 'precision' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-stone-300" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('recall')}
                  className="py-3 px-4 cursor-pointer hover:text-emerald-800 select-none text-right"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Recall</span>
                    {sortField === 'recall' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-stone-300" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('f1_score')}
                  className="py-3 px-4 cursor-pointer hover:text-emerald-800 select-none text-right"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>F1-Score</span>
                    {sortField === 'f1_score' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-stone-300" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('support')}
                  className="py-3 px-4 cursor-pointer hover:text-emerald-800 select-none text-right"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Support</span>
                    {sortField === 'support' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-stone-300" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 bg-white">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-stone-400">
                    No classes match "{searchTerm}".
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const f1Percent = Math.round(row.f1_score * 100);
                  const precPercent = Math.round(row.precision * 100);
                  const recPercent = Math.round(row.recall * 100);

                  return (
                    <tr
                      key={row.rawClass}
                      className="hover:bg-stone-50/80 transition-colors group"
                    >
                      <td className="py-3 px-3 text-center font-mono text-[11px] text-stone-400">
                        {row.idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-stone-900">
                            {row.crop}
                          </span>
                          <span className="text-stone-400">•</span>
                          <span className={row.isHealthy ? 'text-emerald-700 font-medium' : 'text-stone-700'}>
                            {row.disease}
                          </span>
                          {row.isHealthy && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                              Healthy
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                          {row.rawClass}
                        </div>
                      </td>

                      {/* Precision */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-bold text-stone-800">
                          {row.precision.toFixed(3)}
                        </div>
                        <div className="w-16 h-1.5 bg-stone-100 rounded-full overflow-hidden ml-auto mt-1">
                          <div
                            className="h-full bg-teal-500 rounded-full"
                            style={{ width: `${precPercent}%` }}
                          />
                        </div>
                      </td>

                      {/* Recall */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-bold text-stone-800">
                          {row.recall.toFixed(3)}
                        </div>
                        <div className="w-16 h-1.5 bg-stone-100 rounded-full overflow-hidden ml-auto mt-1">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${recPercent}%` }}
                          />
                        </div>
                      </td>

                      {/* F1-Score */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-extrabold text-emerald-700">
                          {row.f1_score.toFixed(3)}
                        </div>
                        <div className="w-16 h-1.5 bg-stone-100 rounded-full overflow-hidden ml-auto mt-1">
                          <div
                            className="h-full bg-emerald-600 rounded-full"
                            style={{ width: `${f1Percent}%` }}
                          />
                        </div>
                      </td>

                      {/* Support */}
                      <td className="py-3 px-4 text-right font-mono text-stone-600">
                        {row.support.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 pt-4 mt-2">
          <span>
            Showing <strong>{filteredRows.length}</strong> of <strong>{tableRows.length}</strong> class metrics
          </span>
          <span className="text-[11px] text-stone-400">
            Pre-computed evaluation results from PlantVillage validation dataset
          </span>
        </div>
      </div>
    </div>
  );
}
