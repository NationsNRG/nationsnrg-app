'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  dealId: string;
  operatorReviewStatus: string;
  escalationStatus: string;
  operatorNotes: string | null;
};

export default function CommodityOperatorReviewPanel({
  dealId,
  operatorReviewStatus,
  escalationStatus,
  operatorNotes,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [reviewStatus, setReviewStatus] = useState(operatorReviewStatus);
  const [escalation, setEscalation] = useState(escalationStatus);
  const [notes, setNotes] = useState(operatorNotes ?? '');
  const [error, setError] = useState<string | null>(null);

  async function saveReview() {
    setError(null);

    const response = await fetch('/api/commodity/operator-review/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealId,
        operatorReviewStatus: reviewStatus,
        escalationStatus: escalation,
        operatorNotes: notes,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? 'Failed to update operator review.');
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Operator Review</h2>
        <p className="text-sm text-zinc-400">
          Final operator decision, escalation path, and handoff notes.
        </p>
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <select
          value={reviewStatus}
          onChange={(e) => setReviewStatus(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="pending_review">pending_review</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
          <option value="on_hold">on_hold</option>
        </select>

        <select
          value={escalation}
          onChange={(e) => setEscalation(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="not_escalated">not_escalated</option>
          <option value="compliance_review">compliance_review</option>
          <option value="senior_review">senior_review</option>
          <option value="legal_review">legal_review</option>
        </select>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Operator notes"
        className="mt-4 min-h-[120px] w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
      />

      <button
        onClick={saveReview}
        disabled={isPending}
        className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
      >
        Save Operator Review
      </button>
    </section>
  );
}