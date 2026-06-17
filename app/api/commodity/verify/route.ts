import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { scoreCommodityDeal } from '@/lib/commodity/scoring';

type CommodityDealUpdate =
  Database['public']['Tables']['commodity_deals']['Update'];

type CommodityVerificationLogInsert =
  Database['public']['Tables']['commodity_verification_logs']['Insert'];

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

    const [dealResult, documentsResult, counterpartiesResult] = await Promise.all([
      supabase
        .from('commodity_deals')
        .select('*')
        .eq('id', dealId)
        .maybeSingle(),
      supabase
        .from('commodity_documents')
        .select('*')
        .eq('deal_id', dealId),
      supabase
        .from('commodity_counterparties')
        .select('*')
        .eq('deal_id', dealId),
    ]);

    if (dealResult.error) {
      return NextResponse.json({ error: dealResult.error.message }, { status: 500 });
    }

    if (documentsResult.error) {
      return NextResponse.json({ error: documentsResult.error.message }, { status: 500 });
    }

    if (counterpartiesResult.error) {
      return NextResponse.json({ error: counterpartiesResult.error.message }, { status: 500 });
    }

    if (!dealResult.data) {
      return NextResponse.json({ error: 'Commodity deal not found.' }, { status: 404 });
    }

    const scoring = scoreCommodityDeal({
      commodity: dealResult.data.commodity,
      buyerName: dealResult.data.buyer_name,
      sellerName: dealResult.data.seller_name,
      volume: dealResult.data.volume,
      price: dealResult.data.price,
      documents: (documentsResult.data ?? []).map((document) => ({
        documentType: document.document_type as 'SCO' | 'FCO' | 'ICPO' | 'BCL' | 'POP',
        verified: document.verified ?? false,
      })),
      counterparties: (counterpartiesResult.data ?? []).map((counterparty) => ({
        role: counterparty.role as 'buyer' | 'seller' | 'intermediary',
        verificationStatus: counterparty.verification_status as
          | 'unverified'
          | 'in_review'
          | 'verified'
          | 'failed',
        riskFlags: counterparty.risk_flags,
      })),
    });

    const dealUpdate: CommodityDealUpdate = {
      risk_score: scoring.riskScore,
      verification_status: scoring.verificationStatus,
      status:
        scoring.verificationStatus === 'verified'
          ? 'verified'
          : scoring.verificationStatus === 'failed'
            ? 'rejected'
            : 'under_review',
    };

    const updateResult = await supabase
      .from('commodity_deals')
      .update(dealUpdate)
      .eq('id', dealId)
      .select('*')
      .single();

    if (updateResult.error) {
      return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
    }

    const logInsert: CommodityVerificationLogInsert = {
      deal_id: dealId,
      action: 'verification_run',
      result: scoring.verificationStatus,
      notes: scoring.reasons.join(' | '),
    };

    const logResult = await supabase
      .from('commodity_verification_logs')
      .insert(logInsert);

    if (logResult.error) {
      return NextResponse.json({ error: logResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      deal: updateResult.data,
      scoring,
    });
  } catch (error) {
    console.error('POST /api/commodity/verify failed', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected error while verifying commodity deal.',
      },
      { status: 500 },
    );
  }
}