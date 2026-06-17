'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type FraudSignal = {
  id: string;
  signal_type: string;
  severity: string;
  status: string;
  notes: string | null;
  created_at: string | null;
};

type Props = {
  dealId: string;
  signals: FraudSignal[];
};

export default function CommodityFraudSignalsPanel({ dealId, signals }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function runFraudSignals() {
    setError(null);
    setInfo(null);

    const response = await fetch('/api/commodity/fraud-signals/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? 'Failed to run fraud signal checks.');
      return;
    }

    setInfo(
      result.signalCount > 0
        ? `${result.signalCount} fraud signal(s) detected.`
        : 'No fraud signals detected.',
    );

    startTransition(() => router.refresh());
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Fraud Signals</h2>
          <p className="text-sm text-zinc-400">
            Advanced suspicious-pattern checks across documents, counterparties, and deal signatures.
          </p>
        </div>

        <button
          onClick={runFraudSignals}
          disabled={isPending}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black"
        >
          Run Fraud Checks
        </button>
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="mb-3 rounded-xl border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {info}
        </div>
      ) : null}

      {signals.length === 0 ? (
        <div className="text-sm text-zinc-400">No fraud signals yet.</div>
      ) : (
        <div className="space-y-3">
          {signals.map((signal) => (
            <div
              key={signal.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
            >
              <div className="text-sm text-white">
                {signal.signal_type} • {signal.severity} • {signal.status}
              </div>
              <div className="mt-1 text-xs text-zinc-400">
                {signal.notes ?? '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}