import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

export default function ImageUploader({
  selectedFile,
  previewUrl,
  onFileSelect,
  onClear,
  onSubmit,
  isLoading
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndSelect = (file) => {
    setDragError(null);
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setDragError('Please upload a standard image file (JPEG, PNG, or WebP).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setDragError('Image is larger than 20MB. Please select a smaller photo.');
      return;
    }

    onFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelect(e.target.files[0]);
    }
  };

  return (
    <div className="glass-panel glass-enter rounded-3xl p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-stone-900">Upload Plant Foliage Photo</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Take a clear photo of an individual leaf showing any lesions, spots, or healthy surface.
          </p>
        </div>
        {previewUrl && (
          <button
            onClick={onClear}
            disabled={isLoading}
            className="flex items-center space-x-1 text-xs text-stone-500 hover:text-rose-600 transition-colors py-1 px-2.5 rounded-lg hover:bg-rose-50"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Upload Box / Dropzone */}
      {!previewUrl ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/95 scale-[0.99]'
              : 'border-white/90 hover:border-emerald-400 hover:bg-white bg-white/90'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleInputChange}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center mx-auto mb-3.5 transition-transform group-hover:scale-110 shadow-xs">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-sm font-semibold text-stone-800 mb-1">
            Drag and drop your leaf photo here, or <span className="text-emerald-700 underline">browse</span>
          </h3>
          <p className="text-xs text-stone-500">
            Supports JPEG, PNG, or WebP up to 20MB
          </p>
        </div>
      ) : (
        /* Preview & Submit state */
        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-stone-50 border border-stone-200/70">
          <div className="relative w-44 h-44 rounded-xl overflow-hidden shadow-xs border border-stone-200 bg-black/5 shrink-0">
            <img
              src={previewUrl}
              alt="Leaf Preview"
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs text-xs flex items-center space-x-1"
              title="Change Image"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="text-[10px]">Change</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>

          <div className="flex-1 w-full flex flex-col justify-between self-stretch py-1">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                  Ready for diagnosis
                </span>
                {selectedFile && (
                  <span className="text-xs text-stone-500 truncate max-w-xs">
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                  </span>
                )}
              </div>
              <h4 className="text-base font-bold text-stone-900 mt-1">
                Leaf Image Loaded
              </h4>
              <p className="text-xs text-stone-600 mt-1">
                Our model will compare disease patterns and show the visual evidence behind its result.
              </p>
            </div>

            <div className="pt-4 mt-2 border-t border-stone-200/60 flex items-center gap-3">
              <button
                onClick={onSubmit}
                disabled={isLoading}
                className="glass-button flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{isLoading ? 'Analyzing Foliage...' : 'Run Diagnosis'}</span>
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>

              <button
                onClick={onClear}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {dragError && (
        <div className="mt-3 flex items-center space-x-2 text-rose-600 text-xs bg-rose-50 p-2.5 rounded-lg border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{dragError}</span>
        </div>
      )}
    </div>
  );
}
