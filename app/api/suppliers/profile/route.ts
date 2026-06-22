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

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePortalStatus(
  value: unknown,
): 'active' | 'inactive' | 'testing' | 'pending' {
  if (
    value === 'active' ||
    value === 'inactive' ||
    value === 'testing' ||
    value === 'pending'
  ) {
    return value;
  }

  return 'active';
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(req: Request) {
  const auth = await requireApiRole(req, ['admin', 'operator']);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await req.json();

    const supplierName = normalizeNullableString(body.supplierName);
    const contactName = normalizeNullableString(body.contactName);
    const contactEmail = normalizeNullableString(body.contactEmail);
    const contactPhone = normalizeNullableString(body.contactPhone);
    const portalStatus = normalizePortalStatus(body.status);
    const notes = normalizeNullableString(body.notes);

    if (!supplierName) return badRequest('Supplier name is required.');
    if (!contactName) return badRequest('Contact name is required.');
    if (!contactEmail) return badRequest('Contact email is required.');

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        company_name: supplierName,
        supplier_name: supplierName,
        contact_name: contactName,
        email: contactEmail,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        portal_status: portalStatus,
        is_active: portalStatus !== 'inactive',
        notes,
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

export async function PUT(req: Request) {
  const auth = await requireApiRole(req, ['admin', 'operator']);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await req.json();

    const supplierId = normalizeNullableString(body.supplierId);
    const supplierName = normalizeNullableString(body.supplierName);
    const contactName = normalizeNullableString(body.contactName);
    const contactEmail = normalizeNullableString(body.contactEmail);
    const contactPhone = normalizeNullableString(body.contactPhone);
    const portalStatus = normalizePortalStatus(body.status);
    const notes = normalizeNullableString(body.notes);

    if (!supplierId) return badRequest('Supplier id is required.');
    if (!supplierName) return badRequest('Supplier name is required.');
    if (!contactName) return badRequest('Contact name is required.');
    if (!contactEmail) return badRequest('Contact email is required.');

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('suppliers')
      .update({
        company_name: supplierName,
        supplier_name: supplierName,
        contact_name: contactName,
        email: contactEmail,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        portal_status: portalStatus,
        is_active: portalStatus !== 'inactive',
        notes,
      })
      .eq('id', supplierId)
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