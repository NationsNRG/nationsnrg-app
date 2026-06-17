"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CounterpartyActions from "@/components/intake/CounterpartyActions";

interface Counterparty {
  id: string;
  counterparty_type: string;
  counterparty_name: string;
  counterparty_identifier: string | null;
  role_label: string | null;
  status: string;
  visibility_level: string;
  notes: string | null;
  created_at: string | null;
}

interface CounterpartyPanelProps {
  dealId: string;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function CounterpartyPanel({
  dealId,
}: CounterpartyPanelProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);

  const [counterpartyType, setCounterpartyType] = useState("supplier");
  const [counterpartyName, setCounterpartyName] = useState("");
  const [counterpartyIdentifier, setCounterpartyIdentifier] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [visibilityLevel, setVisibilityLevel] = useState("internal_only");
  const [notes, setNotes] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadCounterparties() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/counterparties`);
      const data = (await response.json()) as
        | { ok: true; counterparties: Counterparty[] }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(`Failed to load counterparties. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load counterparties.");
      }

      setCounterparties(Array.isArray(data.counterparties) ? data.counterparties : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load counterparties.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCounterparties();
  }, [dealId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSubmitting(true);
      setMessage(null);
      setError(null);

      const response = await fetch(`/api/intake/deal/${dealId}/counterparties`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          counterpartyType,
          counterpartyName,
          counterpartyIdentifier:
            counterpartyIdentifier.trim() === "" ? null : counterpartyIdentifier.trim(),
          roleLabel: roleLabel.trim() === "" ? null : roleLabel.trim(),
          visibilityLevel,
          notes: notes.trim() === "" ? null : notes.trim(),
        }),
      });

      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(`Failed to create counterparty. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to create counterparty.");
      }

      setMessage("Counterparty added successfully.");
      setCounterpartyType("supplier");
      setCounterpartyName("");
      setCounterpartyIdentifier("");
      setRoleLabel("");
      setVisibilityLevel("internal_only");
      setNotes("");

      await loadCounterparties();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create counterparty.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Counterparties</h2>
          <p className="text-sm text-gray-400">
            Track who is involved in this deal and what they can see.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadCounterparties()}
          disabled={loading || submitting}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Counterparties"}
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
        onSubmit={handleSubmit}
        className="mb-6 space-y-4 rounded-xl border border-gray-800 bg-black p-4"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Counterparty Type
            </label>
            <select
              value={counterpartyType}
              onChange={(e) => setCounterpartyType(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            >
              <option value="supplier">supplier</option>
              <option value="epc">epc</option>
              <option value="lpl">lpl</option>
              <option value="buyer">buyer</option>
              <option value="internal">internal</option>
              <option value="advisor">advisor</option>
              <option value="other">other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Counterparty Name
            </label>
            <input
              type="text"
              required
              value={counterpartyName}
              onChange={(e) => setCounterpartyName(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              placeholder="LPL Solar"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Identifier
            </label>
            <input
              type="text"
              value={counterpartyIdentifier}
              onChange={(e) => setCounterpartyIdentifier(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              placeholder="lpl_solar"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Role Label
            </label>
            <input
              type="text"
              value={roleLabel}
              onChange={(e) => setRoleLabel(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              placeholder="Primary EPC"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Visibility Level
            </label>
            <select
              value={visibilityLevel}
              onChange={(e) => setVisibilityLevel(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            >
              <option value="internal_only">internal_only</option>
              <option value="teaser_ok">teaser_ok</option>
              <option value="qualified_ok">qualified_ok</option>
              <option value="execution_ok">execution_ok</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-24 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            placeholder="Internal disclosure and role notes."
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Add Counterparty"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-400">Loading counterparties...</p>
      ) : counterparties.length === 0 ? (
        <p className="text-sm text-gray-400">No counterparties added yet.</p>
      ) : (
        <div className="space-y-4">
          {counterparties.map((counterparty) => (
            <div
              key={counterparty.id}
              className="rounded-xl border border-gray-800 bg-black p-4"
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div>
                  <p className="text-xs uppercase text-gray-500">Type</p>
                  <p className="text-sm text-gray-300">
                    {counterparty.counterparty_type}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Name</p>
                  <p className="text-sm text-gray-300">
                    {counterparty.counterparty_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Identifier</p>
                  <p className="text-sm text-gray-300">
                    {counterparty.counterparty_identifier ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Role</p>
                  <p className="text-sm text-gray-300">
                    {counterparty.role_label ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Visibility</p>
                  <p className="text-sm text-gray-300">
                    {counterparty.visibility_level}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-gray-500">Status</p>
                  <p className="text-sm text-gray-300">{counterparty.status}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Created</p>
                  <p className="text-sm text-gray-300">
                    {formatDate(counterparty.created_at)}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-4">
                <div>
                  <p className="text-xs uppercase text-gray-500">Notes</p>
                  <p className="text-sm text-gray-300">
                    {counterparty.notes ?? "—"}
                  </p>
                </div>

                <CounterpartyActions
                  dealId={dealId}
                  counterpartyId={counterparty.id}
                  status={counterparty.status}
                  visibilityLevel={counterparty.visibility_level}
                  notes={counterparty.notes}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}