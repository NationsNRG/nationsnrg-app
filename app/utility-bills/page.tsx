import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Utility Bills | NationsNRG',
  description:
    'Review utility bill support, pricing analysis, and energy cost guidance for your business.',
};

export default function UtilityBillsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm text-cyan-400 hover:text-cyan-300"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            Utility Bill Support
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-white">
            Utility Bill Review
          </h1>

          <p className="mt-4 max-w-3xl text-lg text-slate-300">
            Upload or review your utility bill information to identify cost-saving
            opportunities, contract issues, and pricing trends.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="text-lg font-semibold text-white">Bill Analysis</h2>
              <p className="mt-2 text-sm text-slate-400">
                Break down charges, usage patterns, and supplier-related costs.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="text-lg font-semibold text-white">Savings Review</h2>
              <p className="mt-2 text-sm text-slate-400">
                Compare current bill structure against better pricing opportunities.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="text-lg font-semibold text-white">Next Steps</h2>
              <p className="mt-2 text-sm text-slate-400">
                Get help deciding whether to renew, switch, or request new quotes.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/get-started"
              className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Start Review
            </Link>

            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-5 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Contact NationsNRG
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}