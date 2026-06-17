"use client";

import { useState } from "react";
import AdminNav from "@/components/admin/AdminNav";

interface CreateDealResponse {
  ok: boolean;
  deal?: {
    id: string;
  };
  error?: string;
}

export default function IntakeDealCreatePage() {
  const [businessName, setBusinessName] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [estimatedMonthlyBill, setEstimatedMonthlyBill] = useState("");
  const [hasUsageData, setHasUsageData] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { dealId: string }>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/intake/deal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessName,
          state: stateValue.trim() === "" ? undefined : stateValue.trim(),
          estimatedMonthlyBill: Number(estimatedMonthlyBill),
          hasUsageData,
        }),
      });

      const data = (await response.json()) as CreateDealResponse;

      if (
  !response.ok ||
  !data.ok ||
  typeof data.deal?.id !== "string"
) {
  throw new Error(data.error ?? "Failed to create deal");
}

setResult({
  dealId: data.deal.id,
});

      setBusinessName("");
      setStateValue("");
      setEstimatedMonthlyBill("");
      setHasUsageData(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
  <>
    <AdminNav />
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Create Intake Deal
            </h1>
            <p className="text-sm text-gray-400">
              Submit a new commercial energy opportunity into the intake system.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/intake/deal"
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Back to List
            </a>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Workflow
            </p>
            <p className="mt-2 text-sm font-medium text-white">
              Intake → Demand → Queue
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Review Posture
            </p>
            <p className="mt-2 text-sm font-medium text-white">
              Premium and incomplete deals escalate automatically
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Demand Engine
            </p>
            <p className="mt-2 text-sm font-medium text-white">
              Bill-driven demand estimate persisted on submit
            </p>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-200">
                Business Name
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500"
                placeholder="Miami Distribution Center"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">
                State
              </label>
              <input
                type="text"
                value={stateValue}
                onChange={(e) => setStateValue(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500"
                placeholder="FL"
                maxLength={2}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">
                Estimated Monthly Bill ($)
              </label>
              <input
                type="number"
                required
                min="0"
                value={estimatedMonthlyBill}
                onChange={(e) => setEstimatedMonthlyBill(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500"
                placeholder="12000"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <div className="flex items-center gap-3">
              <input
                id="hasUsageData"
                type="checkbox"
                checked={hasUsageData}
                onChange={(e) => setHasUsageData(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="hasUsageData" className="text-sm text-gray-200">
                Usage data available
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              If unchecked, the engine will create document requirements and
              blocker state automatically.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Deal"}
            </button>

            <a
              href="/intake/deal"
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Cancel
            </a>
          </div>
        </form>

        {error ? (
          <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="space-y-3 rounded-lg border border-green-800 bg-green-950 p-4 text-sm text-green-300">
            <p>Deal created successfully.</p>
            <p className="font-medium text-green-200">Deal ID: {result.dealId}</p>
            <div className="flex flex-wrap gap-3">
              <a
                href={`/intake/deal/${result.dealId}`}
                className="inline-flex rounded-lg border border-green-700 bg-green-900 px-3 py-2 text-sm font-medium text-green-100 hover:bg-green-800"
              >
                View Deal
              </a>
              <a
                href="/intake/deal/create"
                className="inline-flex rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                Create Another
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  </>
  );
}