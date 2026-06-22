import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { dealEconomics } from '@/lib/dealEconomics';
import type { Database, Json } from '@/types/supabase';
import { requireApiRole } from '@/lib/auth/require-api-role';

type SystemActivityInsert =
  Database['public']['Tables']['system_activity']['Insert'];

interface RouteContext {
  params: Promise<{
    leadId: string;
  }>;
}

interface ApiErrorResponse {
  success: false;
  error: string;
}

type OptimizationResult = Awaited<
  ReturnType<typeof dealEconomics.optimizeDeal>
>;

interface ApiSuccessResponse {
  success: true;
  optimization: OptimizationResult;
}

function getSupabaseClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  if (typeof key !== 'string' || key.length === 0) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function normalizeLeadId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
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

async function logSystemActivity(
  supabase: SupabaseClient<Database>,
  params: {
    activityType: string;
    leadId?: string | null;
    message: string;
    details?: Json;
  }
): Promise<void> {
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
    console.error('optimize_deal_route_log_failed', error.message);
  }
}

export async function GET(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiSuccessResponse | ApiErrorResponse>> {
  const auth = await requireApiRole(
    req,
    ['admin', 'operator'],
  );

  if (!auth.ok) {
    return createErrorResponse('Unauthorized', 401);
  }

  const supabase = getSupabaseClient();

  let leadId = '';

  try {
    const resolvedParams = await context.params;
    leadId = normalizeLeadId(resolvedParams.leadId);

    if (leadId.length === 0) {
      await logSystemActivity(supabase, {
        activityType: 'optimize_deal_invalid_params',
        message: 'Missing or invalid leadId',
        details: null,
      });

      return createErrorResponse('Invalid leadId', 400);
    }

    const optimization = await dealEconomics.optimizeDeal(leadId);

    return NextResponse.json({
      success: true,
      optimization,
    });
  } catch (error: unknown) {
    const message = safeErrorMessage(error);

    await logSystemActivity(supabase, {
      activityType: 'optimize_deal_route_failed',
      leadId: leadId.length > 0 ? leadId : null,
      message,
      details: null,
    });

    return createErrorResponse(message, 500);
  }
}