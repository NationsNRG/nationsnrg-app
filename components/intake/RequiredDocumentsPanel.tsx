"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RequiredDocument {
  id: string;
  document_type: string;
  document_label: string;
  requirement_status: string;
  required_for_stage: string;
  is_required: boolean;
  received_at: string | null;
  verified_at: string | null;
  notes: string | null;
}

interface RequiredDocumentsPanelProps {
  dealId: string;
}

function statusClasses(status: string): string {
  if (status === "verified" || status === "waived") {
    return "border-green-800 bg-green-950 text-green-300";
  }

  if (status === "received" || status === "requested") {
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  }

  if (status === "rejected" || status === "missing") {
    return "border-red-800 bg-red-950 text-red-300";
  }

  return "border-blue-800 bg-blue-950 text-blue-300";
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function RequiredDocumentsPanel({
  dealId,
}: RequiredDocumentsPanelProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<RequiredDocument[]>([]);
  const [notesByDocument, setNotesByDocument] = useState<Record<string, string>>(
    {},
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadDocuments() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/contract-readiness/documents`,
      );

      const data = (await response.json()) as
        | { ok: true; documents: RequiredDocument[] }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(`Failed to load required documents. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load required documents.");
      }

      const nextDocuments = Array.isArray(data.documents) ? data.documents : [];
      setDocuments(nextDocuments);

      const nextNotes: Record<string, string> = {};
      for (const doc of nextDocuments) {
        nextNotes[doc.id] = doc.notes ?? "";
      }
      setNotesByDocument(nextNotes);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load required documents.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, [dealId]);

  async function seedDocuments() {
    try {
      setSeeding(true);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/contract-readiness/documents/seed`,
        {
          method: "POST",
        },
      );

      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(`Failed to seed required documents. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to seed required documents.");
      }

      setMessage("Required documents seeded.");
      await loadDocuments();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to seed required documents.",
      );
    } finally {
      setSeeding(false);
    }
  }

  async function updateDocumentStatus(
    documentId: string,
    requirementStatus:
      | "missing"
      | "requested"
      | "received"
      | "verified"
      | "waived"
      | "rejected",
  ) {
    try {
      setUpdatingId(documentId);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/contract-readiness/documents/${documentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requirementStatus,
            notes:
              notesByDocument[documentId]?.trim() === ""
                ? null
                : notesByDocument[documentId]?.trim() ?? null,
          }),
        },
      );

      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(`Failed to update document. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to update document.");
      }

      setMessage(`Document marked ${requirementStatus}.`);
      await loadDocuments();

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update document.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Required Documents
          </h2>
          <p className="text-sm text-gray-400">
            Track the documents needed to move this deal toward supplier release,
            contracting, execution, and payout.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void seedDocuments()}
          disabled={seeding || loading}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {seeding ? "Seeding..." : "Seed Required Documents"}
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
        <p className="text-sm text-gray-400">Loading required documents...</p>
      ) : documents.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-black p-4">
          <p className="text-sm text-gray-400">
            No required documents seeded yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="rounded-xl border border-gray-800 bg-black p-4"
            >
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {doc.document_label}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {doc.document_type} · required for {doc.required_for_stage}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                    doc.requirement_status,
                  )}`}
                >
                  {doc.requirement_status}
                </span>
              </div>

              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <Metric
                  label="Required"
                  value={doc.is_required ? "Yes" : "No"}
                />
                <Metric label="Received" value={formatDate(doc.received_at)} />
                <Metric label="Verified" value={formatDate(doc.verified_at)} />
              </div>

              <div className="mb-4 space-y-2">
                <label className="text-xs uppercase text-gray-500">Notes</label>
                <textarea
                  value={notesByDocument[doc.id] ?? ""}
                  onChange={(e) =>
                    setNotesByDocument((current) => ({
                      ...current,
                      [doc.id]: e.target.value,
                    }))
                  }
                  className="min-h-20 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                  placeholder="Document notes, source, issue, or verification details."
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "requested",
                    "received",
                    "verified",
                    "waived",
                    "rejected",
                    "missing",
                  ] as const
                ).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => void updateDocumentStatus(doc.id, status)}
                    disabled={updatingId !== null}
                    className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    {updatingId === doc.id ? "Updating..." : `Mark ${status}`}
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
      <p className="mt-1 text-sm text-gray-300">{value}</p>
    </div>
  );
}