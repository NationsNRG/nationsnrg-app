import { NextRequest, NextResponse } from 'next/server';
import { insightEngine } from '@/lib/insightEngine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const insightId =
      typeof body?.insightId === 'string' ? body.insightId.trim() : '';

    if (!insightId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing insightId',
        },
        { status: 400 }
      );
    }

    const result = await insightEngine.generateVariantsForInsight(insightId);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}