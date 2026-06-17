// app/admin/suppliers/[id]/page.tsx

interface SupplierEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface SupplierRecord {
  id: string;
  supplier_entity_id: string;
  supplier_name: string;
  supplier_class: string;
  status: string;
  commodity_types: string[] | null;
  service_states: string[] | null;
  utilities: string[] | null;
  capabilities: string[] | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string | null;
}

async function getSupplier(id: string): Promise<SupplierRecord> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/admin/suppliers/${id}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to load supplier: ${response.status}`);
  }

  const data = (await response.json()) as {
    ok: boolean;
    supplier?: SupplierRecord;
  };

  if (!data.supplier) {
    throw new Error("Supplier not found");
  }

  return data.supplier;
}

function formatArray(values: string[] | null | undefined): string {
  if (!Array.isArray(values) || values.length === 0) {
    return "—";
  }

  return values.join(", ");
}

export default async function SupplierEditPage({
  params,
}: SupplierEditPageProps) {
  const { id } = await params;
  const supplier = await getSupplier(id);

  return (
    <main className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Supplier Record
            </h1>
            <p className="text-sm text-gray-400">
              Review supplier details before wiring the edit form.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/admin/suppliers"
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Back to Supplier List
            </a>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-white">
              Supplier Identity
            </h2>

            <div className="space-y-3">
              <p className="text-sm text-gray-300">
                <span className="font-medium text-white">Supplier Name:</span>{" "}
                {supplier.supplier_name}
              </p>
              <p className="text-sm text-gray-300">
                <span className="font-medium text-white">Entity ID:</span>{" "}
                {supplier.supplier_entity_id}
              </p>
              <p className="text-sm text-gray-300">
                <span className="font-medium text-white">Class:</span>{" "}
                {supplier.supplier_class}
              </p>
              <p className="text-sm text-gray-300">
                <span className="font-medium text-white">Status:</span>{" "}
                {supplier.status}
              </p>
              <p className="text-sm text-gray-300">
                <span className="font-medium text-white">Updated:</span>{" "}
                {supplier.updated_at ?? "—"}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-white">
              Service Profile
            </h2>

            <div className="space-y-3">
              <p className="text-sm text-gray-300">
                <span className="font-medium text-white">Commodity Types:</span>{" "}
                {formatArray(supplier.commodity_types)}
              </p>
              <p className="text-sm text-gray-300">
                <span className="font-medium text-white">Service States:</span>{" "}
                {formatArray(supplier.service_states)}
              </p>
              <p className="text-sm text-gray-300">
                <span className="font-medium text-white">Utilities:</span>{" "}
                {formatArray(supplier.utilities)}
              </p>
              <p className="text-sm text-gray-300">
                <span className="font-medium text-white">Capabilities:</span>{" "}
                {formatArray(supplier.capabilities)}
              </p>
              <p className="text-sm text-gray-300">
                <span className="font-medium text-white">Notes:</span>{" "}
                {supplier.notes ?? "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-white">Metadata</h2>
          <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-black p-4 text-xs text-gray-300">
            {JSON.stringify(supplier.metadata ?? {}, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}