import { NextResponse } from 'next/server';
import { conversationInsights } from '@/lib/conversationInsights';

export async function GET(): Promise<NextResponse> {
  try {
    const results = await conversationInsights.runEffectivenessAnalysis(30);
    const processedCount = Array.isArray(results) ? results.length : 0;

    return NextResponse.json({
      success: true,
      processedCount,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
      },
      { status: 500 }
    );
  }
}