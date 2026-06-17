"use client";

import { useEffect, useState } from "react";

interface ReviewAction {
  key: string;
  title: string;
  priority: "high" | "medium" | "low";
  reason: string;
}

interface ReviewActionsResponse {
  ok: boolean;
  reviewActions?: ReviewAction[];
  error?: string;
}

interface ReviewActionsPanelProps {
  dealId: string;
}

function priorityClasses(priority: ReviewAction["priority"]): string {
  if (priority === "high") {
    return "border-red-800 bg-red-950 text-red-300";
  }

  if (priority === "medium") {
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  }

  return "border-blue-800 bg-blue-950 text-blue-300";
}

export default function ReviewActionsPanel({
  dealId,
}: ReviewActionsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState<ReviewAction[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadActions() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/review-actions`);
      const data = (await response.json()) as ReviewActionsResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load review actions.");
      }

      setActions(Array.isArray(data.reviewActions) ? data.reviewActions : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load review actions.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadActions();
  }, [dealId]);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Review Actions</h2>
          <p className="text-sm text-gray-400">
            Operator guidance for what this deal needs next.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadActions()}
          disabled={loading}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Actions"}
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-400">Loading review actions...</p>
      ) : actions.length === 0 ? (
        <p className="text-sm text-gray-400">No review actions found.</p>
      ) : (
        <div className="space-y-3">
          {actions.map((action) => (
            <div
              key={action.key}
              className="rounded-xl border border-gray-800 bg-black p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">
                  {action.title}
                </p>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${priorityClasses(
                    action.priority,
                  )}`}
                >
                  {action.priority}
                </span>
              </div>
              <p className="text-sm text-gray-300">{action.reason}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}