"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface CommissionClaim {
  id: string;
  claim_status: string;
  claim_amount: number | null;
  claim_currency: string;
  claim_basis: string;
  claim_trigger_event: string;
  counterparty_identifier: string | null;
  invoice_reference: string | null;
  payout_due_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string | null;
}

interface ReferralClaim {
  id: string;
  referral_party: string;
  referred_counterparty: string | null;
  claim_status: string;
  expected_fee: number | null;
  fee_currency: string;
  payment_trigger: string;
  acknowledgment_status: string;
  notes: string | null;
  created_at: string | null;
}

interface SuccessClaim {
  id: string;
  success_event: string;
  claim_status: string;
  expected_success_fee: number | null;
  fee_currency: string;
  success_fee_basis: string;
  counterparty_identifier: string | null;
  notes: string | null;
  created_at: string | null;
}

interface ClaimsResponse {
  commissionClaims: CommissionClaim[];
  referralClaims: ReferralClaim[];
  successClaims: SuccessClaim[];
}

interface Props {
  dealId: string;
}

function money(value: number | null, currency = "USD"): string {
  return typeof value === "number" ? `${currency} ${value.toLocaleString()}` : "—";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function statusClasses(status: string): string {
  if (status === "paid" || status === "approved") {
    return "border-green-800 bg-green-950 text-green-300";
  }

  if (
    status === "claimable" ||
    status === "submitted" ||
    status === "draft"
  ) {
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  }

  if (status === "disputed" || status === "rejected") {
    return "border-red-800 bg-red-950 text-red-300";
  }

  return "border-blue-800 bg-blue-950 text-blue-300";
}

export default function CompensationClaimsPanel({ dealId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const [updatingClaimId, setUpdatingClaimId] = useState<string | null>(null);
  const [claimNotesById, setClaimNotesById] = useState<Record<string, string>>({});
  const [invoiceById, setInvoiceById] = useState<Record<string, string>>({});
  const [payoutDueById, setPayoutDueById] = useState<Record<string, string>>({});  

  const [claims, setClaims] = useState<ClaimsResponse>({
    commissionClaims: [],
    referralClaims: [],
    successClaims: [],
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadClaims() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/compensation-claims`);
      const data = (await response.json()) as
        | { ok: true; claims: ClaimsResponse }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to load compensation claims. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to load compensation claims.");
        }

      setClaims({
        commissionClaims: Array.isArray(data.claims.commissionClaims)
          ? data.claims.commissionClaims
          : [],
        referralClaims: Array.isArray(data.claims.referralClaims)
          ? data.claims.referralClaims
          : [],
        successClaims: Array.isArray(data.claims.successClaims)
          ? data.claims.successClaims
          : [],
      });

        const allClaims = [
        ...(data.claims.commissionClaims ?? []),
        ...(data.claims.referralClaims ?? []),
        ...(data.claims.successClaims ?? []),
        ];

        const nextNotes: Record<string, string> = {};
        const nextInvoices: Record<string, string> = {};
        const nextPayoutDue: Record<string, string> = {};

        for (const claim of allClaims) {
        nextNotes[claim.id] = claim.notes ?? "";

        if ("invoice_reference" in claim) {
            nextInvoices[claim.id] = claim.invoice_reference ?? "";
        }

        if ("payout_due_at" in claim) {
            nextPayoutDue[claim.id] = claim.payout_due_at ?? "";
        }
        }

        setClaimNotesById(nextNotes);
        setInvoiceById(nextInvoices);
        setPayoutDueById(nextPayoutDue);

    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load compensation claims.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClaims();
  }, [dealId]);

  async function seedClaims() {
    try {
      setSeeding(true);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/compensation-claims/seed`,
        {
          method: "POST",
        },
      );

      const data = (await response.json()) as
        | {
            ok: true;
            seeded: {
              commission: number;
              referral: number;
              success: number;
            };
          }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to seed compensation claims. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to seed compensation claims.");
        }

      setMessage(
        `Seeded claims — commission: ${data.seeded.commission}, referral: ${data.seeded.referral}, success: ${data.seeded.success}.`,
      );

      await loadClaims();

      await fetch(`/api/intake/deal/${dealId}/compensation-protection`, {
        method: "POST",
      });

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to seed compensation claims.",
      );
    } finally {
      setSeeding(false);
    }
  }

  const totalExpected =
    claims.commissionClaims.reduce(
      (sum, claim) => sum + (claim.claim_amount ?? 0),
      0,
    ) +
    claims.referralClaims.reduce(
      (sum, claim) => sum + (claim.expected_fee ?? 0),
      0,
    ) +
    claims.successClaims.reduce(
      (sum, claim) => sum + (claim.expected_success_fee ?? 0),
      0,
    );

    async function updateClaimAction(params: {
    claimType: "commission" | "referral" | "success";
    claimId: string;
    action:
        | "mark_draft"
        | "mark_claimable"
        | "mark_submitted"
        | "mark_approved"
        | "mark_paid"
        | "mark_disputed"
        | "mark_rejected"
        | "mark_waived";
    }) {
    try {
        setUpdatingClaimId(params.claimId);
        setMessage(null);
        setError(null);

        const response = await fetch(
        `/api/intake/deal/${dealId}/compensation-claims/${params.claimType}/${params.claimId}`,
        {
            method: "PATCH",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
            action: params.action,
            notes:
                claimNotesById[params.claimId]?.trim() === ""
                ? null
                : claimNotesById[params.claimId]?.trim() ?? null,
            invoiceReference:
                invoiceById[params.claimId]?.trim() === ""
                ? null
                : invoiceById[params.claimId]?.trim() ?? null,
            payoutDueAt:
                payoutDueById[params.claimId]?.trim() === ""
                ? null
                : payoutDueById[params.claimId]?.trim() ?? null,
            }),
        },
        );

        const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to update compensation claim. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to update compensation claim.");
        }

        setMessage(`Claim updated: ${params.action}.`);

        await loadClaims();

        await fetch(`/api/intake/deal/${dealId}/compensation-protection`, {
        method: "POST",
        });

        router.refresh();
    } catch (err) {
        setError(
        err instanceof Error ? err.message : "Failed to update compensation claim.",
        );
    } finally {
        setUpdatingClaimId(null);
    }
    }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Compensation Claims
          </h2>
          <p className="text-sm text-gray-400">
            Convert protected compensation terms into claimable commission,
            referral, and success-fee records.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void loadClaims()}
            disabled={loading || seeding}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Claims"}
          </button>

          <button
            type="button"
            onClick={() => void seedClaims()}
            disabled={loading || seeding}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {seeding ? "Seeding..." : "Seed Claims From Terms"}
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-4">
        <Metric label="Expected Claims" value={money(totalExpected)} />
        <Metric
          label="Commission"
          value={String(claims.commissionClaims.length)}
        />
        <Metric label="Referral" value={String(claims.referralClaims.length)} />
        <Metric label="Success" value={String(claims.successClaims.length)} />
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
        <p className="text-sm text-gray-400">Loading compensation claims...</p>
      ) : (
        <div className="space-y-6">
          <ClaimSection title="Commission Claims">
            {claims.commissionClaims.length === 0 ? (
              <Empty />
            ) : (
              claims.commissionClaims.map((claim) => (
                <ClaimCard
                key={claim.id}
                claimType="commission"
                claimId={claim.id}
                title={money(claim.claim_amount, claim.claim_currency)}
                status={claim.claim_status}
                meta={`${claim.claim_trigger_event} · ${claim.claim_basis}`}
                counterparty={claim.counterparty_identifier}
                notes={claim.notes}
                createdAt={claim.created_at}
                claimNotesById={claimNotesById}
                setClaimNotesById={setClaimNotesById}
                invoiceById={invoiceById}
                setInvoiceById={setInvoiceById}
                payoutDueById={payoutDueById}
                setPayoutDueById={setPayoutDueById}
                updatingClaimId={updatingClaimId}
                updateClaimAction={updateClaimAction}
                />
              ))
            )}
          </ClaimSection>

          <ClaimSection title="Referral Fee Claims">
            {claims.referralClaims.length === 0 ? (
              <Empty />
            ) : (
              claims.referralClaims.map((claim) => (
                <ClaimCard
                key={claim.id}
                claimType="referral"
                claimId={claim.id}
                title={money(claim.expected_fee, claim.fee_currency)}
                status={claim.claim_status}
                meta={`${claim.payment_trigger} · ack ${claim.acknowledgment_status}`}
                counterparty={claim.referred_counterparty}
                notes={claim.notes}
                createdAt={claim.created_at}
                claimNotesById={claimNotesById}
                setClaimNotesById={setClaimNotesById}
                invoiceById={invoiceById}
                setInvoiceById={setInvoiceById}
                payoutDueById={payoutDueById}
                setPayoutDueById={setPayoutDueById}
                updatingClaimId={updatingClaimId}
                updateClaimAction={updateClaimAction}
                />
              ))
            )}
          </ClaimSection>

          <ClaimSection title="Success Fee Claims">
            {claims.successClaims.length === 0 ? (
              <Empty />
            ) : (
              claims.successClaims.map((claim) => (
                <ClaimCard
                key={claim.id}
                claimType="success"
                claimId={claim.id}
                title={money(claim.expected_success_fee, claim.fee_currency)}
                status={claim.claim_status}
                meta={`${claim.success_event} · ${claim.success_fee_basis}`}
                counterparty={claim.counterparty_identifier}
                notes={claim.notes}
                createdAt={claim.created_at}
                claimNotesById={claimNotesById}
                setClaimNotesById={setClaimNotesById}
                invoiceById={invoiceById}
                setInvoiceById={setInvoiceById}
                payoutDueById={payoutDueById}
                setPayoutDueById={setPayoutDueById}
                updatingClaimId={updatingClaimId}
                updateClaimAction={updateClaimAction}
                />
              ))
            )}
          </ClaimSection>
        </div>
      )}
    </section>
  );
}

function ClaimSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-black p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ClaimCard({
  claimType,
  claimId,
  title,
  status,
  meta,
  counterparty,
  notes,
  createdAt,
  claimNotesById,
  setClaimNotesById,
  invoiceById,
  setInvoiceById,
  payoutDueById,
  setPayoutDueById,
  updatingClaimId,
  updateClaimAction,
}: {
  claimType: "commission" | "referral" | "success";
  claimId: string;
  title: string;
  status: string;
  meta: string;
  counterparty: string | null;
  notes: string | null;
  createdAt: string | null;
  claimNotesById: Record<string, string>;
  setClaimNotesById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  invoiceById: Record<string, string>;
  setInvoiceById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  payoutDueById: Record<string, string>;
  setPayoutDueById: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  updatingClaimId: string | null;
  updateClaimAction: (params: {
    claimType: "commission" | "referral" | "success";
    claimId: string;
    action:
      | "mark_draft"
      | "mark_claimable"
      | "mark_submitted"
      | "mark_approved"
      | "mark_paid"
      | "mark_disputed"
      | "mark_rejected"
      | "mark_waived";
  }) => Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-gray-500">
            {meta}
          </p>
          <p className="mt-2 text-sm text-gray-400">
            Counterparty: {counterparty ?? "—"}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Created: {formatDate(createdAt)}
          </p>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
            status,
          )}`}
        >
          {status}
        </span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs uppercase text-gray-500">
            Invoice Reference
          </label>
          <input
            value={invoiceById[claimId] ?? ""}
            onChange={(e) =>
              setInvoiceById((current) => ({
                ...current,
                [claimId]: e.target.value,
              }))
            }
            disabled={claimType !== "commission"}
            className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
            placeholder="INV-001"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase text-gray-500">Payout Due At</label>
          <input
            value={payoutDueById[claimId] ?? ""}
            onChange={(e) =>
              setPayoutDueById((current) => ({
                ...current,
                [claimId]: e.target.value,
              }))
            }
            disabled={claimType !== "commission"}
            className="w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
            placeholder="2026-12-31T00:00:00Z"
          />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <label className="text-xs uppercase text-gray-500">Claim Notes</label>
        <textarea
          value={claimNotesById[claimId] ?? notes ?? ""}
          onChange={(e) =>
            setClaimNotesById((current) => ({
              ...current,
              [claimId]: e.target.value,
            }))
          }
          className="min-h-20 w-full rounded-lg border border-gray-700 bg-black px-3 py-2 text-sm text-white"
          placeholder="Submission notes, approval notes, payment confirmation, dispute reason, or waiver reason."
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(
          [
            "mark_draft",
            "mark_claimable",
            "mark_submitted",
            "mark_approved",
            "mark_paid",
            "mark_disputed",
            "mark_rejected",
            "mark_waived",
          ] as const
        ).map((action) => (
          <button
            key={action}
            type="button"
            onClick={() =>
              void updateClaimAction({
                claimType,
                claimId,
                action,
              })
            }
            disabled={updatingClaimId !== null}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {updatingClaimId === claimId ? "Updating..." : action}
          </button>
        ))}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950 p-4 text-sm text-gray-400">
      No claims found.
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-black p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}