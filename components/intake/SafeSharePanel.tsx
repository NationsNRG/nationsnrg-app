"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface PackageOption {
  id: string;
  package_version: number;
  package_type: string;
  title: string;
  status: string;
}

interface CounterpartyOption {
  id: string;
  counterparty_name: string;
  counterparty_type: string;
  visibility_level: string;
  status: string;
}

interface SafeSharePanelProps {
  dealId: string;
}

interface SafeShareDecision {
  allowed: boolean;
  reason: string;
  sanitized: boolean;
  maxAllowedPackageType: string | null;
}

type PackagesResponse =
  | { ok: true; packages: PackageOption[] }
  | { ok: false; error?: string };

type CounterpartiesResponse =
  | { ok: true; counterparties: CounterpartyOption[] }
  | { ok: false; error?: string };

type SafeShareResponse =
  | {
      ok: true;
      disclosureDecision: SafeShareDecision;
      shareMode: "sanitized" | "full";
    }
  | {
      ok: false;
      blocked?: boolean;
      error?: string;
      disclosureDecision?: SafeShareDecision;
    };

export default function SafeSharePanel({ dealId }: SafeSharePanelProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [packages, setPackages] = useState<PackageOption[]>([]);
  const [counterparties, setCounterparties] = useState<CounterpartyOption[]>([]);

  const [packageId, setPackageId] = useState("");
  const [counterpartyId, setCounterpartyId] = useState("");
  const [shareChannel, setShareChannel] = useState("manual");
  const [recipientIdentifier, setRecipientIdentifier] = useState("");
  const [notes, setNotes] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [decision, setDecision] = useState<SafeShareDecision | null>(null);
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

  async function handleSafeShare(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSubmitting(true);
      setMessage(null);
      setDecision(null);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/package/${packageId}/safe-share`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            counterpartyId,
            shareChannel,
            recipientIdentifier,
            notes: notes.trim() === "" ? null : notes.trim(),
          }),
        },
      );

      const data = (await response.json()) as SafeShareResponse;

      if (!response.ok) {
        throw new Error(`Safe share failed. HTTP ${response.status}`);
      }

      if (!data.ok) {
        setDecision(data.disclosureDecision ?? null);
        throw new Error(data.error ?? "Safe share failed.");
      }

      setDecision(data.disclosureDecision);
      setMessage(
        data.shareMode === "sanitized"
          ? "Safe share logged using sanitized disclosure posture."
          : "Safe share logged using full disclosure posture.",
      );

      setRecipientIdentifier("");
      setNotes("");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Safe share failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Safe Share Flow</h2>
          <p className="text-sm text-gray-400">
            Log a share only when disclosure rules allow it.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadOptions()}
          disabled={loading || submitting}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Options"}
        </button>
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

      <form
        onSubmit={handleSafeShare}
        className="space-y-4 rounded-xl border border-gray-800 bg-black p-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">Package</label>
            <select
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              required
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
              required
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

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Share Channel
            </label>
            <select
              value={shareChannel}
              onChange={(e) => setShareChannel(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            >
              <option value="email">email</option>
              <option value="portal">portal</option>
              <option value="manual">manual</option>
              <option value="api">api</option>
              <option value="other">other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Recipient Identifier
            </label>
            <input
              type="text"
              required
              value={recipientIdentifier}
              onChange={(e) => setRecipientIdentifier(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              placeholder="supplier_test_001 or email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-24 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            placeholder="Disclosure-safe share event notes."
          />
        </div>

        <button
          type="submit"
          disabled={submitting || loading || !packageId || !counterpartyId}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {submitting ? "Processing..." : "Run Safe Share"}
        </button>
      </form>

      {decision ? (
        <div className="mt-4 rounded-xl border border-gray-800 bg-black p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-white">Disclosure Result</p>
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