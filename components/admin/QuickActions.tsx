export default function QuickActions() {
  return (
    <section className="grid gap-3 md:grid-cols-6">
      <a
        href="/intake/deal/create"
        className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-white hover:bg-gray-800"
      >
        + New Deal
      </a>

      <a
        href="/intake/deal"
        className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-white hover:bg-gray-800"
      >
        Intake Dashboard
      </a>

      <a
        href="/admin/suppliers"
        className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-white hover:bg-gray-800"
      >
        Supplier Admin
      </a>

      <a
        href="/admin/suppliers/create"
        className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-white hover:bg-gray-800"
      >
        + New Supplier
      </a>

      <a
        href="/big-deal-desk"
        className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-white hover:bg-gray-800"
      >
        Big Deal Desk
      </a>

      <a
        href="/portfolio-rollup"
        className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-white hover:bg-gray-800"
      >
        Portfolio Rollup
      </a>

      <a
        href="/system/deal-runner"
        className="rounded-xl border border-gray-800 bg-gray-900 p-4 text-sm text-white hover:bg-gray-800"
      >
        Deal Runner
      </a>
    </section>
  );
}