'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ContractOutcomeStatus } from '@/lib/pipeline/types';

type QuoteOption = {
  id: string;
  label: string;
};

type EnrollmentOption = {
  id: string;
  label: string;
};

type Props = {
  pipelineId: string;
  quoteOptions: QuoteOption[];
  enrollmentOptions: EnrollmentOption[];
  defaultSupplierName?: string | null;
  defaultUtilityName?: string | null;
  defaultCommodity?: string | null;
  isClosed: boolean;
};

type FormState = {
  status: ContractOutcomeStatus;
  pricingQuoteId: string;
  enrollmentAttemptId: string;
  supplierName: string;
  utilityName: string;
  commodity: string;
  contractRate: string;
  contractRateUnit: string;
  termMonths: string;
  estimatedMonthlySavings: string;
  estimatedAnnualSavings: string;
  realizedCommission: string;
  closedReason: string;
  notes: string;
  outcomePayload: string;
};

const OUTCOME_STATUSES: ContractOutcomeStatus[] = ['won', 'lost', 'cancelled'];

function parseJsonObject(value: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  const parsed = JSON.parse(trimmed) as unknown;
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('JSON payload must be an object.');
  }

  return parsed as Record<string, unknown>;
}

function toNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableInteger(value: string): number | null {
  const parsed = toNullableNumber(value);
  if (parsed === null) {
    return null;
  }

  return Number.isInteger(parsed) ? parsed : null;
}

export default function PipelineCloseForm({
  pipelineId,
  quoteOptions,
  enrollmentOptions,
  defaultSupplierName,
  defaultUtilityName,
  defaultCommodity,
  isClosed,
}: Props) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [form, setForm] = useState<FormState>({
    status: 'won',
    pricingQuoteId: quoteOptions[0]?.id ?? '',
    enrollmentAttemptId: enrollmentOptions[0]?.id ?? '',
    supplierName: defaultSupplierName ?? '',
    utilityName: defaultUtilityName ?? '',
    commodity: defaultCommodity ?? '',
    contractRate: '',
    contractRateUnit: '',
    termMonths: '',
    estimatedMonthlySavings: '',
    estimatedAnnualSavings: '',
    realizedCommission: '',
    closedReason: '',
    notes: '',
    outcomePayload: '{}',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isBusy = isSubmitting || isRefreshing;

  const canSubmit = useMemo(() => {
    return !isClosed && !isBusy;
  }, [isClosed, isBusy]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    if (isClosed) {
      return;
    }

    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const outcomePayload = parseJsonObject(form.outcomePayload);

      const response = await fetch('/api/pipeline/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pipelineId,
          status: form.status,
          pricingQuoteId: form.pricingQuoteId.trim() || null,
          enrollmentAttemptId: form.enrollmentAttemptId.trim() || null,
          supplierName: form.supplierName.trim() || null,
          utilityName: form.utilityName.trim() || null,
          commodity: form.commodity.trim() || null,
          contractRate: toNullableNumber(form.contractRate),
          contractRateUnit: form.contractRateUnit.trim() || null,
          termMonths: toNullableInteger(form.termMonths),
          estimatedMonthlySavings: toNullableNumber(form.estimatedMonthlySavings),
          estimatedAnnualSavings: toNullableNumber(form.estimatedAnnualSavings),
          realizedCommission: toNullableNumber(form.realizedCommission),
          closedReason: form.closedReason.trim() || null,
          notes: form.notes.trim() || null,
          outcomePayload,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setErrorMessage(payload.error ?? 'Failed to close pipeline.');
        return;
      }

      setSuccessMessage(`Pipeline closed as ${form.status}.`);

      startRefreshTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error('PipelineCloseForm submit failed', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Unexpected error while closing pipeline.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div>
        <h3 className="text-base font-semibold text-white">Close Pipeline</h3>
        <p className="text-sm text-zinc-400">Record final outcome and lock the pipeline.</p>
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

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
        Use this form only when the deal outcome is final. Closing will lock the pipeline into a read-only state.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Outcome Status</span>
          <select
            value={form.status}
            onChange={(event) => updateField('status', event.target.value as ContractOutcomeStatus)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {OUTCOME_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Related Quote</span>
          <select
            value={form.pricingQuoteId}
            onChange={(event) => updateField('pricingQuoteId', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">No quote</option>
            {quoteOptions.map((quote) => (
              <option key={quote.id} value={quote.id}>
                {quote.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-sm text-zinc-300">Related Enrollment Attempt</span>
          <select
            value={form.enrollmentAttemptId}
            onChange={(event) => updateField('enrollmentAttemptId', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">No enrollment</option>
            {enrollmentOptions.map((attempt) => (
              <option key={attempt.id} value={attempt.id}>
                {attempt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Supplier Name</span>
          <input
            value={form.supplierName}
            onChange={(event) => updateField('supplierName', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Utility Name</span>
          <input
            value={form.utilityName}
            onChange={(event) => updateField('utilityName', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Commodity</span>
          <input
            value={form.commodity}
            onChange={(event) => updateField('commodity', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Contract Rate Unit</span>
          <input
            value={form.contractRateUnit}
            onChange={(event) => updateField('contractRateUnit', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="$/kWh or $/therm"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Contract Rate</span>
          <input
            value={form.contractRate}
            onChange={(event) => updateField('contractRate', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Term Months</span>
          <input
            value={form.termMonths}
            onChange={(event) => updateField('termMonths', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Est. Monthly Savings</span>
          <input
            value={form.estimatedMonthlySavings}
            onChange={(event) => updateField('estimatedMonthlySavings', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Est. Annual Savings</span>
          <input
            value={form.estimatedAnnualSavings}
            onChange={(event) => updateField('estimatedAnnualSavings', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Realized Commission</span>
          <input
            value={form.realizedCommission}
            onChange={(event) => updateField('realizedCommission', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-sm text-zinc-300">Closed Reason</span>
          <textarea
            value={form.closedReason}
            onChange={(event) => updateField('closedReason', event.target.value)}
            disabled={isClosed}
            className="min-h-20 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-sm text-zinc-300">Notes</span>
          <textarea
            value={form.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            disabled={isClosed}
            className="min-h-24 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-sm text-zinc-300">Outcome Payload JSON</span>
          <textarea
            value={form.outcomePayload}
            onChange={(event) => updateField('outcomePayload', event.target.value)}
            disabled={isClosed}
            className="min-h-28 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBusy ? 'Closing...' : 'Close Pipeline'}
        </button>
      </div>
    </form>
  );
}