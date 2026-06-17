"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ContractGap {
  id: string;
  gap_type: string;
  gap_severity: number;
  gap_status: string;
  gap_title: string;
  gap_description: string | null;
  resolution_action: string | null;
  resolved_at: string | null;
  created_at: string | null;
}

interface ContractGapsPanelProps {
  dealId: string;
}

function statusClasses(status: string): string {
  if (status === "resolved" || status === "waived") {
    return "border-green-800 bg-green-950 text-green-300";
  }

  if (status === "in_progress") {
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  }

  return "border-red-800 bg-red-950 text-red-300";
}

function severityClasses(severity: number): string {
  if (severity >= 5) {
    return "border-red-800 bg-red-950 text-red-300";
  }

  if (severity >= 3) {
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  }

  return "border-blue-800 bg-blue-950 text-blue-300";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function ContractGapsPanel({ dealId }: ContractGapsPanelProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [gaps, setGaps] = useState<ContractGap[]>([]);
  const [resolutionByGap, setResolutionByGap] = useState<Record<string, string>>(
    {},
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadGaps() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/contract-readiness/gaps`,
      );

      const data = (await response.json()) as
        | { ok: true; gaps: ContractGap[] }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(`Failed to load contract gaps. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load contract gaps.");
      }

      const nextGaps = Array.isArray(data.gaps) ? data.gaps : [];
      setGaps(nextGaps);

      const nextResolution: Record<string, string> = {};
      for (const gap of nextGaps) {
        nextResolution[gap.id] = gap.resolution_action ?? "";
      }
      setResolutionByGap(nextResolution);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contract gaps.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadGaps();
  }, [dealId]);

  async function updateGapStatus(
    gapId: string,
    gapStatus: "open" | "in_progress" | "resolved" | "waived",
  ) {
    try {
      setUpdatingId(gapId);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/contract-readiness/gaps/${gapId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            gapStatus,
            resolutionAction:
              resolutionByGap[gapId]?.trim() === ""
                ? null
                : resolutionByGap[gapId]?.trim() ?? null,
          }),
        },
      );

      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(`Failed to update contract gap. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to update contract gap.");
      }

      setMessage(`Contract gap marked ${gapStatus}.`);
      await loadGaps();
     
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update contract gap.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const openCount = gaps.filter((gap) =>
    ["open", "in_progress"].includes(gap.gap_status),
  ).length;

  const resolvedCount = gaps.filter((gap) =>
    ["resolved", "waived"].includes(gap.gap_status),
  ).length;

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Contract Gaps</h2>
          <p className="text-sm text-gray-400">
            Resolve missing documents, authority gaps, compensation gaps, and
            execution blockers before the deal moves too far.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadGaps()}
          disabled={loading || updatingId !== null}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Gaps"}
        </button>
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Metric label="Total Gaps" value={String(gaps.length)} />
        <Metric label="Open / In Progress" value={String(openCount)} />
        <Metric label="Resolved / Waived" value={String(resolvedCount)} />
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
        <p className="text-sm text-gray-400">Loading contract gaps...</p>
      ) : gaps.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-black p-4">
          <p className="text-sm text-gray-400">
            No contract gaps found. Seed required documents or refresh readiness
            to create gap records.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {gaps.map((gap) => (
            <div
              key={gap.id}
              className="rounded-xl border border-gray-800 bg-black p-4"
            >
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {gap.gap_title}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {gap.gap_type} · created {formatDate(gap.created_at)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${severityClasses(
                      gap.gap_severity,
                    )}`}
                  >
                    severity {gap.gap_severity}
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                      gap.gap_status,
                    )}`}
                  >
                    {gap.gap_status}
                  </span>
                </div>
              </div>

              <div className="mb-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                  <p className="text-xs uppercase text-gray-500">Description</p>
                  <p className="mt-1 text-sm text-gray-300">
                    {gap.gap_description ?? "—"}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                  <p className="text-xs uppercase text-gray-500">Resolved At</p>
                  <p className="mt-1 text-sm text-gray-300">
                    {formatDate(gap.resolved_at)}
                  </p>
                </div>
              </div>

              <div className="mb-4 space-y-2">
                <label className="text-xs uppercase text-gray-500">
                  Resolution Action
                </label>
                <textarea
                  value={resolutionByGap[gap.id] ?? ""}
                  onChange={(e) =>
                    setResolutionByGap((current) => ({
                      ...current,
                      [gap.id]: e.target.value,
                    }))
                  }
                  className="min-h-20 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                  placeholder="What needs to happen or what resolved this gap?"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {(["open", "in_progress", "resolved", "waived"] as const).map(
                  (status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => void updateGapStatus(gap.id, status)}
                      disabled={updatingId !== null}
                      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                    >
                      {updatingId === gap.id ? "Updating..." : `Mark ${status}`}
                    </button>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-black p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}