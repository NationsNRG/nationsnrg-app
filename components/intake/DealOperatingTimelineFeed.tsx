"use client";

import { useEffect, useMemo, useState } from "react";

interface TimelineEvent {
  id: string;
  eventType: string;
  eventTitle: string;
  eventStatus: string;
  eventTime: string | null;
  source: string;
  detail: string;
}

interface DealOperatingTimelineFeedProps {
  dealId: string;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function statusClasses(status: string): string {
  if (
    status === "approved" ||
    status === "accepted" ||
    status === "shared" ||
    status === "applied" ||
    status === "released"
  ) {
    return "border-green-800 bg-green-950 text-green-300";
  }

  if (
    status === "pending" ||
    status === "queued" ||
    status === "under_review" ||
    status === "held" ||
    status === "draft" ||
    status === "received"
  ) {
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  }

  if (
    status === "rejected" ||
    status === "failed" ||
    status === "cancelled" ||
    status === "blocked" ||
    status === "decline"
  ) {
    return "border-red-800 bg-red-950 text-red-300";
  }

  return "border-blue-800 bg-blue-950 text-blue-300";
}

export default function DealOperatingTimelineFeed({
  dealId,
}: DealOperatingTimelineFeedProps) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    return events.sort((a, b) => {
      const aTime = a.eventTime ? new Date(a.eventTime).getTime() : 0;
      const bTime = b.eventTime ? new Date(b.eventTime).getTime() : 0;
      return bTime - aTime;
    });
  }, [events]);

  async function loadTimeline() {
    try {
      setLoading(true);
      setError(null);

      const [
        reviewActionsResponse,
        packagesResponse,
        shareEventsResponse,
        routingHistoryResponse,
        bigDealDeskResponse,
        rollupResponse,
        supplierSequencesResponse,
      ] = await Promise.all([
        fetch(`/api/intake/deal/${dealId}/review-actions`),
        fetch(`/api/intake/deal/${dealId}/package`),
        fetch(`/api/intake/deal/${dealId}/package/share-events`),
        fetch(`/api/intake/deal/${dealId}/supplier-routing/history`),
        fetch(`/api/intake/deal/${dealId}/big-deal-desk`),
        fetch(`/api/intake/deal/${dealId}/portfolio-rollup`),
        fetch(`/api/intake/deal/${dealId}`),
      ]);

      const reviewActionsData = (await reviewActionsResponse.json()) as
        | {
            ok: true;
            reviewActions: Array<{
              key: string;
              title: string;
              priority: string;
              reason: string;
            }>;
          }
        | { ok: false; error?: string };

      const packagesData = (await packagesResponse.json()) as
        | {
            ok: true;
            packages: Array<{
              id: string;
              package_type: string;
              status: string;
              title: string;
              created_at: string | null;
              summary: string | null;
            }>;
          }
        | { ok: false; error?: string };

      const shareEventsData = (await shareEventsResponse.json()) as
        | {
            ok: true;
            shareEvents: Array<{
              id: string;
              share_channel: string;
              recipient_type: string;
              recipient_identifier: string;
              share_status: string;
              created_at: string | null;
              notes: string | null;
            }>;
          }
        | { ok: false; error?: string };

      const routingHistoryData = (await routingHistoryResponse.json()) as
        | {
            ok: true;
            history: Array<{
              id: string;
              action_type: string;
              action_status: string;
              action_reason: string;
              created_at: string | null;
            }>;
          }
        | { ok: false; error?: string };

      const bigDealDeskData = (await bigDealDeskResponse.json()) as
        | {
            ok: true;
            queueRecord: {
              id: string;
              escalation_status: string;
              escalation_reason: string;
              queued_at: string | null;
            } | null;
          }
        | { ok: false; error?: string };

      const rollupData = (await rollupResponse.json()) as
        | {
            ok: true;
            rollupRecord: {
              id: string;
              hold_status: string;
              aggregation_reason: string;
              created_at: string | null;
            } | null;
          }
        | { ok: false; error?: string };

      const supplierSequencesData = (await supplierSequencesResponse.json()) as
        | {
            ok: true;
            supplierSequences?: Array<{
              id: string;
              supplier_entity_id?: string | null;
              sequence_type?: string | null;
              is_primary?: boolean | null;
              hold_reason?: string | null;
              metadata?: Record<string, unknown> | null;
            }>;
          }
        | { ok: false; error?: string };

      if (!reviewActionsResponse.ok) {
        throw new Error(
          `Failed to load review actions. HTTP ${reviewActionsResponse.status}`,
        );
      }

      if (!reviewActionsData.ok) {
        throw new Error(
          reviewActionsData.error ?? "Failed to load review actions.",
        );
      }

      if (!packagesResponse.ok) {
        throw new Error(
          `Failed to load packages. HTTP ${packagesResponse.status}`,
        );
      }

      if (!packagesData.ok) {
        throw new Error(packagesData.error ?? "Failed to load packages.");
      }

      if (!shareEventsResponse.ok) {
        throw new Error(
          `Failed to load share events. HTTP ${shareEventsResponse.status}`,
        );
      }

      if (!shareEventsData.ok) {
        throw new Error(
          shareEventsData.error ?? "Failed to load share events.",
        );
      }

      if (!routingHistoryResponse.ok) {
        throw new Error(
          `Failed to load routing history. HTTP ${routingHistoryResponse.status}`,
        );
      }

      if (!routingHistoryData.ok) {
        throw new Error(
          routingHistoryData.error ?? "Failed to load routing history.",
        );
      }

      if (!bigDealDeskResponse.ok) {
        throw new Error(
          `Failed to load big deal desk state. HTTP ${bigDealDeskResponse.status}`,
        );
      }

      if (!bigDealDeskData.ok) {
        throw new Error(
          bigDealDeskData.error ?? "Failed to load big deal desk state.",
        );
      }

      if (!rollupResponse.ok) {
        throw new Error(
          `Failed to load rollup state. HTTP ${rollupResponse.status}`,
        );
      }

      if (!rollupData.ok) {
        throw new Error(rollupData.error ?? "Failed to load rollup state.");
      }

      if (!supplierSequencesResponse.ok) {
        throw new Error(
          `Failed to load supplier sequence state. HTTP ${supplierSequencesResponse.status}`,
        );
      }

      if (!supplierSequencesData.ok) {
        throw new Error(
          supplierSequencesData.error ?? "Failed to load supplier sequence state.",
        );
      }

      const nextEvents: TimelineEvent[] = [];

      for (const action of reviewActionsData.reviewActions ?? []) {
        nextEvents.push({
          id: `review-${action.key}`,
          eventType: "review_action",
          eventTitle: action.title,
          eventStatus: action.priority,
          eventTime: null,
          source: "review_actions",
          detail: action.reason,
        });
      }

      for (const pkg of packagesData.packages ?? []) {
        nextEvents.push({
          id: `package-${pkg.id}`,
          eventType: "package",
          eventTitle: `${pkg.package_type} package generated`,
          eventStatus: pkg.status,
          eventTime: pkg.created_at,
          source: "deal_packages",
          detail: pkg.summary ?? pkg.title,
        });
      }

      for (const share of shareEventsData.shareEvents ?? []) {
        nextEvents.push({
          id: `share-${share.id}`,
          eventType: "share_event",
          eventTitle: `Package shared via ${share.share_channel}`,
          eventStatus: share.share_status,
          eventTime: share.created_at,
          source: "deal_package_share_events",
          detail: `${share.recipient_type} · ${share.recipient_identifier}${
            share.notes ? ` · ${share.notes}` : ""
          }`,
        });
      }

      for (const routing of routingHistoryData.history ?? []) {
        nextEvents.push({
          id: `routing-${routing.id}`,
          eventType: "routing_action",
          eventTitle: routing.action_type,
          eventStatus: routing.action_status,
          eventTime: routing.created_at,
          source: "supplier_routing_action_events",
          detail: routing.action_reason,
        });
      }

      if (bigDealDeskData.queueRecord) {
        nextEvents.push({
          id: `big-deal-${bigDealDeskData.queueRecord.id}`,
          eventType: "big_deal_desk",
          eventTitle: "Big deal desk escalation",
          eventStatus: bigDealDeskData.queueRecord.escalation_status,
          eventTime: bigDealDeskData.queueRecord.queued_at,
          source: "big_deal_desk_queue",
          detail: bigDealDeskData.queueRecord.escalation_reason,
        });
      }

      if (rollupData.rollupRecord) {
        nextEvents.push({
          id: `rollup-${rollupData.rollupRecord.id}`,
          eventType: "portfolio_rollup",
          eventTitle: "Portfolio rollup hold",
          eventStatus: rollupData.rollupRecord.hold_status,
          eventTime: rollupData.rollupRecord.created_at,
          source: "portfolio_rollup_queue",
          detail: rollupData.rollupRecord.aggregation_reason,
        });
      }

      for (const sequence of supplierSequencesData.supplierSequences ?? []) {
        const latestResponseType =
          sequence.metadata &&
          typeof sequence.metadata === "object" &&
          "latestResponseType" in sequence.metadata &&
          typeof (sequence.metadata as { latestResponseType?: unknown })
            .latestResponseType === "string"
            ? (sequence.metadata as { latestResponseType: string })
                .latestResponseType
            : null;

        const latestResponseStatus =
          sequence.metadata &&
          typeof sequence.metadata === "object" &&
          "latestResponseStatus" in sequence.metadata &&
          typeof (sequence.metadata as { latestResponseStatus?: unknown })
            .latestResponseStatus === "string"
            ? (sequence.metadata as { latestResponseStatus: string })
                .latestResponseStatus
            : null;

        if (latestResponseType) {
          nextEvents.push({
            id: `supplier-seq-${sequence.id}`,
            eventType: "supplier_response",
            eventTitle: `Supplier response: ${latestResponseType}`,
            eventStatus: latestResponseStatus ?? "received",
            eventTime: null,
            source: "supplier_sequence_plans",
            detail: `${sequence.supplier_entity_id ?? "supplier"} · ${
              sequence.hold_reason ?? sequence.sequence_type ?? "sequence updated"
            }`,
          });
        }
      }

      setEvents(nextEvents);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load operating timeline.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTimeline();
  }, [dealId]);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Deal Operating Timeline
          </h2>
          <p className="text-sm text-gray-400">
            Cross-system feed of major deal events, actions, and state changes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadTimeline()}
          disabled={loading}
          className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Timeline"}
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-400">Loading deal timeline...</p>
      ) : grouped.length === 0 ? (
        <p className="text-sm text-gray-400">No timeline events found yet.</p>
      ) : (
        <div className="space-y-4">
          {grouped.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-gray-800 bg-black p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {event.eventTitle}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      {event.eventType.replaceAll("_", " ")} · {event.source}
                    </p>
                  </div>

                  <p className="text-sm text-gray-300">{event.detail}</p>

                  <p className="text-xs text-gray-500">
                    {formatDate(event.eventTime)}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                    event.eventStatus,
                  )}`}
                >
                  {event.eventStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}