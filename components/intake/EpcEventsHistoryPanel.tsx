"use client";

import { useEffect, useState } from "react";

interface EpcEvent {
  id: string;
  epc_identifier: string | null;
  event_type: string;
  event_status: string;
  event_title: string;
  event_summary: string | null;
  fit_score_snapshot: number | null;
  recommended_package_level: string | null;
  triggered_by: string;
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

function statusClasses(status: string): string {
  if (status === "resolved") return "border-green-800 bg-green-950 text-green-300";
  if (status === "action_required") return "border-yellow-800 bg-yellow-950 text-yellow-300";
  if (status === "waived") return "border-gray-700 bg-gray-950 text-gray-300";
  return "border-blue-800 bg-blue-950 text-blue-300";
}

export default function EpcEventsHistoryPanel({ dealId }: Props) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EpcEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadEvents() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/epc-events`);
      const data = (await response.json()) as
        | { ok: true; events: EpcEvent[] }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(`Failed to load EPC events. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load EPC events.");
      }

      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load EPC events.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, [dealId]);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            EPC Recommendation Events
          </h2>
          <p className="text-sm text-gray-400">
            Audit trail of EPC scoring, selection, sequence creation, contact,
            response, hold, and rejection events.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadEvents()}
          disabled={loading}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh EPC Events"}
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-400">Loading EPC events...</p>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-black p-4 text-sm text-gray-400">
          No EPC recommendation events found.
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="rounded-xl border border-gray-800 bg-black p-4">
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {event.event_title}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {event.event_type} · {event.triggered_by} ·{" "}
                    {formatDate(event.created_at)}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                    event.event_status,
                  )}`}
                >
                  {event.event_status}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <Metric label="EPC" value={event.epc_identifier ?? "—"} />
                <Metric
                  label="Fit Score"
                  value={
                    typeof event.fit_score_snapshot === "number"
                      ? String(event.fit_score_snapshot)
                      : "—"
                  }
                />
                <Metric
                  label="Package"
                  value={event.recommended_package_level ?? "—"}
                />
                <Metric label="Created" value={formatDate(event.created_at)} />
              </div>

              <div className="mt-3 rounded-lg border border-gray-800 bg-gray-950 p-3">
                <p className="text-xs uppercase text-gray-500">Summary</p>
                <p className="mt-1 text-sm text-gray-300">
                  {event.event_summary ?? "—"}
                </p>
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
    <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm text-gray-300">{value}</p>
    </div>
  );
}