"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DealPackageRecord {
  id: string;
  package_version: number;
  package_type: string;
  audience: string;
  status: string;
  title: string;
  summary: string | null;
  package_payload: Record<string, unknown> | null;
  created_at: string | null;
}

interface DealPackagePanelProps {
  dealId: string;
}

interface PackagesResponse {
  ok: boolean;
  packages?: DealPackageRecord[];
  error?: string;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function DealPackagePanel({
  dealId,
}: DealPackagePanelProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [packages, setPackages] = useState<DealPackageRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadPackages() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/package`);
      const data = (await response.json()) as PackagesResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load packages.");
      }

      setPackages(Array.isArray(data.packages) ? data.packages : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load packages.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPackages();
  }, [dealId]);

  async function generatePackage(packageType: "teaser" | "full") {
    try {
      setGeneratingType(packageType);
      setError(null);
      setMessage(null);

      const response = await fetch(`/api/intake/deal/${dealId}/package`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageType,
        }),
      });

      const data = (await response.json()) as
        | {
            ok: true;
          }
        | {
            ok: false;
            error?: string;
          };

      if (!response.ok) {
        throw new Error(
          `Failed to generate ${packageType} package. HTTP ${response.status}`,
        );
      }

      if (!data.ok) {
        throw new Error(data.error ?? `Failed to generate ${packageType} package.`);
      }

      setMessage(
        `${packageType === "teaser" ? "Teaser" : "Full"} package generated successfully.`,
      );

      await loadPackages();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to generate ${packageType} package.`,
      );
    } finally {
      setGeneratingType(null);
    }
  }

  async function runPackageAction(
    packageId: string,
    action: "approve" | "share" | "archive" | "supersede",
  ) {
    try {
      setActioningId(packageId);
      setError(null);
      setMessage(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/package/${packageId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        },
      );

      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(`Failed to ${action} package. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? `Failed to ${action} package.`);
      }

      setMessage(`Package ${action} action completed successfully.`);

      await loadPackages();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to ${action} package.`,
      );
    } finally {
      setActioningId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Deal Packages</h2>
          <p className="text-sm text-gray-400">
            Generate, approve, share, and archive package versions for this deal.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void generatePackage("teaser")}
            disabled={generatingType !== null || actioningId !== null}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {generatingType === "teaser" ? "Generating..." : "Generate Teaser"}
          </button>

          <button
            type="button"
            onClick={() => void generatePackage("full")}
            disabled={generatingType !== null || actioningId !== null}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {generatingType === "full" ? "Generating..." : "Generate Full"}
          </button>

          <button
            type="button"
            onClick={() => void loadPackages()}
            disabled={loading || generatingType !== null || actioningId !== null}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Packages"}
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
        <p className="text-sm text-gray-400">Loading packages...</p>
      ) : packages.length === 0 ? (
        <p className="text-sm text-gray-400">No packages generated yet.</p>
      ) : (
        <div className="space-y-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-xl border border-gray-800 bg-black p-4"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      v{pkg.package_version} — {pkg.title}
                    </p>
                    <p className="text-sm text-gray-400">
                      {pkg.package_type} · {pkg.audience} · {pkg.status}
                    </p>
                  </div>

                  <p className="text-sm text-gray-300">{pkg.summary ?? "—"}</p>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-xs uppercase text-gray-500">Version</p>
                      <p className="text-sm text-gray-300">
                        {pkg.package_version}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Type</p>
                      <p className="text-sm text-gray-300">{pkg.package_type}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Audience</p>
                      <p className="text-sm text-gray-300">{pkg.audience}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Created</p>
                      <p className="text-sm text-gray-300">
                        {formatDate(pkg.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void runPackageAction(pkg.id, "approve")}
                      disabled={actioningId !== null || generatingType !== null}
                      className="rounded-lg border border-green-700 bg-green-900 px-3 py-2 text-xs font-medium text-green-100 disabled:opacity-50"
                    >
                      {actioningId === pkg.id ? "Working..." : "Approve"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void runPackageAction(pkg.id, "share")}
                      disabled={actioningId !== null || generatingType !== null}
                      className="rounded-lg border border-blue-700 bg-blue-900 px-3 py-2 text-xs font-medium text-blue-100 disabled:opacity-50"
                    >
                      {actioningId === pkg.id ? "Working..." : "Mark Shared"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void runPackageAction(pkg.id, "supersede")}
                      disabled={actioningId !== null || generatingType !== null}
                      className="rounded-lg border border-yellow-700 bg-yellow-900 px-3 py-2 text-xs font-medium text-yellow-100 disabled:opacity-50"
                    >
                      {actioningId === pkg.id ? "Working..." : "Supersede"}
                    </button>

                    <button
                      type="button"
                      onClick={() => void runPackageAction(pkg.id, "archive")}
                      disabled={actioningId !== null || generatingType !== null}
                      className="rounded-lg border border-red-700 bg-red-900 px-3 py-2 text-xs font-medium text-red-100 disabled:opacity-50"
                    >
                      {actioningId === pkg.id ? "Working..." : "Archive"}
                    </button>
                  </div>
                </div>

                <details className="w-full max-w-xl rounded-lg border border-gray-800 bg-gray-950 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-white">
                    View Payload
                  </summary>
                  <pre className="mt-3 overflow-x-auto text-xs text-gray-300">
                    {JSON.stringify(pkg.package_payload ?? {}, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}