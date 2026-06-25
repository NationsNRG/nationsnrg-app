"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/auth/authenticated-fetch";

interface DashboardSummary {
  totalDeals: number;
  bigDealQueue: number;
  rollupHeld: number;
  supplierSequences: number;
  packages: number;
  shareEvents: number;
}

export default function IntakeDashboardKpiStrip() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary() {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch("/api/intake/dashboard/summary");
      const data = (await response.json()) as
        | {
            ok: true;
            summary: DashboardSummary;
          }
        | {
            ok: false;
            error?: string;
          };

      if (!response.ok) {
        throw new Error(`Failed to load dashboard summary. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load dashboard summary.");
      }

      setSummary(data.summary);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard summary.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  if (error) {
    return (
      <section className="rounded-2xl border border-red-800 bg-red-950 p-4 text-sm text-red-300">
        {error}
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Intake Dashboard KPIs
          </h2>
          <p className="text-sm text-gray-400">
            Live queue counts across deal intake, supplier routing, packages,
            and escalation lanes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadSummary()}
          disabled={loading}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh KPIs"}
        </button>
      </div>

      {loading && !summary ? (
        <p className="text-sm text-gray-400">Loading KPI summary...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard label="Total Deals" value={summary?.totalDeals ?? 0} />
          <KpiCard label="Big Deal Queue" value={summary?.bigDealQueue ?? 0} />
          <KpiCard label="Rollup Held" value={summary?.rollupHeld ?? 0} />
          <KpiCard
            label="Supplier Sequences"
            value={summary?.supplierSequences ?? 0}
          />
          <KpiCard label="Packages" value={summary?.packages ?? 0} />
          <KpiCard label="Share Events" value={summary?.shareEvents ?? 0} />
        </div>
      )}
    </section>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-black p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}