"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSafeAction } from "@/components/shared/useSafeAction";

interface RollupRecord {
  id: string;
  state: string | null;
  rollup_lane: string;
  aggregation_score: number;
  hold_status: string;
  aggregation_reason: string;
  minimum_cluster_target: number;
  assigned_cluster_key: string | null;
  released_to_execution: boolean;
  release_reason: string | null;
  created_at: string | null;
}

interface AggregationDecision {
  holdForRollup: boolean;
  rollupLane: "standard_rollup" | "premium_rollup" | "infrastructure_cluster" | null;
  aggregationScore: number;
  aggregationReason: string;
  minimumClusterTarget: number;
}

interface TriageResult {
  tier: "small" | "mid" | "big";
  lane: "standard_supply" | "premium_escalation" | "infrastructure_triage";
  score: number;
  triageReason: string;
  routeToBigDealDesk: boolean;
  holdForAggregation: boolean;
}

interface Props {
  dealId: string;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function statusClasses(status: string): string {
  if (status === "released") {
    return "border-green-800 bg-green-950 text-green-300";
  }

  if (status === "cancelled") {
    return "border-red-800 bg-red-950 text-red-300";
  }

  return "border-yellow-800 bg-yellow-950 text-yellow-300";
}

export default function PortfolioRollupPanel({ dealId }: Props) {
  const router = useRouter();
  const { locked, run } = useSafeAction();

  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const [rollupRecord, setRollupRecord] = useState<RollupRecord | null>(null);
  const [aggregation, setAggregation] = useState<AggregationDecision | null>(null);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadRollupState() {
    try {
      setLoading(true);
      setError(null);

      const [rollupResponse, triageResponse] = await Promise.all([
        fetch(`/api/intake/deal/${dealId}/portfolio-rollup`),
        fetch(`/api/intake/deal/${dealId}/triage`),
      ]);

      const rollupData = (await rollupResponse.json()) as
        | {
            ok: true;
            rollupRecord: RollupRecord | null;
            aggregation?: AggregationDecision;
          }
        | {
            ok: false;
            error?: string;
          };

      const triageData = (await triageResponse.json()) as
        | {
            ok: true;
            triage: TriageResult;
          }
        | {
            ok: false;
            error?: string;
          };

            if (!rollupResponse.ok) {
        throw new Error(
          `Failed to load portfolio rollup state. HTTP ${rollupResponse.status}`,
        );
      }

      if (!rollupData.ok) {
        throw new Error(
          rollupData.error ?? "Failed to load portfolio rollup state.",
        );
      }

            if (!triageResponse.ok) {
        throw new Error(
          `Failed to load triage state. HTTP ${triageResponse.status}`,
        );
      }

      if (!triageData.ok) {
        throw new Error(triageData.error ?? "Failed to load triage state.");
      }

      setRollupRecord(rollupData.rollupRecord ?? null);
      setAggregation(rollupData.aggregation ?? null);
      setTriage(triageData.triage ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load portfolio rollup state.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRollupState();
  }, [dealId]);

  async function handleHoldForRollup() {
    try {
      setHolding(true);
      setMessage(null);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/portfolio-rollup`, {
        method: "POST",
      });

      const data = (await response.json()) as
        | {
            ok: true;
            queued: boolean;
            aggregation?: AggregationDecision;
            rollupRecord?: RollupRecord;
            message?: string;
          }
        | {
            ok: false;
            error?: string;
          };

      if (!response.ok) {
        throw new Error(`Failed to hold for rollup. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to hold for rollup.");
      }

      if (data.queued) {
        setMessage("Deal queued for portfolio rollup successfully.");
      } else {
        setMessage(
          data.message ??
            "Deal should not be held for portfolio aggregation at this time.",
        );
      }

      await loadRollupState();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to hold for rollup.");
    } finally {
      setHolding(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Portfolio Rollup</h2>
          <p className="text-sm text-gray-400">
            Hold mid-value opportunities for clustered upside and portfolio aggregation.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void run(loadRollupState)}
            disabled={loading || holding || locked}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Rollup"}
          </button>

          <button
            type="button"
            onClick={() => void run(handleHoldForRollup)}
            disabled={holding || locked}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {holding ? "Holding..." : "Hold for Rollup"}
          </button>
        </div>
      </div>

      {message ? (
        <div className="mb-4 rounded-lg border border-green-800 bg-green-950 p-3 text-sm text-green-300">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-400">Loading portfolio rollup state...</p>
      ) : (
        <div className="space-y-4">
          {triage ? (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-gray-800 bg-black p-4">
                <p className="text-xs uppercase text-gray-500">Triage Tier</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {triage.tier}
                </p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-black p-4">
                <p className="text-xs uppercase text-gray-500">Triage Lane</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {triage.lane}
                </p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-black p-4">
                <p className="text-xs uppercase text-gray-500">Triage Score</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {triage.score}
                </p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-black p-4">
                <p className="text-xs uppercase text-gray-500">Hold Aggregate</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {triage.holdForAggregation ? "Yes" : "No"}
                </p>
              </div>
            </div>
          ) : null}

          {aggregation ? (
            <div className="rounded-xl border border-gray-800 bg-black p-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs uppercase text-gray-500">Decision</p>
                  <p className="mt-2 text-sm text-gray-300">
                    {aggregation.holdForRollup ? "Hold" : "Do Not Hold"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Rollup Lane</p>
                  <p className="mt-2 text-sm text-gray-300">
                    {aggregation.rollupLane ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Aggregation Score</p>
                  <p className="mt-2 text-sm text-gray-300">
                    {aggregation.aggregationScore}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Cluster Target</p>
                  <p className="mt-2 text-sm text-gray-300">
                    {aggregation.minimumClusterTarget}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs uppercase text-gray-500">Reason</p>
                <p className="mt-2 text-sm text-gray-300">
                  {aggregation.aggregationReason}
                </p>
              </div>
            </div>
          ) : null}

          {rollupRecord ? (
            <div className="rounded-xl border border-gray-800 bg-black p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Rollup Queue Record</p>
                  <p className="text-sm text-gray-400">
                    {rollupRecord.rollup_lane} · score {rollupRecord.aggregation_score}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                    rollupRecord.hold_status,
                  )}`}
                >
                  {rollupRecord.hold_status}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div>
                  <p className="text-xs uppercase text-gray-500">State</p>
                  <p className="text-sm text-gray-300">
                    {rollupRecord.state ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Lane</p>
                  <p className="text-sm text-gray-300">
                    {rollupRecord.rollup_lane}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Cluster Key</p>
                  <p className="text-sm text-gray-300">
                    {rollupRecord.assigned_cluster_key ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Released</p>
                  <p className="text-sm text-gray-300">
                    {rollupRecord.released_to_execution ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Created</p>
                  <p className="text-sm text-gray-300">
                    {formatDate(rollupRecord.created_at)}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-xs uppercase text-gray-500">Aggregation Reason</p>
                <p className="text-sm text-gray-300">
                  {rollupRecord.aggregation_reason}
                </p>
              </div>

              <div className="mt-3">
                <p className="text-xs uppercase text-gray-500">Release Reason</p>
                <p className="text-sm text-gray-300">
                  {rollupRecord.release_reason ?? "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-800 bg-black p-4">
              <p className="text-sm text-gray-400">
                This deal is not currently held in the portfolio rollup queue.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}