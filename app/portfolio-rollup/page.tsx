// app/portfolio-rollup/page.tsx

import AdminNav from "@/components/admin/AdminNav";
import QuickActions from "@/components/admin/QuickActions";
import PortfolioRollupQueueActions from "@/components/portfolio-rollup/PortfolioRollupQueueActions";

interface QueueRow {
  id: string;
  deal_id: string;
  state: string | null;
  rollup_lane: string;
  aggregation_score: number;
  hold_status: string;
  aggregation_reason: string;
  minimum_cluster_target: number;
  assigned_cluster_key: string | null;
  released_to_execution: boolean;
  release_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
}

async function getQueue(): Promise<QueueRow[]> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/portfolio-rollup/queue`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to load portfolio rollup queue: ${response.status}`);
  }

  const data = (await response.json()) as {
    ok: boolean;
    queue?: QueueRow[];
  };

  return Array.isArray(data.queue) ? data.queue : [];
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function statusClasses(status: string): string {
  if (status === "released") {
    return "border-green-800 bg-green-950 text-green-300";
  }

  if (status === "cancelled") {
    return "border-red-800 bg-red-950 text-red-300";
  }

  return "border-yellow-800 bg-yellow-950 text-yellow-300";
}

export default async function PortfolioRollupPage() {
  const queue = await getQueue();

  return (
    <>
      <AdminNav />
      <main className="min-h-screen bg-black px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl space-y-8">
          <QuickActions />

          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Portfolio Rollup Queue
              </h1>
              <p className="text-sm text-gray-400">
                Manage held deals awaiting clustered upside or release to execution.
              </p>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Total Queue
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {queue.length}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Held
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {queue.filter((row) => row.hold_status === "held").length}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Released
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {queue.filter((row) => row.hold_status === "released").length}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Highest Score
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {queue.length > 0 ? queue[0].aggregation_score : "—"}
              </p>
            </div>
          </section>

          {queue.length === 0 ? (
            <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
              <p className="text-sm text-gray-400">
                No rollup queue records found.
              </p>
            </section>
          ) : (
            <div className="space-y-6">
              {queue.map((row) => (
                <section
                  key={row.id}
                  className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm"
                >
                  <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold text-white">
                        Deal {row.deal_id}
                      </h2>
                      <p className="text-sm text-gray-400">
                        {row.rollup_lane} · score {row.aggregation_score}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                        row.hold_status,
                      )}`}
                    >
                      {row.hold_status}
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                    <div className="rounded-lg border border-gray-800 bg-black p-4">
                      <p className="text-xs uppercase text-gray-500">State</p>
                      <p className="mt-2 text-sm text-gray-300">
                        {row.state ?? "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-black p-4">
                      <p className="text-xs uppercase text-gray-500">Lane</p>
                      <p className="mt-2 text-sm text-gray-300">{row.rollup_lane}</p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-black p-4">
                      <p className="text-xs uppercase text-gray-500">Cluster Target</p>
                      <p className="mt-2 text-sm text-gray-300">
                        {row.minimum_cluster_target}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-black p-4">
                      <p className="text-xs uppercase text-gray-500">Cluster Key</p>
                      <p className="mt-2 text-sm text-gray-300">
                        {row.assigned_cluster_key ?? "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-black p-4">
                      <p className="text-xs uppercase text-gray-500">Created</p>
                      <p className="mt-2 text-sm text-gray-300">
                        {formatDate(row.created_at)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-black p-4">
                      <p className="text-xs uppercase text-gray-500">Updated</p>
                      <p className="mt-2 text-sm text-gray-300">
                        {formatDate(row.updated_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-gray-800 bg-black p-4">
                    <p className="text-xs uppercase text-gray-500">Aggregation Reason</p>
                    <p className="mt-2 text-sm text-gray-300">
                      {row.aggregation_reason}
                    </p>
                  </div>

                  <div className="mt-4 rounded-lg border border-gray-800 bg-black p-4">
                    <p className="text-xs uppercase text-gray-500">Release Reason</p>
                    <p className="mt-2 text-sm text-gray-300">
                      {row.release_reason ?? "—"}
                    </p>
                  </div>

                  <div className="mt-4">
                    <PortfolioRollupQueueActions
                      queueId={row.id}
                      assignedClusterKey={row.assigned_cluster_key}
                      releaseReason={row.release_reason}
                      holdStatus={row.hold_status}
                    />
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}