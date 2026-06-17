// app/admin/suppliers/page.tsx

import AdminNav from "@/components/admin/AdminNav";
import QuickActions from "@/components/admin/QuickActions";

interface SupplierRow {
  id: string;
  supplier_entity_id: string;
  supplier_name: string;
  supplier_class: string;
  status: string;
  commodity_types: string[] | null;
  service_states: string[] | null;
  capabilities: string[] | null;
  created_at: string | null;
}

async function getSuppliers(): Promise<SupplierRow[]> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/admin/suppliers/list`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to load suppliers: ${response.status}`);
  }

  const data = (await response.json()) as {
    ok: boolean;
    suppliers?: SupplierRow[];
  };

  return Array.isArray(data.suppliers) ? data.suppliers : [];
}

function formatList(values: string[] | null): string {
  if (!Array.isArray(values) || values.length === 0) {
    return "—";
  }

  return values.join(", ");
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default async function SupplierAdminListPage() {
  const suppliers = await getSuppliers();

  return (
    <>
      <AdminNav />
      <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <QuickActions />
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Suppliers
            </h1>
            <p className="text-sm text-gray-400">
              Review and manage the supplier catalog.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/admin/suppliers/create"
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              New Supplier
            </a>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Total Suppliers
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {suppliers.length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Active Suppliers
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {suppliers.filter((supplier) => supplier.status === "active").length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Premium Partners
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {
                suppliers.filter(
                  (supplier) => supplier.supplier_class === "premium_partner",
                ).length
              }
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
          {suppliers.length === 0 ? (
            <p className="text-sm text-gray-400">No suppliers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Supplier
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Entity ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Class
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Commodities
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      States
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Capabilities
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id} className="border-b border-gray-800">
                      <td className="px-4 py-4 text-sm font-medium text-white">
                        {supplier.supplier_name}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-300">
                        {supplier.supplier_entity_id}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-300">
                        {supplier.supplier_class}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-300">
                        {supplier.status}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-300">
                        {formatList(supplier.commodity_types)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-300">
                        {formatList(supplier.service_states)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-300">
                        {formatList(supplier.capabilities)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-300">
                        {formatDate(supplier.created_at)}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <a
                          href={`/admin/suppliers/${supplier.supplier_entity_id}`}
                          className="inline-flex rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
                        >
                          Open
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
    </>
  );
}