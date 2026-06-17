import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type CommodityDealUpdate =
  Database['public']['Tables']['commodity_deals']['Update'];

type RequestBody = {
  dealId?: string;
  operatorReviewStatus?: 'pending_review' | 'approved' | 'rejected' | 'on_hold';
  escalationStatus?: 'not_escalated' | 'compliance_review' | 'senior_review' | 'legal_review';
  operatorNotes?: string | null;
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

function assertOperatorReviewStatus(
  value: unknown,
): 'pending_review' | 'approved' | 'rejected' | 'on_hold' {
  if (
    value === 'pending_review' ||
    value === 'approved' ||
    value === 'rejected' ||
    value === 'on_hold'
  ) {
    return value;
  }

  throw new Error('Invalid operatorReviewStatus');
}

function assertEscalationStatus(
  value: unknown,
): 'not_escalated' | 'compliance_review' | 'senior_review' | 'legal_review' {
  if (
    value === 'not_escalated' ||
    value === 'compliance_review' ||
    value === 'senior_review' ||
    value === 'legal_review'
  ) {
    return value;
  }

  throw new Error('Invalid escalationStatus');
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const dealId = normalizeNullableString(body.dealId);

    if (!dealId) {
      return NextResponse.json({ error: 'dealId is required.' }, { status: 400 });
    }

    const updatePayload: CommodityDealUpdate = {
      operator_review_status: assertOperatorReviewStatus(body.operatorReviewStatus),
      escalation_status: assertEscalationStatus(body.escalationStatus),
      operator_notes: normalizeNullableString(body.operatorNotes),
    };

    const supabase = getSupabase();

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
      action: 'operator_review_update',
      result: updatePayload.operator_review_status,
      notes: updatePayload.operator_notes,
    });

    return NextResponse.json({
      deal: updateResult.data,
    });
  } catch (error) {
    console.error('POST /api/commodity/operator-review/update failed', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected error while updating operator review.',
      },
      { status: 500 },
    );
  }
}