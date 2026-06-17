"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface OperatorBrief {
  id: string;
  brief_status: string;
  brief_title: string;
  executive_summary: string;
  current_posture: string;
  money_path_summary: string | null;
  risk_summary: string | null;
  next_best_action: string | null;
  operator_workload_level: string;
  delegation_recommendation: string | null;
  disclosure_recommendation: string | null;
  compensation_recommendation: string | null;
  epc_recommendation: string | null;
  updated_at: string | null;
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
  if (status === "approved") {
    return "border-green-800 bg-green-950 text-green-300";
  }

  if (status === "reviewed") {
    return "border-blue-800 bg-blue-950 text-blue-300";
  }

  if (status === "archived") {
    return "border-gray-700 bg-gray-950 text-gray-300";
  }

  return "border-yellow-800 bg-yellow-950 text-yellow-300";
}

function workloadClasses(level: string): string {
  if (level === "low") {
    return "border-green-800 bg-green-950 text-green-300";
  }

  if (level === "delegate_now") {
    return "border-red-800 bg-red-950 text-red-300";
  }

  if (level === "high") {
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  }

  return "border-blue-800 bg-blue-950 text-blue-300";
}

export default function OperatorBriefPanel({ dealId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [brief, setBrief] = useState<OperatorBrief | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadBrief() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/operator-brief`);
      const data = (await response.json()) as
        | { ok: true; operatorBrief: OperatorBrief | null }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to load operator brief. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to load operator brief.");
        }

      setBrief(data.operatorBrief ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load operator brief.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBrief();
  }, [dealId]);

  async function generateBrief() {
    try {
      setGenerating(true);
      setMessage(null);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/operator-brief/run`, {
        method: "POST",
      });

      const data = (await response.json()) as
        | { ok: true; operatorBrief: OperatorBrief }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to generate operator brief. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to generate operator brief.");
        }

      setBrief(data.operatorBrief);
      setMessage("Operator brief generated.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate operator brief.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function updateBrief(
    action: "mark_draft" | "mark_reviewed" | "mark_approved" | "mark_archived",
  ) {
    if (!brief) return;

    try {
      setUpdating(true);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/operator-brief/${brief.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );

      const data = (await response.json()) as
        | { ok: true; operatorBrief: OperatorBrief }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to update operator brief. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to update operator brief.");
        }

      setBrief(data.operatorBrief);
      setMessage(`Operator brief updated: ${action}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update operator brief.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Operator Brief</h2>
          <p className="text-sm text-gray-400">
            One-page command summary: posture, money path, risk, next action,
            delegation, disclosure, compensation, and EPC direction.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void loadBrief()}
            disabled={loading || generating || updating}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Brief"}
          </button>

          <button
            type="button"
            onClick={() => void generateBrief()}
            disabled={loading || generating || updating}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate Brief"}
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
        <p className="text-sm text-gray-400">Loading operator brief...</p>
      ) : !brief ? (
        <div className="rounded-xl border border-gray-800 bg-black p-4">
          <p className="text-sm text-gray-400">
            No operator brief exists yet.
          </p>

          <button
            type="button"
            onClick={() => void generateBrief()}
            disabled={generating}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {generating ? "Generating..." : "Create Operator Brief"}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {brief.brief_title}
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Updated: {formatDate(brief.updated_at)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                    brief.brief_status,
                  )}`}
                >
                  {brief.brief_status}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${workloadClasses(
                    brief.operator_workload_level,
                  )}`}
                >
                  {brief.operator_workload_level}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-300">{brief.executive_summary}</p>
          </div>

          <BriefBlock title="Current Posture" value={brief.current_posture} />
          <BriefBlock title="Money Path Summary" value={brief.money_path_summary} />
          <BriefBlock title="Risk Summary" value={brief.risk_summary} />
          <BriefBlock title="Next Best Action" value={brief.next_best_action} />
          <BriefBlock
            title="Delegation Recommendation"
            value={brief.delegation_recommendation}
          />
          <BriefBlock
            title="Disclosure Recommendation"
            value={brief.disclosure_recommendation}
          />
          <BriefBlock
            title="Compensation Recommendation"
            value={brief.compensation_recommendation}
          />
          <BriefBlock title="EPC Recommendation" value={brief.epc_recommendation} />

          <div className="flex flex-wrap gap-2 rounded-xl border border-gray-800 bg-black p-4">
            {(
              [
                "mark_draft",
                "mark_reviewed",
                "mark_approved",
                "mark_archived",
              ] as const
            ).map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => void updateBrief(action)}
                disabled={updating || generating}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {updating ? "Updating..." : action}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function BriefBlock({
  title,
  value,
}: {
  title: string;
  value: string | null;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-black p-4">
      <p className="text-xs uppercase text-gray-500">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">
        {value ?? "—"}
      </p>
    </div>
  );
}