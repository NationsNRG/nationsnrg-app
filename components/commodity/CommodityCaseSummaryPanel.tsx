'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type CaseSummary = {
  overview?: {
    dealName?: string;
    commodity?: string;
    buyerName?: string | null;
    sellerName?: string | null;
    volume?: number | null;
    unit?: string | null;
    price?: number | null;
    currency?: string | null;
  };
  verification?: {
    dealStatus?: string;
    verificationStatus?: string;
    operatorReviewStatus?: string;
    escalationStatus?: string;
    riskScore?: number;
  };
  documents?: {
    total?: number;
    verified?: number;
    missingCore?: string[];
  };
  counterparties?: {
    total?: number;
    verified?: number;
    failed?: number;
    flagged?: number;
  };
  fraudSignals?: {
    total?: number;
    critical?: number;
    high?: number;
    open?: number;
  };
  recommendation?: {
    readyForPresentment?: boolean;
    readyForRejection?: boolean;
    recommendationLabel?: 'present' | 'reject' | 'hold';
    reasons?: string[];
  };
};

type Props = {
  dealId: string;
  caseSummary: CaseSummary | null;
};

export default function CommodityCaseSummaryPanel({ dealId, caseSummary }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function buildSummary() {
    setError(null);

    const response = await fetch('/api/commodity/case-summary/build', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? 'Failed to build case summary.');
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Case Summary</h2>
          <p className="text-sm text-zinc-400">
            Build and review the internal verification packet before operator handoff.
          </p>
        </div>

        <button
          onClick={buildSummary}
          disabled={isPending}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
        >
          Build Summary
        </button>
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {!caseSummary ? (
        <div className="text-sm text-zinc-400">No case summary built yet.</div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-sm text-white">
              Recommendation: {caseSummary.recommendation?.recommendationLabel ?? '—'}
            </div>
            <div className="mt-1 text-xs text-zinc-400">
              Risk Score: {caseSummary.verification?.riskScore ?? '—'}
            </div>
            <div className="mt-2 text-xs text-zinc-400">
              Reasons: {(caseSummary.recommendation?.reasons ?? []).join(' | ') || '—'}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
              Documents: {caseSummary.documents?.verified ?? 0}/{caseSummary.documents?.total ?? 0}
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
              Counterparties Verified: {caseSummary.counterparties?.verified ?? 0}/{caseSummary.counterparties?.total ?? 0}
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
              Open Fraud Signals: {caseSummary.fraudSignals?.open ?? 0}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}