"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface CompensationTerm {
  id: string;
  compensation_type: string;
  compensation_status: string;
  payor_type: string;
  payor_identifier: string | null;
  payment_trigger: string;
  payment_basis: string;
  expected_value: number | null;
  term_summary: string;
  protection_level: string;
  signed_acknowledgment_required: boolean;
  signed_acknowledgment_received: boolean;
  disclosure_allowed: boolean;
  notes: string | null;
  created_at: string | null;
}

interface Props {
  dealId: string;
}

export default function CompensationTermsPanel({ dealId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [updatingTermId, setUpdatingTermId] = useState<string | null>(null);
  const [termNotesById, setTermNotesById] = useState<Record<string, string>>({});

  const [terms, setTerms] = useState<CompensationTerm[]>([]);

  const [compensationType, setCompensationType] = useState("broker_commission");
  const [payorType, setPayorType] = useState("supplier");
  const [payorIdentifier, setPayorIdentifier] = useState("");
  const [paymentTrigger, setPaymentTrigger] = useState("contract_signed");
  const [paymentBasis, setPaymentBasis] = useState("percentage_of_contract_value");
  const [expectedValue, setExpectedValue] = useState("");
  const [termSummary, setTermSummary] = useState("");
  const [protectionLevel, setProtectionLevel] = useState("drafted");
  const [ackRequired, setAckRequired] = useState(true);
  const [ackReceived, setAckReceived] = useState(false);
  const [disclosureAllowed, setDisclosureAllowed] = useState(false);
  const [notes, setNotes] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadTerms() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/compensation-terms`);
      const data = (await response.json()) as
        | { ok: true; terms: CompensationTerm[] }
        | { ok: false; error?: string };

    if (!response.ok) {
    throw new Error(`Failed to load compensation terms. HTTP ${response.status}`);
    }

    if (!data.ok) {
    throw new Error(data.error ?? "Failed to load compensation terms.");
    }

      const nextTerms = Array.isArray(data.terms) ? data.terms : [];
      setTerms(nextTerms);

      const nextNotes: Record<string, string> = {};
      for (const term of nextTerms) {
        nextNotes[term.id] = term.notes ?? "";
      }
      setTermNotesById(nextNotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load compensation terms.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTerms();
  }, [dealId]);

  async function createTerm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage(null);
      setError(null);

      const parsedExpectedValue =
        expectedValue.trim() === "" ? null : Number(expectedValue.trim());

      if (parsedExpectedValue !== null && !Number.isFinite(parsedExpectedValue)) {
        throw new Error("Expected value must be a valid number.");
      }

      const response = await fetch(`/api/intake/deal/${dealId}/compensation-terms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compensationType,
          payorType,
          payorIdentifier: payorIdentifier.trim() === "" ? null : payorIdentifier.trim(),
          paymentTrigger,
          paymentBasis,
          expectedValue: parsedExpectedValue,
          termSummary,
          protectionLevel,
          signedAcknowledgmentRequired: ackRequired,
          signedAcknowledgmentReceived: ackReceived,
          disclosureAllowed,
          notes: notes.trim() === "" ? null : notes.trim(),
        }),
      });

      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

    if (!response.ok) {
    throw new Error(`Failed to create compensation term. HTTP ${response.status}`);
    }

    if (!data.ok) {
    throw new Error(data.error ?? "Failed to create compensation term.");
    }

      setMessage("Compensation term created.");
      setTermSummary("");
      setExpectedValue("");
      setPayorIdentifier("");
      setNotes("");

      await loadTerms();

      await fetch(`/api/intake/deal/${dealId}/compensation-protection`, {
        method: "POST",
      });

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create compensation term.");
    } finally {
      setSaving(false);
    }
  }

async function updateTermAction(
  termId: string,
  action:
    | "mark_drafted"
    | "mark_review_required"
    | "mark_protected"
    | "mark_waived"
    | "mark_rejected"
    | "require_ack"
    | "mark_ack_received"
    | "allow_disclosure"
    | "block_disclosure",
) {
  try {
    setUpdatingTermId(termId);
    setMessage(null);
    setError(null);

    const response = await fetch(
      `/api/intake/deal/${dealId}/compensation-terms/${termId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          notes:
            termNotesById[termId]?.trim() === ""
              ? null
              : termNotesById[termId]?.trim() ?? null,
        }),
      },
    );

    const data = (await response.json()) as
      | { ok: true }
      | { ok: false; error?: string };

    if (!response.ok) {
    throw new Error(`YOUR MESSAGE HERE HTTP ${response.status}`);
    }

    if (!data.ok) {
    throw new Error(data.error ?? "YOUR MESSAGE HERE");
    }

    setMessage(`Compensation term updated: ${action}.`);

    await loadTerms();

    await fetch(`/api/intake/deal/${dealId}/compensation-protection`, {
      method: "POST",
    });

    await fetch(`/api/intake/deal/${dealId}/contract-readiness`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ triggerSource: "compensation_update" }),
    });

    router.refresh();
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Failed to update compensation term.",
    );
  } finally {
    setUpdatingTermId(null);
  }
}  

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">Compensation Terms</h2>
        <p className="text-sm text-gray-400">
          Capture 360 monetization terms while keeping the deal fair, attractive,
          and protected for NationsNRG and its partners.
        </p>
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

      <form onSubmit={createTerm} className="mb-6 space-y-4 rounded-xl border border-gray-800 bg-black p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Select label="Type" value={compensationType} setValue={setCompensationType} options={[
            "broker_commission","referral_fee","success_fee","packaging_fee","advisory_fee","retained_upside","future_expansion_rights","other"
          ]} />

          <Select label="Payor" value={payorType} setValue={setPayorType} options={[
            "supplier","epc","buyer","partner","marketplace","other"
          ]} />

          <Select label="Trigger" value={paymentTrigger} setValue={setPaymentTrigger} options={[
            "contract_signed","enrollment_accepted","project_funded","project_completed","supplier_paid","buyer_paid","milestone","other"
          ]} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Select label="Basis" value={paymentBasis} setValue={setPaymentBasis} options={[
            "per_kwh","per_therm","percentage_of_savings","percentage_of_contract_value","flat_fee","success_fee","spread_margin","other"
          ]} />

          <Input label="Expected Value" value={expectedValue} setValue={setExpectedValue} placeholder="2500" />

          <Input label="Payor Identifier" value={payorIdentifier} setValue={setPayorIdentifier} placeholder="supplier_test_001" />
        </div>

        <Select label="Protection Level" value={protectionLevel} setValue={setProtectionLevel} options={[
          "internal_only","drafted","counterparty_ack_required","counterparty_ack_received","fully_protected"
        ]} />

        <div className="grid gap-4 md:grid-cols-3">
          <Toggle label="Ack Required" checked={ackRequired} setChecked={setAckRequired} />
          <Toggle label="Ack Received" checked={ackReceived} setChecked={setAckReceived} />
          <Toggle label="Disclosure Allowed" checked={disclosureAllowed} setChecked={setDisclosureAllowed} />
        </div>

        <Textarea
          label="Term Summary"
          value={termSummary}
          setValue={setTermSummary}
          placeholder="NationsNRG earns a reasonable success fee if the deal closes, structured to remain attractive to supplier/EPC/buyer."
        />

        <Textarea
          label="Notes"
          value={notes}
          setValue={setNotes}
          placeholder="Internal fairness, partner-protection, and disclosure notes."
        />

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create Compensation Term"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-400">Loading compensation terms...</p>
      ) : terms.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-black p-4 text-sm text-gray-400">
          No compensation terms created yet.
        </div>
      ) : (
        <div className="space-y-4">
          {terms.map((term) => (
            <div key={term.id} className="rounded-xl border border-gray-800 bg-black p-4">
              <div className="mb-3 flex justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {term.compensation_type}
                  </p>
                  <p className="text-xs uppercase text-gray-500">
                    {term.payor_type} · {term.payment_trigger} · {term.payment_basis}
                  </p>
                </div>
                <span className="rounded-full border border-blue-800 bg-blue-950 px-3 py-1 text-xs uppercase text-blue-300">
                  {term.protection_level}
                </span>
              </div>

              <p className="text-sm text-gray-300">{term.term_summary}</p>

              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <Metric label="Expected" value={term.expected_value ? `$${term.expected_value}` : "—"} />
                <Metric label="Ack Required" value={term.signed_acknowledgment_required ? "Yes" : "No"} />
                <Metric label="Ack Received" value={term.signed_acknowledgment_received ? "Yes" : "No"} />
                <Metric label="Disclosure" value={term.disclosure_allowed ? "Allowed" : "Blocked"} />
              </div>

            <div className="mt-3 space-y-2">
            <label className="text-xs uppercase text-gray-500">Protection Notes</label>
            <textarea
                value={termNotesById[term.id] ?? ""}
                onChange={(e) =>
                setTermNotesById((current) => ({
                    ...current,
                    [term.id]: e.target.value,
                }))
                }
                className="min-h-20 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                placeholder="Mutual protection, fairness logic, acknowledgment details, or disclosure limits."
            />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
            {(
                [
                "mark_drafted",
                "mark_review_required",
                "mark_protected",
                "require_ack",
                "mark_ack_received",
                "allow_disclosure",
                "block_disclosure",
                "mark_waived",
                "mark_rejected",
                ] as const
            ).map((action) => (
                <button
                key={action}
                type="button"
                onClick={() => void updateTermAction(term.id, action)}
                disabled={updatingTermId !== null}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                >
                {updatingTermId === term.id ? "Updating..." : action}
                </button>
            ))}
            </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Select({
  label,
  value,
  setValue,
  options,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-200">{label}</label>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}

function Input({
  label,
  value,
  setValue,
  placeholder,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-200">{label}</label>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
        placeholder={placeholder}
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  setValue,
  placeholder,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-200">{label}</label>
      <textarea
        required={label === "Term Summary"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-h-24 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
        placeholder={placeholder}
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  setChecked,
}: {
  label: string;
  checked: boolean;
  setChecked: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-950 p-3 text-sm text-gray-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
      />
      {label}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-300">{value}</p>
    </div>
  );
}