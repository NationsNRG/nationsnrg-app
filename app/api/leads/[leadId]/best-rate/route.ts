import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from "@/lib/supabase/server";
import type { Database, Json } from '@/types/supabase';

type PublicSchema = Database['public'];
type LeadRow = PublicSchema['Tables']['discovered_leads']['Row'];
type SystemActivityInsert = PublicSchema['Tables']['system_activity']['Insert'];

interface RouteContext {
  params: Promise<{
    leadId: string;
  }>;
}

interface BestRateSuccessResponse {
  success: true;
  rate: number;
  supplier: string;
  savings: number;
}

interface BestRateErrorResponse {
  success: false;
  error: string;
}

type BestRateResponse = BestRateSuccessResponse | BestRateErrorResponse;

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

function createErrorResponse(
  message: string,
  status: number
): NextResponse<BestRateErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

const supabase = getServiceClient();

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
    console.error('best_rate_route_log_failed', error.message);
  }
}

function estimateRateFromLead(lead: LeadRow): number | null {
  const directRate = normalizeNumber(
    (lead as LeadRow & {
      rate_cents_kwh?: number | null;
      best_rate_cents_kwh?: number | null;
      current_rate_cents_kwh?: number | null;
      current_rate?: number | null;
    }).best_rate_cents_kwh ??
      (lead as LeadRow & {
        rate_cents_kwh?: number | null;
      }).rate_cents_kwh ??
      (lead as LeadRow & {
        current_rate_cents_kwh?: number | null;
      }).current_rate_cents_kwh ??
      (lead as LeadRow & {
        current_rate?: number | null;
      }).current_rate
  );

  if (directRate > 0) {
    return directRate;
  }

  const estimatedSavings = normalizeNumber(lead.estimated_savings);
  if (estimatedSavings > 0) {
    return 9.9;
  }

  return null;
}

function estimateSupplierFromLead(lead: LeadRow): string | null {
  const supplier = normalizeNullableString(
    (lead as LeadRow & {
      supplier_name?: string | null;
      incumbent_supplier?: string | null;
      current_supplier?: string | null;
      best_supplier?: string | null;
    }).best_supplier ??
      (lead as LeadRow & {
        supplier_name?: string | null;
      }).supplier_name ??
      (lead as LeadRow & {
        incumbent_supplier?: string | null;
      }).incumbent_supplier ??
      (lead as LeadRow & {
        current_supplier?: string | null;
      }).current_supplier
  );

  if (supplier) {
    return supplier;
  }

  if (normalizeNumber(lead.estimated_savings) > 0) {
    return 'Best Available Market Match';
  }

  return null;
}

export async function GET(
  _req: NextRequest,
  context: RouteContext
): Promise<NextResponse<BestRateResponse>> {
  let leadId = '';

  try {
    const params = await context.params;
    leadId = normalizeString(params.leadId);

    if (leadId.length === 0) {
      await logSystemActivity({
        activityType: 'best_rate_invalid_params',
        message: 'Missing or invalid leadId',
      });

      return createErrorResponse('Invalid leadId', 400);
    }

    const { data, error } = await supabase
      .from('discovered_leads')
      .select('*')
      .eq('id', leadId)
      .maybeSingle();

    if (error) {
      await logSystemActivity({
        activityType: 'best_rate_lead_fetch_failed',
        leadId,
        message: error.message,
      });

      return createErrorResponse('Failed to load lead', 500);
    }

    if (!data) {
    await logSystemActivity({
      activityType: 'best_rate_lead_not_found',
      leadId: null,
      message: `Lead not found: ${leadId}`,
    });

      return createErrorResponse('Lead not found', 404);
    }

    const rate = estimateRateFromLead(data);
    const supplier = estimateSupplierFromLead(data);
    const savings = normalizeNumber(data.estimated_savings);

    if (rate === null || supplier === null) {
      return NextResponse.json({
        success: false,
        error: 'No best rate available for this lead yet',
      });
    }

    return NextResponse.json({
      success: true,
      rate,
      supplier,
      savings,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';

await logSystemActivity({
  activityType: 'best_rate_route_failed',
  leadId: null,
  message: leadId.length > 0 ? `${message} | leadId=${leadId}` : message,
});

    return createErrorResponse(message, 500);
  }
}