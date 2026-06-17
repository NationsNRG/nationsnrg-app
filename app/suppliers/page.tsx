import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export const dynamic = 'force-dynamic';

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

export default async function SuppliersPage() {
  const supabase = getSupabase();

  const suppliersRes = await supabase
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false });

  if (suppliersRes.error) {
    throw new Error(suppliersRes.error.message);
  }

  const suppliers = suppliersRes.data ?? [];

  return (
    <div className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Suppliers</h1>
          <p className="text-zinc-400 text-sm">
            Supplier-side partner console foundation for NationsNRG.
          </p>
        </div>

        <div className="grid gap-4">
          {suppliers.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-400">
              No suppliers yet.
            </div>
          ) : (
            suppliers.map((supplier) => (
              <a
                key={supplier.id}
                href={`/suppliers/${supplier.id}`}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 hover:border-zinc-700"
              >
                <div className="text-lg font-medium">
                    {supplier.supplier_name ?? supplier.company_name}
                </div>
                <div className="text-sm text-zinc-400">
                    {(supplier.contact_email ?? supplier.email) ?? 'No contact email'} • {supplier.portal_status}
                </div>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}