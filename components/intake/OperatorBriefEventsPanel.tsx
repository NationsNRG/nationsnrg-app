"use client";

import { useEffect, useState } from "react";

interface OperatorBriefEvent {
  id: string;
  event_type: string;
  event_status: string;
  event_title: string;
  event_summary: string | null;
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
  if (status === "resolved") {
    return "border-green-800 bg-green-950 text-green-300";
  }

  if (status === "action_required") {
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  }

  if (status === "waived") {
    return "border-gray-700 bg-gray-950 text-gray-300";
  }

  return "border-blue-800 bg-blue-950 text-blue-300";
}

export default function OperatorBriefEventsPanel({ dealId }: Props) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<OperatorBriefEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadEvents() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/operator-brief/events`);

      const data = (await response.json()) as
        | { ok: true; events: OperatorBriefEvent[] }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to update checklist item. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to update checklist item.");
        }

      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load operator brief events.",
      );
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
            Operator Brief Events
          </h2>
          <p className="text-sm text-gray-400">
            Audit trail for brief generation, review, approval, and operator recommendations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadEvents()}
          disabled={loading}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Events"}
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-400">Loading operator brief events...</p>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-black p-4 text-sm text-gray-400">
          No operator brief events found.
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-gray-800 bg-black p-4"
            >
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

              <p className="text-sm text-gray-300">
                {event.event_summary ?? "—"}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}