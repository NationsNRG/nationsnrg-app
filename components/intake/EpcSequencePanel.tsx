"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface EpcProfile {
  epc_name: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  website_url: string | null;
  disclosure_tolerance: string | null;
  compensation_requirement: string | null;
  liability_boundary_requirement: string | null;
}

interface EpcSequence {
  id: string;
  epc_profile_id: string;
  epc_identifier: string;
  sequence_type: string;
  sequence_position: number;
  package_level: string;
  sequence_status: string;
  is_primary: boolean;
  hold_reason: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  epc_partner_profiles: EpcProfile | null;
}

interface Props {
  dealId: string;
}

function statusClasses(status: string): string {
  if (status === "completed" || status === "responded" || status === "approved") {
    return "border-green-800 bg-green-950 text-green-300";
  }

  if (status === "planned" || status === "contacted") {
    return "border-blue-800 bg-blue-950 text-blue-300";
  }

  if (status === "held") {
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  }

  return "border-red-800 bg-red-950 text-red-300";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function EpcSequencePanel({ dealId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [sequence, setSequence] = useState<EpcSequence[]>([]);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [holdReasonById, setHoldReasonById] = useState<Record<string, string>>({});
  const [packageById, setPackageById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSequence() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/epc-sequence`);
      const data = (await response.json()) as
        | { ok: true; epcSequence: EpcSequence[] }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to load EPC sequence. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to load EPC sequence.");
        }

      const next = Array.isArray(data.epcSequence) ? data.epcSequence : [];
      setSequence(next);

      const nextNotes: Record<string, string> = {};
      const nextHoldReasons: Record<string, string> = {};
      const nextPackages: Record<string, string> = {};

      for (const item of next) {
        nextNotes[item.id] = item.notes ?? "";
        nextHoldReasons[item.id] = item.hold_reason ?? "";
        nextPackages[item.id] = item.package_level;
      }

      setNotesById(nextNotes);
      setHoldReasonById(nextHoldReasons);
      setPackageById(nextPackages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load EPC sequence.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSequence();
  }, [dealId]);

  async function updateSequence(
    sequenceId: string,
    action:
      | "mark_planned"
      | "mark_approved"
      | "mark_contacted"
      | "mark_responded"
      | "mark_held"
      | "mark_rejected"
      | "mark_completed"
      | "set_primary",
  ) {
    try {
      setUpdatingId(sequenceId);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/epc-sequence/${sequenceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            notes:
              notesById[sequenceId]?.trim() === ""
                ? null
                : notesById[sequenceId]?.trim() ?? null,
            holdReason:
              holdReasonById[sequenceId]?.trim() === ""
                ? null
                : holdReasonById[sequenceId]?.trim() ?? null,
            packageLevel: packageById[sequenceId],
          }),
        },
      );

      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to update EPC sequence. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to update EPC sequence.");
        }

      setMessage(`EPC sequence updated: ${action}.`);
      await loadSequence();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update EPC sequence.");
    } finally {
      setUpdatingId(null);
    }
  }

  const primary = sequence.find((item) => item.is_primary) ?? null;

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            EPC Sequence Plan
          </h2>
          <p className="text-sm text-gray-400">
            Control EPC release order, package level, contact status, primary selection,
            hold/reject decisions, and response progression.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadSequence()}
          disabled={loading || updatingId !== null}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Sequence"}
        </button>
      </div>

      {primary ? (
        <div className="mb-4 rounded-xl border border-green-800 bg-green-950 p-4">
          <p className="text-sm font-semibold text-green-200">
            Primary EPC: {primary.epc_partner_profiles?.epc_name ?? primary.epc_identifier}
          </p>
          <p className="mt-1 text-xs text-green-300">
            Package: {primary.package_level} · Status: {primary.sequence_status}
          </p>
        </div>
      ) : null}

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
        <p className="text-sm text-gray-400">Loading EPC sequence...</p>
      ) : sequence.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-black p-4 text-sm text-gray-400">
          No EPC sequence created yet. Score EPCs and create a sequence from recommendations.
        </div>
      ) : (
        <div className="space-y-4">
          {sequence.map((item) => (
            <div key={item.id} className="rounded-xl border border-gray-800 bg-black p-4">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    #{item.sequence_position}{" "}
                    {item.epc_partner_profiles?.epc_name ?? item.epc_identifier}
                    {item.is_primary ? " · PRIMARY" : ""}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {item.epc_identifier} · {item.sequence_type} · updated{" "}
                    {formatDate(item.updated_at)}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                    item.sequence_status,
                  )}`}
                >
                  {item.sequence_status}
                </span>
              </div>

              <div className="mb-4 grid gap-3 md:grid-cols-4">
                <Metric label="Contact" value={item.epc_partner_profiles?.primary_contact_name ?? "—"} />
                <Metric label="Email" value={item.epc_partner_profiles?.primary_contact_email ?? "—"} />
                <Metric label="Disclosure" value={item.epc_partner_profiles?.disclosure_tolerance ?? "—"} />
                <Metric label="Liability" value={item.epc_partner_profiles?.liability_boundary_requirement ?? "—"} />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase text-gray-500">
                    Package Level
                  </label>
                  <select
                    value={packageById[item.id] ?? item.package_level}
                    onChange={(e) =>
                      setPackageById((current) => ({
                        ...current,
                        [item.id]: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                  >
                    {[
                      "none",
                      "teaser",
                      "qualified_package",
                      "full_package",
                      "nda_required",
                    ].map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase text-gray-500">
                    Hold Reason
                  </label>
                  <input
                    value={holdReasonById[item.id] ?? ""}
                    onChange={(e) =>
                      setHoldReasonById((current) => ({
                        ...current,
                        [item.id]: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                    placeholder="Why hold this EPC?"
                  />
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <label className="text-xs uppercase text-gray-500">
                  EPC Sequence Notes
                </label>
                <textarea
                  value={notesById[item.id] ?? ""}
                  onChange={(e) =>
                    setNotesById((current) => ({
                      ...current,
                      [item.id]: e.target.value,
                    }))
                  }
                  className="min-h-20 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                  placeholder="Contact notes, release limits, accountability owner, response, or override reason."
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    "set_primary",
                    "mark_planned",
                    "mark_approved",
                    "mark_contacted",
                    "mark_responded",
                    "mark_held",
                    "mark_rejected",
                    "mark_completed",
                  ] as const
                ).map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => void updateSequence(item.id, action)}
                    disabled={updatingId !== null}
                    className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    {updatingId === item.id ? "Updating..." : action}
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-300 break-words">{value}</p>
    </div>
  );
}