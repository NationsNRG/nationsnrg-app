"use client";

import { useEffect, useState } from "react";

interface ShareAnalytics {
  totals: {
    totalEvents: number;
    sentCount: number;
    deliveredCount: number;
    openedCount: number;
    failedCount: number;
  };
  byChannel: Record<string, number>;
  byRecipientType: Record<string, number>;
  latestEvent: {
    share_channel?: string;
    recipient_type?: string;
    recipient_identifier?: string;
    share_status?: string;
    created_at?: string;
  } | null;
}

interface PackageShareAnalyticsPanelProps {
  dealId: string;
}

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function PackageShareAnalyticsPanel({
  dealId,
}: PackageShareAnalyticsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<ShareAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/intake/deal/${dealId}/package/share-analytics`,
      );

      const data = (await response.json()) as
        | { ok: true; analytics: ShareAnalytics }
        | { ok: false; error?: string };

      if (!response.ok) {
        throw new Error(`Failed to load share analytics. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load share analytics.");
      }

      setAnalytics(data.analytics);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load share analytics.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAnalytics();
  }, [dealId]);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">Share Analytics</h2>
          <p className="text-sm text-gray-400">
            Visibility into package distribution activity.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAnalytics()}
          disabled={loading}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Analytics"}
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-400">Loading analytics...</p>
      ) : !analytics ? (
        <p className="text-sm text-gray-400">No analytics available.</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="rounded-xl border border-gray-800 bg-black p-4">
              <p className="text-xs uppercase text-gray-500">Total</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {analytics.totals.totalEvents}
              </p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-black p-4">
              <p className="text-xs uppercase text-gray-500">Sent</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {analytics.totals.sentCount}
              </p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-black p-4">
              <p className="text-xs uppercase text-gray-500">Delivered</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {analytics.totals.deliveredCount}
              </p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-black p-4">
              <p className="text-xs uppercase text-gray-500">Opened</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {analytics.totals.openedCount}
              </p>
            </div>
            <div className="rounded-xl border border-gray-800 bg-black p-4">
              <p className="text-xs uppercase text-gray-500">Failed</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {analytics.totals.failedCount}
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-gray-800 bg-black p-4">
              <p className="mb-3 text-sm font-semibold text-white">By Channel</p>
              <div className="space-y-2">
                {Object.entries(analytics.byChannel).length === 0 ? (
                  <p className="text-sm text-gray-400">—</p>
                ) : (
                  Object.entries(analytics.byChannel).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between text-sm text-gray-300"
                    >
                      <span>{key}</span>
                      <span>{value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-black p-4">
              <p className="mb-3 text-sm font-semibold text-white">
                By Recipient Type
              </p>
              <div className="space-y-2">
                {Object.entries(analytics.byRecipientType).length === 0 ? (
                  <p className="text-sm text-gray-400">—</p>
                ) : (
                  Object.entries(analytics.byRecipientType).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between text-sm text-gray-300"
                    >
                      <span>{key}</span>
                      <span>{value}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-800 bg-black p-4">
            <p className="mb-3 text-sm font-semibold text-white">Latest Event</p>
            {analytics.latestEvent ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs uppercase text-gray-500">Channel</p>
                  <p className="text-sm text-gray-300">
                    {analytics.latestEvent.share_channel ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Recipient</p>
                  <p className="text-sm text-gray-300">
                    {analytics.latestEvent.recipient_type ?? "—"} ·{" "}
                    {analytics.latestEvent.recipient_identifier ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Status</p>
                  <p className="text-sm text-gray-300">
                    {analytics.latestEvent.share_status ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Created</p>
                  <p className="text-sm text-gray-300">
                    {formatDate(analytics.latestEvent.created_at)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No share events yet.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}