'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type FormState = {
  dealName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  supplierName: string;
  utilityName: string;
  commodity: string;
  serviceAddress: string;
  accountNumber: string;
  annualUsageKwh: string;
  annualUsageTherms: string;
  notes: string;
};

const INITIAL_STATE: FormState = {
  dealName: '',
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  supplierName: '',
  utilityName: '',
  commodity: '',
  serviceAddress: '',
  accountNumber: '',
  annualUsageKwh: '',
  annualUsageTherms: '',
  notes: '',
};

function toNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function PipelineCreateForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return form.dealName.trim().length > 0 && !isSubmitting;
  }, [form.dealName, isSubmitting]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
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
      const response = await fetch('/api/pipeline/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dealName: form.dealName.trim(),
          customerName: form.customerName.trim() || null,
          customerEmail: form.customerEmail.trim() || null,
          customerPhone: form.customerPhone.trim() || null,
          supplierName: form.supplierName.trim() || null,
          utilityName: form.utilityName.trim() || null,
          commodity: form.commodity.trim() || null,
          serviceAddress: form.serviceAddress.trim() || null,
          accountNumber: form.accountNumber.trim() || null,
          annualUsageKwh: toNullableNumber(form.annualUsageKwh),
          annualUsageTherms: toNullableNumber(form.annualUsageTherms),
          notes: form.notes.trim() || null,
          metadata: {},
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        pipeline?: { id: string };
      };

      if (!response.ok || !payload.pipeline?.id) {
        setErrorMessage(payload.error ?? 'Failed to create pipeline.');
        return;
      }

      setSuccessMessage('Pipeline created successfully.');
      setForm(INITIAL_STATE);
      router.refresh();
      router.push(`/pipeline/${payload.pipeline.id}`);
    } catch (error) {
      console.error('PipelineCreateForm submit failed', error);
      setErrorMessage('Unexpected error while creating pipeline.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Create Pipeline</h2>
          <p className="text-sm text-zinc-400">Start a new deal record and move it into execution.</p>
        </div>
      </div>

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
        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Deal Name</span>
          <input
            value={form.dealName}
            onChange={(event) => updateField('dealName', event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none ring-0"
            placeholder="Miami Retail Gas Renewal"
            required
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Commodity</span>
          <input
            value={form.commodity}
            onChange={(event) => updateField('commodity', event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none ring-0"
            placeholder="natural_gas or electricity"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Customer Name</span>
          <input
            value={form.customerName}
            onChange={(event) => updateField('customerName', event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none ring-0"
            placeholder="Business or decision maker"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Customer Email</span>
          <input
            type="email"
            value={form.customerEmail}
            onChange={(event) => updateField('customerEmail', event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none ring-0"
            placeholder="owner@company.com"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Customer Phone</span>
          <input
            value={form.customerPhone}
            onChange={(event) => updateField('customerPhone', event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none ring-0"
            placeholder="(555) 555-5555"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Supplier Name</span>
          <input
            value={form.supplierName}
            onChange={(event) => updateField('supplierName', event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none ring-0"
            placeholder="Supplier target"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Utility Name</span>
          <input
            value={form.utilityName}
            onChange={(event) => updateField('utilityName', event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none ring-0"
            placeholder="FPL, TECO, etc."
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Account Number</span>
          <input
            value={form.accountNumber}
            onChange={(event) => updateField('accountNumber', event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none ring-0"
            placeholder="Utility account number"
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-sm text-zinc-300">Service Address</span>
          <input
            value={form.serviceAddress}
            onChange={(event) => updateField('serviceAddress', event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none ring-0"
            placeholder="123 Main St, Miami, FL"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Annual Usage kWh</span>
          <input
            value={form.annualUsageKwh}
            onChange={(event) => updateField('annualUsageKwh', event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none ring-0"
            placeholder="125000"
          />
        </label>

        <label className="space-y-1">
          <span className="text-sm text-zinc-300">Annual Usage Therms</span>
          <input
            value={form.annualUsageTherms}
            onChange={(event) => updateField('annualUsageTherms', event.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none ring-0"
            placeholder="25000"
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-sm text-zinc-300">Notes</span>
          <textarea
            value={form.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            className="min-h-28 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none ring-0"
            placeholder="Qualification notes, expiration timing, context..."
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Creating...' : 'Create Pipeline'}
        </button>
      </div>
    </form>
  );
}