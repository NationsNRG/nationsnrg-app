"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface PortfolioRollupQueueActionsProps {
  queueId: string;
  assignedClusterKey: string | null;
  releaseReason: string | null;
  holdStatus: string;
}

export default function PortfolioRollupQueueActions({
  queueId,
  assignedClusterKey,
  releaseReason,
  holdStatus,
}: PortfolioRollupQueueActionsProps) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  const [draftClusterKey, setDraftClusterKey] = useState(assignedClusterKey ?? "");
  const [draftReleaseReason, setDraftReleaseReason] = useState(releaseReason ?? "");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(
    payload:
      | {
          action: "assign_cluster_key";
          assignedClusterKey: string | null;
        }
      | {
          action: "release_to_execution" | "cancel_hold" | "update_release_reason";
          releaseReason?: string | null;
        },
    successMessage: string,
  ) {
    try {
      setLoadingAction(payload.action);
      setMessage(null);
      setError(null);

      const response = await fetch(`/api/portfolio-rollup/queue/${queueId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

            if (!response.ok) {
        throw new Error(`Failed to update rollup queue record. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to update rollup queue record.");
      }

      setMessage(successMessage);

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update rollup queue record.",
      );
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {holdStatus !== "released" ? (
          <button
            type="button"
            onClick={() =>
              void runAction(
                {
                  action: "release_to_execution",
                  releaseReason:
                    draftReleaseReason.trim() === ""
                      ? null
                      : draftReleaseReason.trim(),
                },
                "Rollup hold released to execution.",
              )
            }
            disabled={loadingAction !== null || isRefreshing}
            className="rounded-lg border border-green-700 bg-green-900 px-3 py-2 text-xs font-medium text-green-100 disabled:opacity-50"
          >
            {loadingAction === "release_to_execution"
              ? "Working..."
              : "Release to Execution"}
          </button>
        ) : null}

        {holdStatus !== "cancelled" ? (
          <button
            type="button"
            onClick={() =>
              void runAction(
                {
                  action: "cancel_hold",
                  releaseReason:
                    draftReleaseReason.trim() === ""
                      ? null
                      : draftReleaseReason.trim(),
                },
                "Rollup hold cancelled.",
              )
            }
            disabled={loadingAction !== null || isRefreshing}
            className="rounded-lg border border-red-700 bg-red-900 px-3 py-2 text-xs font-medium text-red-100 disabled:opacity-50"
          >
            {loadingAction === "cancel_hold" ? "Working..." : "Cancel Hold"}
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs uppercase text-gray-500">Assigned Cluster Key</label>
          <input
            type="text"
            value={draftClusterKey}
            onChange={(e) => setDraftClusterKey(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            placeholder="fl-premium-cluster-01"
          />
          <button
            type="button"
            onClick={() =>
              void runAction(
                {
                  action: "assign_cluster_key",
                  assignedClusterKey:
                    draftClusterKey.trim() === "" ? null : draftClusterKey.trim(),
                },
                "Cluster key updated.",
              )
            }
            disabled={loadingAction !== null || isRefreshing}
            className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-black disabled:opacity-50"
          >
            {loadingAction === "assign_cluster_key" ? "Saving..." : "Save Cluster Key"}
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase text-gray-500">Release Reason</label>
          <textarea
            value={draftReleaseReason}
            onChange={(e) => setDraftReleaseReason(e.target.value)}
            className="min-h-24 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={() =>
              void runAction(
                {
                  action: "update_release_reason",
                  releaseReason:
                    draftReleaseReason.trim() === ""
                      ? null
                      : draftReleaseReason.trim(),
                },
                "Release reason updated.",
              )
            }
            disabled={loadingAction !== null || isRefreshing}
            className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-black disabled:opacity-50"
          >
            {loadingAction === "update_release_reason" ? "Saving..." : "Save Release Reason"}
          </button>
        </div>
      </div>

      {message ? (
        <div className="rounded-lg border border-green-800 bg-green-950 p-3 text-xs text-green-300">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-800 bg-red-950 p-3 text-xs text-red-300">
          {error}
        </div>
      ) : null}
    </div>
  );
}