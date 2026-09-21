import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, Brain, CheckCircle2 } from 'lucide-react';

const STEPS = [
  'Preprocessing leaf foliage and normalizing channels...',
  'Evaluating 38 disease classes with EfficientNetB0...',
  'Comparing visual patterns across the leaf...',
  'Mapping the regions that influenced the result...',
  'Checking evidence strength before the result is ready...'
];

export default function LoadingState() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 900);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="glass-panel glass-enter rounded-3xl p-8 mb-8">
      <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto py-6">
        
        {/* Animated Icon Ring */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm animate-pulse-subtle">
            <Brain className="w-8 h-8 animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-xs">
            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
          </div>
        </div>

        <h3 className="text-lg font-bold text-stone-900 mb-1">
          Reading Plant Health
        </h3>
        <p className="text-xs text-stone-500 mb-6">
          Comparing visual patterns and preparing your result...
        </p>

        {/* Step progress checklist */}
        <div className="w-full space-y-2.5 text-left bg-stone-50/80 p-4 rounded-xl border border-stone-200/60">
          {STEPS.map((step, idx) => {
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;

            return (
              <div
                key={idx}
                className={`flex items-center space-x-2.5 text-xs transition-opacity duration-300 ${
                  isDone
                    ? 'text-emerald-800 font-medium'
                    : isCurrent
                    ? 'text-stone-900 font-semibold'
                    : 'text-stone-400 opacity-60'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-stone-300 shrink-0" />
                )}
                <span>{step}</span>
              </div>
            );
          })}
        </div>

        {/* Skeleton Shimmer */}
        <div className="w-full mt-6 grid grid-cols-2 gap-4">
          <div className="h-44 rounded-xl bg-stone-100 animate-pulse" />
          <div className="h-44 rounded-xl bg-stone-100 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
