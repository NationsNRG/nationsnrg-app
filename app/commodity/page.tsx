import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import CommodityDealCreateForm from '@/components/commodity/CommodityDealCreateForm';
import CommodityDashboardCards from '@/components/commodity/CommodityDashboardCards';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
}

export default async function CommodityDealsPage() {
  const supabase = getSupabase();

  const dealsResult = await supabase
    .from('commodity_deals')
    .select('*')
    .order('created_at', { ascending: false });

  if (dealsResult.error) {
    throw new Error(dealsResult.error.message);
  }

  const deals = dealsResult.data ?? [];

  const totalDeals = deals.length;
  const verifiedDeals = deals.filter((deal) => deal.verification_status === 'verified').length;
  const failedDeals = deals.filter((deal) => deal.verification_status === 'failed').length;
  const inReviewDeals = deals.filter((deal) => deal.verification_status === 'in_review').length;

  return (
    <div className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div>
          <h1 className="text-3xl font-semibold">Commodity Verification Engine</h1>
          <p className="text-sm text-zinc-400">
            Oil brokering system for deal intake, document verification, and risk scoring.
          </p>
        </div>

        <CommodityDashboardCards
          totalDeals={totalDeals}
          verifiedDeals={verifiedDeals}
          failedDeals={failedDeals}
          inReviewDeals={inReviewDeals}
        />

        <CommodityDealCreateForm />

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Deals</h2>
          </div>

          {deals.length === 0 ? (
            <div className="text-sm text-zinc-400">No commodity deals yet.</div>
          ) : (
            <div className="space-y-3">
              {deals.map((deal) => (
                <a
                  key={deal.id}
                  href={`/commodity/${deal.id}`}
                  className="block rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-medium text-white">
                      {deal.deal_name}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {deal.commodity} • {deal.verification_status}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Created: {formatDate(deal.created_at)}
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}