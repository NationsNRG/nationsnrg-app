"use client";

import { useEffect, useState } from "react";
import { authenticatedFetch } from "@/lib/auth/authenticated-fetch";

interface RecentDeal {
  id: string;
  business_name: string | null;
  state: string | null;
  estimated_monthly_bill: number | null;
  status: string | null;
  created_at: string | null;
}

interface BigDeal {
  id: string;
  deal_id: string;
  triage_lane: string;
  triage_score: number;
  escalation_status: string;
  queued_at: string | null;
}

interface RollupDeal {
  id: string;
  deal_id: string;
  state: string | null;
  rollup_lane: string;
  aggregation_score: number;
  hold_status: string;
  created_at: string | null;
}

interface PackageRow {
  id: string;
  deal_id: string;
  package_version: number;
  package_type: string;
  status: string;
  created_at: string | null;
}

interface DashboardQueues {
  recentDeals: RecentDeal[];
  bigDeals: BigDeal[];
  rollups: RollupDeal[];
  latestPackages: PackageRow[];
}

function formatMoney(value: number | null): string {
  if (typeof value !== "number") {
    return "—";
  }

  return `$${value.toLocaleString()}`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function IntakeDashboardQueueCards() {
  const [loading, setLoading] = useState(true);
  const [queues, setQueues] = useState<DashboardQueues | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadQueues() {
    try {
      setLoading(true);
      setError(null);

      const response = await authenticatedFetch("/api/intake/dashboard/queues");
      const data = (await response.json()) as
        | {
            ok: true;
            queues: DashboardQueues;
          }
        | {
            ok: false;
            error?: string;
          };

      if (!response.ok) {
        throw new Error(`Failed to load dashboard queues. HTTP ${response.status}`);
      }

      if (!data.ok) {
        throw new Error(data.error ?? "Failed to load dashboard queues.");
      }

      setQueues(data.queues);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard queues.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueues();
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Priority Queues
          </h2>
          <p className="text-sm text-gray-400">
            Fast access to the latest intake, escalation, rollup, and package activity.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadQueues()}
          disabled={loading}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Queues"}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-800 bg-red-950 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {loading && !queues ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-sm text-gray-400">
          Loading priority queues...
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <QueueCard title="Recent Deals" href="/intake/deal">
            {(queues?.recentDeals ?? []).length === 0 ? (
              <EmptyQueue />
            ) : (
              (queues?.recentDeals ?? []).map((deal) => (
                <QueueItem
                  key={deal.id}
                  title={deal.business_name ?? "Untitled Deal"}
                  href={`/intake/deal/${deal.id}`}
                  meta={`${deal.state ?? "—"} · ${formatMoney(
                    deal.estimated_monthly_bill,
                  )} monthly`}
                  status={deal.status ?? "intake"}
                  footer={formatDate(deal.created_at)}
                />
              ))
            )}
          </QueueCard>

          <QueueCard title="Big Deal Desk" href="/big-deal-desk">
            {(queues?.bigDeals ?? []).length === 0 ? (
              <EmptyQueue />
            ) : (
              (queues?.bigDeals ?? []).map((deal) => (
                <QueueItem
                  key={deal.id}
                  title={`Deal ${deal.deal_id}`}
                  href={`/intake/deal/${deal.deal_id}`}
                  meta={`${deal.triage_lane} · score ${deal.triage_score}`}
                  status={deal.escalation_status}
                  footer={formatDate(deal.queued_at)}
                />
              ))
            )}
          </QueueCard>

          <QueueCard title="Portfolio Rollup" href="/portfolio-rollup">
            {(queues?.rollups ?? []).length === 0 ? (
              <EmptyQueue />
            ) : (
              (queues?.rollups ?? []).map((rollup) => (
                <QueueItem
                  key={rollup.id}
                  title={`Deal ${rollup.deal_id}`}
                  href={`/intake/deal/${rollup.deal_id}`}
                  meta={`${rollup.state ?? "—"} · ${rollup.rollup_lane} · score ${
                    rollup.aggregation_score
                  }`}
                  status={rollup.hold_status}
                  footer={formatDate(rollup.created_at)}
                />
              ))
            )}
          </QueueCard>

          <QueueCard title="Latest Packages" href="/intake/deal">
            {(queues?.latestPackages ?? []).length === 0 ? (
              <EmptyQueue />
            ) : (
              (queues?.latestPackages ?? []).map((pkg) => (
                <QueueItem
                  key={pkg.id}
                  title={`v${pkg.package_version} ${pkg.package_type} package`}
                  href={`/intake/deal/${pkg.deal_id}`}
                  meta={`Deal ${pkg.deal_id}`}
                  status={pkg.status}
                  footer={formatDate(pkg.created_at)}
                />
              ))
            )}
          </QueueCard>
        </div>
      )}
    </section>
  );
}

function QueueCard({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <a
          href={href}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-white hover:bg-gray-700"
        >
          Open
        </a>
      </div>

      <div className="space-y-3">{children}</div>
    </div>
  );
}

function QueueItem({
  title,
  href,
  meta,
  status,
  footer,
}: {
  title: string;
  href: string;
  meta: string;
  status: string;
  footer: string;
}) {
  return (
    <a
      href={href}
      className="block rounded-xl border border-gray-800 bg-black p-4 hover:bg-gray-950"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="mt-1 text-sm text-gray-400">{meta}</p>
          <p className="mt-2 text-xs text-gray-500">{footer}</p>
        </div>

        <span className="rounded-full border border-blue-800 bg-blue-950 px-3 py-1 text-xs font-medium uppercase text-blue-300">
          {status}
        </span>
      </div>
    </a>
  );
}

function EmptyQueue() {
  return (
    <div className="rounded-xl border border-gray-800 bg-black p-4 text-sm text-gray-400">
      No records found.
    </div>
  );
}