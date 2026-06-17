import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/supabase';

type PublicSchema = Database['public'];
type LeadRow = PublicSchema['Tables']['discovered_leads']['Row'];
type SystemActivityInsert = PublicSchema['Tables']['system_activity']['Insert'];

interface ApiErrorResponse {
  success: false;
  error: string;
}

interface TopProfitabilityDeal {
  id: string;
  business_name: string;
  estimated_commission: number;
  score: number;
}

interface ApiSuccessResponse {
  success: true;
  deals: TopProfitabilityDeal[];
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }

  const rounded = Math.floor(parsed);
  if (rounded < 1) {
    return DEFAULT_LIMIT;
  }

  if (rounded > MAX_LIMIT) {
    return MAX_LIMIT;
  }

  return rounded;
}

function calculateFallbackScore(lead: LeadRow): number {
  const estimatedCommission = normalizeNumber(
    (lead as LeadRow & { estimated_commission?: number | null }).estimated_commission
  );
  const leadScore = normalizeNumber(
    (lead as LeadRow & { lead_score?: number | null }).lead_score
  );
  const brokerValueScore = normalizeNumber(
    (lead as LeadRow & { broker_value_score?: number | null }).broker_value_score
  );
  const estimatedSavings = normalizeNumber(lead.estimated_savings);

  return leadScore + brokerValueScore + Math.round(estimatedCommission / 100) + Math.round(estimatedSavings / 1000);
}

function mapLeadToTopDeal(lead: LeadRow): TopProfitabilityDeal {
  const estimatedCommission = normalizeNumber(
    (lead as LeadRow & { estimated_commission?: number | null }).estimated_commission
  );

  return {
    id: lead.id,
    business_name: normalizeNullableString(lead.business_name) ?? 'Unknown Business',
    estimated_commission: estimatedCommission,
    score: calculateFallbackScore(lead),
  };
}

async function logSystemActivity(params: {
  activityType: string;
  leadId?: string | null;
  message: string;
  details?: Json;
}): Promise<void> {
  const payload: SystemActivityInsert = {
    activity_type: params.activityType,
    lead_id: params.leadId ?? null,
    details: {
      message: params.message,
      payload: params.details ?? null,
    },
    created_at: nowIso(),
  };

  const { error } = await supabase.from('system_activity').insert(payload);

  if (error) {
    console.error('top_profitability_log_failed', error.message);
  }
}

function createErrorResponse(
  message: string,
  status: number
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

export async function GET(
  req: NextRequest
): Promise<NextResponse<ApiSuccessResponse | ApiErrorResponse>> {
  try {
    const limit = normalizeLimit(req.nextUrl.searchParams.get('limit'));

    const { data, error } = await supabase
      .from('discovered_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(250);

    if (error) {
      await logSystemActivity({
        activityType: 'top_profitability_fetch_failed',
        message: error.message,
        details: {
          limit,
        },
      });

      return createErrorResponse('Failed to load top profitability deals', 500);
    }

    const leads = Array.isArray(data) ? data : [];

    const deals = leads
      .map(mapLeadToTopDeal)
      .filter((deal) => deal.estimated_commission > 0 || deal.score > 0)
      .sort((a, b) => {
        if (b.estimated_commission !== a.estimated_commission) {
          return b.estimated_commission - a.estimated_commission;
        }

        return b.score - a.score;
      })
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      deals,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    await logSystemActivity({
      activityType: 'top_profitability_route_failed',
      message,
      details: null,
    });

    return createErrorResponse(message, 500);
  }
}