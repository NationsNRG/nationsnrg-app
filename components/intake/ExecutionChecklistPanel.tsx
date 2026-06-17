"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ExecutionChecklist {
  id: string;
  checklist_status: string;
  execution_lane: string;
  readiness_score_snapshot: number | null;
  compensation_status_snapshot: string | null;
  package_status_snapshot: string | null;
  blocker_count_snapshot: number;
  checklist_summary: string;
  next_required_action: string | null;
  updated_at: string | null;
}

interface ChecklistItem {
  id: string;
  item_key: string;
  item_title: string;
  item_description: string | null;
  item_status: string;
  item_category: string;
  severity: number;
  required_before_stage: string;
  owner_type: string;
  owner_identifier: string | null;
  completed_at: string | null;
  waived_at: string | null;
  notes: string | null;
}

interface GateEvent {
  id: string;
  gate_type: string;
  gate_status: string;
  gate_score: number;
  gate_reason: string;
  recommended_action: string | null;
  evaluated_by: string;
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
  if (status === "ready" || status === "completed" || status === "passed") {
    return "border-green-800 bg-green-950 text-green-300";
  }

  if (status === "in_progress" || status === "conditional" || status === "open") {
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  }

  if (status === "blocked") {
    return "border-red-800 bg-red-950 text-red-300";
  }

  return "border-blue-800 bg-blue-950 text-blue-300";
}

function severityClasses(severity: number): string {
  if (severity >= 5) return "border-red-800 bg-red-950 text-red-300";
  if (severity >= 3) return "border-yellow-800 bg-yellow-950 text-yellow-300";
  return "border-blue-800 bg-blue-950 text-blue-300";
}

export default function ExecutionChecklistPanel({ dealId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
const [itemNotesById, setItemNotesById] = useState<Record<string, string>>({});
const [ownerTypeById, setOwnerTypeById] = useState<Record<string, string>>({});
const [ownerIdentifierById, setOwnerIdentifierById] = useState<Record<string, string>>({});  

  const [checklist, setChecklist] = useState<ExecutionChecklist | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [gates, setGates] = useState<GateEvent[]>([]);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadChecklist() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/execution-checklist`);
      const data = (await response.json()) as
        | {
            ok: true;
            checklist: ExecutionChecklist | null;
            items: ChecklistItem[];
            gates: GateEvent[];
          }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to load execution checklist. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to load execution checklist.");
        }

      setChecklist(data.checklist ?? null);
      const nextItems = Array.isArray(data.items) ? data.items : [];
setItems(nextItems);

const nextNotes: Record<string, string> = {};
const nextOwnerTypes: Record<string, string> = {};
const nextOwnerIdentifiers: Record<string, string> = {};

for (const item of nextItems) {
  nextNotes[item.id] = item.notes ?? "";
  nextOwnerTypes[item.id] = item.owner_type;
  nextOwnerIdentifiers[item.id] = item.owner_identifier ?? "";
}

setItemNotesById(nextNotes);
setOwnerTypeById(nextOwnerTypes);
setOwnerIdentifierById(nextOwnerIdentifiers);
      setGates(Array.isArray(data.gates) ? data.gates : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load execution checklist.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadChecklist();
  }, [dealId]);

  async function runChecklist() {
    try {
      setRunning(true);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/execution-checklist/run`,
        { method: "POST" },
      );

      const data = (await response.json()) as
        | {
            ok: true;
            gate: {
              status: string;
              score: number;
              reason: string;
            };
            items: number;
          }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to run execution checklist. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to run execution checklist.");
        }

      setMessage(
        `Execution checklist evaluated: ${data.gate.status} · score ${data.gate.score}.`,
      );

      await loadChecklist();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to run execution checklist.",
      );
    } finally {
      setRunning(false);
    }
  }

  const latestGate = gates[0] ?? null;
  const completedCount = items.filter((item) => item.item_status === "completed").length;
  const blockedCount = items.filter((item) => item.item_status === "blocked").length;
  const openCriticalCount = items.filter(
    (item) => item.item_status !== "completed" && item.severity >= 5,
  ).length;

  async function updateChecklistItem(params: {
  itemId: string;
  action:
    | "mark_open"
    | "mark_in_progress"
    | "mark_completed"
    | "mark_blocked"
    | "mark_waived"
    | "assign_owner";
}) {
  try {
    setUpdatingItemId(params.itemId);
    setMessage(null);
    setError(null);

    const response = await fetch(
      `/api/intake/deal/${dealId}/execution-checklist/items/${params.itemId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: params.action,
          ownerType: ownerTypeById[params.itemId] ?? "operator",
          ownerIdentifier:
            ownerIdentifierById[params.itemId]?.trim() === ""
              ? null
              : ownerIdentifierById[params.itemId]?.trim() ?? null,
          notes:
            itemNotesById[params.itemId]?.trim() === ""
              ? null
              : itemNotesById[params.itemId]?.trim() ?? null,
        }),
      },
    );

    const data = (await response.json()) as
      | { ok: true }
      | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to update checklist item. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to update checklist item.");
        }

    setMessage(`Checklist item updated: ${params.action}.`);

    await loadChecklist();
    router.refresh();
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Failed to update checklist item.",
    );
  } finally {
    setUpdatingItemId(null);
  }
}

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Execution Checklist + Gate Status
          </h2>
          <p className="text-sm text-gray-400">
            Final go/no-go control layer for supplier release, contracting,
            execution, EPC release, and payout readiness.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void loadChecklist()}
            disabled={loading || running}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Checklist"}
          </button>

          <button
            type="button"
            onClick={() => void runChecklist()}
            disabled={loading || running}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {running ? "Evaluating..." : "Run Execution Gate"}
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
        <p className="text-sm text-gray-400">Loading execution checklist...</p>
      ) : !checklist ? (
        <div className="rounded-xl border border-gray-800 bg-black p-4">
          <p className="text-sm text-gray-400">
            No execution checklist exists yet.
          </p>

          <button
            type="button"
            onClick={() => void runChecklist()}
            disabled={running}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {running ? "Creating..." : "Create Execution Checklist"}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">
                  Checklist Status: {checklist.checklist_status}
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  Lane: {checklist.execution_lane}
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                  checklist.checklist_status,
                )}`}
              >
                {checklist.checklist_status}
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <Metric label="Readiness" value={String(checklist.readiness_score_snapshot ?? "—")} />
            <Metric label="Compensation" value={checklist.compensation_status_snapshot ?? "—"} />
            <Metric label="Package" value={checklist.package_status_snapshot ?? "—"} />
            <Metric label="Blockers" value={String(checklist.blocker_count_snapshot)} />
            <Metric label="Completed" value={`${completedCount}/${items.length}`} />
            <Metric label="Critical Open" value={String(openCriticalCount)} />
          </div>

          {latestGate ? (
            <div className="rounded-xl border border-gray-800 bg-black p-4">
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Latest Gate: {latestGate.gate_type}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    Score: {latestGate.gate_score}/100 · Evaluated by{" "}
                    {latestGate.evaluated_by}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    {formatDate(latestGate.created_at)}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                    latestGate.gate_status,
                  )}`}
                >
                  {latestGate.gate_status}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                  <p className="text-xs uppercase text-gray-500">Gate Reason</p>
                  <p className="mt-1 text-sm text-gray-300">
                    {latestGate.gate_reason}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                  <p className="text-xs uppercase text-gray-500">
                    Recommended Action
                  </p>
                  <p className="mt-1 text-sm text-gray-300">
                    {latestGate.recommended_action ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <p className="text-xs uppercase text-gray-500">Checklist Summary</p>
            <p className="mt-2 text-sm text-gray-300">
              {checklist.checklist_summary}
            </p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <p className="text-xs uppercase text-gray-500">Next Required Action</p>
            <p className="mt-2 text-sm text-gray-300">
              {checklist.next_required_action ?? "No required action."}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">
              Checklist Items
            </h3>

            {items.length === 0 ? (
              <div className="rounded-xl border border-gray-800 bg-black p-4 text-sm text-gray-400">
                No checklist items found.
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-800 bg-black p-4"
                >
                  <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {item.item_title}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        {item.item_category} · before {item.required_before_stage}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${severityClasses(
                          item.severity,
                        )}`}
                      >
                        severity {item.severity}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                          item.item_status,
                        )}`}
                      >
                        {item.item_status}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-300">
                    {item.item_description ?? "—"}
                  </p>

                  <div className="mt-3 grid gap-3 md:grid-cols-4">
                    <Metric label="Owner" value={item.owner_type} />
                    <Metric label="Owner ID" value={item.owner_identifier ?? "—"} />
                    <Metric label="Completed" value={formatDate(item.completed_at)} />
                    <Metric label="Waived" value={formatDate(item.waived_at)} />
                  </div>

                  {item.notes ? (
                    <div className="mt-3 rounded-lg border border-gray-800 bg-gray-950 p-3">
                      <p className="text-xs uppercase text-gray-500">Notes</p>
                      <p className="mt-1 text-sm text-gray-300">{item.notes}</p>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}