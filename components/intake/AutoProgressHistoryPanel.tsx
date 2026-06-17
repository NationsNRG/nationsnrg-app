"use client";

import { useEffect, useState } from "react";

interface AutoProgressEvent {
  id: string;
  previous_status: string | null;
  next_status: string;
  should_update: boolean;
  updated: boolean;
  progression_reason: string;
  trigger_source: string;
  created_at: string | null;
}

interface AutoProgressHistoryPanelProps {
  dealId: string;
}

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function statusClasses(updated: boolean): string {
  return updated
    ? "border-green-800 bg-green-950 text-green-300"
    : "border-blue-800 bg-blue-950 text-blue-300";
}

export default function AutoProgressHistoryPanel({
  dealId,
}: AutoProgressHistoryPanelProps) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<AutoProgressEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/auto-progress/history`,
      );

      const data = (await response.json()) as
        | { ok: true; history: AutoProgressEvent[] }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(
          `Failed to load auto-progress history. HTTP ${response.status}`,
        );
      }

      if (!data.ok) {
        throw new Error(
          data.error ?? "Failed to load auto-progress history.",
        );
      }

      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load auto-progress history.",
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
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Auto-Progress History
          </h2>
          <p className="text-sm text-gray-400">
            Audit trail of automated stage decisions and trigger sources.
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
        <p className="text-sm text-gray-400">Loading auto-progress history...</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-gray-400">
          No auto-progress events logged yet.
        </p>
      ) : (
        <div className="space-y-3">
          {history.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-gray-800 bg-black p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {event.previous_status ?? "—"} → {event.next_status}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {event.trigger_source} · {formatDate(event.created_at)}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                    event.updated,
                  )}`}
                >
                  {event.updated ? "updated" : "no change"}
                </span>
              </div>

              <p className="text-sm text-gray-300">
                {event.progression_reason}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}