import { NextResponse } from 'next/server';
import { analyticsEngine } from '@/lib/analyticsEngine';
import { requireApiRole } from '@/lib/auth/require-api-role';

interface ErrorResponseBody {
  success: false;
  error: string;
}

interface SuccessResponseBody<T> {
  success: true;
  metrics: T;
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

function parseDateParam(value: string | null): Date | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export async function GET(
  req: Request
): Promise<Response> {
  const auth = await requireApiRole(
    req,
    ["admin", "operator"],
  );

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const url = new URL(req.url);
    const rawDate = url.searchParams.get('date');
    const parsedDate = parseDateParam(rawDate);

    if (rawDate !== null && parsedDate === null) {
      return createErrorResponse('Invalid date parameter', 400);
    }

    const metrics = await analyticsEngine.generateDailyMetrics(parsedDate ?? new Date());

    return NextResponse.json({
      success: true,
      metrics,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(message, 500);
  }
}