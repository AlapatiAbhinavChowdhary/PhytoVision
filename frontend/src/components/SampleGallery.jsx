import React from 'react';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export const SAMPLE_DATA = [
  {
    id: 'tomato_late_blight',
    name: 'Tomato — Late Blight',
    crop: 'Tomato',
    condition: 'Late Blight',
    isHealthy: false,
    severity: 'High',
    url: '/samples/tomato_late_blight.jpg',
    description: 'Dark water-soaked lesions across leaf blades'
  },
  {
    id: 'tomato_healthy',
    name: 'Tomato — Healthy',
    crop: 'Tomato',
    condition: 'Healthy Leaf',
    isHealthy: true,
    severity: 'None',
    url: '/samples/tomato_healthy.jpg',
    description: 'Clean emerald foliage with zero lesions'
  },
  {
    id: 'apple_scab',
    name: 'Apple — Apple Scab',
    crop: 'Apple',
    condition: 'Apple Scab',
    isHealthy: false,
    severity: 'Medium',
    url: '/samples/apple_scab.jpg',
    description: 'Dark velvety fungal spots on leaf surfaces'
  },
  {
    id: 'corn_common_rust',
    name: 'Corn — Common Rust',
    crop: 'Corn (Maize)',
    condition: 'Common Rust',
    isHealthy: false,
    severity: 'Medium',
    url: '/samples/corn_common_rust.jpg',
    description: 'Cinnamon-brown powdery rust pustules'
  },
  {
    id: 'bell_pepper_bacterial_spot',
    name: 'Pepper — Bacterial Spot',
    crop: 'Bell Pepper',
    condition: 'Bacterial Spot',
    isHealthy: false,
    severity: 'High',
    url: '/samples/bell_pepper_bacterial_spot.jpg',
    description: 'Greasy spots with distinctive yellow halos'
  },
  {
    id: 'grape_black_rot',
    name: 'Grape — Black Rot',
    crop: 'Grape',
    condition: 'Black Rot',
    isHealthy: false,
    severity: 'High',
    url: '/samples/grape_black_rot.jpg',
    description: 'Reddish-brown necrotic patches'
  },
];

export default function SampleGallery({ onSelectSample, activeSampleId, isLoading }) {
  return (
    <div className="glass-panel glass-enter rounded-3xl p-5 mb-8">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold text-stone-900 uppercase tracking-wider">
            Quick Try — Preloaded Leaf Samples
          </h2>
        </div>
        <span className="text-xs text-stone-500 font-medium hidden sm:inline">
          Click any card to analyze instantly
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {SAMPLE_DATA.map((sample) => {
          const isSelected = activeSampleId === sample.id;
          return (
            <button
              key={sample.id}
              onClick={() => onSelectSample(sample)}
              disabled={isLoading}
              className={`group text-left p-2.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/95 ring-2 ring-emerald-600/20 shadow-xs'
                  : 'border-white/90 hover:border-emerald-300 hover:bg-white bg-white/90'
              } ${isLoading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {/* Image preview */}
              <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-stone-100 mb-2 border border-stone-200/50">
                <img
                  src={sample.url}
                  alt={sample.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span
                  className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                    sample.isHealthy
                      ? 'bg-emerald-600/90 text-white'
                      : sample.severity === 'High'
                      ? 'bg-rose-600/90 text-white'
                      : 'bg-amber-600/90 text-white'
                  }`}
                >
                  {sample.isHealthy ? 'Healthy' : sample.severity}
                </span>
              </div>

              {/* Caption */}
              <div>
                <div className="text-[11px] font-medium text-stone-500 truncate">
                  {sample.crop}
                </div>
                <div className="text-xs font-bold text-stone-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                  {sample.condition}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
