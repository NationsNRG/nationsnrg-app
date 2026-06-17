'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function CommodityDealCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [dealName, setDealName] = useState('');
  const [commodity, setCommodity] = useState('crude_oil');
  const [buyerName, setBuyerName] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [volume, setVolume] = useState('');
  const [unit, setUnit] = useState('bbl');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState<string | null>(null);

  async function createDeal() {
    setError(null);

    const response = await fetch('/api/commodity/deals/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealName,
        commodity,
        buyerName,
        sellerName,
        volume: volume ? Number(volume) : null,
        unit,
        price: price ? Number(price) : null,
        currency,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? 'Failed to create commodity deal.');
      return;
    }

    startTransition(() => {
      router.push(`/commodity/${result.deal.id}`);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white">Create Commodity Deal</h3>
        <p className="text-sm text-zinc-400">
          Intake for oil and energy commodity verification workflows.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <input
          value={dealName}
          onChange={(e) => setDealName(e.target.value)}
          placeholder="Deal Name"
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
        />

        <select
          value={commodity}
          onChange={(e) => setCommodity(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="crude_oil">crude_oil</option>
          <option value="diesel">diesel</option>
          <option value="jet_fuel">jet_fuel</option>
          <option value="lng">lng</option>
          <option value="lpg">lpg</option>
        </select>

        <input
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          placeholder="Buyer Name"
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
        />

        <input
          value={sellerName}
          onChange={(e) => setSellerName(e.target.value)}
          placeholder="Seller Name"
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
        />

        <input
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          placeholder="Volume"
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
        />

        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Unit"
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
        />

        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price"
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
        />

        <input
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          placeholder="Currency"
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
        />
      </div>

      <button
        onClick={createDeal}
        disabled={isPending}
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
      >
        Create Deal
      </button>
    </div>
  );
}