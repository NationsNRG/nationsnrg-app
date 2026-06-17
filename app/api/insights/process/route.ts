import { NextRequest, NextResponse } from 'next/server';
import { insightEngine } from '@/lib/insightEngine';

export async function POST(_req: NextRequest) {
  try {
    const result = await insightEngine.processInsights();

    return NextResponse.json({
      success: true,
      created: result.created,
      insightIds: result.insightIds,
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