"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useSafeAction } from "@/components/shared/useSafeAction";

interface SupplierSequenceActionsProps {
  dealId: string;
  sequenceId: string;
  isPrimary: boolean | null;
  holdReason: string | null;
}

export default function SupplierSequenceActions({
  dealId,
  sequenceId,
  isPrimary,
  holdReason,
}: SupplierSequenceActionsProps) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const { locked, run } = useSafeAction();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(action: string, nextHoldReason?: string | null) {
    try {
      setLoadingAction(action);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/supplier-sequence/${sequenceId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            holdReason: nextHoldReason ?? null,
          }),
        },
      );

      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

            if (!response.ok) {
        throw new Error(`Failed to update supplier sequence. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to update supplier sequence.");
      }

      if (action === "approve_primary") {
        setMessage("Supplier approved as primary.");
      } else if (action === "demote") {
        setMessage("Supplier demoted to fallback.");
      } else if (action === "hold") {
        setMessage("Supplier placed on hold.");
      } else {
        setMessage("Supplier hold released.");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update supplier sequence.",
      );
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {!isPrimary ? (
          <button
            type="button"
            onClick={() => void run(() => runAction("approve_primary"))}
            disabled={loadingAction !== null || isRefreshing || locked}
            className="rounded-lg border border-green-700 bg-green-900 px-3 py-2 text-xs font-medium text-green-100 disabled:opacity-50"
          >
            {loadingAction === "approve_primary"
              ? "Approving..."
              : "Approve Primary"}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => void run(() => runAction("demote"))}
          disabled={loadingAction !== null || isRefreshing || locked}
          className="rounded-lg border border-yellow-700 bg-yellow-900 px-3 py-2 text-xs font-medium text-yellow-100 disabled:opacity-50"
        >
          {loadingAction === "demote" ? "Demoting..." : "Demote"}
        </button>

        {!holdReason ? (
          <button
            type="button"
            onClick={() =>
              void run(() => runAction("hold", "Held by operator review"))
            }
            disabled={loadingAction !== null || isRefreshing || locked}
            className="rounded-lg border border-red-700 bg-red-900 px-3 py-2 text-xs font-medium text-red-100 disabled:opacity-50"
          >
            {loadingAction === "hold" ? "Holding..." : "Hold"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void run(() => runAction("release_hold"))}
            disabled={loadingAction !== null || isRefreshing || locked}
            className="rounded-lg border border-blue-700 bg-blue-900 px-3 py-2 text-xs font-medium text-blue-100 disabled:opacity-50"
          >
            {loadingAction === "release_hold"
              ? "Releasing..."
              : "Release Hold"}
          </button>
        )}
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