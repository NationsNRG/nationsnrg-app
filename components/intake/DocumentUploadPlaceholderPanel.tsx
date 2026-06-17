"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface RequiredDocument {
  id: string;
  document_type: string;
  document_label: string;
  requirement_status: string;
}

interface UploadRecord {
  id: string;
  required_document_id: string | null;
  document_type: string;
  file_name: string;
  file_mime_type: string | null;
  file_size_bytes: number | null;
  upload_status: string;
  verification_status: string;
  uploaded_by: string | null;
  notes: string | null;
  uploaded_at: string | null;
}

interface Props {
  dealId: string;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatBytes(value: number | null): string {
  if (typeof value !== "number") return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${Math.round((value / (1024 * 1024)) * 100) / 100} MB`;
}

export default function DocumentUploadPlaceholderPanel({ dealId }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [updatingUploadId, setUpdatingUploadId] = useState<string | null>(null);
  const [uploadNotesById, setUploadNotesById] = useState<Record<string, string>>(
    {},
  );

  const [requiredDocuments, setRequiredDocuments] = useState<RequiredDocument[]>([]);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);

  const [requiredDocumentId, setRequiredDocumentId] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileMimeType, setFileMimeType] = useState("");
  const [fileSizeBytes, setFileSizeBytes] = useState("");
  const [notes, setNotes] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [documentsResponse, uploadsResponse] = await Promise.all([
        fetch(`/api/intake/deal/${dealId}/contract-readiness/documents`),
        fetch(`/api/intake/deal/${dealId}/documents/uploads`),
      ]);

      const documentsData = (await documentsResponse.json()) as
        | { ok: true; documents: RequiredDocument[] }
        | { ok: false; error?: string };

      const uploadsData = (await uploadsResponse.json()) as
        | { ok: true; uploads: UploadRecord[] }
        | { ok: false; error?: string };

      if (!documentsResponse.ok) {
        throw new Error(
            `Failed to load required documents. HTTP ${documentsResponse.status}`,
        );
      }

      if (!documentsData.ok) {
        throw new Error(documentsData.error ?? "Failed to load required documents.");
      }

      if (!uploadsResponse.ok) {
        throw new Error(
            `Failed to load upload records. HTTP ${uploadsResponse.status}`,
        );
      }

      if (!uploadsData.ok) {
        throw new Error(uploadsData.error ?? "Failed to load upload records.");
      }

      const nextDocs = Array.isArray(documentsData.documents)
        ? documentsData.documents
        : [];

      setRequiredDocuments(nextDocs);
      const nextUploads = Array.isArray(uploadsData.uploads)
        ? uploadsData.uploads
        : [];

      setUploads(nextUploads);

      const nextUploadNotes: Record<string, string> = {};
      for (const upload of nextUploads) {
        nextUploadNotes[upload.id] = upload.notes ?? "";
      }
      setUploadNotesById(nextUploadNotes);

      if (!requiredDocumentId && nextDocs.length > 0) {
        setRequiredDocumentId(nextDocs[0].id);
        setDocumentType(nextDocs[0].document_type);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load document data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [dealId]);

  function handleRequiredDocumentChange(nextId: string) {
    setRequiredDocumentId(nextId);

    const selected = requiredDocuments.find((doc) => doc.id === nextId);
    if (selected) {
      setDocumentType(selected.document_type);
    }
  }

  async function createPlaceholderUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage(null);
      setError(null);

      const parsedSize =
        fileSizeBytes.trim() === "" ? null : Number(fileSizeBytes.trim());

      if (parsedSize !== null && !Number.isFinite(parsedSize)) {
        throw new Error("File size must be a valid number.");
      }

      const response = await fetch(`/api/intake/deal/${dealId}/documents/uploads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requiredDocumentId: requiredDocumentId || null,
          documentType,
          fileName,
          fileMimeType: fileMimeType.trim() === "" ? null : fileMimeType.trim(),
          fileSizeBytes: parsedSize,
          storageBucket: null,
          storagePath: null,
          notes: notes.trim() === "" ? null : notes.trim(),
        }),
      });

      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(
          `Failed to create upload placeholder. HTTP ${response.status}`,
        );
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to create upload placeholder.");
      }

      setMessage("Document upload placeholder created.");
      setFileName("");
      setFileMimeType("");
      setFileSizeBytes("");
      setNotes("");

      await loadData();

      await fetch(`/api/intake/deal/${dealId}/contract-readiness`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerSource: "document_update" }),
      });

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create upload placeholder.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateUploadRecord(params: {
    uploadId: string;
    uploadStatus?: "metadata_only" | "uploaded" | "failed" | "archived";
    verificationStatus?: "pending" | "in_review" | "verified" | "rejected" | "waived";
  }) {
    try {
      setUpdatingUploadId(params.uploadId);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/documents/uploads/${params.uploadId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uploadStatus: params.uploadStatus,
            verificationStatus: params.verificationStatus,
            notes:
              uploadNotesById[params.uploadId]?.trim() === ""
                ? null
                : uploadNotesById[params.uploadId]?.trim() ?? null,
          }),
        },
      );

      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(`Failed to update upload record. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to update upload record.");
      }

      setMessage("Upload record updated.");
      await loadData();

      await fetch(`/api/intake/deal/${dealId}/contract-readiness`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerSource: "document_update" }),
      });

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update upload record.",
      );
    } finally {
      setUpdatingUploadId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Document Upload Placeholder
          </h2>
          <p className="text-sm text-gray-400">
            Record document metadata now. Later this can connect to Supabase Storage.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading || saving}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Uploads"}
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
        onSubmit={createPlaceholderUpload}
        className="mb-6 space-y-4 rounded-xl border border-gray-800 bg-black p-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Required Document
            </label>
            <select
              value={requiredDocumentId}
              onChange={(e) => handleRequiredDocumentChange(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            >
              <option value="">No required document selected</option>
              {requiredDocuments.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.document_label} — {doc.requirement_status}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Document Type
            </label>
            <input
              type="text"
              required
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              placeholder="utility_bill"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">File Name</label>
            <input
              type="text"
              required
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              placeholder="miami-test-facility-utility-bill.pdf"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">MIME Type</label>
            <input
              type="text"
              value={fileMimeType}
              onChange={(e) => setFileMimeType(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              placeholder="application/pdf"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              File Size Bytes
            </label>
            <input
              type="number"
              min="0"
              value={fileSizeBytes}
              onChange={(e) => setFileSizeBytes(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              placeholder="250000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-24 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            placeholder="Where this came from, what still needs verification, etc."
          />
        </div>

        <button
          type="submit"
          disabled={saving || loading}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create Upload Placeholder"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-400">Loading upload records...</p>
      ) : uploads.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-black p-4">
          <p className="text-sm text-gray-400">
            No document upload records created yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="rounded-xl border border-gray-800 bg-black p-4"
            >
              <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {upload.file_name}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    {upload.document_type} · {upload.upload_status}
                  </p>
                </div>

                <span className="rounded-full border border-blue-800 bg-blue-950 px-3 py-1 text-xs font-medium uppercase text-blue-300">
                  {upload.verification_status}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <Metric label="MIME" value={upload.file_mime_type ?? "—"} />
                <Metric label="Size" value={formatBytes(upload.file_size_bytes)} />
                <Metric label="Uploaded By" value={upload.uploaded_by ?? "—"} />
                <Metric label="Uploaded" value={formatDate(upload.uploaded_at)} />
              </div>

              <div className="mt-3 space-y-2">
                <label className="text-xs uppercase text-gray-500">Verification Notes</label>
                <textarea
                  value={uploadNotesById[upload.id] ?? ""}
                  onChange={(e) =>
                    setUploadNotesById((current) => ({
                      ...current,
                      [upload.id]: e.target.value,
                    }))
                  }
                  className="min-h-20 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                  placeholder="Verification notes, rejection reason, or source details."
                />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {(["metadata_only", "uploaded", "failed", "archived"] as const).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() =>
                      void updateUploadRecord({
                        uploadId: upload.id,
                        uploadStatus: status,
                      })
                    }
                    disabled={updatingUploadId !== null}
                    className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    {updatingUploadId === upload.id ? "Updating..." : `Upload: ${status}`}
                  </button>
                ),
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {(["pending", "in_review", "verified", "rejected", "waived"] as const).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() =>
                      void updateUploadRecord({
                        uploadId: upload.id,
                        verificationStatus: status,
                      })
                    }
                    disabled={updatingUploadId !== null}
                    className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    {updatingUploadId === upload.id
                      ? "Updating..."
                      : `Verify: ${status}`}
                  </button>
                ),
              )}
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