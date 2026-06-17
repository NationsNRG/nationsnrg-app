"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface EnforcementEvent {
  id: string;
  claim_type: string;
  claim_id: string;
  enforcement_status: string;
  enforcement_severity: number;
  enforcement_reason: string;
  recommended_action: string;
  escalation_owner: string | null;
  created_at: string | null;
  resolved_at: string | null;
}

interface Props {
  dealId: string;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function severityClasses(severity: number): string {
  if (severity >= 5) return "border-red-800 bg-red-950 text-red-300";
  if (severity >= 3) return "border-yellow-800 bg-yellow-950 text-yellow-300";
  return "border-blue-800 bg-blue-950 text-blue-300";
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

export default function PayoutEnforcementPanel({ dealId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);
  const [ownerByEventId, setOwnerByEventId] = useState<Record<string, string>>({});
  const [actionByEventId, setActionByEventId] = useState<Record<string, string>>({});

  const [events, setEvents] = useState<EnforcementEvent[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadEvents() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/payout-enforcement`);
      const data = (await response.json()) as
        | { ok: true; enforcementEvents: EnforcementEvent[] }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to load payout enforcement. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to load payout enforcement.");
        }

    const nextEvents = Array.isArray(data.enforcementEvents)
    ? data.enforcementEvents
    : [];

    setEvents(nextEvents);

    const nextOwners: Record<string, string> = {};
    const nextActions: Record<string, string> = {};

    for (const event of nextEvents) {
    nextOwners[event.id] = event.escalation_owner ?? "";
    nextActions[event.id] = event.recommended_action ?? "";
    }

    setOwnerByEventId(nextOwners);
    setActionByEventId(nextActions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payout enforcement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, [dealId]);

  async function runEnforcement() {
    try {
      setRunning(true);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/payout-enforcement/run`,
        { method: "POST" },
      );

      const data = (await response.json()) as
        | { ok: true; scanned: number; created: number }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to run payout enforcement. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to run payout enforcement.");
        }

      setMessage(`Scanned ${data.scanned} claims. Created ${data.created} enforcement events.`);
      await loadEvents();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run payout enforcement.");
    } finally {
      setRunning(false);
    }
  }

  const openCount = events.filter((event) =>
    ["open", "in_progress"].includes(event.enforcement_status),
  ).length;

  const severeCount = events.filter((event) => event.enforcement_severity >= 4).length;

    async function updateEnforcementEvent(
    eventId: string,
    action: "mark_open" | "mark_in_progress" | "mark_resolved" | "mark_waived",
    ) {
    try {
        setUpdatingEventId(eventId);
        setMessage(null);
        setError(null);

        const response = await fetch(
        `/api/intake/deal/${dealId}/payout-enforcement/${eventId}`,
        {
            method: "PATCH",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
            action,
            escalationOwner:
                ownerByEventId[eventId]?.trim() === ""
                ? null
                : ownerByEventId[eventId]?.trim() ?? null,
            recommendedAction:
                actionByEventId[eventId]?.trim() === ""
                ? null
                : actionByEventId[eventId]?.trim() ?? null,
            }),
        },
        );

        const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(
            `Failed to update payout enforcement event. HTTP ${response.status}`,
        );
        }

        if (!data.ok) {
        throw new Error(
            data.error ?? "Failed to update payout enforcement event.",
        );
        }

        setMessage(`Payout enforcement event updated: ${action}.`);
        await loadEvents();
        router.refresh();
    } catch (err) {
        setError(
        err instanceof Error
            ? err.message
            : "Failed to update payout enforcement event.",
        );
    } finally {
        setUpdatingEventId(null);
    }
    }  

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Payout Enforcement
          </h2>
          <p className="text-sm text-gray-400">
            Detect overdue, disputed, rejected, or under-documented compensation claims.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void loadEvents()}
            disabled={loading || running}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Enforcement"}
          </button>

          <button
            type="button"
            onClick={() => void runEnforcement()}
            disabled={loading || running}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {running ? "Running..." : "Run Enforcement Scan"}
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <Metric label="Events" value={String(events.length)} />
        <Metric label="Open / In Progress" value={String(openCount)} />
        <Metric label="High Severity" value={String(severeCount)} />
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
        <p className="text-sm text-gray-400">Loading payout enforcement...</p>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-black p-4 text-sm text-gray-400">
          No payout enforcement events found.
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="rounded-xl border border-gray-800 bg-black p-4">
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {event.claim_type} claim enforcement
                  </p>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Owner: {event.escalation_owner ?? "—"} · created {formatDate(event.created_at)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${severityClasses(
                      event.enforcement_severity,
                    )}`}
                  >
                    severity {event.enforcement_severity}
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                      event.enforcement_status,
                    )}`}
                  >
                    {event.enforcement_status}
                  </span>
                </div>
              </div>

        <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
            <p className="text-xs uppercase text-gray-500">Reason</p>
            <p className="mt-1 text-sm text-gray-300">
            {event.enforcement_reason}
            </p>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
            <p className="text-xs uppercase text-gray-500">Resolved</p>
            <p className="mt-1 text-sm text-gray-300">
            {formatDate(event.resolved_at)}
            </p>
        </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
            <label className="text-xs uppercase text-gray-500">Escalation Owner</label>
            <input
            value={ownerByEventId[event.id] ?? ""}
            onChange={(e) =>
                setOwnerByEventId((current) => ({
                ...current,
                [event.id]: e.target.value,
                }))
            }
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            placeholder="operator / finance / legal / partner_owner"
            />
        </div>

        <div className="space-y-2">
            <label className="text-xs uppercase text-gray-500">
            Recommended Action
            </label>
            <textarea
            value={actionByEventId[event.id] ?? ""}
            onChange={(e) =>
                setActionByEventId((current) => ({
                ...current,
                [event.id]: e.target.value,
                }))
            }
            className="min-h-20 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            placeholder="Follow-up, collection, dispute review, waiver reason, or resolution note."
            />
        </div>
        </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    "mark_open",
                    "mark_in_progress",
                    "mark_resolved",
                    "mark_waived",
                  ] as const
                ).map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => void updateEnforcementEvent(event.id, action)}
                    disabled={updatingEventId !== null}
                    className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    {updatingEventId === event.id ? "Updating..." : action}
                  </button>
                ))}
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
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}