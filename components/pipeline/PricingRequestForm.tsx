'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { PricingRequestStatus } from '@/lib/pipeline/types';

type Props = {
  pipelineId: string;
  defaultSupplierName?: string | null;
  defaultUtilityName?: string | null;
  defaultCommodity?: string | null;
  isClosed: boolean;
};

type FormState = {
  requestSource: string;
  supplierName: string;
  utilityName: string;
  commodity: string;
  requestedLoadZone: string;
  requestedTermMonths: string;
  requestedUsage: string;
  status: PricingRequestStatus;
  requestPayload: string;
};

const STATUSES: PricingRequestStatus[] = [
  'pending',
  'submitted',
  'completed',
  'failed',
  'cancelled',
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

export default function PricingRequestForm({
  pipelineId,
  defaultSupplierName,
  defaultUtilityName,
  defaultCommodity,
  isClosed,
}: Props) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [form, setForm] = useState<FormState>({
    requestSource: 'manual',
    supplierName: defaultSupplierName ?? '',
    utilityName: defaultUtilityName ?? '',
    commodity: defaultCommodity ?? '',
    requestedLoadZone: '',
    requestedTermMonths: '',
    requestedUsage: '',
    status: 'pending',
    requestPayload: '{}',
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
      const requestPayload = parseJsonObject(form.requestPayload);

      const response = await fetch('/api/pipeline/pricing-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pipelineId,
          requestSource: form.requestSource.trim() || 'manual',
          supplierName: form.supplierName.trim() || null,
          utilityName: form.utilityName.trim() || null,
          commodity: form.commodity.trim() || null,
          requestedLoadZone: form.requestedLoadZone.trim() || null,
          requestedTermMonths: toNullableInteger(form.requestedTermMonths),
          requestedUsage: toNullableNumber(form.requestedUsage),
          status: form.status,
          requestPayload,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setErrorMessage(payload.error ?? 'Failed to create pricing request.');
        return;
      }

      setSuccessMessage('Pricing request created and pipeline moved to pricing_requested.');

      startRefreshTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error('PricingRequestForm submit failed', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Unexpected error while creating pricing request.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div>
        <h3 className="text-base font-semibold text-white">Create Pricing Request</h3>
        <p className="text-sm text-zinc-400">Capture quote request details for this pipeline.</p>
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
        This action currently creates an internal pricing request record only. Supplier-side sending remains manual until external integrations are added.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Request Source</span>
          <input
            value={form.requestSource}
            onChange={(event) => updateField('requestSource', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="manual"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Status</span>
          <select
            value={form.status}
            onChange={(event) => updateField('status', event.target.value as PricingRequestStatus)}
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
          <span className="text-sm text-zinc-300">Load Zone</span>
          <input
            value={form.requestedLoadZone}
            onChange={(event) => updateField('requestedLoadZone', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Requested Term Months</span>
          <input
            value={form.requestedTermMonths}
            onChange={(event) => updateField('requestedTermMonths', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="12"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Requested Usage</span>
          <input
            value={form.requestedUsage}
            onChange={(event) => updateField('requestedUsage', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="25000"
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-sm text-zinc-300">Request Payload JSON</span>
          <textarea
            value={form.requestPayload}
            onChange={(event) => updateField('requestPayload', event.target.value)}
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
          {isBusy ? 'Submitting...' : 'Create Pricing Request'}
        </button>
      </div>
    </form>
  );
}