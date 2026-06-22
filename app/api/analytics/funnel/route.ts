import { NextResponse } from 'next/server';
import { analyticsEngine } from '@/lib/analyticsEngine';
import { requireApiRole } from '@/lib/auth/require-api-role';

interface ErrorResponseBody {
  success: false;
  error: string;
}

interface SuccessResponseBody<T> {
  success: true;
  funnel: T;
}

function createErrorResponse(message: string, status: number): NextResponse<ErrorResponseBody> {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

export async function GET(request: Request): Promise<Response> {
  const auth = await requireApiRole(
    request,
    ["admin", "operator"],
  );

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const funnel = await analyticsEngine.getFunnelAnalysis();

    return NextResponse.json({
      success: true,
      funnel,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(message, 500);
  }
}