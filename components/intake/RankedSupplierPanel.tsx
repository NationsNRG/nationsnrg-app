"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface RankedSupplier {
  supplierEntityId: string;
  supplierName: string;
  supplierClass: string;
  totalScore: number;
  matchRank: number;
  matchStatus: "recommended" | "fallback";
  capabilityFitScore: number;
  geographyFitScore: number;
  responsivenessScore: number;
  economicFitScore: number;
  rationale: Record<string, unknown>;
}

interface RankedSupplierPanelProps {
  dealId: string;
}

interface RankedSupplierResponse {
  ok: boolean;
  rankedSuppliers?: RankedSupplier[];
  error?: string;
}

export default function RankedSupplierPanel({
  dealId,
}: RankedSupplierPanelProps) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  const [loading, setLoading] = useState(true);
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [rankedSuppliers, setRankedSuppliers] = useState<RankedSupplier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attachMessage, setAttachMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRankedSuppliers() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/intake/deal/${dealId}/supplier-rank`);
        const data = (await response.json()) as RankedSupplierResponse;

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load ranked suppliers.");
        }

        if (!isMounted) {
          return;
        }

        setRankedSuppliers(
          Array.isArray(data.rankedSuppliers) ? data.rankedSuppliers : [],
        );
      } catch (err) {
        if (!isMounted) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Failed to load ranked suppliers.",
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadRankedSuppliers();

    return () => {
      isMounted = false;
    };
  }, [dealId]);

  async function attachSupplier(supplier: RankedSupplier) {
    try {
      setAttachingId(supplier.supplierEntityId);
      setAttachMessage(null);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/supplier-attach`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supplierEntityId: supplier.supplierEntityId,
            supplierName: supplier.supplierName,
            sequenceType:
              supplier.matchStatus === "recommended"
                ? "sequential_waterfall"
                : "fallback_only",
            visibilityTier:
              supplier.supplierClass === "premium_partner"
                ? "tier_4_premium"
                : "tier_2_qualified",
            packageAudience:
              supplier.supplierClass === "premium_partner"
                ? "lpl"
                : "supplier_qualified",
            isPrimary: supplier.matchRank === 1,
            holdReason: null,
            fitScore: supplier.totalScore,
          }),
        },
      );

      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to attach ranked supplier.");
      }

      setAttachMessage(
        `${supplier.supplierName} attached successfully at rank ${supplier.matchRank}.`,
      );

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to attach ranked supplier.",
      );
    } finally {
      setAttachingId(null);
    }
  }

  function renderReasons(value: unknown): string[] {
    if (
      value &&
      typeof value === "object" &&
      "reasons" in value &&
      (value as { reasons?: unknown }).reasons &&
      typeof (value as { reasons?: unknown }).reasons === "object"
    ) {
      const reasonsObject = (value as {
        reasons: Record<string, unknown>;
      }).reasons;

      return Object.values(reasonsObject)
        .flatMap((entry) =>
          Array.isArray(entry)
            ? entry.filter((item): item is string => typeof item === "string")
            : [],
        )
        .slice(0, 4);
    }

    return [];
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Ranked Suppliers</h2>
          <p className="text-sm text-gray-400">
            Auto-ranked supplier matches for this deal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError(null);
            fetch(`/api/intake/deal/${dealId}/supplier-rank`)
              .then(async (r) => {
                const data = (await r.json()) as RankedSupplierResponse;
                if (!r.ok || !data.ok) {
                  throw new Error(
                    data.error ?? "Failed to refresh ranked suppliers.",
                  );
                }
                setRankedSuppliers(
                  Array.isArray(data.rankedSuppliers) ? data.rankedSuppliers : [],
                );
              })
              .catch((err) =>
                setError(
                  err instanceof Error
                    ? err.message
                    : "Failed to refresh ranked suppliers.",
                ),
              )
              .finally(() => setLoading(false));
          }}
          disabled={loading || isRefreshing}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh Ranking"}
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {attachMessage ? (
        <div className="mb-4 rounded-lg border border-green-800 bg-green-950 p-4 text-sm text-green-300">
          {attachMessage}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-400">Loading ranked suppliers...</p>
      ) : rankedSuppliers.length === 0 ? (
        <p className="text-sm text-gray-400">No ranked suppliers found.</p>
      ) : (
        <div className="space-y-4">
          {rankedSuppliers.map((supplier) => {
            const reasons = renderReasons(supplier.rationale);

            return (
              <div
                key={supplier.supplierEntityId}
                className="rounded-xl border border-gray-800 bg-black p-4"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        #{supplier.matchRank} — {supplier.supplierName}
                      </p>
                      <p className="text-sm text-gray-400">
                        {supplier.supplierEntityId} · {supplier.supplierClass}
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase text-gray-500">
                          Total Score
                        </p>
                        <p className="text-sm font-medium text-white">
                          {supplier.totalScore}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-gray-500">
                          Capability
                        </p>
                        <p className="text-sm text-gray-300">
                          {supplier.capabilityFitScore}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-gray-500">
                          Geography
                        </p>
                        <p className="text-sm text-gray-300">
                          {supplier.geographyFitScore}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase text-gray-500">
                          Economics
                        </p>
                        <p className="text-sm text-gray-300">
                          {supplier.economicFitScore}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs uppercase text-gray-500">
                        Match Status
                      </p>
                      <p className="text-sm text-gray-300">
                        {supplier.matchStatus}
                      </p>
                    </div>

                    <div>
                      <p className="mb-2 text-xs uppercase text-gray-500">
                        Top Reasons
                      </p>
                      {reasons.length > 0 ? (
                        <ul className="space-y-1 text-sm text-gray-300">
                          {reasons.map((reason, index) => (
                            <li key={`${supplier.supplierEntityId}-${index}`}>
                              • {reason}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-400">—</p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => attachSupplier(supplier)}
                      disabled={
                        attachingId === supplier.supplierEntityId || isRefreshing
                      }
                      className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                    >
                      {attachingId === supplier.supplierEntityId
                        ? "Attaching..."
                        : "Attach Ranked Supplier"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}