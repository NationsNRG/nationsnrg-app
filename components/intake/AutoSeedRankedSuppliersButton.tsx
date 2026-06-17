"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface AutoSeedRankedSuppliersButtonProps {
  dealId: string;
}

interface SeededSupplier {
  supplierEntityId: string;
  supplierName: string;
  supplierClass: string;
  totalScore: number;
  matchRank: number;
  matchStatus: "recommended" | "fallback";
}

interface SkippedSupplier {
  supplierEntityId: string;
  supplierName: string;
  reason: string;
}

type AutoSeedResponse =
  | {
      ok: true;
      insertedCount: number;
      seededSuppliers: SeededSupplier[];
      skippedSuppliers: SkippedSupplier[];
      message?: string;
    }
  | {
      ok: false;
      error?: string;
    };

export default function AutoSeedRankedSuppliersButton({
  dealId,
}: AutoSeedRankedSuppliersButtonProps) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleAutoSeed() {
    try {
      setLoading(true);
      setMessage(null);
      setDetails([]);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/supplier-rank/seed`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            maxSuppliers: 3,
            attachPrimary: true,
          }),
        },
      );

      const data = (await response.json()) as AutoSeedResponse;

            if (!response.ok) {
        throw new Error(`Failed to auto-seed ranked suppliers. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to auto-seed ranked suppliers.");
      }

      const seededLines = data.seededSuppliers.map(
        (supplier) =>
          `Seeded: ${supplier.supplierName} (#${supplier.matchRank}, score ${supplier.totalScore})`,
      );

      const skippedLines = data.skippedSuppliers.map(
        (supplier) =>
          `Skipped: ${supplier.supplierName} (${supplier.reason})`,
      );

      setMessage(
        data.message ??
          `Auto-seeded ${data.insertedCount} ranked supplier(s).`,
      );

      setDetails([...seededLines, ...skippedLines]);

      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to auto-seed ranked suppliers.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleAutoSeed}
        disabled={loading || isRefreshing}
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
      >
        {loading ? "Seeding..." : "Auto-Seed Ranked Suppliers"}
      </button>

      {message ? (
        <div className="rounded-lg border border-green-800 bg-green-950 p-3 text-sm text-green-300">
          <p>{message}</p>

          {details.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {details.map((line, index) => (
                <li key={`${line}-${index}`}>• {line}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}
    </div>
  );
}