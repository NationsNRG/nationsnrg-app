import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePortalStatus(value: unknown): 'active' | 'inactive' | 'testing' | 'pending' {
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

export async function POST(req: Request) {
  const body = await req.json();

  const supplierName = normalizeNullableString(body.supplierName);
  const contactName = normalizeNullableString(body.contactName);
  const contactEmail = normalizeNullableString(body.contactEmail);
  const contactPhone = normalizeNullableString(body.contactPhone);
  const portalStatus = normalizePortalStatus(body.status);
  const notes = normalizeNullableString(body.notes);

  if (!supplierName) {
  return NextResponse.json({ error: 'Supplier name is required.' }, { status: 400 });
}

if (!contactName) {
  return NextResponse.json({ error: 'Contact name is required.' }, { status: 400 });
}

if (!contactEmail) {
  return NextResponse.json({ error: 'Contact email is required.' }, { status: 400 });
}

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
}

export async function PUT(req: Request) {
  const body = await req.json();

  const supplierId = normalizeNullableString(body.supplierId);
  const supplierName = normalizeNullableString(body.supplierName);
  const contactName = normalizeNullableString(body.contactName);
  const contactEmail = normalizeNullableString(body.contactEmail);
  const contactPhone = normalizeNullableString(body.contactPhone);
  const portalStatus = normalizePortalStatus(body.status);
  const notes = normalizeNullableString(body.notes);

  if (!supplierId) {
  return NextResponse.json({ error: 'Supplier id is required.' }, { status: 400 });
}

if (!supplierName) {
  return NextResponse.json({ error: 'Supplier name is required.' }, { status: 400 });
}

if (!contactName) {
  return NextResponse.json({ error: 'Contact name is required.' }, { status: 400 });
}

if (!contactEmail) {
  return NextResponse.json({ error: 'Contact email is required.' }, { status: 400 });
}

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
}