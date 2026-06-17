'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { EnrollmentStatus } from '@/lib/pipeline/types';

type QuoteOption = {
  id: string;
  label: string;
};

type Props = {
  pipelineId: string;
  quoteOptions: QuoteOption[];
  defaultSupplierName?: string | null;
  isClosed: boolean;
};

type FormState = {
  pricingQuoteId: string;
  supplierName: string;
  externalEnrollmentId: string;
  status: EnrollmentStatus;
  enrollmentPayload: string;
  responsePayload: string;
  failureReason: string;
};

const STATUSES: EnrollmentStatus[] = [
  'pending',
  'submitted',
  'accepted',
  'rejected',
  'failed',
];

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

export default function EnrollmentSubmitForm({
  pipelineId,
  quoteOptions,
  defaultSupplierName,
  isClosed,
}: Props) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [form, setForm] = useState<FormState>({
    pricingQuoteId: quoteOptions[0]?.id ?? '',
    supplierName: defaultSupplierName ?? '',
    externalEnrollmentId: '',
    status: 'submitted',
    enrollmentPayload: '{}',
    responsePayload: '{}',
    failureReason: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isBusy = isSubmitting || isRefreshing;

  const canSubmit = useMemo(() => {
    return !isClosed && !isBusy && form.supplierName.trim().length > 0;
  }, [form.supplierName, isClosed, isBusy]);

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
      const enrollmentPayload = parseJsonObject(form.enrollmentPayload);
      const responsePayload = parseJsonObject(form.responsePayload);

      const response = await fetch('/api/pipeline/enrollment-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pipelineId,
          pricingQuoteId: form.pricingQuoteId.trim() || null,
          supplierName: form.supplierName.trim(),
          externalEnrollmentId: form.externalEnrollmentId.trim() || null,
          status: form.status,
          enrollmentPayload,
          responsePayload,
          failureReason: form.failureReason.trim() || null,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setErrorMessage(payload.error ?? 'Failed to submit enrollment.');
        return;
      }

      setSuccessMessage('Enrollment submitted and pipeline moved to enrollment_submitted.');

      startRefreshTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error('EnrollmentSubmitForm submit failed', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Unexpected error while submitting enrollment.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div>
        <h3 className="text-base font-semibold text-white">Submit Enrollment</h3>
        <p className="text-sm text-zinc-400">Track a supplier enrollment attempt for this pipeline.</p>
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

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 md:col-span-2">
          <span className="text-sm text-zinc-300">Selected Quote</span>
          <select
            value={form.pricingQuoteId}
            onChange={(event) => updateField('pricingQuoteId', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">No quote selected</option>
            {quoteOptions.map((quote) => (
              <option key={quote.id} value={quote.id}>
                {quote.label}
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
            required
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Status</span>
          <select
            value={form.status}
            onChange={(event) => updateField('status', event.target.value as EnrollmentStatus)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-sm text-zinc-300">External Enrollment ID</span>
          <input
            value={form.externalEnrollmentId}
            onChange={(event) => updateField('externalEnrollmentId', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Supplier returned reference"
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-sm text-zinc-300">Enrollment Payload JSON</span>
          <textarea
            value={form.enrollmentPayload}
            onChange={(event) => updateField('enrollmentPayload', event.target.value)}
            disabled={isClosed}
            className="min-h-28 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-sm text-zinc-300">Response Payload JSON</span>
          <textarea
            value={form.responsePayload}
            onChange={(event) => updateField('responsePayload', event.target.value)}
            disabled={isClosed}
            className="min-h-28 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-sm text-zinc-300">Failure Reason</span>
          <textarea
            value={form.failureReason}
            onChange={(event) => updateField('failureReason', event.target.value)}
            disabled={isClosed}
            className="min-h-20 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="Optional reason if rejected or failed"
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBusy ? 'Submitting...' : 'Submit Enrollment'}
        </button>
      </div>
    </form>
  );
}