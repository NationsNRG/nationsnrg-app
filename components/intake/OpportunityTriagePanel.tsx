"use client";

import { useEffect, useState } from "react";

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

function badgeClasses(tier: TriageResult["tier"]): string {
  if (tier === "big") {
    return "border-red-800 bg-red-950 text-red-300";
  }

  if (tier === "mid") {
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  }

  return "border-blue-800 bg-blue-950 text-blue-300";
}

export default function OpportunityTriagePanel({ dealId }: Props) {
  const [loading, setLoading] = useState(true);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadTriage() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/intake/deal/${dealId}/triage`);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load triage");
      }

      setTriage(data.triage ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load triage");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTriage();
  }, [dealId]);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Opportunity Triage
          </h2>
          <p className="text-sm text-gray-400">
            Split the deal into standard, premium, or big-deal infrastructure lanes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadTriage()}
          disabled={loading}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Triage"}
        </button>
      </div>

      {error ? <div className="mb-4 text-sm text-red-400">{error}</div> : null}

      {loading ? (
        <p className="text-sm text-gray-400">Loading triage...</p>
      ) : triage ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-black p-4">
            <div>
              <p className="text-sm font-medium text-white">{triage.lane}</p>
              <p className="text-sm text-gray-400">{triage.triageReason}</p>
            </div>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${badgeClasses(
                triage.tier,
              )}`}
            >
              {triage.tier}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Stat label="Score" value={triage.score} />
            <Stat
              label="Big Deal Desk"
              value={triage.routeToBigDealDesk ? "Yes" : "No"}
            />
            <Stat
              label="Hold Aggregate"
              value={triage.holdForAggregation ? "Yes" : "No"}
            />
            <Stat label="Lane" value={triage.lane} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400">No triage result found.</p>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-black p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}