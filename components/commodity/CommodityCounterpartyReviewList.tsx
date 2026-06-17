'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type CommodityCounterparty = {
  id: string;
  name: string;
  role: string;
  verification_status: string | null;
  risk_flags: string[] | null;
};

type Props = {
  counterparties: CommodityCounterparty[];
};

export default function CommodityCounterpartyReviewList({ counterparties }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [riskFlagsById, setRiskFlagsById] = useState<Record<string, string>>(
    Object.fromEntries(
      counterparties.map((counterparty) => [
        counterparty.id,
        counterparty.risk_flags?.join(', ') ?? '',
      ]),
    ),
  );

  async function updateCounterparty(counterpartyId: string, verificationStatus: string) {
    setError(null);

    const normalizedRiskFlags = (riskFlagsById[counterpartyId] ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const response = await fetch('/api/commodity/counterparties/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        counterpartyId,
        verificationStatus,
        riskFlags: normalizedRiskFlags,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? 'Failed to update counterparty.');
      return;
    }

    startTransition(() => router.refresh());
  }

  if (counterparties.length === 0) {
    return <div className="text-sm text-zinc-400">No counterparties yet.</div>;
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {counterparties.map((counterparty) => (
        <div
          key={counterparty.id}
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
        >
          <div className="text-sm text-white">
            {counterparty.name} • {counterparty.role}
          </div>

          <div className="mt-1 text-xs text-zinc-400">
            Status: {counterparty.verification_status ?? 'unverified'}
          </div>

          <input
            value={riskFlagsById[counterparty.id] ?? ''}
            onChange={(e) =>
              setRiskFlagsById((current) => ({
                ...current,
                [counterparty.id]: e.target.value,
              }))
            }
            placeholder="Risk flags (comma separated)"
            className="mt-3 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => updateCounterparty(counterparty.id, 'in_review')}
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white"
            >
              In Review
            </button>
            <button
              onClick={() => updateCounterparty(counterparty.id, 'verified')}
              disabled={isPending}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
            >
              Verified
            </button>
            <button
              onClick={() => updateCounterparty(counterparty.id, 'failed')}
              disabled={isPending}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white"
            >
              Failed
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}