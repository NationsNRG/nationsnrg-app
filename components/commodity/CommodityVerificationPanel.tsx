'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  dealId: string;
};

export default function CommodityVerificationPanel({ dealId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  async function runVerification() {
    setError(null);
    setResultMessage(null);

    const response = await fetch('/api/commodity/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? 'Failed to verify deal.');
      return;
    }

    setResultMessage(
      `Verification complete. Risk Score: ${result.scoring.riskScore} | Status: ${result.scoring.verificationStatus}`,
    );

    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Verification</h3>
        <p className="text-sm text-zinc-400">
          Run the commodity deal verification and scoring workflow.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {resultMessage ? (
        <div className="rounded-xl border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {resultMessage}
        </div>
      ) : null}

      <button
        onClick={runVerification}
        disabled={isPending}
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
      >
        Run Verification
      </button>
    </div>
  );
}