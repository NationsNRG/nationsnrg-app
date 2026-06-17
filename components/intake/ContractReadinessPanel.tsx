"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ContractReadinessProfile {
  id: string;
  readiness_status: string;
  readiness_score: number;
  execution_lane: string;
  buyer_identity_status: string;
  authority_status: string;
  usage_data_status: string;
  site_data_status: string;
  supplier_package_status: string;
  compensation_protection_status: string;
  legal_review_status: string;
  blocker_count: number;
  next_required_action: string | null;
  readiness_reason: string;
  updated_at: string | null;
}

interface ContractReadinessPanelProps {
  dealId: string;
}

function statusClasses(status: string): string {
  if (status === "ready_for_execution" || status === "ready_for_supplier") {
    return "border-green-800 bg-green-950 text-green-300";
  }

  if (status === "in_progress") {
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  }

  if (status === "blocked" || status === "not_ready") {
    return "border-red-800 bg-red-950 text-red-300";
  }

  return "border-blue-800 bg-blue-950 text-blue-300";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function ContractReadinessPanel({
  dealId,
}: ContractReadinessPanelProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<ContractReadinessProfile | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadProfile() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/contract-readiness`);
      const data = (await response.json()) as
        | {
            ok: true;
            readinessProfile: ContractReadinessProfile | null;
          }
        | {
            ok: false;
            error?: string;
          };

      if (!response.ok) {
        throw new Error(`Failed to load contract readiness. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load contract readiness.");
      }

      setProfile(data.readinessProfile ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load contract readiness.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function refreshReadiness() {
    try {
      setRefreshing(true);
      setMessage(null);
      setError(null);

      const response = await fetch(
  `/api/intake/deal/${dealId}/contract-readiness`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      triggerSource: "operator",
    }),
  },
);

      const data = (await response.json()) as
        | {
            ok: true;
            readinessProfile: ContractReadinessProfile;
          }
        | {
            ok: false;
            error?: string;
          };

      if (!response.ok) {
        throw new Error(`Failed to refresh contract readiness. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to refresh contract readiness.");
      }

      setProfile(data.readinessProfile);
      setMessage("Contract readiness refreshed.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to refresh contract readiness.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, [dealId]);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Contract Readiness
          </h2>
          <p className="text-sm text-gray-400">
            Measures whether this deal is ready for supplier release, execution,
            and protected monetization.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refreshReadiness()}
          disabled={refreshing || loading}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh Readiness"}
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

      {loading ? (
        <p className="text-sm text-gray-400">Loading contract readiness...</p>
      ) : !profile ? (
        <div className="rounded-xl border border-gray-800 bg-black p-4">
          <p className="text-sm text-gray-400">
            No contract readiness profile exists yet.
          </p>
          <button
            type="button"
            onClick={() => void refreshReadiness()}
            disabled={refreshing}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {refreshing ? "Creating..." : "Create Readiness Profile"}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-4 rounded-xl border border-gray-800 bg-black p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                Score: {profile.readiness_score}/100
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Lane: {profile.execution_lane}
              </p>
            </div>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                profile.readiness_status,
              )}`}
            >
              {profile.readiness_status}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Buyer Identity" value={profile.buyer_identity_status} />
            <Metric label="Authority" value={profile.authority_status} />
            <Metric label="Usage Data" value={profile.usage_data_status} />
            <Metric label="Site Data" value={profile.site_data_status} />
            <Metric
              label="Supplier Package"
              value={profile.supplier_package_status}
            />
            <Metric
              label="Comp Protection"
              value={profile.compensation_protection_status}
            />
            <Metric label="Legal Review" value={profile.legal_review_status} />
            <Metric label="Blockers" value={String(profile.blocker_count)} />
          </div>

          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <p className="text-xs uppercase text-gray-500">Next Required Action</p>
            <p className="mt-2 text-sm text-gray-300">
              {profile.next_required_action ?? "No required action."}
            </p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <p className="text-xs uppercase text-gray-500">Readiness Reason</p>
            <p className="mt-2 text-sm text-gray-300">
              {profile.readiness_reason}
            </p>
          </div>

          <p className="text-xs text-gray-500">
            Last updated: {formatDate(profile.updated_at)}
          </p>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-black p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}