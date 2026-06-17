"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface CounterpartyActionsProps {
  dealId: string;
  counterpartyId: string;
  status: string;
  visibilityLevel: string;
  notes: string | null;
}

export default function CounterpartyActions({
  dealId,
  counterpartyId,
  status,
  visibilityLevel,
  notes,
}: CounterpartyActionsProps) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState(notes ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAction(
    payload:
      | {
          action:
            | "set_active"
            | "set_inactive"
            | "set_blocked"
            | "set_archived";
        }
      | {
          action: "set_visibility";
          visibilityLevel:
            | "internal_only"
            | "teaser_ok"
            | "qualified_ok"
            | "execution_ok";
        }
      | {
          action: "update_notes";
          notes: string | null;
        },
    successMessage: string,
  ) {
    try {
      setLoadingAction(payload.action);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/counterparties/${counterpartyId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(`Failed to update counterparty. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to update counterparty.");
      }

      setMessage(successMessage);

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update counterparty.",
      );
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {status !== "active" ? (
          <button
            type="button"
            onClick={() =>
              void runAction(
                { action: "set_active" },
                "Counterparty set to active.",
              )
            }
            disabled={loadingAction !== null || isRefreshing}
            className="rounded-lg border border-green-700 bg-green-900 px-3 py-2 text-xs font-medium text-green-100 disabled:opacity-50"
          >
            {loadingAction === "set_active" ? "Working..." : "Set Active"}
          </button>
        ) : null}

        {status !== "inactive" ? (
          <button
            type="button"
            onClick={() =>
              void runAction(
                { action: "set_inactive" },
                "Counterparty set to inactive.",
              )
            }
            disabled={loadingAction !== null || isRefreshing}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {loadingAction === "set_inactive" ? "Working..." : "Set Inactive"}
          </button>
        ) : null}

        {status !== "blocked" ? (
          <button
            type="button"
            onClick={() =>
              void runAction(
                { action: "set_blocked" },
                "Counterparty set to blocked.",
              )
            }
            disabled={loadingAction !== null || isRefreshing}
            className="rounded-lg border border-red-700 bg-red-900 px-3 py-2 text-xs font-medium text-red-100 disabled:opacity-50"
          >
            {loadingAction === "set_blocked" ? "Working..." : "Block"}
          </button>
        ) : null}

        {status !== "archived" ? (
          <button
            type="button"
            onClick={() =>
              void runAction(
                { action: "set_archived" },
                "Counterparty archived.",
              )
            }
            disabled={loadingAction !== null || isRefreshing}
            className="rounded-lg border border-yellow-700 bg-yellow-900 px-3 py-2 text-xs font-medium text-yellow-100 disabled:opacity-50"
          >
            {loadingAction === "set_archived" ? "Working..." : "Archive"}
          </button>
        ) : null}
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        {(
          [
            "internal_only",
            "teaser_ok",
            "qualified_ok",
            "execution_ok",
          ] as const
        ).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() =>
              void runAction(
                {
                  action: "set_visibility",
                  visibilityLevel: level,
                },
                `Visibility updated to ${level}.`,
              )
            }
            disabled={
              loadingAction !== null || isRefreshing || visibilityLevel === level
            }
            className="rounded-lg border border-blue-700 bg-blue-900 px-3 py-2 text-xs font-medium text-blue-100 disabled:opacity-50"
          >
            {level}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase text-gray-500">Notes</label>
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
                notes: draftNotes.trim() === "" ? null : draftNotes.trim(),
              },
              "Counterparty notes updated.",
            )
          }
          disabled={loadingAction !== null || isRefreshing}
          className="rounded-lg bg-white px-3 py-2 text-xs font-medium text-black disabled:opacity-50"
        >
          {loadingAction === "update_notes" ? "Saving..." : "Save Notes"}
        </button>
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