"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useSafeAction } from "@/components/shared/useSafeAction";

interface AutoProgressDealButtonProps {
  dealId: string;
}

export default function AutoProgressDealButton({
  dealId,
}: AutoProgressDealButtonProps) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const { locked, run } = useSafeAction();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAutoProgression() {
    try {
      setLoading(true);
      setMessage(null);
      setError(null);

const response = await fetch(`/api/intake/deal/${dealId}/auto-progress`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    triggerSource: "operator",
  }),
});

      const data = (await response.json()) as
        | {
            ok: true;
            updated: boolean;
            decision: {
              nextStatus: string;
              reason: string;
            };
          }
        | {
            ok: false;
            error?: string;
          };

      if (!response.ok) {
        throw new Error(`Failed to auto-progress deal. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to auto-progress deal.");
      }

      setMessage(
        data.updated
          ? `Deal advanced to ${data.decision.nextStatus}: ${data.decision.reason}`
          : `No status change needed: ${data.decision.reason}`,
      );

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to auto-progress deal.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void run(runAutoProgression)}
        disabled={loading || isRefreshing || locked}
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
      >
        {loading ? "Progressing..." : "Auto-Progress Deal"}
      </button>

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