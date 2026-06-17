"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface BigDealDeskQueueActionsProps {
  queueId: string;
  assignedOwner: string | null;
  reviewNotes: string | null;
  escalationStatus: string;
}

export default function BigDealDeskQueueActions({
  queueId,
  assignedOwner,
  reviewNotes,
  escalationStatus,
}: BigDealDeskQueueActionsProps) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  const [draftOwner, setDraftOwner] = useState(assignedOwner ?? "");
  const [draftNotes, setDraftNotes] = useState(reviewNotes ?? "");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(
    payload:
      | {
          action: "set_under_review" | "approve" | "reject" | "return";
          reviewNotes?: string | null;
        }
      | {
          action: "assign_owner";
          assignedOwner: string | null;
        }
      | {
          action: "update_notes";
          reviewNotes: string | null;
        },
    successMessage: string,
  ) {
    try {
      setLoadingAction(payload.action);
      setMessage(null);
      setError(null);

      const response = await fetch(`/api/big-deal-desk/queue/${queueId}`, {
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
        throw new Error(
          `Failed to update big deal desk record. HTTP ${response.status}`,
        );
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to update big deal desk record.");
      }

      setMessage(successMessage);

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update big deal desk record.",
      );
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {escalationStatus !== "under_review" ? (
          <button
            type="button"
            onClick={() =>
              void runAction(
                { action: "set_under_review", reviewNotes: draftNotes || null },
                "Queue moved to under review.",
              )
            }
            disabled={loadingAction !== null || isRefreshing}
            className="rounded-lg border border-yellow-700 bg-yellow-900 px-3 py-2 text-xs font-medium text-yellow-100 disabled:opacity-50"
          >
            {loadingAction === "set_under_review" ? "Working..." : "Set Under Review"}
          </button>
        ) : null}

        {escalationStatus !== "approved" ? (
          <button
            type="button"
            onClick={() =>
              void runAction(
                { action: "approve", reviewNotes: draftNotes || null },
                "Queue approved.",
              )
            }
            disabled={loadingAction !== null || isRefreshing}
            className="rounded-lg border border-green-700 bg-green-900 px-3 py-2 text-xs font-medium text-green-100 disabled:opacity-50"
          >
            {loadingAction === "approve" ? "Working..." : "Approve"}
          </button>
        ) : null}

        {escalationStatus !== "rejected" ? (
          <button
            type="button"
            onClick={() =>
              void runAction(
                { action: "reject", reviewNotes: draftNotes || null },
                "Queue rejected.",
              )
            }
            disabled={loadingAction !== null || isRefreshing}
            className="rounded-lg border border-red-700 bg-red-900 px-3 py-2 text-xs font-medium text-red-100 disabled:opacity-50"
          >
            {loadingAction === "reject" ? "Working..." : "Reject"}
          </button>
        ) : null}

        {escalationStatus !== "returned" ? (
          <button
            type="button"
            onClick={() =>
              void runAction(
                { action: "return", reviewNotes: draftNotes || null },
                "Queue returned.",
              )
            }
            disabled={loadingAction !== null || isRefreshing}
            className="rounded-lg border border-blue-700 bg-blue-900 px-3 py-2 text-xs font-medium text-blue-100 disabled:opacity-50"
          >
            {loadingAction === "return" ? "Working..." : "Return"}
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs uppercase text-gray-500">Assigned Owner</label>
          <input
            type="text"
            value={draftOwner}
            onChange={(e) => setDraftOwner(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            placeholder="big_deal_desk_owner"
          />
          <button
            type="button"
            onClick={() =>
              void runAction(
                {
                  action: "assign_owner",
                  assignedOwner: draftOwner.trim() === "" ? null : draftOwner.trim(),
                },
                "Owner updated.",
              )
            }
            disabled={loadingAction !== null || isRefreshing}
            className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-black disabled:opacity-50"
          >
            {loadingAction === "assign_owner" ? "Saving..." : "Save Owner"}
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase text-gray-500">Review Notes</label>
          <textarea
            value={draftNotes}
            onChange={(e) => setDraftNotes(e.target.value)}
            className="min-h-24 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={() =>
              void runAction(
                {
                  action: "update_notes",
                  reviewNotes: draftNotes.trim() === "" ? null : draftNotes.trim(),
                },
                "Review notes updated.",
              )
            }
            disabled={loadingAction !== null || isRefreshing}
            className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-black disabled:opacity-50"
          >
            {loadingAction === "update_notes" ? "Saving..." : "Save Notes"}
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