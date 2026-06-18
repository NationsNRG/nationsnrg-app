// app/intake/deal/page.tsx

import AdminNav from "@/components/admin/AdminNav";
import QuickActions from "@/components/admin/QuickActions";
import IntakeDashboardKpiStrip from "@/components/intake/IntakeDashboardKpiStrip";
import IntakeDashboardQueueCards from "@/components/intake/IntakeDashboardQueueCards";
import IntakeDashboardFilterBar from "@/components/intake/IntakeDashboardFilterBar";
import OperatorSavedViewsBar from "@/components/intake/OperatorSavedViewsBar";
import AutoProgressHealthPanel from "@/components/intake/AutoProgressHealthPanel";

interface DealListItem {
  id: string;
  business_name: string | null;
  state: string | null;
  estimated_monthly_bill: number | null;
  intake_source: string | null;
  status: string | null;
  created_at: string | null;
}

interface PaginationInfo {
  page: number;
  totalPages: number;
}

interface DealFilters {
  search?: string;
  status?: string;
  state?: string;
  minBill?: string;
}

interface DealListResponse {
  ok: boolean;
  deals?: DealListItem[];
  pagination?: PaginationInfo;
  filters?: DealFilters;
}

async function getDeals(
  searchParams: Record<string, string | string[] | undefined>,
): Promise<DealListResponse> {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string" && value.length > 0) {
      params.set(key, value);
    }
  }

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://nationsnrg.com");

const response = await fetch(`${appUrl}/api/intake/deal?${params.toString()}`, {
  cache: "no-store",
});

  if (!response.ok) {
    throw new Error(`Failed to load deals: ${response.status}`);
  }

  return (await response.json()) as DealListResponse;
}

function formatCurrency(value: number | null): string {
  if (typeof value !== "number") {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default async function IntakeDealListPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const data = await getDeals(searchParams);
  const deals = data.deals ?? [];
  const pagination = data.pagination ?? { page: 1, totalPages: 1 };
  const filters = data.filters ?? {};

  return (
    <>
      <AdminNav />
      <main className="min-h-screen bg-black px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl space-y-8">
          <QuickActions />

          <AutoProgressHealthPanel />
          
          <IntakeDashboardKpiStrip />

          <IntakeDashboardQueueCards />

          <OperatorSavedViewsBar />

          <IntakeDashboardFilterBar />

          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Intake Deals
              </h1>
              <p className="text-sm text-gray-400">
                Review recently created intake deals and open their detail pages.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/intake/deal/create"
                className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                New Deal
              </a>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Total Deals
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {deals.length}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                With Bill Data
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {
                  deals.filter(
                    (deal) =>
                      typeof deal.estimated_monthly_bill === "number" &&
                      deal.estimated_monthly_bill > 0,
                  ).length
                }
              </p>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Latest Intake
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {deals.length > 0 ? formatDate(deals[0].created_at) : "—"}
              </p>
            </div>
          </section>

          {(filters.search ||
            filters.status ||
            filters.state ||
            filters.minBill) && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-gray-300">
              <span className="font-medium text-white">Active Filters:</span>{" "}
              {filters.search ? `Search: "${filters.search}" · ` : ""}
              {filters.status ? `Status: ${filters.status} · ` : ""}
              {filters.state ? `State: ${filters.state} · ` : ""}
              {filters.minBill ? `Min Bill: $${filters.minBill}` : ""}
            </div>
          )}

          <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            {deals.length === 0 ? (
              <p className="text-sm text-gray-400">No intake deals found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Business
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        State
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Monthly Bill
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Source
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Created
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {deals.map((deal) => (
                      <tr key={deal.id} className="border-b border-gray-800">
                        <td className="px-4 py-4 text-sm font-medium text-white">
                          {deal.business_name ?? "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-300">
                          {deal.state ?? "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-300">
                          {formatCurrency(deal.estimated_monthly_bill)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-300">
                          {deal.intake_source ?? "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-300">
                          {deal.status ?? "—"}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-300">
                          {formatDate(deal.created_at)}
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <a
                            href={`/intake/deal/${deal.id}`}
                            className="inline-flex rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
                          >
                            Open
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <div className="flex gap-2">
              {pagination.page > 1 && (
                <a
                  href={`?${new URLSearchParams({
                    ...filters,
                    page: String(pagination.page - 1),
                  }).toString()}`}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700"
                >
                  Previous
                </a>
              )}

              {pagination.page < pagination.totalPages && (
                <a
                  href={`?${new URLSearchParams({
                    ...filters,
                    page: String(pagination.page + 1),
                  }).toString()}`}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700"
                >
                  Next
                </a>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}