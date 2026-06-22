import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { requireApiRole } from '@/lib/auth/require-api-role';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase env not configured');
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: Request) {
  const auth = await requireApiRole(req, ['admin', 'operator']);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await req.json();
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('supplier_capabilities')
      .insert({
        supplier_id: body.supplierId,
        commodity: body.commodity,
        pricing_supported: body.pricing,
        enrollment_supported: body.enrollment,
        api_supported: body.api,
        widget_supported: body.widget,
        portal_supported: body.portal,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}