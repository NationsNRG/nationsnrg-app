import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { assertVerificationStatus } from '@/lib/commodity/validation';

type CommodityCounterpartyUpdate =
  Database['public']['Tables']['commodity_counterparties']['Update'];

type CommodityVerificationLogInsert =
  Database['public']['Tables']['commodity_verification_logs']['Insert'];

type RequestBody = {
  counterpartyId?: string;
  verificationStatus?: string;
  riskFlags?: string[] | null;
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

function normalizeStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return items.length > 0 ? items : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const counterpartyId = normalizeNullableString(body.counterpartyId);
    const verificationStatusRaw = normalizeNullableString(body.verificationStatus);

    if (!counterpartyId) {
      return NextResponse.json({ error: 'counterpartyId is required.' }, { status: 400 });
    }

    if (!verificationStatusRaw) {
      return NextResponse.json({ error: 'verificationStatus is required.' }, { status: 400 });
    }

    const verificationStatus = assertVerificationStatus(verificationStatusRaw);

    const supabase = getSupabase();

    const counterpartyResult = await supabase
      .from('commodity_counterparties')
      .select('*')
      .eq('id', counterpartyId)
      .maybeSingle();

    if (counterpartyResult.error) {
      return NextResponse.json({ error: counterpartyResult.error.message }, { status: 500 });
    }

    if (!counterpartyResult.data) {
      return NextResponse.json({ error: 'Commodity counterparty not found.' }, { status: 404 });
    }

    const updatePayload: CommodityCounterpartyUpdate = {
      verification_status: verificationStatus,
      risk_flags: normalizeStringArray(body.riskFlags),
    };

    const updateResult = await supabase
      .from('commodity_counterparties')
      .update(updatePayload)
      .eq('id', counterpartyId)
      .select('*')
      .single();

    if (updateResult.error) {
      return NextResponse.json({ error: updateResult.error.message }, { status: 500 });
    }

    const logInsert: CommodityVerificationLogInsert = {
      deal_id: counterpartyResult.data.deal_id,
      action: 'counterparty_verification_update',
      result: verificationStatus,
      notes: `Counterparty ${counterpartyResult.data.name} updated to ${verificationStatus}.`,
    };

    const logResult = await supabase
      .from('commodity_verification_logs')
      .insert(logInsert);

    if (logResult.error) {
      return NextResponse.json({ error: logResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      counterparty: updateResult.data,
    });
  } catch (error) {
    console.error('POST /api/commodity/counterparties/update failed', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected error while updating counterparty.',
      },
      { status: 500 },
    );
  }
}