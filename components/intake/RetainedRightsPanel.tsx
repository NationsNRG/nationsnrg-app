"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RetainedRight {
  id: string;
  right_type: string;
  right_status: string;
  right_summary: string;
  protected_until: string | null;
  counterparty_identifier: string | null;
  notes: string | null;
  created_at: string | null;
  metadata: {
    teamExpansionIncluded?: boolean;
    limitedOperatorInvolvement?: boolean;
    accountabilityStructureRequired?: boolean;
    liabilityBoundaryRequired?: boolean;
  } | null;
}

interface Props {
  dealId: string;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function RetainedRightsPanel({ dealId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [updatingRightId, setUpdatingRightId] = useState<string | null>(null);
  const [rightNotesById, setRightNotesById] = useState<Record<string, string>>({});

  const [rights, setRights] = useState<RetainedRight[]>([]);
  const [rightType, setRightType] = useState("future_expansion");
  const [rightSummary, setRightSummary] = useState("");
  const [protectedUntil, setProtectedUntil] = useState("");
  const [counterpartyIdentifier, setCounterpartyIdentifier] = useState("");
  const [notes, setNotes] = useState("");

  const [teamExpansionIncluded, setTeamExpansionIncluded] = useState(true);
  const [limitedOperatorInvolvement, setLimitedOperatorInvolvement] =
    useState(true);
  const [accountabilityStructureRequired, setAccountabilityStructureRequired] =
    useState(true);
  const [liabilityBoundaryRequired, setLiabilityBoundaryRequired] =
    useState(true);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadRights() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/retained-rights`);
      const data = (await response.json()) as
        | { ok: true; retainedRights: RetainedRight[] }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to load retained rights. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to load retained rights.");
        }

        const nextRights = Array.isArray(data.retainedRights)
        ? data.retainedRights
        : [];

        setRights(nextRights);

        const nextNotes: Record<string, string> = {};
        for (const right of nextRights) {
        nextNotes[right.id] = right.notes ?? "";
        }
        setRightNotesById(nextNotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load retained rights.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRights();
  }, [dealId]);

  async function createRight(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage(null);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/retained-rights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rightType,
          rightSummary,
          protectedUntil: protectedUntil.trim() === "" ? null : protectedUntil,
          counterpartyIdentifier:
            counterpartyIdentifier.trim() === ""
              ? null
              : counterpartyIdentifier.trim(),
          notes: notes.trim() === "" ? null : notes.trim(),
          teamExpansionIncluded,
          limitedOperatorInvolvement,
          accountabilityStructureRequired,
          liabilityBoundaryRequired,
        }),
      });

      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to create retained right. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to create retained right.");
        }

      setMessage("Retained right created.");
      setRightSummary("");
      setProtectedUntil("");
      setCounterpartyIdentifier("");
      setNotes("");

      await loadRights();

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
      setError(err instanceof Error ? err.message : "Failed to create retained right.");
    } finally {
      setSaving(false);
    }
  }

async function updateRightAction(
  rightId: string,
  action:
    | "mark_reserved"
    | "mark_acknowledged"
    | "mark_released"
    | "mark_expired"
    | "mark_waived",
) {
  try {
    setUpdatingRightId(rightId);
    setMessage(null);
    setError(null);

    const response = await fetch(
      `/api/intake/deal/${dealId}/retained-rights/${rightId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          notes:
            rightNotesById[rightId]?.trim() === ""
              ? null
              : rightNotesById[rightId]?.trim() ?? null,
        }),
      },
    );

    const data = (await response.json()) as
      | { ok: true }
      | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to update retained right. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to update retained right.");
        }

    setMessage(`Retained right updated: ${action}.`);

    await loadRights();

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
      err instanceof Error ? err.message : "Failed to update retained right.",
    );
  } finally {
    setUpdatingRightId(null);
  }
} 

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">
          Retained Rights + Future Expansion
        </h2>
        <p className="text-sm text-gray-400">
          Reserve future upside, team expansion rights, delegated execution,
          accountability standards, and liability boundaries.
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

      <form
        onSubmit={createRight}
        className="mb-6 space-y-4 rounded-xl border border-gray-800 bg-black p-4"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Select
            label="Right Type"
            value={rightType}
            setValue={setRightType}
            options={[
              "future_expansion",
              "project_follow_on",
              "buyer_relationship",
              "site_portfolio",
              "data_rights",
              "marketplace_rights",
              "other",
            ]}
          />

          <Input
            label="Counterparty Identifier"
            value={counterpartyIdentifier}
            setValue={setCounterpartyIdentifier}
            placeholder="buyer / EPC / supplier / partner"
          />

          <Input
            label="Protected Until"
            value={protectedUntil}
            setValue={setProtectedUntil}
            placeholder="2027-12-31T00:00:00Z"
          />
        </div>

        <Textarea
          label="Right Summary"
          value={rightSummary}
          setValue={setRightSummary}
          required
          placeholder="NationsNRG reserves future expansion rights for additional sites, related projects, sales team assignment, or follow-on opportunities created through this relationship."
        />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Toggle
            label="Sales / Team Expansion"
            checked={teamExpansionIncluded}
            setChecked={setTeamExpansionIncluded}
          />
          <Toggle
            label="Limited Founder Workload"
            checked={limitedOperatorInvolvement}
            setChecked={setLimitedOperatorInvolvement}
          />
          <Toggle
            label="Accountability Structure"
            checked={accountabilityStructureRequired}
            setChecked={setAccountabilityStructureRequired}
          />
          <Toggle
            label="Liability Boundary"
            checked={liabilityBoundaryRequired}
            setChecked={setLiabilityBoundaryRequired}
          />
        </div>

        <Textarea
          label="Notes"
          value={notes}
          setValue={setNotes}
          required={false}
          placeholder="Internal notes about delegation, team ownership, partner responsibility, or boundaries."
        />

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create Retained Right"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-400">Loading retained rights...</p>
      ) : rights.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-black p-4 text-sm text-gray-400">
          No retained rights reserved yet.
        </div>
      ) : (
        <div className="space-y-4">
          {rights.map((right) => (
            <div
              key={right.id}
              className="rounded-xl border border-gray-800 bg-black p-4"
            >
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {right.right_type}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {right.right_status} · created {formatDate(right.created_at)}
                  </p>
                </div>

                <span className="rounded-full border border-blue-800 bg-blue-950 px-3 py-1 text-xs font-medium uppercase text-blue-300">
                  {right.counterparty_identifier ?? "internal"}
                </span>
              </div>

              <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                <p className="text-xs uppercase text-gray-500">Right Summary</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-gray-300">
                  {right.right_summary}
                </p>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <Metric
                  label="Protected Until"
                  value={formatDate(right.protected_until)}
                />
                <Metric
                  label="Team Expansion"
                  value={right.metadata?.teamExpansionIncluded ? "Yes" : "No"}
                />
                <Metric
                  label="Limited Workload"
                  value={
                    right.metadata?.limitedOperatorInvolvement ? "Yes" : "No"
                  }
                />
                <Metric
                  label="Accountability"
                  value={
                    right.metadata?.accountabilityStructureRequired
                      ? "Required"
                      : "No"
                  }
                />
                <Metric
                  label="Liability Boundary"
                  value={
                    right.metadata?.liabilityBoundaryRequired
                      ? "Required"
                      : "No"
                  }
                />
              </div>

            <div className="mt-3 space-y-2">
            <label className="text-xs uppercase text-gray-500">
                Retained Right Notes
            </label>
            <textarea
                value={rightNotesById[right.id] ?? ""}
                onChange={(e) =>
                setRightNotesById((current) => ({
                    ...current,
                    [right.id]: e.target.value,
                }))
                }
                className="min-h-20 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                placeholder="Acknowledgment, release reason, team responsibility, liability boundary, or follow-on notes."
            />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
            {(
                [
                "mark_reserved",
                "mark_acknowledged",
                "mark_released",
                "mark_expired",
                "mark_waived",
                ] as const
            ).map((action) => (
                <button
                key={action}
                type="button"
                onClick={() => void updateRightAction(right.id, action)}
                disabled={updatingRightId !== null}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                >
                {updatingRightId === right.id ? "Updating..." : action}
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
          <option key={option} value={option}>
            {option}
          </option>
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
  required,
  placeholder,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  required: boolean;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-200">{label}</label>
      <textarea
        required={required}
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