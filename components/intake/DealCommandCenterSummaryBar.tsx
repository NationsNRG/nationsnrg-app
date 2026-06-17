"use client";

import { useEffect, useState } from "react";

interface TriageResult {
  tier: "small" | "mid" | "big";
  lane: "standard_supply" | "premium_escalation" | "infrastructure_triage";
  score: number;
  routeToBigDealDesk: boolean;
  holdForAggregation: boolean;
}

interface BigDealDeskRecord {
  id: string;
  escalation_status: string;
}

interface RollupRecord {
  id: string;
  hold_status: string;
  released_to_execution: boolean;
}

interface PackageRecord {
  id: string;
  package_type: string;
  status: string;
}

interface RoutingHistoryRecord {
  id: string;
  action_type: string;
  action_status: string;
}

interface DealCommandCenterSummaryBarProps {
  dealId: string;
}

function pillClasses(value: string): string {
  if (
    value === "approved" ||
    value === "released" ||
    value === "shared" ||
    value === "active"
  ) {
    return "border-green-800 bg-green-950 text-green-300";
  }

  if (
    value === "under_review" ||
    value === "held" ||
    value === "queued" ||
    value === "draft"
  ) {
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  }

  if (
    value === "rejected" ||
    value === "returned" ||
    value === "cancelled" ||
    value === "archived"
  ) {
    return "border-red-800 bg-red-950 text-red-300";
  }

  return "border-blue-800 bg-blue-950 text-blue-300";
}

export default function DealCommandCenterSummaryBar({
  dealId,
}: DealCommandCenterSummaryBarProps) {
  const [loading, setLoading] = useState(true);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [bigDealDesk, setBigDealDesk] = useState<BigDealDeskRecord | null>(null);
  const [rollup, setRollup] = useState<RollupRecord | null>(null);
  const [latestPackage, setLatestPackage] = useState<PackageRecord | null>(null);
  const [latestRoutingAction, setLatestRoutingAction] =
    useState<RoutingHistoryRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary() {
    try {
      setLoading(true);
      setError(null);

      const [
        triageResponse,
        bigDealDeskResponse,
        rollupResponse,
        packageResponse,
        routingHistoryResponse,
      ] = await Promise.all([
        fetch(`/api/intake/deal/${dealId}/triage`),
        fetch(`/api/intake/deal/${dealId}/big-deal-desk`),
        fetch(`/api/intake/deal/${dealId}/portfolio-rollup`),
        fetch(`/api/intake/deal/${dealId}/package?latestOnly=true`),
        fetch(`/api/intake/deal/${dealId}/supplier-routing/history`),
      ]);

      const triageData = (await triageResponse.json()) as
        | { ok: true; triage: TriageResult }
        | { ok: false; error?: string };

      const bigDealDeskData = (await bigDealDeskResponse.json()) as
        | { ok: true; queueRecord: BigDealDeskRecord | null }
        | { ok: false; error?: string };

      const rollupData = (await rollupResponse.json()) as
        | { ok: true; rollupRecord: RollupRecord | null }
        | { ok: false; error?: string };

      const packageData = (await packageResponse.json()) as
        | { ok: true; packages: PackageRecord[] }
        | { ok: false; error?: string };

      const routingHistoryData = (await routingHistoryResponse.json()) as
        | { ok: true; history: RoutingHistoryRecord[] }
        | { ok: false; error?: string };

      if (!triageResponse.ok) {
        throw new Error(
          `Failed to load triage summary. HTTP ${triageResponse.status}`,
        );
      }

      if (!triageData.ok) {
        throw new Error(triageData.error ?? "Failed to load triage summary.");
      }

      if (!bigDealDeskResponse.ok) {
        throw new Error(
          `Failed to load big deal desk summary. HTTP ${bigDealDeskResponse.status}`,
        );
      }

      if (!bigDealDeskData.ok) {
        throw new Error(
          bigDealDeskData.error ?? "Failed to load big deal desk summary.",
        );
      }

      if (!rollupResponse.ok) {
        throw new Error(
          `Failed to load rollup summary. HTTP ${rollupResponse.status}`,
        );
      }

      if (!rollupData.ok) {
        throw new Error(rollupData.error ?? "Failed to load rollup summary.");
      }

      if (!packageResponse.ok) {
        throw new Error(
          `Failed to load package summary. HTTP ${packageResponse.status}`,
        );
      }

      if (!packageData.ok) {
        throw new Error(packageData.error ?? "Failed to load package summary.");
      }

      if (!routingHistoryResponse.ok) {
        throw new Error(
          `Failed to load routing summary. HTTP ${routingHistoryResponse.status}`,
        );
      }

      if (!routingHistoryData.ok) {
        throw new Error(
          routingHistoryData.error ?? "Failed to load routing summary.",
        );
      }

      setTriage(triageData.triage ?? null);
      setBigDealDesk(bigDealDeskData.queueRecord ?? null);
      setRollup(rollupData.rollupRecord ?? null);
      setLatestPackage(
        Array.isArray(packageData.packages) && packageData.packages.length > 0
          ? packageData.packages[0]
          : null,
      );
      setLatestRoutingAction(
        Array.isArray(routingHistoryData.history) &&
          routingHistoryData.history.length > 0
          ? routingHistoryData.history[0]
          : null,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load command center summary.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary();
  }, [dealId]);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Deal Command Center
          </h2>
          <p className="text-sm text-gray-400">
            High-level execution posture across routing, packaging, escalation,
            and rollup.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadSummary()}
          disabled={loading}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Summary"}
        </button>
      </div>

      {error ? (
        <div className="mb-3 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-400">Loading command center summary...</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <p className="text-xs uppercase text-gray-500">Triage</p>
            <p className="mt-2 text-sm font-medium text-white">
              {triage ? `${triage.tier} · ${triage.lane}` : "—"}
            </p>
            <p className="mt-2 text-xs text-gray-400">
              Score: {triage?.score ?? "—"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <p className="text-xs uppercase text-gray-500">Big Deal Desk</p>
            <div className="mt-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${pillClasses(
                  bigDealDesk?.escalation_status ?? "not_queued",
                )}`}
              >
                {bigDealDesk?.escalation_status ?? "not_queued"}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <p className="text-xs uppercase text-gray-500">Portfolio Rollup</p>
            <div className="mt-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${pillClasses(
                  rollup?.hold_status ?? "not_held",
                )}`}
              >
                {rollup?.hold_status ?? "not_held"}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Released: {rollup?.released_to_execution ? "Yes" : "No"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <p className="text-xs uppercase text-gray-500">Latest Package</p>
            <p className="mt-2 text-sm font-medium text-white">
              {latestPackage
                ? `${latestPackage.package_type}`
                : "—"}
            </p>
            <div className="mt-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${pillClasses(
                  latestPackage?.status ?? "none",
                )}`}
              >
                {latestPackage?.status ?? "none"}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <p className="text-xs uppercase text-gray-500">Latest Routing</p>
            <p className="mt-2 text-sm font-medium text-white">
              {latestRoutingAction?.action_type ?? "—"}
            </p>
            <div className="mt-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${pillClasses(
                  latestRoutingAction?.action_status ?? "none",
                )}`}
              >
                {latestRoutingAction?.action_status ?? "none"}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}