// app/big-deal-desk/page.tsx

import AdminNav from "@/components/admin/AdminNav";
import QuickActions from "@/components/admin/QuickActions";
import BigDealDeskQueueActions from "@/components/big-deal-desk/BigDealDeskQueueActions";

interface QueueRow {
  id: string;
  deal_id: string;
  triage_tier: string;
  triage_lane: string;
  triage_score: number;
  escalation_status: string;
  escalation_reason: string;
  assigned_owner: string | null;
  review_notes: string | null;
  queued_at: string | null;
  reviewed_at: string | null;
}

async function getQueue(): Promise<QueueRow[]> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/big-deal-desk/queue`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to load big deal desk queue: ${response.status}`);
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
  if (status === "approved") {
    return "border-green-800 bg-green-950 text-green-300";
  }

  if (status === "under_review") {
    return "border-yellow-800 bg-yellow-950 text-yellow-300";
  }

  if (status === "rejected" || status === "returned") {
    return "border-red-800 bg-red-950 text-red-300";
  }

  return "border-blue-800 bg-blue-950 text-blue-300";
}

export default async function BigDealDeskPage() {
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
                Big Deal Desk
              </h1>
              <p className="text-sm text-gray-400">
                Review, assign, and disposition major opportunities.
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
                Under Review
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {queue.filter((row) => row.escalation_status === "under_review").length}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Approved
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {queue.filter((row) => row.escalation_status === "approved").length}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Highest Score
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {queue.length > 0 ? queue[0].triage_score : "—"}
              </p>
            </div>
          </section>

          {queue.length === 0 ? (
            <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
              <p className="text-sm text-gray-400">
                No big deal desk records found.
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
                        {row.triage_lane} · score {row.triage_score}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium uppercase ${statusClasses(
                        row.escalation_status,
                      )}`}
                    >
                      {row.escalation_status}
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-lg border border-gray-800 bg-black p-4">
                      <p className="text-xs uppercase text-gray-500">Tier</p>
                      <p className="mt-2 text-sm text-gray-300">{row.triage_tier}</p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-black p-4">
                      <p className="text-xs uppercase text-gray-500">Lane</p>
                      <p className="mt-2 text-sm text-gray-300">{row.triage_lane}</p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-black p-4">
                      <p className="text-xs uppercase text-gray-500">Owner</p>
                      <p className="mt-2 text-sm text-gray-300">
                        {row.assigned_owner ?? "—"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-black p-4">
                      <p className="text-xs uppercase text-gray-500">Queued</p>
                      <p className="mt-2 text-sm text-gray-300">
                        {formatDate(row.queued_at)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-800 bg-black p-4">
                      <p className="text-xs uppercase text-gray-500">Reviewed</p>
                      <p className="mt-2 text-sm text-gray-300">
                        {formatDate(row.reviewed_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-gray-800 bg-black p-4">
                    <p className="text-xs uppercase text-gray-500">Escalation Reason</p>
                    <p className="mt-2 text-sm text-gray-300">
                      {row.escalation_reason}
                    </p>
                  </div>

                  <div className="mt-4">
                    <BigDealDeskQueueActions
                      queueId={row.id}
                      assignedOwner={row.assigned_owner}
                      reviewNotes={row.review_notes}
                      escalationStatus={row.escalation_status}
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