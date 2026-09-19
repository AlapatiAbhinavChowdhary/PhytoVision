import React from 'react';
import { Leaf, ShieldCheck, Activity, Cpu } from 'lucide-react';

export default function Navbar({ isBackendOnline }) {
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-stone-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-600/20">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-stone-900 tracking-tight">PhytoVision</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200/60">
                XAI
              </span>
            </div>
            <p className="text-[11px] text-stone-500 -mt-0.5 font-medium hidden sm:block">
              Explainable Plant Disease Diagnosis
            </p>
          </div>
        </div>

        {/* Badges / Status */}
        <div className="flex items-center space-x-3">
          {/* Model info badge */}
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-stone-100/90 text-stone-600 text-xs font-medium border border-stone-200">
            <Cpu className="w-3.5 h-3.5 text-stone-500" />
            <span>EfficientNetB0</span>
            <span className="text-stone-300">•</span>
            <span className="text-emerald-700 font-semibold">99.12% Val Acc</span>
          </div>

          {/* Backend Status indicator */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors duration-200">
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className={isBackendOnline ? 'text-emerald-800' : 'text-amber-800'}>
              {isBackendOnline ? 'Model Online' : 'Connecting API...'}
            </span>
          </div>
        </div>

      </div>
    </header>
  );
}
