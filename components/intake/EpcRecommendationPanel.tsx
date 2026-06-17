"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface EpcPartnerProfile {
  epc_name: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  coverage_states: string[] | null;
  preferred_project_types: string[] | null;
  financing_appetite: string | null;
  disclosure_tolerance: string | null;
}

interface EpcRecommendation {
  id: string;
  epc_profile_id: string;
  epc_identifier: string;
  fit_score: number;
  recommendation_status: string;
  recommendation_rank: number | null;
  recommended_package_level: string;
  recommended_next_action: string | null;
  fit_reason: string;
  geography_score: number;
  project_size_score: number;
  load_profile_score: number;
  compensation_protection_score: number;
  disclosure_safety_score: number;
  execution_gate_score: number;
  relationship_score: number;
  liability_boundary_score: number;
  epc_partner_profiles: EpcPartnerProfile | null;
}

interface Props {
  dealId: string;
}

function scoreClasses(score: number): string {
  if (score >= 85) return "border-green-800 bg-green-950 text-green-300";
  if (score >= 65) return "border-blue-800 bg-blue-950 text-blue-300";
  if (score >= 45) return "border-yellow-800 bg-yellow-950 text-yellow-300";
  return "border-red-800 bg-red-950 text-red-300";
}

function statusClasses(status: string): string {
  if (status === "primary" || status === "recommended") {
    return "border-green-800 bg-green-950 text-green-300";
  }

  if (status === "backup" || status === "candidate") {
    return "border-blue-800 bg-blue-950 text-blue-300";
  }

  if (status === "held") {
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  }

  return "border-red-800 bg-red-950 text-red-300";
}

export default function EpcRecommendationPanel({ dealId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<EpcRecommendation[]>([]);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [packageById, setPackageById] = useState<Record<string, string>>({});
  const [positionById, setPositionById] = useState<Record<string, string>>({});
  const [primaryById, setPrimaryById] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadRecommendations() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/epc-recommendation`);
      const data = (await response.json()) as
        | { ok: true; recommendations: EpcRecommendation[] }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to load EPC recommendations. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to load EPC recommendations.");
        }

      const next = Array.isArray(data.recommendations) ? data.recommendations : [];
      setRecommendations(next);

      const nextNotes: Record<string, string> = {};
      const nextPackages: Record<string, string> = {};
      const nextPositions: Record<string, string> = {};
      const nextPrimary: Record<string, boolean> = {};

      for (const rec of next) {
        nextNotes[rec.id] = rec.recommended_next_action ?? "";
        nextPackages[rec.id] = rec.recommended_package_level;
        nextPositions[rec.id] = String(rec.recommendation_rank ?? 1);
        nextPrimary[rec.id] = rec.recommendation_status === "primary";
      }

      setNotesById(nextNotes);
      setPackageById(nextPackages);
      setPositionById(nextPositions);
      setPrimaryById(nextPrimary);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load EPC recommendations.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecommendations();
  }, [dealId]);

  async function runScoring() {
    try {
      setScoring(true);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/epc-recommendation/run`,
        { method: "POST" },
      );

      const data = (await response.json()) as
        | { ok: true; totalEpcs: number }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to score EPCs. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to score EPCs.");
        }

      setMessage(`Scored ${data.totalEpcs} EPC partner profiles.`);
      await loadRecommendations();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to score EPCs.");
    } finally {
      setScoring(false);
    }
  }

  async function createSequence(rec: EpcRecommendation) {
    try {
      setCreatingId(rec.id);
      setMessage(null);
      setError(null);

      const sequencePosition = Number(positionById[rec.id] ?? rec.recommendation_rank ?? 1);

      if (!Number.isInteger(sequencePosition) || sequencePosition < 1) {
        throw new Error("Sequence position must be a positive whole number.");
      }

      const response = await fetch(`/api/intake/deal/${dealId}/epc-sequence/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          epcProfileId: rec.epc_profile_id,
          epcIdentifier: rec.epc_identifier,
          sequencePosition,
          packageLevel: packageById[rec.id] ?? rec.recommended_package_level,
          isPrimary: primaryById[rec.id] ?? false,
          notes: notesById[rec.id]?.trim() === "" ? null : notesById[rec.id]?.trim() ?? null,
        }),
      });

      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

        if (!response.ok) {
        throw new Error(`Failed to create EPC sequence. HTTP ${response.status}`);
        }

        if (!data.ok) {
        throw new Error(data.error ?? "Failed to create EPC sequence.");
        }

      setMessage("EPC sequence plan created.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create EPC sequence.",
      );
    } finally {
      setCreatingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            EPC Recommendation Engine
          </h2>
          <p className="text-sm text-gray-400">
            Score EPC partners, select primary/backup candidates, and create controlled EPC release sequences.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void loadRecommendations()}
            disabled={loading || scoring || creatingId !== null}
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh EPCs"}
          </button>

          <button
            type="button"
            onClick={() => void runScoring()}
            disabled={loading || scoring || creatingId !== null}
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {scoring ? "Scoring..." : "Score EPCs"}
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
        <p className="text-sm text-gray-400">Loading EPC recommendations...</p>
      ) : recommendations.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-black p-4">
          <p className="text-sm text-gray-400">
            No EPC recommendations scored yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div key={rec.id} className="rounded-xl border border-gray-800 bg-black p-4">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    #{rec.recommendation_rank ?? "—"}{" "}
                    {rec.epc_partner_profiles?.epc_name ?? rec.epc_identifier}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {rec.epc_identifier} · contact{" "}
                    {rec.epc_partner_profiles?.primary_contact_email ?? "—"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${scoreClasses(
                      rec.fit_score,
                    )}`}
                  >
                    fit {rec.fit_score}
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                      rec.recommendation_status,
                    )}`}
                  >
                    {rec.recommendation_status}
                  </span>
                </div>
              </div>

              <div className="mb-4 grid gap-3 md:grid-cols-4">
                <Metric label="Geo" value={String(rec.geography_score)} />
                <Metric label="Size" value={String(rec.project_size_score)} />
                <Metric label="Load" value={String(rec.load_profile_score)} />
                <Metric label="Comp" value={String(rec.compensation_protection_score)} />
                <Metric label="Disclosure" value={String(rec.disclosure_safety_score)} />
                <Metric label="Gate" value={String(rec.execution_gate_score)} />
                <Metric label="Relationship" value={String(rec.relationship_score)} />
                <Metric label="Liability" value={String(rec.liability_boundary_score)} />
              </div>

              <div className="mb-4 rounded-lg border border-gray-800 bg-gray-950 p-3">
                <p className="text-xs uppercase text-gray-500">Fit Reason</p>
                <p className="mt-1 text-sm text-gray-300">{rec.fit_reason}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs uppercase text-gray-500">
                    Sequence Position
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={positionById[rec.id] ?? "1"}
                    onChange={(e) =>
                      setPositionById((current) => ({
                        ...current,
                        [rec.id]: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase text-gray-500">
                    Package Level
                  </label>
                  <select
                    value={packageById[rec.id] ?? rec.recommended_package_level}
                    onChange={(e) =>
                      setPackageById((current) => ({
                        ...current,
                        [rec.id]: e.target.value,
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

                <label className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-950 p-3 text-sm text-gray-200">
                  <input
                    type="checkbox"
                    checked={primaryById[rec.id] ?? false}
                    onChange={(e) =>
                      setPrimaryById((current) => ({
                        ...current,
                        [rec.id]: e.target.checked,
                      }))
                    }
                  />
                  Set as primary EPC
                </label>
              </div>

              <div className="mt-3 space-y-2">
                <label className="text-xs uppercase text-gray-500">
                  Sequence Notes / Override Reason
                </label>
                <textarea
                  value={notesById[rec.id] ?? ""}
                  onChange={(e) =>
                    setNotesById((current) => ({
                      ...current,
                      [rec.id]: e.target.value,
                    }))
                  }
                  className="min-h-20 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                  placeholder="Why this EPC should get the deal, disclosure limits, liability boundaries, or operator override reasoning."
                />
              </div>

              <button
                type="button"
                onClick={() => void createSequence(rec)}
                disabled={creatingId !== null}
                className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              >
                {creatingId === rec.id ? "Creating..." : "Create EPC Sequence"}
              </button>
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
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}