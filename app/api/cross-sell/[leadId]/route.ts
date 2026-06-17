import { NextRequest, NextResponse } from 'next/server';
import { crossSellEngine } from '@/lib/crossSellEngine';

interface RouteContext {
  params: Promise<{
    leadId: string;
  }>;
}

interface ApiError {
  success: false;
  error: string;
}

interface ApiSuccessRecommendations {
  success: true;
  recommendations: Awaited<ReturnType<typeof crossSellEngine.recommendForLead>>;
}

interface ApiSuccessProposal {
  success: true;
  proposal: Awaited<ReturnType<typeof crossSellEngine.generateBundleProposal>>;
}

function createErrorResponse(
  message: string,
  status: number
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeBundleId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export async function GET(
  _req: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiSuccessRecommendations | ApiError>> {
  try {
    const { leadId } = await context.params;

    const recommendations = await crossSellEngine.recommendForLead(leadId);

    return NextResponse.json({
      success: true,
      recommendations,
    });
  } catch (error: unknown) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}

export async function POST(
  req: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiSuccessProposal | ApiError>> {
  try {
    const { leadId } = await context.params;
    const body: unknown = await req.json();

    if (!isRecord(body)) {
      return createErrorResponse('Invalid request body', 400);
    }

    const bundleId = normalizeBundleId(body.bundleId);

    if (!bundleId) {
      return createErrorResponse('bundleId is required', 400);
    }

    const proposal = await crossSellEngine.generateBundleProposal(
      leadId,
      bundleId
    );

    return NextResponse.json({
      success: true,
      proposal,
    });
  } catch (error: unknown) {
    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}