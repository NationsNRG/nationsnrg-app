import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: Request) {
  const body = await req.json();

  const { data, error } = await supabase.from('supplier_capabilities').insert({
    supplier_id: body.supplierId,
    commodity: body.commodity,
    pricing_supported: body.pricing,
    enrollment_supported: body.enrollment,
    api_supported: body.api,
    widget_supported: body.widget,
    portal_supported: body.portal,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}