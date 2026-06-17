'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Option = {
  id: string;
  label: string;
};

type ExecutionOption = {
  id: string;
  label: string;
};

type Props = {
  pipelineId: string;
  pricingRequestOptions: Option[];
  pricingExecutionOptions: ExecutionOption[];
  isClosed: boolean;
};

export default function PricingResultIngestionPanel({
  pipelineId,
  pricingRequestOptions,
  pricingExecutionOptions,
  isClosed,
}: Props) {
  const router = useRouter();

  const [pricingRequestId, setPricingRequestId] = useState('');
  const [pricingExecutionId, setPricingExecutionId] = useState('');
  const [payload, setPayload] = useState('');
  const [selectQuote, setSelectQuote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ingestResult() {
    if (!pricingRequestId) {
      setError('Select a pricing request');
      return;
    }

    if (!payload) {
      setError('Paste a pricing result payload');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(payload);
    } catch {
      setError('Invalid JSON payload');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/integrations/pricing/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipelineId,
          pricingRequestId,
          pricingExecutionId: pricingExecutionId || null,
          selected: selectQuote,
          response: parsed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to ingest result');
        return;
      }

      alert('Quote created from pricing result');
      router.refresh();
      setPayload('');
    } catch (err) {
      console.error(err);
      setError('Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
      <h3 className="text-white font-semibold text-lg">
        Pricing Result Ingestion
      </h3>

      {error && (
        <div className="text-red-400 text-sm">
          {error}
        </div>
      )}

      {pricingRequestOptions.length === 0 ? (
        <div className="text-zinc-400 text-sm">
          Create a pricing request first.
        </div>
      ) : (
        <>
          <select
            value={pricingRequestId}
            onChange={(e) => setPricingRequestId(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm"
            disabled={isClosed}
          >
            <option value="">Select Pricing Request</option>
            {pricingRequestOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={pricingExecutionId}
            onChange={(e) => setPricingExecutionId(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm"
            disabled={isClosed}
          >
            <option value="">Optional: Link Pricing Execution</option>
            {pricingExecutionOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          <textarea
            placeholder="Paste NormalizedPricingResponse JSON here..."
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            rows={8}
            className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm font-mono"
            disabled={isClosed}
          />

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={selectQuote}
              onChange={(e) => setSelectQuote(e.target.checked)}
              disabled={isClosed}
            />
            Mark this quote as selected
          </label>

          <button
            onClick={ingestResult}
            disabled={isClosed || loading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
          >
            {loading ? 'Ingesting...' : 'Ingest Pricing Result'}
          </button>
        </>
      )}
    </div>
  );
}