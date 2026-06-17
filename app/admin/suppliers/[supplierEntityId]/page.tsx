// app/admin/suppliers/[supplierEntityId]/page.tsx

import AdminNav from "@/components/admin/AdminNav";

interface SupplierPageProps {
  params: Promise<{
    supplierEntityId: string;
  }>;
}

interface SupplierRecord {
  supplier_entity_id: string;
  supplier_name: string;
  supplier_class: string;
  status: string;
  commodity_types: string[] | null;
  service_states: string[] | null;
  utilities: string[] | null;
  capabilities: string[] | null;
  notes: string | null;
  metadata: unknown;
  created_at: string | null;
  updated_at: string | null;
}

async function getSupplier(
  supplierEntityId: string,
): Promise<SupplierRecord | null> {
  const response = await fetch(
    `${
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    }/api/admin/suppliers/${supplierEntityId}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    ok: boolean;
    supplier?: SupplierRecord;
  };

  return data.supplier ?? null;
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

export default async function SupplierDetailPage({
  params,
}: SupplierPageProps) {
  const { supplierEntityId } = await params;
  const supplier = await getSupplier(supplierEntityId);

  if (!supplier) {
    return (
  <>
    <AdminNav />
    <main className="min-h-screen bg-black px-6 py-8 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-white">Supplier Not Found</h1>
            <p className="mt-2 text-sm text-gray-400">
              No supplier matched {supplierEntityId}.
            </p>
          </div>
        </div>
    </main>
  </>
);
  }

  return (
  <>
    <AdminNav />
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {supplier.supplier_name}
            </h1>
            <p className="text-sm text-gray-400">
              Supplier Entity ID: {supplier.supplier_entity_id}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/admin/suppliers"
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Back to Suppliers
            </a>
            <a
              href={`/admin/suppliers/${supplier.supplier_entity_id}/edit`}
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Edit Supplier
            </a>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-white">
              Core Profile
            </h2>
            <div className="space-y-3 text-sm text-gray-300">
              <p>
                <span className="font-medium text-white">Supplier Name:</span>{" "}
                {supplier.supplier_name}
              </p>
              <p>
                <span className="font-medium text-white">Entity ID:</span>{" "}
                {supplier.supplier_entity_id}
              </p>
              <p>
                <span className="font-medium text-white">Class:</span>{" "}
                {supplier.supplier_class}
              </p>
              <p>
                <span className="font-medium text-white">Status:</span>{" "}
                {supplier.status}
              </p>
              <p>
                <span className="font-medium text-white">Created:</span>{" "}
                {formatDate(supplier.created_at)}
              </p>
              <p>
                <span className="font-medium text-white">Updated:</span>{" "}
                {formatDate(supplier.updated_at)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-white">
              Coverage & Capability
            </h2>
            <div className="space-y-3 text-sm text-gray-300">
              <p>
                <span className="font-medium text-white">Commodities:</span>{" "}
                {formatList(supplier.commodity_types)}
              </p>
              <p>
                <span className="font-medium text-white">Service States:</span>{" "}
                {formatList(supplier.service_states)}
              </p>
              <p>
                <span className="font-medium text-white">Utilities:</span>{" "}
                {formatList(supplier.utilities)}
              </p>
              <p>
                <span className="font-medium text-white">Capabilities:</span>{" "}
                {formatList(supplier.capabilities)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-white">Notes</h2>
          <p className="text-sm text-gray-300">{supplier.notes ?? "—"}</p>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-white">Metadata</h2>
          <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-black p-4 text-xs text-gray-300">
            {JSON.stringify(supplier.metadata ?? {}, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  </>
);
}