import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

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

export default async function SupplierDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = getSupabase();

  const [supplierRes, capabilitiesRes, inboundRes] = await Promise.all([
    supabase.from('suppliers').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('supplier_capabilities')
      .select('*')
      .eq('supplier_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('supplier_inbound_requests')
      .select('*')
      .eq('supplier_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (supplierRes.error) {
    throw new Error(supplierRes.error.message);
  }

  if (!supplierRes.data) {
    notFound();
  }

  if (capabilitiesRes.error) {
    throw new Error(capabilitiesRes.error.message);
  }

  if (inboundRes.error) {
    throw new Error(inboundRes.error.message);
  }

  const supplier = supplierRes.data;
  const capabilities = capabilitiesRes.data ?? [];
  const inboundRequests = inboundRes.data ?? [];

  return (
    <div className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h1 className="text-3xl font-semibold">
            {supplier.supplier_name ?? supplier.company_name}
          </h1>
          <p className="text-zinc-400 text-sm">
            {(supplier.contact_email ?? supplier.email) ?? 'No contact email'} • {supplier.portal_status}
          </p>
        </div>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-lg font-semibold mb-4">Capabilities</h2>
          <div className="space-y-3">
            {capabilities.length === 0 ? (
              <div className="text-zinc-400 text-sm">No capabilities recorded yet.</div>
            ) : (
              capabilities.map((capability) => (
                <div key={capability.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="text-sm text-white">
                    Commodity: {capability.commodity ?? '—'}
                  </div>
                  <div className="text-xs text-zinc-400">
                    Pricing: {String(capability.pricing_supported)} • Enrollment: {String(capability.enrollment_supported)} • API: {String(capability.api_supported)} • Widget: {String(capability.widget_supported)}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-lg font-semibold mb-4">Inbound Requests</h2>
          <div className="space-y-3">
            {inboundRequests.length === 0 ? (
              <div className="text-zinc-400 text-sm">No inbound requests yet.</div>
            ) : (
              inboundRequests.map((request) => (
                <div key={request.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="text-sm text-white">
                    {request.request_type} • {request.request_status}
                  </div>
                  <div className="text-xs text-zinc-400">
                    Pipeline: {request.pipeline_id ?? '—'}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}