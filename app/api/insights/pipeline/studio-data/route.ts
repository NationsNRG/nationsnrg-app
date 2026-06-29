import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/server';
import { requireApiRole } from '@/lib/auth/require-api-role';

export async function GET(request: Request): Promise<Response> {
  const auth = await requireApiRole(request, ['admin', 'operator']);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const supabase = getServiceClient();

    const [insightsRes, variantsRes] = await Promise.all([
      supabase
        .from('content_insights')
        .select('id, slug, title, canonical_summary, canonical_body, angle, audience, seo_keyword, source_type, confidence_score, status, created_at, updated_at, published_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('content_insight_variants')
        .select('id, insight_id, variant_type, title, body, cta, status, created_at, updated_at')
        .order('created_at', { ascending: false }),
    ]);

    if (insightsRes.error) {
      return NextResponse.json({ success: false, error: insightsRes.error.message }, { status: 500 });
    }

    if (variantsRes.error) {
      return NextResponse.json({ success: false, error: variantsRes.error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      insights: insightsRes.data ?? [],
      variants: variantsRes.data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}