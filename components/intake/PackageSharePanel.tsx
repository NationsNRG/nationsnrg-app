"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ShareEventRecord {
  id: string;
  package_id: string;
  share_channel: string;
  recipient_type: string;
  recipient_identifier: string;
  share_status: string;
  notes: string | null;
  created_at: string | null;
}

interface DealPackageOption {
  id: string;
  package_version: number;
  package_type: string;
  title: string;
  status: string;
}

interface PackageSharePanelProps {
  dealId: string;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function PackageSharePanel({
  dealId,
}: PackageSharePanelProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [packages, setPackages] = useState<DealPackageOption[]>([]);
  const [shareEvents, setShareEvents] = useState<ShareEventRecord[]>([]);

  const [packageId, setPackageId] = useState("");
  const [shareChannel, setShareChannel] = useState("manual");
  const [recipientType, setRecipientType] = useState("supplier");
  const [recipientIdentifier, setRecipientIdentifier] = useState("");
  const [shareStatus, setShareStatus] = useState("logged");
  const [notes, setNotes] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [packagesResponse, shareEventsResponse] = await Promise.all([
        fetch(`/api/intake/deal/${dealId}/package`),
        fetch(`/api/intake/deal/${dealId}/package/share-events`),
      ]);

      const packagesData = (await packagesResponse.json()) as
        | {
            ok: true;
            packages: Array<{
              id: string;
              package_version: number;
              package_type: string;
              title: string;
              status: string;
            }>;
          }
        | {
            ok: false;
            error?: string;
          };

      const shareEventsData = (await shareEventsResponse.json()) as
        | {
            ok: true;
            shareEvents: ShareEventRecord[];
          }
        | {
            ok: false;
            error?: string;
          };

      if (!packagesResponse.ok || !packagesData.ok) {
        throw new Error(
          "error" in packagesData
            ? packagesData.error ?? "Failed to load packages."
            : "Failed to load packages.",
        );
      }

      if (!shareEventsResponse.ok || !shareEventsData.ok) {
        throw new Error(
          "error" in shareEventsData
            ? shareEventsData.error ?? "Failed to load share events."
            : "Failed to load share events.",
        );
      }

      const nextPackages = Array.isArray(packagesData.packages)
        ? packagesData.packages
        : [];

      const nextShareEvents = Array.isArray(shareEventsData.shareEvents)
        ? shareEventsData.shareEvents
        : [];

      setPackages(nextPackages);
      setShareEvents(nextShareEvents);

      if (!packageId && nextPackages.length > 0) {
        setPackageId(nextPackages[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load share data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [dealId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSubmitting(true);
      setMessage(null);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/package/${packageId}/share-event`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            shareChannel,
            recipientType,
            recipientIdentifier,
            shareStatus,
            notes: notes.trim() === "" ? null : notes.trim(),
          }),
        },
      );

      const data = (await response.json()) as
        | { ok: true }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(`Failed to log share event. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to log share event.");
      }

      setMessage("Share event logged successfully.");
      setRecipientIdentifier("");
      setNotes("");

      await loadData();
      router.refresh();

      setTimeout(() => {
        void loadData();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log share event.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Package Share Log</h2>
          <p className="text-sm text-gray-400">
            Record who received which package and by what channel.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          disabled={loading || submitting}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Share Log"}
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
            <label className="text-sm font-medium text-gray-200">Package</label>
            <select
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              required
            >
              <option value="">Select package</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  v{pkg.package_version} — {pkg.package_type} — {pkg.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Share Channel
            </label>
            <select
              value={shareChannel}
              onChange={(e) => setShareChannel(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            >
              <option value="email">email</option>
              <option value="portal">portal</option>
              <option value="manual">manual</option>
              <option value="api">api</option>
              <option value="other">other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Recipient Type
            </label>
            <select
              value={recipientType}
              onChange={(e) => setRecipientType(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            >
              <option value="supplier">supplier</option>
              <option value="epc">epc</option>
              <option value="lpl">lpl</option>
              <option value="buyer">buyer</option>
              <option value="internal">internal</option>
            </select>
          </div>

          <div className="space-y-2 xl:col-span-2">
            <label className="text-sm font-medium text-gray-200">
              Recipient Identifier
            </label>
            <input
              type="text"
              required
              value={recipientIdentifier}
              onChange={(e) => setRecipientIdentifier(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              placeholder="supplier_test_001 or someone@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Share Status
            </label>
            <select
              value={shareStatus}
              onChange={(e) => setShareStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            >
              <option value="logged">logged</option>
              <option value="sent">sent</option>
              <option value="delivered">delivered</option>
              <option value="opened">opened</option>
              <option value="failed">failed</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-24 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            placeholder="Initial teaser sent manually to supplier."
          />
        </div>

        <button
          type="submit"
          disabled={submitting || loading || packageId === ""}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {submitting ? "Logging..." : "Log Share Event"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-400">Loading share events...</p>
      ) : shareEvents.length === 0 ? (
        <p className="text-sm text-gray-400">No share events logged yet.</p>
      ) : (
        <div className="space-y-4">
          {shareEvents.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-gray-800 bg-black p-4"
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div>
                  <p className="text-xs uppercase text-gray-500">Package ID</p>
                  <p className="text-sm text-gray-300">{event.package_id}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Channel</p>
                  <p className="text-sm text-gray-300">{event.share_channel}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Recipient</p>
                  <p className="text-sm text-gray-300">
                    {event.recipient_type} · {event.recipient_identifier}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Status</p>
                  <p className="text-sm text-gray-300">{event.share_status}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Created</p>
                  <p className="text-sm text-gray-300">
                    {formatDate(event.created_at)}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-xs uppercase text-gray-500">Notes</p>
                <p className="text-sm text-gray-300">{event.notes ?? "—"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}