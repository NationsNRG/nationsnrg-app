"use client";

import { useEffect, useState } from "react";

interface VerificationEvent {
  id: string;
  document_type: string;
  previous_verification_status: string | null;
  next_verification_status: string;
  previous_upload_status: string | null;
  next_upload_status: string | null;
  verification_notes: string | null;
  event_source: string;
  created_at: string | null;
}

interface Props {
  dealId: string;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function statusClasses(status: string): string {
  if (status === "verified" || status === "waived") {
    return "border-green-800 bg-green-950 text-green-300";
  }

  if (status === "pending" || status === "in_review") {
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  }

  if (status === "rejected" || status === "failed") {
    return "border-red-800 bg-red-950 text-red-300";
  }

  return "border-blue-800 bg-blue-950 text-blue-300";
}

export default function DocumentVerificationHistoryPanel({ dealId }: Props) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<VerificationEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadHistory() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/documents/verification-history`,
      );

      const data = (await response.json()) as
        | { ok: true; history: VerificationEvent[] }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(
            `Failed to load verification history. HTTP ${response.status}`,
        );
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load verification history.");
      }

      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load verification history.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, [dealId]);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Document Verification History
          </h2>
          <p className="text-sm text-gray-400">
            Audit trail of upload and verification status changes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadHistory()}
          disabled={loading}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh History"}
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-400">
          Loading document verification history...
        </p>
      ) : history.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-black p-4">
          <p className="text-sm text-gray-400">
            No document verification events logged yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-gray-800 bg-black p-4"
            >
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {event.document_type}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {event.event_source} · {formatDate(event.created_at)}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                    event.next_verification_status,
                  )}`}
                >
                  {event.previous_verification_status ?? "—"} →{" "}
                  {event.next_verification_status}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                  <p className="text-xs uppercase text-gray-500">
                    Upload Status
                  </p>
                  <p className="mt-1 text-sm text-gray-300">
                    {event.previous_upload_status ?? "—"} →{" "}
                    {event.next_upload_status ?? "—"}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
                  <p className="text-xs uppercase text-gray-500">
                    Verification Notes
                  </p>
                  <p className="mt-1 text-sm text-gray-300">
                    {event.verification_notes ?? "—"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}