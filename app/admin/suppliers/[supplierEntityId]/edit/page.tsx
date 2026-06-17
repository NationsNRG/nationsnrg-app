"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/components/admin/AdminNav";

interface SupplierEditPageProps {
  params: Promise<{
    supplierEntityId: string;
  }>;
}

interface SupplierRecord {
  supplier_entity_id: string;
  supplier_name: string;
  supplier_class: string;
  status: string;
  commodity_types: string[] | null;
  service_states: string[] | null;
  utilities: string[] | null;
  capabilities: string[] | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
}

interface SupplierResponse {
  ok: boolean;
  supplier?: SupplierRecord;
  error?: string;
}

function parseCsvInput(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function toCsv(value: string[] | null | undefined): string {
  if (!Array.isArray(value) || value.length === 0) {
    return "";
  }

  return value.join(", ");
}

export default function SupplierEditPage({
  params,
}: SupplierEditPageProps) {
  const [supplierEntityId, setSupplierEntityId] = useState<string>("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierClass, setSupplierClass] = useState("");
  const [status, setStatus] = useState("active");
  const [commodityTypes, setCommodityTypes] = useState("");
  const [serviceStates, setServiceStates] = useState("");
  const [utilities, setUtilities] = useState("");
  const [capabilities, setCapabilities] = useState("");
  const [notes, setNotes] = useState("");
  const [metadataText, setMetadataText] = useState("{}");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSupplier() {
      try {
        const resolvedParams = await params;
        const id = resolvedParams.supplierEntityId;
        setSupplierEntityId(id);
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/admin/suppliers/${id}`);
        const data = (await response.json()) as SupplierResponse;

        if (!response.ok || !data.supplier) {
          throw new Error(data.error ?? "Failed to load supplier");
        }

        if (!isMounted) {
          return;
        }

        setSupplierName(data.supplier.supplier_name);
        setSupplierClass(data.supplier.supplier_class);
        setStatus(data.supplier.status);
        setCommodityTypes(toCsv(data.supplier.commodity_types));
        setServiceStates(toCsv(data.supplier.service_states));
        setUtilities(toCsv(data.supplier.utilities));
        setCapabilities(toCsv(data.supplier.capabilities));
        setNotes(data.supplier.notes ?? "");
        setMetadataText(JSON.stringify(data.supplier.metadata ?? {}, null, 2));
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(err instanceof Error ? err.message : "Failed to load supplier");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadSupplier();

    return () => {
      isMounted = false;
    };
  }, [params]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSaveMessage(null);

      const parsedMetadata = JSON.parse(metadataText) as Record<string, unknown>;

      const response = await fetch(
        `/api/admin/suppliers/${supplierEntityId}/edit`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supplierName,
            supplierClass,
            status,
            commodityTypes: parseCsvInput(commodityTypes),
            serviceStates: parseCsvInput(serviceStates),
            utilities: parseCsvInput(utilities),
            capabilities: parseCsvInput(capabilities),
            notes: notes.trim() === "" ? null : notes.trim(),
            metadata: parsedMetadata,
          }),
        },
      );

      const data = (await response.json()) as SupplierResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update supplier");
      }

      setSaveMessage("Supplier updated successfully.");
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Metadata must be valid JSON.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to update supplier");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
  return (
    <>
      <AdminNav />
      <main className="min-h-screen bg-black px-6 py-8 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <p className="text-sm text-gray-400">Loading supplier...</p>
          </div>
        </div>
        </main>
    </>
  );
  }

  return (
  <>
    <AdminNav />
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Edit Supplier
            </h1>
            <p className="text-sm text-gray-400">
              Supplier Entity ID: {supplierEntityId}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`/admin/suppliers/${supplierEntityId}`}
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Back to Supplier
            </a>
            <a
              href="/admin/suppliers"
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Supplier List
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
                Supplier Name
              </label>
              <input
                type="text"
                required
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
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

            <div className="space-y-2">
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

            <div className="space-y-2">
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

            <div className="space-y-2">
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
              <label className="text-sm font-medium text-gray-200">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-28 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-200">
                Metadata JSON
              </label>
              <textarea
                value={metadataText}
                onChange={(e) => setMetadataText(e.target.value)}
                className="min-h-48 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {error ? (
          <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {saveMessage ? (
          <div className="rounded-lg border border-green-800 bg-green-950 p-4 text-sm text-green-300">
            {saveMessage}
          </div>
        ) : null}
      </div>
    </main>
  </>
);
}