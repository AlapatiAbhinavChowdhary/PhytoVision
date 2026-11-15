import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Leaf,
  FlaskConical,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Send,
  Droplets,
  Wind,
  HelpCircle,
  Clock,
  ChevronRight,
  MessageSquare,
  Flame,
  Check
} from 'lucide-react';
import { askGeminiAgronomist } from '../api';

export default function GeminiDiseaseInsights({
  diseaseInfo,
  prediction
}) {
  const [userQuestion, setUserQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState([]);
  const [qaError, setQaError] = useState(null);
  const [checkedSymptoms, setCheckedSymptoms] = useState({});

  if (!diseaseInfo) return null;

  const insights = diseaseInfo?.ai_insights;
  const isHealthy = prediction?.is_healthy;
  const cropName = prediction?.crop_name || diseaseInfo?.crop_name || 'Plant';
  const diseaseName = prediction?.predicted_class || diseaseInfo?.disease_name || 'Condition';
  const rawClass = prediction?.raw_class || diseaseInfo?.raw_class;

  // Urgency badge styling
  const urgency = insights?.urgency_level || (isHealthy ? 'Low - Routine Maintenance' : 'Moderate - Monitor & Treat');
  const isUrgent = urgency.toLowerCase().includes('high') || urgency.toLowerCase().includes('immediate');
  const isModerate = urgency.toLowerCase().includes('moderate');

  const toggleSymptom = (idx) => {
    setCheckedSymptoms((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleAskQuestion = async (customPrompt) => {
    const questionText = customPrompt || userQuestion;
    if (!questionText.trim() || isAsking) return;

    setIsAsking(true);
    setQaError(null);

    try {
      const response = await askGeminiAgronomist({
        question: questionText.trim(),
        crop_name: cropName,
        disease_name: diseaseName,
        raw_class: rawClass,
        is_healthy: isHealthy
      });

      setQaHistory((prev) => [
        ...prev,
        {
          question: questionText.trim(),
          answer: response.answer,
          source: response.source,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setUserQuestion('');
    } catch (err) {
      console.error('Gemini Agronomist Q&A error:', err);
      setQaError(err.message || 'Unable to receive response from Gemini. Please try again.');
    } finally {
      setIsAsking(false);
    }
  };

  const sampleQuestions = isHealthy
    ? [
        `What is the best fertilizer balance for ${cropName}?`,
        `How often should I water ${cropName} in hot weather?`,
        `What early signs of pests should I scout for?`
      ]
    : [
        `Is the fruit on this ${cropName} safe to harvest and eat?`,
        `What natural homemade spray can I make today?`,
        `Will this spread to other nearby vegetables?`,
        `How many days until I see improvement after treatment?`
      ];

  return (
    <div className="mt-8 rounded-3xl bg-gradient-to-b from-white via-emerald-50/20 to-white border border-emerald-200/90 shadow-sm overflow-hidden">
      
      {/* 1. Header Banner */}
      <div className="p-6 sm:p-7 border-b border-emerald-100 bg-gradient-to-r from-emerald-900 via-stone-900 to-emerald-950 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-200 flex items-center justify-center text-stone-900 shadow-md shadow-emerald-500/20 shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Gemini AI Agronomist Layer
                </span>
                <span className="text-[10px] bg-emerald-800/80 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-600/50">
                  {insights?.source === 'gemini' ? '⚡ Real-time Gemini 2.5' : '🛡️ Agronomic Knowledge Base'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                Pathology & Treatment Protocol
              </h2>
            </div>
          </div>

          {/* Urgency Badge */}
          <div className="self-start sm:self-auto">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border ${
                isUrgent
                  ? 'bg-rose-500/20 text-rose-200 border-rose-400/40'
                  : isModerate
                  ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                  : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{urgency}</span>
            </span>
          </div>

        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-7">

        {/* 2. Disease Overview & Pathology */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs">
          <div className="flex items-center space-x-2 text-stone-900 font-bold text-sm mb-2.5">
            <div className="p-1 rounded-md bg-emerald-100 text-emerald-800">
              <Leaf className="w-4 h-4" />
            </div>
            <h3 className="text-sm uppercase tracking-wider font-bold text-stone-700">
              {isHealthy ? 'Crop Health & Physiological Status' : 'Pathogen Biology & Impact'}
            </h3>
          </div>
          <p className="text-stone-700 text-sm leading-relaxed">
            {insights?.disease_overview || diseaseInfo?.what_it_means}
          </p>
        </div>

        {/* 3. Causes & Environmental Spread */}
        {insights?.causes_and_spread && (
          <div className="bg-amber-50/50 rounded-2xl p-5 border border-amber-200/70">
            <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm mb-2">
              <div className="p-1 rounded-md bg-amber-100 text-amber-800">
                <Wind className="w-4 h-4" />
              </div>
              <h3 className="text-sm uppercase tracking-wider font-bold text-amber-900">
                {isHealthy ? 'Optimal Growing Conditions' : 'Transmission & Environmental Drivers'}
              </h3>
            </div>
            <p className="text-stone-700 text-xs sm:text-sm leading-relaxed">
              {insights.causes_and_spread}
            </p>
          </div>
        )}

        {/* 4. Symptoms Checklist */}
        {insights?.symptoms && insights.symptoms.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center justify-between">
              <span>Field Scouting & Symptom Checklist</span>
              <span className="text-[11px] font-normal text-stone-400">Click to verify field observations</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {insights.symptoms.map((symptom, idx) => {
                const isChecked = !!checkedSymptoms[idx];
                return (
                  <div
                    key={idx}
                    onClick={() => toggleSymptom(idx)}
                    className={`cursor-pointer flex items-start space-x-3 p-3 rounded-xl border transition-all text-xs ${
                      isChecked
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                        : 'bg-stone-50/70 hover:bg-stone-100/70 border-stone-200 text-stone-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md mt-0.5 flex items-center justify-center border transition-colors ${
                        isChecked
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="flex-1 leading-snug">{symptom}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Dual-Column Treatment Protocol (Organic vs Chemical) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Organic & Biological Remedies */}
          <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-emerald-950 font-bold text-sm mb-3">
                <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
                  <Leaf className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-950">
                    {isHealthy ? 'Organic Nutrients & Soil Health' : 'Organic & Biological Remedies'}
                  </h3>
                  <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">
                    Eco-friendly & Food-Safe
                  </span>
                </div>
              </div>

              <ul className="space-y-2.5">
                {(insights?.organic_remedies || [diseaseInfo?.recommended_action]).map((remedy, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5 text-xs text-stone-700 leading-relaxed">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{remedy}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Conventional Chemical Treatments */}
          <div className="bg-slate-50/70 rounded-2xl p-5 border border-stone-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-stone-900 font-bold text-sm mb-3">
                <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">
                    {isHealthy ? 'Preventative Supplements' : 'Targeted Chemical Sprays'}
                  </h3>
                  <span className="text-[10px] text-indigo-700 font-semibold uppercase tracking-wider">
                    Active Ingredients & PHI Guidance
                  </span>
                </div>
              </div>

              <ul className="space-y-2.5">
                {(insights?.chemical_treatments || [
                  'Consult local agricultural extension for registered fungicides specific to this crop.'
                ]).map((treatment, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5 text-xs text-stone-700 leading-relaxed">
                    <ChevronRight className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>{treatment}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>

        {/* 6. Long-term Prevention & Cultural Care */}
        {insights?.preventative_measures && insights.preventative_measures.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs">
            <div className="flex items-center space-x-2 text-stone-900 font-bold text-sm mb-3">
              <div className="p-1 rounded-md bg-teal-100 text-teal-800">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">
                Long-Term Cultural & Preventive Protocol
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {insights.preventative_measures.map((measure, idx) => (
                <div key={idx} className="flex items-start space-x-2.5 text-xs text-stone-600 p-2.5 rounded-xl bg-stone-50">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                  <span className="leading-relaxed">{measure}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. Agronomist Farmer Pro-Tip */}
        {insights?.farmer_pro_tip && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-amber-500/10 border border-emerald-300/80 flex items-start space-x-3.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs uppercase font-extrabold tracking-wider text-emerald-950 mb-1">
                Agronomist Insider Tip
              </h4>
              <p className="text-xs sm:text-sm text-stone-800 leading-relaxed font-medium">
                {insights.farmer_pro_tip}
              </p>
            </div>
          </div>
        )}

        {/* 8. Interactive "Ask Gemini Agronomist" Chat / Consultation Box */}
        <div className="pt-6 border-t border-stone-200/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded-md bg-stone-900 text-emerald-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">
                Ask Gemini Agronomist a Question
              </h3>
            </div>
            <span className="text-[11px] text-stone-400">
              Interactive AI Consultation
            </span>
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {sampleQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAskQuestion(q)}
                disabled={isAsking}
                className="text-[11px] px-3 py-1.5 rounded-full bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 transition-colors text-stone-600 cursor-pointer text-left"
              >
                💬 {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskQuestion();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              placeholder={`Ask Gemini anything about treating this ${cropName} (${diseaseName})...`}
              disabled={isAsking}
              className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 text-xs sm:text-sm bg-white placeholder-stone-400"
            />
            <button
              type="submit"
              disabled={isAsking || !userQuestion.trim()}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold text-xs flex items-center space-x-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
            >
              {isAsking ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <span>Consult</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Error notice if ask fails */}
          {qaError && (
            <p className="text-xs text-rose-600 mt-2 font-medium">
              ⚠️ {qaError}
            </p>
          )}

          {/* Q&A Stream History */}
          {qaHistory.length > 0 && (
            <div className="mt-4 space-y-3">
              {qaHistory.map((item, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-stone-800">
                    <span className="flex items-center gap-1.5 text-stone-900">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Q: {item.question}
                    </span>
                    <span className="text-stone-400 font-normal">{item.timestamp}</span>
                  </div>
                  <div className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line bg-stone-50/80 p-3.5 rounded-xl border border-stone-100">
                    {item.answer}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
