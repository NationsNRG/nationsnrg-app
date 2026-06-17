import Link from "next/link";

export const metadata = {
  title: "Commercial Energy Audit | NationsNRG",
  description:
    "Upload your electricity or gas bill and see if your business is overpaying. NationsNRG compares suppliers and negotiates better energy contracts for commercial businesses.",
};

export default function BusinessEnergyAudit() {
  return (
    <main className="bg-white text-gray-900">

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">

        <h1 className="text-5xl font-bold mb-6 leading-tight">
          Stop Overpaying For Commercial Electricity
        </h1>

        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Upload your latest utility bill and our system will analyze your
          usage and compare supplier rates to find potential savings.
        </p>

        <Link
          href="/upload-bill"
          className="bg-black text-white px-10 py-5 rounded-lg text-lg font-semibold hover:opacity-90 transition"
        >
          Upload Your Utility Bill
        </Link>

      </section>

      {/* TRUST */}
      <section className="bg-gray-50 py-16">

        <div className="max-w-5xl mx-auto text-center px-6">

          <h2 className="text-2xl font-semibold mb-6">
            Trusted By Commercial Businesses
          </h2>

          <p className="text-gray-600">
            Restaurants • Gyms • Retail Chains • Multi-Location Franchises
          </p>

        </div>

      </section>

      {/* SAVINGS */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">

        <h2 className="text-3xl font-bold mb-6">
          Businesses Often Overpay 10–30% On Energy
        </h2>

        <p className="text-gray-600 mb-10">
          Many companies stay on default utility rates long after contracts
          expire. NationsNRG compares supplier offers to identify better
          contract pricing.
        </p>

      </section>

      {/* WHO WE HELP */}

      <section className="bg-gray-50 py-20">

        <div className="max-w-6xl mx-auto px-6">

          <h2 className="text-3xl font-bold text-center mb-12">
            Who We Help
          </h2>

          <div className="grid md:grid-cols-3 gap-8 text-center">

            <div>
              <h3 className="font-semibold text-lg mb-2">
                Restaurants & Fast Food
              </h3>
              <p className="text-gray-600">
                High refrigeration and kitchen loads often create major
                savings opportunities.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">
                Gyms & Fitness Centers
              </h3>
              <p className="text-gray-600">
                HVAC and long operating hours make energy optimization
                critical.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">
                Retail Chains
              </h3>
              <p className="text-gray-600">
                Multi-location stores can secure better supplier contracts
                with aggregated usage.
              </p>
            </div>

          </div>

        </div>

      </section>

      {/* HOW IT WORKS */}

      <section className="max-w-6xl mx-auto px-6 py-20">

        <h2 className="text-3xl font-bold text-center mb-12">
          How It Works
        </h2>

        <div className="grid md:grid-cols-3 gap-10 text-center">

          <div>
            <h3 className="font-semibold text-lg mb-2">1. Upload Your Bill</h3>
            <p className="text-gray-600">
              Provide a recent electricity or natural gas bill for analysis.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">2. Usage Analysis</h3>
            <p className="text-gray-600">
              Our system reviews consumption, rates, and supplier options.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">3. Savings Proposal</h3>
            <p className="text-gray-600">
              If savings are available, we present a supplier contract option.
            </p>
          </div>

        </div>

      </section>

      {/* FINAL CTA */}

      <section className="bg-black text-white py-20 text-center">

        <h2 className="text-3xl font-bold mb-6">
          Find Out If Your Business Is Overpaying
        </h2>

        <Link
          href="/upload-bill"
          className="bg-white text-black px-10 py-5 rounded-lg font-semibold text-lg"
        >
          Upload Your Utility Bill
        </Link>

      </section>

    </main>
  );
}