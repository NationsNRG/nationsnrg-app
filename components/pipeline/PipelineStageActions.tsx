'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { PipelineStage } from '@/lib/pipeline/types';

type Props = {
  pipelineId: string;
  currentStage: PipelineStage;
  isClosed: boolean;
};

const STAGE_LABELS: Record<PipelineStage, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  pricing_requested: 'Pricing Requested',
  quoted: 'Quoted',
  enrollment_submitted: 'Enrollment Submitted',
  won: 'Won',
  lost: 'Lost',
};

const STAGES: PipelineStage[] = [
  'lead',
  'qualified',
  'pricing_requested',
  'quoted',
  'enrollment_submitted',
  'won',
  'lost',
];

export default function PipelineStageActions({
  pipelineId,
  currentStage,
  isClosed,
}: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isBusy = isSubmitting || isRefreshing;

  const allowedStages = useMemo(() => {
    if (isClosed) {
      return [] as PipelineStage[];
    }

    if (currentStage === 'lead') {
      return ['qualified'] as PipelineStage[];
    }

    return [] as PipelineStage[];
  }, [currentStage, isClosed]);

  async function moveToStage(nextStage: PipelineStage) {
    if (isBusy || isClosed) {
      return;
    }

    const confirmed = window.confirm(`Move pipeline to ${STAGE_LABELS[nextStage]}?`);
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/pipeline/stage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pipelineId,
          stage: nextStage,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setErrorMessage(payload.error ?? 'Failed to update stage.');
        return;
      }

      setSuccessMessage(`Pipeline moved to ${STAGE_LABELS[nextStage]}.`);

      startRefreshTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error('PipelineStageActions moveToStage failed', error);
      setErrorMessage('Unexpected error while updating stage.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const workflowHint = useMemo(() => {
    switch (currentStage) {
      case 'qualified':
        return 'Use Create Pricing Request below to move this pipeline into pricing_requested.';
      case 'pricing_requested':
        return 'Use Record Quote Received below to move this pipeline into quoted.';
      case 'quoted':
        return 'Use Submit Enrollment below to move this pipeline into enrollment_submitted.';
      case 'enrollment_submitted':
        return 'Use Close Pipeline below to finalize this pipeline as won or lost.';
      case 'won':
      case 'lost':
        return 'This pipeline is closed and read-only.';
      default:
        return 'Continue using the workflow forms below to progress this pipeline.';
    }
  }, [currentStage]);

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">Stage Actions</h3>
          <p className="text-sm text-zinc-400">
            Current stage: <span className="text-zinc-200">{STAGE_LABELS[currentStage]}</span>
          </p>
        </div>
      </div>

      {isClosed ? (
        <div className="rounded-xl border border-amber-900 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          This pipeline is closed and read-only.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-xl border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {successMessage}
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
        {workflowHint}
      </div>

      {isClosed ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
          Closed pipelines cannot change stage.
        </div>
      ) : allowedStages.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
          No manual stage actions are available here. This stage should advance through the workflow forms below.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {allowedStages.map((stage) => (
            <button
              key={stage}
              type="button"
              disabled={isBusy}
              onClick={() => moveToStage(stage)}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isBusy ? 'Updating...' : `Move to ${STAGE_LABELS[stage]}`}
            </button>
          ))}
        </div>
      )}

      <div className="hidden">
        {STAGES.map((stage) => (
          <span key={stage}>{stage}</span>
        ))}
      </div>
    </div>
  );
}