"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useSafeAction } from "@/components/shared/useSafeAction";

interface RoutingDecision {
  action: string;
  reason: string;
  targetSequenceId: string | null;
  targetSupplierEntityId: string | null;
  priority: "low" | "medium" | "high";
}

interface ApplyRoutingActionButtonsProps {
  dealId: string;
  decisions: RoutingDecision[];
}

export default function ApplyRoutingActionButtons({
  dealId,
  decisions,
}: ApplyRoutingActionButtonsProps) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const { locked, run } = useSafeAction();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function applyDecision(decision: RoutingDecision, index: number) {
    try {
      const actionKey = `${decision.action}-${index}`;
      setLoadingAction(actionKey);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/supplier-routing/apply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: decision.action,
            targetSequenceId: decision.targetSequenceId,
            targetSupplierEntityId: decision.targetSupplierEntityId,
            reason: decision.reason,
          }),
        },
      );

      const data = (await response.json()) as
        | { ok: true; applied: boolean; message?: string }
        | { ok: false; error?: string };

            if (!response.ok) {
        throw new Error(`Failed to apply routing action. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to apply routing action.");
      }

      setMessage(
        data.message ??
          `Routing action applied: ${decision.action.replaceAll("_", " ")}.`,
      );

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to apply routing action.",
      );
    } finally {
      setLoadingAction(null);
    }
  }

  if (decisions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-white">Apply Routing Decisions</p>

      <div className="flex flex-wrap gap-2">
        {decisions.map((decision, index) => {
          const actionKey = `${decision.action}-${index}`;

          return (
            <button
              key={actionKey}
              type="button"
              onClick={() => void run(() => applyDecision(decision, index))}
disabled={loadingAction !== null || isRefreshing || locked}
              className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-black disabled:opacity-50"
            >
              {loadingAction === actionKey
                ? "Applying..."
                : `Apply: ${decision.action}`}
            </button>
          );
        })}
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