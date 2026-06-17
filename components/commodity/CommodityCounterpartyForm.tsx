'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  dealId: string;
};

export default function CommodityCounterpartyForm({ dealId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState('');
  const [role, setRole] = useState('buyer');
  const [riskFlags, setRiskFlags] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function createCounterparty() {
    setError(null);

    const normalizedRiskFlags = riskFlags
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const response = await fetch('/api/commodity/counterparties/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealId,
        name,
        role,
        riskFlags: normalizedRiskFlags,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? 'Failed to create counterparty.');
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
      <h3 className="text-lg font-semibold text-white">Add Counterparty</h3>

      {error ? (
        <div className="rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Counterparty Name"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
      />

      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
      >
        <option value="buyer">buyer</option>
        <option value="seller">seller</option>
        <option value="intermediary">intermediary</option>
      </select>

      <input
        value={riskFlags}
        onChange={(e) => setRiskFlags(e.target.value)}
        placeholder="Risk Flags (comma separated)"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
      />

      <button
        onClick={createCounterparty}
        disabled={isPending}
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
      >
        Save Counterparty
      </button>
    </div>
  );
}