"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface CompensationProtection {
  compensationProtectionStatus: string;
  protectionScore: number;
  protectionReason: string;
  disclosureSafe: boolean;
  nextRequiredAction: string | null;
}

interface CompensationTerm {
  id: string;
  compensation_type: string;
  compensation_status: string;
  payor_type: string;
  payment_trigger: string;
  payment_basis: string;
  expected_value: number | null;
  protection_level: string;
  signed_acknowledgment_received: boolean;
  disclosure_allowed: boolean;
}

interface RetainedRight {
  id: string;
  right_type: string;
  right_status: string;
  right_summary: string;
}

interface Props {
  dealId: string;
}

function statusClasses(status: string): string {
  if (status === "protected") return "border-green-800 bg-green-950 text-green-300";
  if (status === "review_required" || status === "drafted") return "border-yellow-800 bg-yellow-950 text-yellow-300";
  return "border-red-800 bg-red-950 text-red-300";
}

function money(value: number | null): string {
  return typeof value === "number" ? `$${value.toLocaleString()}` : "—";
}

export default function CompensationProtectionPanel({ dealId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [protection, setProtection] = useState<CompensationProtection | null>(null);
  const [terms, setTerms] = useState<CompensationTerm[]>([]);
  const [rights, setRights] = useState<RetainedRight[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadProtection() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/compensation-protection`);
      const data = (await response.json()) as
        | {
            ok: true;
            compensationProtection: CompensationProtection;
            terms: CompensationTerm[];
            retainedRights: RetainedRight[];
          }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(
            `Failed to load compensation protection. HTTP ${response.status}`,
        );
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to load compensation protection.");
        }

      setProtection(data.compensationProtection);
      setTerms(Array.isArray(data.terms) ? data.terms : []);
      setRights(Array.isArray(data.retainedRights) ? data.retainedRights : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load compensation protection.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshProtection() {
    try {
      setRefreshing(true);
      setMessage(null);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/compensation-protection`, {
        method: "POST",
      });

      const data = (await response.json()) as
        | { ok: true; compensationProtection: CompensationProtection }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(
            `Failed to refresh compensation protection. HTTP ${response.status}`,
        );
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to refresh compensation protection.");
        }

      setProtection(data.compensationProtection);
      setMessage("Compensation protection refreshed.");
      await loadProtection();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh compensation protection.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadProtection();
  }, [dealId]);

  const expectedTotal = terms.reduce(
    (sum, term) => sum + (typeof term.expected_value === "number" ? term.expected_value : 0),
    0,
  );

  const protectedTerms = terms.filter(
    (term) =>
      term.compensation_status === "protected" ||
      term.protection_level === "fully_protected" ||
      term.signed_acknowledgment_received,
  ).length;

  const disclosureAllowedCount = terms.filter((term) => term.disclosure_allowed).length;

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Compensation Protection + 360 Opportunity Summary
          </h2>
          <p className="text-sm text-gray-400">
            Protect NationsNRG while keeping terms reasonable, attractive, and mutually aligned.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refreshProtection()}
          disabled={refreshing || loading}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh Protection"}
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
        <p className="text-sm text-gray-400">Loading compensation protection...</p>
      ) : !protection ? (
        <div className="rounded-xl border border-gray-800 bg-black p-4 text-sm text-gray-400">
          No compensation protection result found.
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">
                  Protection Score: {protection.protectionScore}/100
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  Disclosure Safe: {protection.disclosureSafe ? "Yes" : "No"}
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                  protection.compensationProtectionStatus,
                )}`}
              >
                {protection.compensationProtectionStatus}
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Metric label="Expected Total" value={money(expectedTotal)} />
            <Metric label="Terms" value={String(terms.length)} />
            <Metric label="Protected Terms" value={String(protectedTerms)} />
            <Metric label="Disclosure Allowed" value={String(disclosureAllowedCount)} />
            <Metric label="Retained Rights" value={String(rights.length)} />
          </div>

          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <p className="text-xs uppercase text-gray-500">Next Required Action</p>
            <p className="mt-2 text-sm text-gray-300">
              {protection.nextRequiredAction ?? "No required action."}
            </p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <p className="text-xs uppercase text-gray-500">Protection Reason</p>
            <p className="mt-2 text-sm text-gray-300">
              {protection.protectionReason}
            </p>
          </div>

          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <p className="text-xs uppercase text-gray-500">
              360 Opportunity Logic
            </p>
            <p className="mt-2 text-sm text-gray-300">
              The goal is not to overcharge one party. The goal is to capture every fair
              monetization angle: supplier commission, EPC referral/success fee,
              advisory or packaging value, retained upside, future expansion rights,
              and partner-safe disclosure rules.
            </p>
          </div>

          {terms.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Term Summary</h3>

              {terms.map((term) => (
                <div key={term.id} className="rounded-xl border border-gray-800 bg-black p-4">
                  <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {term.compensation_type}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-gray-500">
                        {term.payor_type} · {term.payment_trigger} · {term.payment_basis}
                      </p>
                    </div>

                    <span className="rounded-full border border-blue-800 bg-blue-950 px-3 py-1 text-xs font-medium uppercase text-blue-300">
                      {term.compensation_status}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-4">
                    <Metric label="Expected" value={money(term.expected_value)} />
                    <Metric label="Protection" value={term.protection_level} />
                    <Metric
                      label="Ack"
                      value={term.signed_acknowledgment_received ? "Received" : "Missing"}
                    />
                    <Metric
                      label="Disclosure"
                      value={term.disclosure_allowed ? "Allowed" : "Blocked"}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {rights.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Retained Rights</h3>

              {rights.map((right) => (
                <div key={right.id} className="rounded-xl border border-gray-800 bg-black p-4">
                  <p className="text-sm font-semibold text-white">{right.right_type}</p>
                  <p className="mt-1 text-sm text-gray-300">{right.right_summary}</p>
                  <p className="mt-2 text-xs uppercase text-gray-500">
                    {right.right_status}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}