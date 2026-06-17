import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import {
  buildCommodityCaseSummary,
  caseSummaryToJson,
} from '@/lib/commodity/caseSummary';

type CommodityDealUpdate =
  Database['public']['Tables']['commodity_deals']['Update'];

type RequestBody = {
  dealId?: string;
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

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const dealId = normalizeNullableString(body.dealId);

    if (!dealId) {
      return NextResponse.json({ error: 'dealId is required.' }, { status: 400 });
    }

    const supabase = getSupabase();

    const [dealResult, documentsResult, counterpartiesResult, fraudSignalsResult] =
      await Promise.all([
        supabase.from('commodity_deals').select('*').eq('id', dealId).maybeSingle(),
        supabase.from('commodity_documents').select('*').eq('deal_id', dealId),
        supabase.from('commodity_counterparties').select('*').eq('deal_id', dealId),
        supabase.from('commodity_fraud_signals').select('*').eq('deal_id', dealId),
      ]);

    if (dealResult.error || documentsResult.error || counterpartiesResult.error || fraudSignalsResult.error) {
      return NextResponse.json({ error: 'Failed to load case summary inputs.' }, { status: 500 });
    }

    if (!dealResult.data) {
      return NextResponse.json({ error: 'Commodity deal not found.' }, { status: 404 });
    }

    const summary = buildCommodityCaseSummary({
      deal: dealResult.data,
      documents: documentsResult.data ?? [],
      counterparties: counterpartiesResult.data ?? [],
      fraudSignals: fraudSignalsResult.data ?? [],
    });

    const updatePayload: CommodityDealUpdate = {
      case_summary: caseSummaryToJson(summary),
      ready_for_presentment: summary.recommendation.readyForPresentment,
      ready_for_rejection: summary.recommendation.readyForRejection,
    };

    const updateResult = await supabase
      .from('commodity_deals')
      .update(updatePayload)
      .eq('id', dealId)
      .select('*')
      .single();

    if (updateResult.error) {
      return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
    }

    await supabase.from('commodity_verification_logs').insert({
      deal_id: dealId,
      action: 'case_summary_built',
      result: summary.recommendation.recommendationLabel,
      notes: summary.recommendation.reasons.join(' | '),
    });

    return NextResponse.json({
      deal: updateResult.data,
      caseSummary: summary,
    });
  } catch (error) {
    console.error('POST /api/commodity/case-summary/build failed', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected error while building case summary.',
      },
      { status: 500 },
    );
  }
}