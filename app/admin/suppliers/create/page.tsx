"use client";

import { useState } from "react";
import AdminNav from "@/components/admin/AdminNav";

interface SupplierCreateResponse {
  ok: boolean;
  supplier?: {
    id: string;
    supplier_entity_id: string;
    supplier_name: string;
  };
  error?: string;
}

function parseCsvInput(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export default function SupplierAdminCreatePage() {
  const [supplierEntityId, setSupplierEntityId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierClass, setSupplierClass] = useState("standard_supplier");
  const [status, setStatus] = useState("active");
  const [commodityTypes, setCommodityTypes] = useState("");
  const [serviceStates, setServiceStates] = useState("");
  const [utilities, setUtilities] = useState("");
  const [capabilities, setCapabilities] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SupplierCreateResponse | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/suppliers/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplierEntityId,
          supplierName,
          supplierClass,
          status,
          commodityTypes: parseCsvInput(commodityTypes),
          serviceStates: parseCsvInput(serviceStates),
          utilities: parseCsvInput(utilities),
          capabilities: parseCsvInput(capabilities),
          notes: notes.trim() === "" ? null : notes.trim(),
          metadata: {
            source: "admin_supplier_create_page",
          },
        }),
      });

      const data = (await response.json()) as SupplierCreateResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save supplier");
      }

      setResult(data);

      setSupplierEntityId("");
      setSupplierName("");
      setSupplierClass("standard_supplier");
      setStatus("active");
      setCommodityTypes("");
      setServiceStates("");
      setUtilities("");
      setCapabilities("");
      setNotes("");
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
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
              Create Supplier
            </h1>
            <p className="text-sm text-gray-400">
              Add or update suppliers in the master supplier catalog.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/intake/deal"
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Intake Deals
            </a>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">
                Supplier Entity ID
              </label>
              <input
                type="text"
                required
                value={supplierEntityId}
                onChange={(e) => setSupplierEntityId(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                placeholder="lpl_solar"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">
                Supplier Name
              </label>
              <input
                type="text"
                required
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                placeholder="LPL Solar"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">
                Supplier Class
              </label>
              <input
                type="text"
                required
                value={supplierClass}
                onChange={(e) => setSupplierClass(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                placeholder="premium_partner"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-200">
                Commodity Types
              </label>
              <input
                type="text"
                value={commodityTypes}
                onChange={(e) => setCommodityTypes(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                placeholder="electricity, natural_gas, solar"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-200">
                Service States
              </label>
              <input
                type="text"
                value={serviceStates}
                onChange={(e) => setServiceStates(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                placeholder="FL, TX, CA"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-200">
                Utilities
              </label>
              <input
                type="text"
                value={utilities}
                onChange={(e) => setUtilities(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                placeholder="FPL, Duke Energy Florida"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-200">
                Capabilities
              </label>
              <input
                type="text"
                value={capabilities}
                onChange={(e) => setCapabilities(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                placeholder="broker_supply, commercial_accounts, solar_development"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-200">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-28 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                placeholder="Internal notes about supplier fit, partner posture, and execution capabilities."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Supplier"}
          </button>
        </form>

        {result?.ok === false ? (
          <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-300">
            {result.error}
          </div>
        ) : null}

        {result?.ok === true && result.supplier ? (
          <div className="rounded-lg border border-green-800 bg-green-950 p-4 text-sm text-green-300 space-y-2">
            <p>Supplier saved successfully.</p>
            <p className="font-medium text-green-200">
              {result.supplier.supplier_name} ({result.supplier.supplier_entity_id})
            </p>
          </div>
        ) : null}
      </div>
    </main>
    </>
  );
}