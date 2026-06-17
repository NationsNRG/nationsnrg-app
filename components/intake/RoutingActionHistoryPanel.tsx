"use client";

import { useEffect, useState } from "react";

interface RoutingActionEvent {
  id: string;
  supplier_sequence_id: string | null;
  action_type: string;
  action_status: string;
  target_supplier_entity_id: string | null;
  action_reason: string;
  action_source: string;
  notes: string | null;
  created_at: string | null;
}

interface Props {
  dealId: string;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function RoutingActionHistoryPanel({ dealId }: Props) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<RoutingActionEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/intake/deal/${dealId}/supplier-routing/history`,
      );
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load routing history");
      }

      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load routing history",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, [dealId]);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Routing Action History
          </h2>
          <p className="text-sm text-gray-400">
            Audit log of applied supplier routing actions.
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
        <div className="mb-4 text-sm text-red-400">{error}</div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-400">Loading history...</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-gray-400">
          No routing actions have been logged yet.
        </p>
      ) : (
        <div className="space-y-3">
          {history.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-gray-800 bg-black p-4"
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div>
                  <p className="text-xs uppercase text-gray-500">Action</p>
                  <p className="text-sm text-gray-300">{event.action_type}</p>
                </div>

                <div>
                  <p className="text-xs uppercase text-gray-500">Status</p>
                  <p className="text-sm text-gray-300">{event.action_status}</p>
                </div>

                <div>
                  <p className="text-xs uppercase text-gray-500">Target</p>
                  <p className="text-sm text-gray-300">
                    {event.target_supplier_entity_id ?? "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase text-gray-500">Source</p>
                  <p className="text-sm text-gray-300">{event.action_source}</p>
                </div>

                <div>
                  <p className="text-xs uppercase text-gray-500">Created</p>
                  <p className="text-sm text-gray-300">
                    {formatDate(event.created_at)}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-xs uppercase text-gray-500">Reason</p>
                <p className="text-sm text-gray-300">{event.action_reason}</p>
              </div>

              <div className="mt-3">
                <p className="text-xs uppercase text-gray-500">Notes</p>
                <p className="text-sm text-gray-300">{event.notes ?? "—"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}