import type { Metadata } from 'next';
import Link from 'next/link';

interface CityPageProps {
  params: Promise<{
    city: string;
  }>;
}

function normalizeCitySlug(slug: string): string {
  return slug
    .split('-')
    .map((part) => {
      const normalized = part.trim();
      if (normalized.length === 0) {
        return '';
      }

      return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
    })
    .filter((part) => part.length > 0)
    .join(' ');
}

export async function generateMetadata(
  props: CityPageProps
): Promise<Metadata> {
  const { city } = await props.params;
  const cityName = normalizeCitySlug(city);

  return {
    title: `${cityName} Natural Gas Rates | NationsNRG`,
    description: `Compare natural gas options and request pricing assistance for businesses in ${cityName}, Florida.`,
  };
}

export default async function FloridaNaturalGasCityPage(
  props: CityPageProps
) {
  const { city } = await props.params;
  const cityName = normalizeCitySlug(city);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-8">
          <Link
            href="/natural-gas/florida"
            className="text-sm text-cyan-400 hover:text-cyan-300"
          >
            ← Back to Florida Natural Gas
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            Florida Natural Gas
          </p>

          <h1 className="text-4xl font-bold tracking-tight text-white">
            {cityName} Natural Gas Pricing
          </h1>

          <p className="mt-4 max-w-3xl text-lg text-slate-300">
            NationsNRG is preparing natural gas pricing support for businesses in{' '}
            <span className="font-semibold text-white">{cityName}, Florida</span>.
            Request a quote review and we will help evaluate available supply options,
            contract structure, and potential savings.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="text-lg font-semibold text-white">Rate Review</h2>
              <p className="mt-2 text-sm text-slate-400">
                Review current pricing structure and identify opportunities to reduce spend.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="text-lg font-semibold text-white">Contract Guidance</h2>
              <p className="mt-2 text-sm text-slate-400">
                Compare term length, renewal timing, and supplier options for your business.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="text-lg font-semibold text-white">Quote Assistance</h2>
              <p className="mt-2 text-sm text-slate-400">
                Submit your usage details and get help evaluating next-step pricing.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/get-started"
              className="inline-flex items-center justify-center rounded-lg bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Request Pricing Help
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