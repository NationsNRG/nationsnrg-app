"use client";

import { useEffect, useState } from "react";

interface SupplierOption {
  supplierEntityId: string;
  supplierName: string;
}

interface SupplierSelectorProps {
  value: string;
  onChange: (value: string) => void;
  onNameChange: (value: string) => void;
}

type SupplierCatalogResponse =
  | {
      ok: true;
      suppliers: unknown[];
    }
  | {
      ok: false;
      error?: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSupplierOption(value: unknown): SupplierOption | null {
  if (!isRecord(value)) {
    return null;
  }

  const supplierEntityId =
    typeof value.supplierEntityId === "string"
      ? value.supplierEntityId
      : typeof value.supplier_entity_id === "string"
        ? value.supplier_entity_id
        : "";

  const supplierName =
    typeof value.supplierName === "string"
      ? value.supplierName
      : typeof value.supplier_name === "string"
        ? value.supplier_name
        : "";

  const normalized: SupplierOption = {
    supplierEntityId: supplierEntityId.trim(),
    supplierName: supplierName.trim(),
  };

  if (normalized.supplierEntityId === "" || normalized.supplierName === "") {
    return null;
  }

  return normalized;
}

export default function SupplierSelector({
  value,
  onChange,
  onNameChange,
}: SupplierSelectorProps) {
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSuppliers() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/suppliers/catalog", {
          method: "GET",
        });

        const data = (await response.json()) as SupplierCatalogResponse;

                if (!response.ok) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Failed to load suppliers.",
          );
        }

        if (!data.ok) {
          throw new Error(data.error ?? "Failed to load suppliers.");
        }

        if (!isMounted) {
          return;
        }

        const normalizedSuppliers = data.suppliers
          .map(normalizeSupplierOption)
          .filter((supplier): supplier is SupplierOption => supplier !== null);

        setSuppliers(normalizedSuppliers);
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(err instanceof Error ? err.message : "Failed to load suppliers.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadSuppliers();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-200">
        Existing Supplier
      </label>

      <select
        value={value}
        onChange={(e) => {
          const selectedValue = e.target.value;
          onChange(selectedValue);

          const selectedSupplier = suppliers.find(
            (supplier) => supplier.supplierEntityId === selectedValue,
          );

          onNameChange(selectedSupplier?.supplierName ?? "");
        }}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
        disabled={loading}
      >
        <option value="">
          {loading ? "Loading suppliers..." : "Select existing supplier"}
        </option>

        {suppliers.map((supplier) => (
          <option
            key={supplier.supplierEntityId}
            value={supplier.supplierEntityId}
          >
            {supplier.supplierName} ({supplier.supplierEntityId})
          </option>
        ))}
      </select>

      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : (
        <p className="text-xs text-gray-500">
          Loads previously attached suppliers so you can reuse them.
        </p>
      )}
    </div>
  );
}