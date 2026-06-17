"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RunnerResult {
  ok: boolean;
  mode?: string;
  processed?: number;
  successCount?: number;
  failureCount?: number;
  runStatus?: string;
  error?: string;
}

export default function DealRunnerControlPanel() {
  const router = useRouter();

  const [secret, setSecret] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunnerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runDealRunner() {
    try {
      setRunning(true);
      setResult(null);
      setError(null);

      if (secret.trim().length === 0) {
        throw new Error("Deal runner secret is required.");
      }

      const response = await fetch("/api/system/deal-runner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-deal-runner-secret": secret.trim(),
        },
      });

      const data = (await response.json()) as RunnerResult;

      if (!response.ok || data.ok !== true) {
        throw new Error(data.error ?? "Deal runner failed.");
      }

      setResult(data);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run deal runner.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">
          Runner Control Panel
        </h2>
        <p className="text-sm text-gray-400">
          Manually trigger the autonomous deal runner.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="space-y-4 rounded-xl border border-gray-800 bg-black p-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">
            Deal Runner Secret
          </label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            placeholder="Paste DEAL_RUNNER_SECRET"
          />
        </div>

        <button
          type="button"
          onClick={() => void runDealRunner()}
          disabled={running}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {running ? "Running..." : "Run Deal Runner Now"}
        </button>
      </div>

      {result ? (
        <div className="mt-4 rounded-xl border border-green-800 bg-green-950 p-4">
          <p className="text-sm font-semibold text-green-200">
            Runner completed.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <Stat label="Processed" value={result.processed ?? 0} />
            <Stat label="Success" value={result.successCount ?? 0} />
            <Stat label="Failed" value={result.failureCount ?? 0} />
            <Stat label="Status" value={result.runStatus ?? "—"} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-green-800 bg-black p-3">
      <p className="text-xs uppercase text-green-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}