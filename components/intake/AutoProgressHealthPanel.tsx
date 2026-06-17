"use client";

import { useEffect, useState } from "react";

interface StaleDeal {
  id: string;
  business_name: string | null;
  status: string | null;
  created_at: string | null;
}

interface Signal {
  totalDeals: number;
  recentlyUpdated: number;
  staleDeals: number;
  healthScore: number;
  healthStatus: "healthy" | "warning" | "critical";
  staleList: StaleDeal[];
}

function statusColor(status: Signal["healthStatus"]) {
  if (status === "healthy") return "green";
  if (status === "warning") return "yellow";
  return "red";
}

export default function AutoProgressHealthPanel() {
  const [loading, setLoading] = useState(true);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSignal() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/intake/dashboard/auto-progress-signal");
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load signal.");
      }

      setSignal(data.signal);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load signal.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSignal();
  }, []);

  if (loading && !signal) {
    return (
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-gray-400">
        Loading auto-progress health...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-800 bg-red-950 p-6 text-red-300">
        {error}
      </section>
    );
  }

  const color = statusColor(signal!.healthStatus);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Auto-Progress Health
          </h2>
          <p className="text-sm text-gray-400">
            Measures system automation performance and deal stagnation.
          </p>
        </div>

        <button
          onClick={() => void loadSignal()}
          className="text-sm px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
        >
          Refresh
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Metric label="Total Deals" value={signal!.totalDeals} />
        <Metric label="Recently Progressed" value={signal!.recentlyUpdated} />
        <Metric label="Stale Deals" value={signal!.staleDeals} />
        <Metric label="Health Score" value={`${signal!.healthScore}%`} />
      </div>

      <div
        className={`rounded-xl border border-${color}-800 bg-${color}-950 p-4 text-${color}-300`}
      >
        System Status: <b>{signal!.healthStatus.toUpperCase()}</b>
      </div>

      {signal!.staleList.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-400">Top Stale Deals</p>

          {signal!.staleList.map((deal) => (
            <a
              key={deal.id}
              href={`/intake/deal/${deal.id}`}
              className="block rounded-lg border border-gray-800 bg-black p-3 hover:bg-gray-950"
            >
              <p className="text-white text-sm">
                {deal.business_name ?? "Unnamed Deal"}
              </p>
              <p className="text-xs text-gray-500">
                {deal.status} · {deal.created_at}
              </p>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-black p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl text-white font-semibold mt-1">{value}</p>
    </div>
  );
}