'use client';

import React, { useState } from 'react';
import { Send, Sparkles, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

export function GovernedAiAssistant({ campaignId }: { campaignId: string }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  const predefinedPrompts = [
    'What is our current household coverage rate?',
    'Show aggregate turnout progression from authorized agents.',
    'Summarize reported community infrastructure issues.',
    'How many Voter Information Slips (VIS) were issued at civic desks?',
    'Who is most likely to vote for our candidate?', // deliberate guardrail test
  ];

  async function handleAsk(queryToRun?: string) {
    const q = queryToRun || prompt;
    if (!q.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch('/api/v1/analytics/governed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: q, campaignId }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || { message: 'Query failed' });
      } else {
        setResponse(json.data);
      }
    } catch (e: any) {
      setError({ message: e.message || 'Network request failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Governed AI Natural Language Analytics</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Policy Guarded (Docs 13)
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Ask operational questions in plain language. Strictly enforces non-inference rules (disallows persuasion scores, ideology, or demographic profiling).
      </p>

      {/* Quick Prompts */}
      <div className="flex flex-wrap gap-2 mb-4">
        {predefinedPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              setPrompt(p);
              handleAsk(p);
            }}
            className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
              idx === predefinedPrompts.length - 1
                ? 'border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100/50'
                : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          placeholder="Ask an operational query (e.g. 'Show coverage by ward' or 'Check pending visits')..."
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
        />
        <button
          onClick={() => handleAsk()}
          disabled={loading || !prompt.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>Query</span>
        </button>
      </div>

      {/* Guardrail Violation Alert */}
      {error && (
        <div className="mt-4 p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-900 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-rose-950">
              {error.code === 'GUARDRAIL_VIOLATION' ? 'Strict Non-Inference Policy Enforced' : 'Query Failed'}
            </span>
            <p className="text-[11px] text-rose-800 mt-0.5">{error.message}</p>
            {error.details && (
              <pre className="mt-2 text-[10px] font-mono bg-rose-100 p-2 rounded text-rose-900 overflow-x-auto">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Results Box */}
      {response && (
        <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-slate-900">Query Result</span>
            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {response.guardrailEvaluation}
            </span>
          </div>
          <p className="text-slate-700 mb-3">{response.explanation}</p>
          <pre className="text-[11px] font-mono bg-white p-3 rounded-lg border border-slate-200 overflow-x-auto">
            {JSON.stringify(response.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
