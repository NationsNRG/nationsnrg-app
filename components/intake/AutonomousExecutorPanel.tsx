"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ExecutorEvent {
  id: string;
  decisions_evaluated: number;
  successful_actions: number;
  failed_actions: number;
  executor_status: string;
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
  if (status === "completed") return "border-green-800 bg-green-950 text-green-300";
  if (status === "partial_failure") return "border-yellow-800 bg-yellow-950 text-yellow-300";
  return "border-red-800 bg-red-950 text-red-300";
}

export default function AutonomousExecutorPanel({ dealId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<ExecutorEvent[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/autonomous-executor/history`,
      );

      const data = (await response.json()) as
        | { ok: true; history: ExecutorEvent[] }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error("Failed to load autonomous executor history.");
        }

        if (data.ok === false) {
        throw new Error(data.error ?? "Failed to load autonomous executor history.");
        }

      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load autonomous executor history.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, [dealId]);

  async function runExecutor() {
    try {
      setRunning(true);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/autonomous-executor/run`,
        { method: "POST" },
      );

      const data = (await response.json()) as
        | {
            ok: true;
            decisionsEvaluated: number;
            successfulActions: number;
            failedActions: number;
          }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error("Failed to run autonomous executor.");
        }

        if (data.ok === false) {
        throw new Error(data.error ?? "Failed to run autonomous executor.");
        }

      setMessage(
        `Executor complete: ${data.successfulActions} successful, ${data.failedActions} failed, ${data.decisionsEvaluated} decisions evaluated.`,
      );

      await loadHistory();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to run autonomous executor.",
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Autonomous Executor
          </h2>
          <p className="text-sm text-gray-400">
            Runs the autonomous decision engine and executes the next safe system actions.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void loadHistory()}
            disabled={loading || running}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh History"}
          </button>

          <button
            type="button"
            onClick={() => void runExecutor()}
            disabled={loading || running}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {running ? "Running..." : "Run Autonomous Executor"}
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
        <p className="text-sm text-gray-400">Loading executor history...</p>
      ) : history.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-black p-4 text-sm text-gray-400">
          No autonomous executor runs found yet.
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((event) => (
            <div key={event.id} className="rounded-xl border border-gray-800 bg-black p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {event.decisions_evaluated} decisions evaluated
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    Success: {event.successful_actions} · Failed:{" "}
                    {event.failed_actions}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    {formatDate(event.created_at)}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                    event.executor_status,
                  )}`}
                >
                  {event.executor_status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}