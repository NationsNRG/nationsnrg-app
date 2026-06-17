import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { assertCommodity } from '@/lib/commodity/validation';

type CommodityDealInsert =
  Database['public']['Tables']['commodity_deals']['Insert'];

type RequestBody = {
  dealName?: string;
  commodity?: string;
  buyerName?: string | null;
  sellerName?: string | null;
  volume?: number | null;
  unit?: string | null;
  price?: number | null;
  currency?: string | null;
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

function normalizeNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    const dealName = normalizeNullableString(body.dealName);
    const commodityRaw = normalizeNullableString(body.commodity);

    if (!dealName) {
      return NextResponse.json({ error: 'dealName is required.' }, { status: 400 });
    }

    if (!commodityRaw) {
      return NextResponse.json({ error: 'commodity is required.' }, { status: 400 });
    }

    const commodity = assertCommodity(commodityRaw);

    const insertPayload: CommodityDealInsert = {
      deal_name: dealName,
      commodity,
      buyer_name: normalizeNullableString(body.buyerName),
      seller_name: normalizeNullableString(body.sellerName),
      volume: normalizeNullableNumber(body.volume),
      unit: normalizeNullableString(body.unit),
      price: normalizeNullableNumber(body.price),
      currency: normalizeNullableString(body.currency),
      status: 'submitted',
      verification_status: 'unverified',
      risk_score: 0,
    };

    const supabase = getSupabase();

    const insertResult = await supabase
      .from('commodity_deals')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      deal: insertResult.data,
    });
  } catch (error) {
    console.error('POST /api/commodity/deals/create failed', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected error while creating commodity deal.',
      },
      { status: 500 },
    );
  }
}