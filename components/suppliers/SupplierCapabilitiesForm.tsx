'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  supplierId: string;
};

export default function SupplierCapabilitiesForm({ supplierId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [commodity, setCommodity] = useState('');
  const [pricing, setPricing] = useState(false);
  const [enrollment, setEnrollment] = useState(false);
  const [api, setApi] = useState(false);
  const [widget, setWidget] = useState(false);
  const [portal, setPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);

    const res = await fetch('/api/suppliers/capabilities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId,
        commodity,
        pricing,
        enrollment,
        api,
        widget,
        portal,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Failed to save capability');
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
      <h3 className="text-white font-semibold text-lg">Capabilities</h3>

      {error && <div className="text-red-400 text-sm">{error}</div>}

      <input
        placeholder="Commodity (natural_gas, electricity)"
        value={commodity}
        onChange={(e) => setCommodity(e.target.value)}
        className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm w-full"
      />

      <label className="text-sm text-zinc-300">
        <input type="checkbox" checked={pricing} onChange={() => setPricing(!pricing)} /> Pricing
      </label>

      <label className="text-sm text-zinc-300">
        <input type="checkbox" checked={enrollment} onChange={() => setEnrollment(!enrollment)} /> Enrollment
      </label>

      <label className="text-sm text-zinc-300">
        <input type="checkbox" checked={api} onChange={() => setApi(!api)} /> API
      </label>

      <label className="text-sm text-zinc-300">
        <input type="checkbox" checked={widget} onChange={() => setWidget(!widget)} /> Widget
      </label>

      <label className="text-sm text-zinc-300">
        <input type="checkbox" checked={portal} onChange={() => setPortal(!portal)} /> Portal
      </label>

      <button
        onClick={save}
        disabled={isPending}
        className="bg-purple-600 text-white px-4 py-2 rounded text-sm"
      >
        Save Capability
      </button>
    </div>
  );
}