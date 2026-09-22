import React from 'react';
import { Leaf, Cpu, BarChart3, Stethoscope } from 'lucide-react';

export default function Navbar({ isBackendOnline, activeTab, onSelectTab }) {
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-stone-200/80 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Brand */}
        <div
          onClick={() => onSelectTab && onSelectTab('diagnosis')}
          className="flex items-center space-x-3 cursor-pointer shrink-0"
        >
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

        {/* Tab Navigation Controls */}
        <nav className="flex items-center rounded-2xl bg-stone-100/90 p-1 border border-stone-200/80 text-xs font-semibold">
          <button
            onClick={() => onSelectTab && onSelectTab('diagnosis')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'diagnosis'
                ? 'bg-white text-emerald-900 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
            <span>Diagnosis</span>
          </button>
          
          <button
            onClick={() => onSelectTab && onSelectTab('performance')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'performance'
                ? 'bg-white text-emerald-900 shadow-xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Model Performance</span>
            <span className="hidden md:inline-block px-1.5 py-0.2 rounded-md text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200">
              99.12%
            </span>
          </button>
        </nav>

        {/* Badges / Status */}
        <div className="flex items-center space-x-3 shrink-0">
          {/* Model info badge */}
          <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-stone-100/90 text-stone-600 text-xs font-medium border border-stone-200">
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
