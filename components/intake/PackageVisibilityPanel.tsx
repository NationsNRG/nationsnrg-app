"use client";

import { useEffect, useState } from "react";

interface VisibilityCounterparty {
  counterpartyId: string;
  counterpartyType: string;
  counterpartyName: string;
  status: string;
  visibilityLevel: string;
  disclosureDecision: {
    allowed: boolean;
    reason: string;
    sanitized: boolean;
    maxAllowedPackageType: string | null;
  };
}

interface PackageOption {
  id: string;
  package_version: number;
  package_type: string;
  title: string;
  status: string;
}

interface PackageVisibilityPanelProps {
  dealId: string;
}

function badgeClasses(allowed: boolean): string {
  return allowed
    ? "border-green-800 bg-green-950 text-green-300"
    : "border-red-800 bg-red-950 text-red-300";
}

export default function PackageVisibilityPanel({
  dealId,
}: PackageVisibilityPanelProps) {
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [eligibleCounterparties, setEligibleCounterparties] = useState<
    VisibilityCounterparty[]
  >([]);
  const [blockedCounterparties, setBlockedCounterparties] = useState<
    VisibilityCounterparty[]
  >([]);
  const [packageContext, setPackageContext] = useState<{
    packageType?: string;
    audience?: string;
    status?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPackages() {
    const response = await fetch(`/api/intake/deal/${dealId}/package`);
    const data = (await response.json()) as
      | {
          ok: true;
          packages: PackageOption[];
        }
      | {
          ok: false;
          error?: string;
        };

if (!response.ok) {
  throw new Error(`Failed to load packages. HTTP ${response.status}`);
}

if (!data.ok) {
  throw new Error(data.error ?? "Failed to load packages.");
}

    const nextPackages = Array.isArray(data.packages) ? data.packages : [];
    setPackages(nextPackages);

if (!selectedPackageId && nextPackages.length > 0) {
    const firstPackageId = nextPackages[0].id;

    setSelectedPackageId(firstPackageId);

    return firstPackageId;
}

return selectedPackageId || nextPackages[0]?.id || "";
  }

  async function loadVisibility(packageId: string) {
    const response = await fetch(
      `/api/intake/deal/${dealId}/package/${packageId}/visibility`,
    );

    const data = (await response.json()) as
      | {
          ok: true;
          packageContext: {
            packageType: string;
            audience: string;
            status: string;
          };
          visibility: {
            eligibleCounterparties: VisibilityCounterparty[];
            blockedCounterparties: VisibilityCounterparty[];
          };
        }
      | {
          ok: false;
          error?: string;
        };

    if (!response.ok) {
      throw new Error(`Failed to load package visibility. HTTP ${response.status}`);
    }

    if (!data.ok) {
      throw new Error(data.error ?? "Failed to load package visibility.");
    }

    setPackageContext(data.packageContext);
    setEligibleCounterparties(
      Array.isArray(data.visibility.eligibleCounterparties)
        ? data.visibility.eligibleCounterparties
        : [],
    );
    setBlockedCounterparties(
      Array.isArray(data.visibility.blockedCounterparties)
        ? data.visibility.blockedCounterparties
        : [],
    );
  }

  async function refreshAll() {
    try {
      setLoading(true);
      setError(null);

      const packageId = await loadPackages();
      if (packageId) {
        await loadVisibility(packageId);
      } else {
        setPackageContext(null);
        setEligibleCounterparties([]);
        setBlockedCounterparties([]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load package visibility.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealId]);

  async function handlePackageChange(nextPackageId: string) {
    try {
      setSelectedPackageId(nextPackageId);
      setLoading(true);
      setError(null);
      await loadVisibility(nextPackageId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load package visibility.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Package Visibility</h2>
          <p className="text-sm text-gray-400">
            Check who can receive a package before disclosure.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={loading}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Visibility"}
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mb-6 space-y-2">
        <label className="text-sm font-medium text-gray-200">Package</label>
        <select
          value={selectedPackageId}
          onChange={(e) => void handlePackageChange(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
          disabled={packages.length === 0}
        >
          <option value="">Select package</option>
          {packages.map((pkg) => (
            <option key={pkg.id} value={pkg.id}>
              v{pkg.package_version} — {pkg.package_type} — {pkg.title}
            </option>
          ))}
        </select>
      </div>

      {packageContext ? (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <p className="text-xs uppercase text-gray-500">Package Type</p>
            <p className="mt-2 text-sm text-gray-300">
              {packageContext.packageType ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <p className="text-xs uppercase text-gray-500">Audience</p>
            <p className="mt-2 text-sm text-gray-300">
              {packageContext.audience ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <p className="text-xs uppercase text-gray-500">Status</p>
            <p className="mt-2 text-sm text-gray-300">
              {packageContext.status ?? "—"}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-800 bg-black p-4">
          <h3 className="mb-4 text-lg font-semibold text-white">
            Eligible Counterparties
          </h3>

          {eligibleCounterparties.length === 0 ? (
            <p className="text-sm text-gray-400">No eligible counterparties.</p>
          ) : (
            <div className="space-y-4">
              {eligibleCounterparties.map((counterparty) => (
                <div
                  key={counterparty.counterpartyId}
                  className="rounded-lg border border-gray-800 bg-gray-950 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {counterparty.counterpartyName}
                      </p>
                      <p className="text-sm text-gray-400">
                        {counterparty.counterpartyType} ·{" "}
                        {counterparty.visibilityLevel}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${badgeClasses(
                        true,
                      )}`}
                    >
                      allowed
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-300">
                    <p>{counterparty.disclosureDecision.reason}</p>
                    <p>
                      Sanitized:{" "}
                      {counterparty.disclosureDecision.sanitized ? "Yes" : "No"}
                    </p>
                    <p>
                      Max Allowed Package:{" "}
                      {counterparty.disclosureDecision.maxAllowedPackageType ??
                        "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-800 bg-black p-4">
          <h3 className="mb-4 text-lg font-semibold text-white">
            Blocked Counterparties
          </h3>

          {blockedCounterparties.length === 0 ? (
            <p className="text-sm text-gray-400">No blocked counterparties.</p>
          ) : (
            <div className="space-y-4">
              {blockedCounterparties.map((counterparty) => (
                <div
                  key={counterparty.counterpartyId}
                  className="rounded-lg border border-gray-800 bg-gray-950 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {counterparty.counterpartyName}
                      </p>
                      <p className="text-sm text-gray-400">
                        {counterparty.counterpartyType} ·{" "}
                        {counterparty.visibilityLevel}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${badgeClasses(
                        false,
                      )}`}
                    >
                      blocked
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-300">
                    <p>{counterparty.disclosureDecision.reason}</p>
                    <p>
                      Max Allowed Package:{" "}
                      {counterparty.disclosureDecision.maxAllowedPackageType ??
                        "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}