'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type PricingRequestOption = {
  id: string;
  label: string;
};

type Props = {
  pipelineId: string;
  pricingRequests: PricingRequestOption[];
  defaultSupplierName?: string | null;
  defaultUtilityName?: string | null;
  defaultCommodity?: string | null;
  isClosed: boolean;
};

type FormState = {
  pricingRequestId: string;
  supplierName: string;
  utilityName: string;
  commodity: string;
  rate: string;
  rateUnit: string;
  termMonths: string;
  estimatedMonthlySavings: string;
  estimatedAnnualSavings: string;
  commissionEstimate: string;
  validUntil: string;
  quotePayload: string;
  selectForPipeline: boolean;
};

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

export default function QuoteReceivedForm({
  pipelineId,
  pricingRequests,
  defaultSupplierName,
  defaultUtilityName,
  defaultCommodity,
  isClosed,
}: Props) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [form, setForm] = useState<FormState>({
    pricingRequestId: pricingRequests[0]?.id ?? '',
    supplierName: defaultSupplierName ?? '',
    utilityName: defaultUtilityName ?? '',
    commodity: defaultCommodity ?? '',
    rate: '',
    rateUnit: '',
    termMonths: '',
    estimatedMonthlySavings: '',
    estimatedAnnualSavings: '',
    commissionEstimate: '',
    validUntil: '',
    quotePayload: '{}',
    selectForPipeline: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isBusy = isSubmitting || isRefreshing;

  const canSubmit = useMemo(() => {
    return (
      !isClosed &&
      !isBusy &&
      form.pricingRequestId.trim().length > 0 &&
      form.supplierName.trim().length > 0
    );
  }, [form.pricingRequestId, form.supplierName, isClosed, isBusy]);

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
      const quotePayload = parseJsonObject(form.quotePayload);

      const response = await fetch('/api/pipeline/quote-received', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pipelineId,
          pricingRequestId: form.pricingRequestId,
          supplierName: form.supplierName.trim(),
          utilityName: form.utilityName.trim() || null,
          commodity: form.commodity.trim() || null,
          rate: toNullableNumber(form.rate),
          rateUnit: form.rateUnit.trim() || null,
          termMonths: toNullableInteger(form.termMonths),
          estimatedMonthlySavings: toNullableNumber(form.estimatedMonthlySavings),
          estimatedAnnualSavings: toNullableNumber(form.estimatedAnnualSavings),
          commissionEstimate: toNullableNumber(form.commissionEstimate),
          validUntil: form.validUntil.trim() || null,
          quotePayload,
          selectForPipeline: form.selectForPipeline,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setErrorMessage(payload.error ?? 'Failed to save quote.');
        return;
      }

      setSuccessMessage(
        form.selectForPipeline
          ? 'Quote recorded, selected for the pipeline, and stage moved to quoted.'
          : 'Quote recorded and pipeline moved to quoted.',
      );

      startRefreshTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error('QuoteReceivedForm submit failed', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Unexpected error while recording quote.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div>
        <h3 className="text-base font-semibold text-white">Record Quote Received</h3>
        <p className="text-sm text-zinc-400">Attach a pricing quote to a request and optionally select it.</p>
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
          <span className="text-sm text-zinc-300">Pricing Request</span>
          <select
            value={form.pricingRequestId}
            onChange={(event) => updateField('pricingRequestId', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pricingRequests.length === 0 ? (
              <option value="">No pricing requests available</option>
            ) : (
              pricingRequests.map((request) => (
                <option key={request.id} value={request.id}>
                  {request.label}
                </option>
              ))
            )}
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
          <span className="text-sm text-zinc-300">Rate Unit</span>
          <input
            value={form.rateUnit}
            onChange={(event) => updateField('rateUnit', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="$/kWh or $/therm"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Rate</span>
          <input
            value={form.rate}
            onChange={(event) => updateField('rate', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="0.1295"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Term Months</span>
          <input
            value={form.termMonths}
            onChange={(event) => updateField('termMonths', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
            placeholder="12"
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
          <span className="text-sm text-zinc-300">Commission Estimate</span>
          <input
            value={form.commissionEstimate}
            onChange={(event) => updateField('commissionEstimate', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Valid Until</span>
          <input
            type="datetime-local"
            value={form.validUntil}
            onChange={(event) => updateField('validUntil', event.target.value)}
            disabled={isClosed}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
          <p className="text-xs text-zinc-500">Select quote expiration date and time.</p>
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-sm text-zinc-300">Quote Payload JSON</span>
          <textarea
            value={form.quotePayload}
            onChange={(event) => updateField('quotePayload', event.target.value)}
            disabled={isClosed}
            className="min-h-28 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="flex items-center gap-2 md:col-span-2">
          <input
            type="checkbox"
            checked={form.selectForPipeline}
            onChange={(event) => updateField('selectForPipeline', event.target.checked)}
            disabled={isClosed}
          />
          <span className="text-sm text-zinc-300">Mark this quote as selected for the pipeline</span>
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBusy ? 'Saving...' : 'Record Quote'}
        </button>
      </div>
    </form>
  );
}