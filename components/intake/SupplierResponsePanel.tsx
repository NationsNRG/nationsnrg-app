"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";


interface SupplierResponseEvent {
  id: string;
  response_type: string;
  response_status: string;
  response_summary: string | null;
  objections: string[] | null;
  requested_changes: string[] | null;
  confidence_signal: number | null;
  response_speed_hours: number | null;
  notes: string | null;
  created_at: string | null;
}

interface SupplierResponsePanelProps {
  dealId: string;
  sequenceId: string;
  supplierName: string;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatList(values: string[] | null | undefined): string {
  if (!Array.isArray(values) || values.length === 0) {
    return "—";
  }

  return values.join(", ");
}

export default function SupplierResponsePanel({
  dealId,
  sequenceId,
  supplierName,
}: SupplierResponsePanelProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [responses, setResponses] = useState<SupplierResponseEvent[]>([]);

  const [responseType, setResponseType] = useState("interest");
  const [responseStatus, setResponseStatus] = useState("received");
  const [responseSummary, setResponseSummary] = useState("");
  const [objections, setObjections] = useState("");
  const [requestedChanges, setRequestedChanges] = useState("");
  const [confidenceSignal, setConfidenceSignal] = useState("");
  const [responseSpeedHours, setResponseSpeedHours] = useState("");
  const [notes, setNotes] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function parseCsv(value: string): string[] {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  async function loadResponses() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/supplier-sequence/${sequenceId}/responses`,
      );

      const data = (await response.json()) as
        | { ok: true; responses: SupplierResponseEvent[] }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(
          `Failed to load supplier responses. HTTP ${response.status}`,
        );
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load supplier responses.");
      }

      setResponses(Array.isArray(data.responses) ? data.responses : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load supplier responses.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadResponses();
  }, [dealId, sequenceId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSubmitting(true);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/supplier-sequence/${sequenceId}/responses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            responseType,
            responseStatus,
            responseSummary: responseSummary.trim() === "" ? null : responseSummary.trim(),
            objections: parseCsv(objections),
            requestedChanges: parseCsv(requestedChanges),
            confidenceSignal:
              confidenceSignal.trim() === "" ? null : Number(confidenceSignal),
            responseSpeedHours:
              responseSpeedHours.trim() === "" ? null : Number(responseSpeedHours),
            notes: notes.trim() === "" ? null : notes.trim(),
          }),
        },
      );

      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(
          `Failed to log supplier response. HTTP ${response.status}`,
        );
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to log supplier response.");
      }

      setMessage("Supplier response logged successfully.");

      setResponseType("interest");
      setResponseStatus("received");
      setResponseSummary("");
      setObjections("");
      setRequestedChanges("");
      setConfidenceSignal("");
      setResponseSpeedHours("");
      setNotes("");

      await loadResponses();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to log supplier response.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Supplier Responses — {supplierName}
          </h3>
          <p className="text-sm text-gray-400">
            Capture supplier feedback, objections, and follow-up needs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadResponses()}
          disabled={loading || submitting}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Responses"}
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Response Type
            </label>
            <select
              value={responseType}
              onChange={(e) => setResponseType(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            >
              <option value="interest">interest</option>
              <option value="decline">decline</option>
              <option value="objection">objection</option>
              <option value="counter">counter</option>
              <option value="request_for_info">request_for_info</option>
              <option value="term_revision">term_revision</option>
              <option value="pricing_feedback">pricing_feedback</option>
              <option value="non_starter">non_starter</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Response Status
            </label>
            <select
              value={responseStatus}
              onChange={(e) => setResponseStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            >
              <option value="received">received</option>
              <option value="reviewed">reviewed</option>
              <option value="accepted">accepted</option>
              <option value="rejected">rejected</option>
              <option value="pending_followup">pending_followup</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Confidence Signal
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={confidenceSignal}
              onChange={(e) => setConfidenceSignal(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              placeholder="72"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Response Speed (hours)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={responseSpeedHours}
              onChange={(e) => setResponseSpeedHours(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              placeholder="6"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">
            Response Summary
          </label>
          <textarea
            value={responseSummary}
            onChange={(e) => setResponseSummary(e.target.value)}
            className="min-h-24 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            placeholder="Supplier wants interval usage and service address validation."
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Objections (comma-separated)
            </label>
            <input
              type="text"
              value={objections}
              onChange={(e) => setObjections(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              placeholder="insufficient_usage_detail, weak_load_shape"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Requested Changes (comma-separated)
            </label>
            <input
              type="text"
              value={requestedChanges}
              onChange={(e) => setRequestedChanges(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              placeholder="provide_12_month_usage, confirm_service_address"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-24 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            placeholder="Supplier engaged quickly but needs more detail."
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Log Supplier Response"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-400">Loading response history...</p>
      ) : responses.length === 0 ? (
        <p className="text-sm text-gray-400">No supplier responses logged yet.</p>
      ) : (
        <div className="space-y-4">
          {responses.map((response) => (
            <div
              key={response.id}
              className="rounded-xl border border-gray-800 bg-black p-4"
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div>
                  <p className="text-xs uppercase text-gray-500">Type</p>
                  <p className="text-sm text-gray-300">{response.response_type}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Status</p>
                  <p className="text-sm text-gray-300">{response.response_status}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Confidence</p>
                  <p className="text-sm text-gray-300">
                    {response.confidence_signal ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Speed</p>
                  <p className="text-sm text-gray-300">
                    {response.response_speed_hours ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Created</p>
                  <p className="text-sm text-gray-300">
                    {formatDate(response.created_at)}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-xs uppercase text-gray-500">Summary</p>
                <p className="text-sm text-gray-300">
                  {response.response_summary ?? "—"}
                </p>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-gray-500">Objections</p>
                  <p className="text-sm text-gray-300">
                    {formatList(response.objections)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">
                    Requested Changes
                  </p>
                  <p className="text-sm text-gray-300">
                    {formatList(response.requested_changes)}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-xs uppercase text-gray-500">Notes</p>
                <p className="text-sm text-gray-300">{response.notes ?? "—"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}