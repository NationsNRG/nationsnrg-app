"use client";

import { useEffect, useState } from "react";

interface ReadinessScoreEvent {
  id: string;
  previous_score: number | null;
  next_score: number;
  previous_status: string | null;
  next_status: string;
  score_reason: string;
  trigger_source: string;
  created_at: string | null;
}

interface ReadinessScoreHistoryPanelProps {
  dealId: string;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function statusClasses(status: string): string {
  if (status === "ready_for_execution" || status === "ready_for_supplier") {
    return "border-green-800 bg-green-950 text-green-300";
  }

  if (status === "in_progress") {
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  }

  if (status === "blocked" || status === "not_ready") {
    return "border-red-800 bg-red-950 text-red-300";
  }

  return "border-blue-800 bg-blue-950 text-blue-300";
}

export default function ReadinessScoreHistoryPanel({
  dealId,
}: ReadinessScoreHistoryPanelProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ReadinessScoreEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/contract-readiness/history`,
      );

      const data = (await response.json()) as
        | { ok: true; history: ReadinessScoreEvent[] }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(`Failed to load readiness history. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load readiness history.");
      }

      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load readiness history.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, [dealId]);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Readiness Score History
          </h2>
          <p className="text-sm text-gray-400">
            Audit trail of contract readiness score changes and trigger sources.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadHistory()}
          disabled={loading}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh History"}
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-400">
          Loading readiness score history...
        </p>
      ) : history.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-black p-4">
          <p className="text-sm text-gray-400">
            No readiness score history logged yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-gray-800 bg-black p-4"
            >
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Score {event.previous_score ?? "—"} → {event.next_score}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {event.trigger_source} · {formatDate(event.created_at)}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                    event.next_status,
                  )}`}
                >
                  {event.previous_status ?? "—"} → {event.next_status}
                </span>
              </div>

              <p className="text-sm text-gray-300">{event.score_reason}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}