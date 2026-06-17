"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSafeAction } from "@/components/shared/useSafeAction";

interface QueueRecord {
  id: string;
  triage_tier: string;
  triage_lane: string;
  triage_score: number;
  escalation_status: string;
  escalation_reason: string;
  assigned_owner: string | null;
  review_notes: string | null;
  queued_at: string | null;
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

function badgeClasses(status: string): string {
  if (status === "approved") {
    return "border-green-800 bg-green-950 text-green-300";
  }

  if (status === "under_review") {
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  }

  if (status === "rejected" || status === "returned") {
    return "border-red-800 bg-red-950 text-red-300";
  }

  return "border-blue-800 bg-blue-950 text-blue-300";
}

export default function BigDealDeskPanel({ dealId }: Props) {
  const router = useRouter();
  const { locked, run } = useSafeAction();
  const [loading, setLoading] = useState(true);
  const [escalating, setEscalating] = useState(false);
  const [queueRecord, setQueueRecord] = useState<QueueRecord | null>(null);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDeskState() {
    try {
      setLoading(true);
      setError(null);

      const [deskResponse, triageResponse] = await Promise.all([
        fetch(`/api/intake/deal/${dealId}/big-deal-desk`),
        fetch(`/api/intake/deal/${dealId}/triage`),
      ]);

      const deskData = (await deskResponse.json()) as
        | {
            ok: true;
            queueRecord: QueueRecord | null;
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

      if (!deskResponse.ok) {
        throw new Error(
          `Failed to load big deal desk state. HTTP ${deskResponse.status}`,
        );
      }

      if (!deskData.ok) {
        throw new Error(deskData.error ?? "Failed to load big deal desk state.");
      }

      if (!triageResponse.ok) {
        throw new Error(`Failed to load triage state. HTTP ${triageResponse.status}`);
      }

      if (!triageData.ok) {
        throw new Error(triageData.error ?? "Failed to load triage state.");
      }

      setQueueRecord(deskData.queueRecord ?? null);
      setTriage(triageData.triage ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load big deal desk state.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDeskState();
  }, [dealId]);

  async function handleEscalate() {
    try {
      setEscalating(true);
      setMessage(null);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/big-deal-desk`, {
        method: "POST",
      });

      const data = (await response.json()) as
        | {
            ok: true;
            escalated: boolean;
            triage?: TriageResult;
            queueRecord?: QueueRecord;
            message?: string;
          }
        | {
            ok: false;
            error?: string;
          };

      if (!response.ok) {
        throw new Error(`Failed to escalate to big deal desk. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to escalate to big deal desk.");
      }

      if (data.escalated) {
        setMessage("Deal escalated to big deal desk successfully.");
      } else {
        setMessage(
          data.message ??
            "Deal does not currently meet big-deal desk routing threshold.",
        );
      }

      await loadDeskState();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to escalate to big deal desk.",
      );
    } finally {
      setEscalating(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Big Deal Desk</h2>
          <p className="text-sm text-gray-400">
            Escalate and monitor major opportunities separately from normal flow.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
        onClick={() => void run(loadDeskState)}
        disabled={loading || escalating || locked}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Desk"}
          </button>

          <button
            type="button"
            onClick={() => void run(handleEscalate)}
            disabled={escalating || locked}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {escalating ? "Escalating..." : "Escalate to Big Deal Desk"}
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
        <p className="text-sm text-gray-400">Loading big deal desk state...</p>
      ) : (
        <div className="space-y-4">
          {triage ? (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-gray-800 bg-black p-4">
                <p className="text-xs uppercase text-gray-500">Tier</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {triage.tier}
                </p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-black p-4">
                <p className="text-xs uppercase text-gray-500">Lane</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {triage.lane}
                </p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-black p-4">
                <p className="text-xs uppercase text-gray-500">Score</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {triage.score}
                </p>
              </div>
              <div className="rounded-lg border border-gray-800 bg-black p-4">
                <p className="text-xs uppercase text-gray-500">Desk Route</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {triage.routeToBigDealDesk ? "Yes" : "No"}
                </p>
              </div>
            </div>
          ) : null}

          {queueRecord ? (
            <div className="rounded-xl border border-gray-800 bg-black p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Queue Record
                  </p>
                  <p className="text-sm text-gray-400">
                    {queueRecord.triage_lane} · score {queueRecord.triage_score}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${badgeClasses(
                    queueRecord.escalation_status,
                  )}`}
                >
                  {queueRecord.escalation_status}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs uppercase text-gray-500">Tier</p>
                  <p className="text-sm text-gray-300">
                    {queueRecord.triage_tier}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Lane</p>
                  <p className="text-sm text-gray-300">
                    {queueRecord.triage_lane}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Owner</p>
                  <p className="text-sm text-gray-300">
                    {queueRecord.assigned_owner ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Queued</p>
                  <p className="text-sm text-gray-300">
                    {formatDate(queueRecord.queued_at)}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-xs uppercase text-gray-500">
                  Escalation Reason
                </p>
                <p className="text-sm text-gray-300">
                  {queueRecord.escalation_reason}
                </p>
              </div>

              <div className="mt-3">
                <p className="text-xs uppercase text-gray-500">Review Notes</p>
                <p className="text-sm text-gray-300">
                  {queueRecord.review_notes ?? "—"}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-800 bg-black p-4">
              <p className="text-sm text-gray-400">
                This deal is not yet in the big deal desk queue.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}