'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Rebuttals = {
  consultative: string;
  direct: string;
  savings_focused: string;
  urgency_focused: string;
  short_follow_up: string;
};

type Props = {
  pipelineId: string;
  isClosed: boolean;
};

const CATEGORIES = [
  'generic',
  'happy_with_current_supplier',
  'too_busy',
  'not_interested',
  'send_me_something',
  'price_too_high',
  'contract_not_expiring_yet',
  'need_to_think_about_it',
];

export default function RebuttalGenerator({ pipelineId, isClosed }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [objectionText, setObjectionText] = useState('');
  const [category, setCategory] = useState('generic');
  const [rebuttals, setRebuttals] = useState<Rebuttals | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!objectionText.trim()) {
      setError('Enter an objection.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/pipeline/rebuttal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipelineId,
          objectionText,
          objectionCategory: category,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to generate.');
        return;
      }

      setRebuttals(data.rebuttals);
      setSelected(null);
    } catch (err) {
      console.error(err);
      setError('Unexpected error.');
    } finally {
      setLoading(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  function select(text: string) {
    setSelected(text);

    // Save selected rebuttal
    fetch('/api/pipeline/rebuttal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pipelineId,
        objectionText,
        objectionCategory: category,
        selectedRebuttal: text,
      }),
    }).then(() => {
      startTransition(() => router.refresh());
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
      <div>
        <h3 className="text-white font-semibold text-lg">Rebuttal Generator</h3>
        <p className="text-zinc-400 text-sm">
          Convert objections into controlled responses.
        </p>
      </div>

      {isClosed && (
        <div className="text-amber-400 text-sm">
          Pipeline is closed. You can still generate for review.
        </div>
      )}

      {error && (
        <div className="text-red-400 text-sm">{error}</div>
      )}

      <textarea
        value={objectionText}
        onChange={(e) => setObjectionText(e.target.value)}
        placeholder="Enter customer objection..."
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white text-sm"
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-white text-sm"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      <button
        onClick={generate}
        disabled={loading}
        className="bg-white text-black px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate'}
      </button>

      {rebuttals && (
        <div className="grid gap-4 mt-4">
          {Object.entries(rebuttals).map(([key, text]) => (
            <div
              key={key}
              className={`border rounded-xl p-3 text-sm ${
                selected === text
                  ? 'border-emerald-500 bg-emerald-950/30'
                  : 'border-zinc-800 bg-zinc-900'
              }`}
            >
              <div className="text-xs text-zinc-400 mb-2 uppercase">
                {key.replace('_', ' ')}
              </div>

              <div className="text-white whitespace-pre-wrap">
                {text}
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => copy(text)}
                  className="text-xs px-2 py-1 border border-zinc-700 rounded"
                >
                  Copy
                </button>

                <button
                  onClick={() => select(text)}
                  className="text-xs px-2 py-1 border border-zinc-700 rounded"
                >
                  Use
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}