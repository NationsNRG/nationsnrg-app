import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import CommodityDocumentForm from '@/components/commodity/CommodityDocumentForm';
import CommodityCounterpartyForm from '@/components/commodity/CommodityCounterpartyForm';
import CommodityVerificationPanel from '@/components/commodity/CommodityVerificationPanel';
import CommodityDocumentVerificationList from '@/components/commodity/CommodityDocumentVerificationList';
import CommodityCounterpartyReviewList from '@/components/commodity/CommodityCounterpartyReviewList';
import CommodityFraudSignalsPanel from '@/components/commodity/CommodityFraudSignalsPanel';
import CommodityDocumentArtifactForm from '@/components/commodity/CommodityDocumentArtifactForm';
import CommodityCaseSummaryPanel from '@/components/commodity/CommodityCaseSummaryPanel';
import CommodityOperatorReviewPanel from '@/components/commodity/CommodityOperatorReviewPanel';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

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

export default async function CommodityDealDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = getSupabase();

  const [
    dealResult,
    documentsResult,
    counterpartiesResult,
    logsResult,
    fraudSignalsResult,
  ] = await Promise.all([
    supabase.from('commodity_deals').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('commodity_documents')
      .select('*')
      .eq('deal_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('commodity_counterparties')
      .select('*')
      .eq('deal_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('commodity_verification_logs')
      .select('*')
      .eq('deal_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('commodity_fraud_signals')
      .select('*')
      .eq('deal_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (dealResult.error) {
    throw new Error(dealResult.error.message);
  }

  if (!dealResult.data) {
    notFound();
  }

  if (documentsResult.error) {
    throw new Error(documentsResult.error.message);
  }

  if (counterpartiesResult.error) {
    throw new Error(counterpartiesResult.error.message);
  }

  if (logsResult.error) {
    throw new Error(logsResult.error.message);
  }

  if (fraudSignalsResult.error) {
    throw new Error(fraudSignalsResult.error.message);
  }

  const deal = dealResult.data;
  const documents = documentsResult.data ?? [];
  const counterparties = counterpartiesResult.data ?? [];
  const logs = logsResult.data ?? [];
  const fraudSignals = fraudSignalsResult.data ?? [];

  const documentOptions = documents.map((document) => ({
    id: document.id,
    label: [
      document.document_type,
      document.file_name ?? null,
      document.document_url ?? null,
    ]
      .filter(Boolean)
      .join(' • '),
  }));

  const caseSummary =
    deal.case_summary && typeof deal.case_summary === 'object' && !Array.isArray(deal.case_summary)
      ? (deal.case_summary as {
          overview?: Record<string, unknown>;
          verification?: Record<string, unknown>;
          documents?: Record<string, unknown>;
          counterparties?: Record<string, unknown>;
          fraudSignals?: Record<string, unknown>;
          recommendation?: Record<string, unknown>;
        })
      : null;

  return (
    <div className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-col gap-3">
            <div className="text-sm text-zinc-500">{deal.id}</div>
            <h1 className="text-3xl font-semibold">{deal.deal_name}</h1>
            <div className="text-sm text-zinc-400">
              {deal.commodity} • {deal.status} • {deal.verification_status}
            </div>
            <div className="text-sm text-zinc-400">
              Buyer: {deal.buyer_name ?? '—'} | Seller: {deal.seller_name ?? '—'}
            </div>
            <div className="text-sm text-zinc-400">
              Volume: {deal.volume ?? '—'} {deal.unit ?? ''} | Price: {deal.price ?? '—'} {deal.currency ?? ''}
            </div>
            <div className="text-sm text-zinc-400">
              Risk Score: {deal.risk_score ?? 0}
            </div>
          </div>
        </div>

        <CommodityVerificationPanel dealId={deal.id} />
        <CommodityFraudSignalsPanel dealId={deal.id} signals={fraudSignals} />
        <CommodityCaseSummaryPanel dealId={deal.id} caseSummary={caseSummary} />
        <CommodityOperatorReviewPanel
          dealId={deal.id}
          operatorReviewStatus={deal.operator_review_status}
          escalationStatus={deal.escalation_status}
          operatorNotes={deal.operator_notes}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <CommodityDocumentForm dealId={deal.id} />
          <CommodityCounterpartyForm dealId={deal.id} />
        </div>

        <CommodityDocumentArtifactForm documentOptions={documentOptions} />

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Documents</h2>
            </div>
            <CommodityDocumentVerificationList documents={documents} />
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Counterparties</h2>
            </div>
            <CommodityCounterpartyReviewList counterparties={counterparties} />
          </section>
        </div>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Verification Logs</h2>
          </div>

          {logs.length === 0 ? (
            <div className="text-sm text-zinc-400">No verification logs yet.</div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                  <div className="text-sm text-white">
                    {log.action} • {log.result ?? '—'}
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {log.notes ?? '—'}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Created: {formatDate(log.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}