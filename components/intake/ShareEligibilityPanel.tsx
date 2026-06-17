"use client";

import { useEffect, useState } from "react";

interface CounterpartyOption {
  id: string;
  counterparty_name: string;
  counterparty_type: string;
  visibility_level: string;
  status: string;
}

interface PackageOption {
  id: string;
  package_version: number;
  package_type: string;
  title: string;
}

interface ShareDecision {
  allowed: boolean;
  reason: string;
  sanitized: boolean;
  maxAllowedPackageType: string | null;
}

interface ShareEligibilityPanelProps {
  dealId: string;
}

type PackagesResponse =
  | { ok: true; packages: PackageOption[] }
  | { ok: false; error?: string };

type CounterpartiesResponse =
  | { ok: true; counterparties: CounterpartyOption[] }
  | { ok: false; error?: string };

type ShareCheckResponse =
  | { ok: true; disclosureDecision: ShareDecision }
  | { ok: false; error?: string };

export default function ShareEligibilityPanel({
  dealId,
}: ShareEligibilityPanelProps) {
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [counterparties, setCounterparties] = useState<CounterpartyOption[]>([]);
  const [packageId, setPackageId] = useState("");
  const [counterpartyId, setCounterpartyId] = useState("");
  const [decision, setDecision] = useState<ShareDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadOptions() {
    try {
      setLoading(true);
      setError(null);

      const [packagesResponse, counterpartiesResponse] = await Promise.all([
        fetch(`/api/intake/deal/${dealId}/package`),
        fetch(`/api/intake/deal/${dealId}/counterparties`),
      ]);

      const packagesData = (await packagesResponse.json()) as PackagesResponse;
      const counterpartiesData =
        (await counterpartiesResponse.json()) as CounterpartiesResponse;

      if (!packagesResponse.ok) {
        throw new Error(`Failed to load packages. HTTP ${packagesResponse.status}`);
      }

      if (!packagesData.ok) {
        throw new Error(packagesData.error ?? "Failed to load packages.");
      }

      if (!counterpartiesResponse.ok) {
        throw new Error(
          `Failed to load counterparties. HTTP ${counterpartiesResponse.status}`,
        );
      }

      if (!counterpartiesData.ok) {
        throw new Error(
          counterpartiesData.error ?? "Failed to load counterparties.",
        );
      }

      const nextPackages = Array.isArray(packagesData.packages)
        ? packagesData.packages
        : [];

      const nextCounterparties = Array.isArray(counterpartiesData.counterparties)
        ? counterpartiesData.counterparties
        : [];

      setPackages(nextPackages);
      setCounterparties(nextCounterparties);

      if (packageId === "" && nextPackages.length > 0) {
        setPackageId(nextPackages[0].id);
      }

      if (counterpartyId === "" && nextCounterparties.length > 0) {
        setCounterpartyId(nextCounterparties[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load options.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  async function runCheck() {
    try {
      setChecking(true);
      setError(null);
      setDecision(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/package/${packageId}/share-check`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            counterpartyId,
          }),
        },
      );

      const data = (await response.json()) as ShareCheckResponse;

      if (!response.ok) {
        throw new Error(
          `Failed to evaluate share eligibility. HTTP ${response.status}`,
        );
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to evaluate share eligibility.");
      }

      setDecision(data.disclosureDecision);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to evaluate share eligibility.",
      );
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">Share Eligibility</h2>
        <p className="text-sm text-gray-400">
          Check a specific package against a specific counterparty before sharing.
        </p>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">Package</label>
          <select
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            disabled={loading}
          >
            <option value="">Select package</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                v{pkg.package_version} — {pkg.package_type} — {pkg.title}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">
            Counterparty
          </label>
          <select
            value={counterpartyId}
            onChange={(e) => setCounterpartyId(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            disabled={loading}
          >
            <option value="">Select counterparty</option>
            {counterparties.map((counterparty) => (
              <option key={counterparty.id} value={counterparty.id}>
                {counterparty.counterparty_name} ({counterparty.counterparty_type})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => void runCheck()}
          disabled={loading || checking || !packageId || !counterpartyId}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {checking ? "Checking..." : "Check Share Eligibility"}
        </button>
      </div>

      {decision ? (
        <div className="mt-6 rounded-xl border border-gray-800 bg-black p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">Disclosure Decision</p>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${
                decision.allowed
                  ? "border-green-800 bg-green-950 text-green-300"
                  : "border-red-800 bg-red-950 text-red-300"
              }`}
            >
              {decision.allowed ? "allowed" : "blocked"}
            </span>
          </div>

          <div className="space-y-2 text-sm text-gray-300">
            <p>{decision.reason}</p>
            <p>Sanitized: {decision.sanitized ? "Yes" : "No"}</p>
            <p>
              Max Allowed Package Type: {decision.maxAllowedPackageType ?? "—"}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}