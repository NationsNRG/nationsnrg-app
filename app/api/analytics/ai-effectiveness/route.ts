import { NextResponse } from 'next/server';
import { analyticsEngine } from '@/lib/analyticsEngine';

interface ErrorResponseBody {
  success: false;
  error: string;
}

interface SuccessResponseBody<T> {
  success: true;
  effectiveness: T;
}

function createErrorResponse(
  message: string,
  status: number
): NextResponse<ErrorResponseBody> {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

export async function GET(): Promise<
  NextResponse<
    SuccessResponseBody<
      Awaited<ReturnType<typeof analyticsEngine.getAIEffectiveness>>
    > | ErrorResponseBody
  >
> {
  try {
    const effectiveness = await analyticsEngine.getAIEffectiveness();

    return NextResponse.json({
      success: true,
      effectiveness,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(message, 500);
  }
}