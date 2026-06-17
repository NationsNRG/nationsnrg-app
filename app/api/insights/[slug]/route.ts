import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

interface ApiErrorResponse {
  error: string;
}

interface ApiSuccessResponse {
  success: true;
  insight: unknown;
}

function normalizeSlug(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function GET(
  _req: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiSuccessResponse | ApiErrorResponse>> {
  try {
    const { slug } = await context.params;
    const normalizedSlug = normalizeSlug(slug);

    if (normalizedSlug.length === 0) {
      return NextResponse.json(
        { error: 'Invalid slug' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('insights')
      .select('*')
      .eq('slug', normalizedSlug)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Insight not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      insight: data,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}