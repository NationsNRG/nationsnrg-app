import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { assertCounterpartyRole } from '@/lib/commodity/validation';

type CommodityCounterpartyInsert =
  Database['public']['Tables']['commodity_counterparties']['Insert'];

type RequestBody = {
  dealId?: string;
  name?: string;
  role?: string;
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

    const dealId = normalizeNullableString(body.dealId);
    const name = normalizeNullableString(body.name);
    const roleRaw = normalizeNullableString(body.role);

    if (!dealId) {
      return NextResponse.json({ error: 'dealId is required.' }, { status: 400 });
    }

    if (!name) {
      return NextResponse.json({ error: 'name is required.' }, { status: 400 });
    }

    if (!roleRaw) {
      return NextResponse.json({ error: 'role is required.' }, { status: 400 });
    }

    const role = assertCounterpartyRole(roleRaw);

    const insertPayload: CommodityCounterpartyInsert = {
      deal_id: dealId,
      name,
      role,
      verification_status: 'unverified',
      risk_flags: normalizeStringArray(body.riskFlags),
    };

    const supabase = getSupabase();

    const insertResult = await supabase
      .from('commodity_counterparties')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      counterparty: insertResult.data,
    });
  } catch (error) {
    console.error('POST /api/commodity/counterparties/create failed', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected error while creating commodity counterparty.',
      },
      { status: 500 },
    );
  }
}