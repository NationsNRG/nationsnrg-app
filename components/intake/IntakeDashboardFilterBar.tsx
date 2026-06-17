"use client";

import { useMemo, useState } from "react";

interface IntakeDashboardFilterBarProps {
  basePath?: string;
}

export default function IntakeDashboardFilterBar({
  basePath = "/intake/deal",
}: IntakeDashboardFilterBarProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [state, setState] = useState("");
  const [minBill, setMinBill] = useState("");

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (search.trim()) params.set("search", search.trim());
    if (status.trim()) params.set("status", status.trim());
    if (state.trim()) params.set("state", state.trim().toUpperCase());
    if (minBill.trim()) params.set("minBill", minBill.trim());

    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  }, [basePath, search, status, state, minBill]);

  function clearFilters() {
    setSearch("");
    setStatus("");
    setState("");
    setMinBill("");
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Search & Filters</h2>
        <p className="text-sm text-gray-400">
          Filter intake deals by business, status, state, or minimum monthly bill.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-sm text-white"
            placeholder="Business name"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-sm text-white"
          >
            <option value="">Any</option>
            <option value="intake">intake</option>
            <option value="qualified">qualified</option>
            <option value="pricing_requested">pricing_requested</option>
            <option value="enrollment_submitted">enrollment_submitted</option>
            <option value="won">won</option>
            <option value="lost">lost</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">State</label>
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-sm text-white"
            placeholder="FL"
            maxLength={2}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">
            Minimum Monthly Bill
          </label>
          <input
            type="number"
            min="0"
            value={minBill}
            onChange={(e) => setMinBill(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-sm text-white"
            placeholder="10000"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={queryUrl}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
        >
          Apply Filters
        </a>

        <button
          type="button"
          onClick={clearFilters}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          Clear
        </button>
      </div>
    </section>
  );
}