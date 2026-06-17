export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-black">

      {/* HERO SECTION */}
      <section className="px-8 py-28 text-center bg-white">
  <div className="max-w-4xl mx-auto">

    <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-10">
      Commercial Energy Procurement,
      <br />
      Without the Guesswork.
    </h1>

    <div className="text-xl md:text-2xl text-gray-600 space-y-3 mb-10">
      <p>
        We make electricity and gas suppliers compete for your business.
      </p>
      <p>
        So you secure stronger rates and predictable contracts.
      </p>
      <p className="font-semibold text-black">
        No upfront cost. No obligation. Just competitive supplier pricing.
      </p>
    </div>

    <div className="flex justify-center gap-6">
      <a
        href="/upload-bill"
        className="bg-black text-white px-8 py-4 rounded text-lg font-semibold hover:opacity-90 transition"
      >
        Get A Complimentary Rate Analysis
      </a>

      <a
        href="/book"
        className="border border-black px-8 py-4 rounded text-lg font-semibold hover:bg-black hover:text-white transition"
      >
        Schedule Consultation
      </a>
    </div>

  </div>
</section>

<section className="bg-black text-white py-6">
  <div className="max-w-6xl mx-auto px-8 text-center text-sm md:text-base">
    Currently onboarding a limited number of new commercial accounts per month to ensure optimal supplier negotiations.
  </div>
</section>

      {/* WHO WE SERVE */}
      <section className="px-8 py-16 bg-gray-50">
        <h2 className="text-3xl font-bold text-center mb-12">
          Who We Serve
        </h2>

        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div>
            <h3 className="font-semibold text-xl mb-2">
              Commercial Property Owners
            </h3>
            <p className="text-gray-600">
              Lock in predictable energy costs across portfolios.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-xl mb-2">
              Small Businesses
            </h3>
            <p className="text-gray-600">
              Reduce overhead without changing operations.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-xl mb-2">
              Industrial Facilities
            </h3>
            <p className="text-gray-600">
              Strategic procurement for high-usage accounts.
            </p>
          </div>
        </div>
      </section>


      {/* HOW IT WORKS */}
      <section className="px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          How It Works
        </h2>

        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl mb-4">1</div>
            <p>Upload your utility bill.</p>
          </div>

          <div>
            <div className="text-4xl mb-4">2</div>
            <p>We analyze usage and negotiate supplier rates.</p>
          </div>

          <div>
            <div className="text-4xl mb-4">3</div>
            <p>You receive competitive contract options.</p>
          </div>
        </div>
      </section>


      {/* SUPPLIER SOCIAL PROOF */}
      <section className="px-8 py-20 bg-gray-50 text-center">
  <div className="max-w-6xl mx-auto">

    <h2 className="text-4xl font-bold mb-6">
      Access to 90+ Leading Energy Suppliers
    </h2>

    <p className="text-gray-600 mb-12 text-lg">
      We leverage deep market relationships across all deregulated states
      to secure competitive electricity and natural gas contracts.
    </p>

    <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-gray-700 font-semibold">
      <div>Direct Energy</div>
      <div>NRG</div>
      <div>Vistra</div>
      <div>TXU Energy</div>
      <div>Constellation</div>
      <div>ENGIE</div>
      <div>Champion Energy</div>
      <div>Hudson Energy</div>
      <div>Green Mountain</div>
      <div>And 80+ More</div>
    </div>

  </div>
</section>

      <section className="px-8 py-20">
  <div className="max-w-6xl mx-auto text-center">

    <h2 className="text-4xl font-bold mb-12">
      Examples of Client Savings
    </h2>

    <div className="grid md:grid-cols-3 gap-8">

      <div className="border p-8 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold mb-4">
          Texas Retail Location
        </h3>
        <p className="text-gray-600 mb-4">
          Annual Usage: 500,000+ kWh
        </p>
        <p className="text-3xl font-bold text-green-600">
          $24,000 Annual Savings
        </p>
      </div>

      <div className="border p-8 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold mb-4">
          Ohio Industrial Facility
        </h3>
        <p className="text-gray-600 mb-4">
          High-Load Electricity Account
        </p>
        <p className="text-3xl font-bold text-green-600">
          $65,000 Annual Savings
        </p>
      </div>

      <div className="border p-8 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold mb-4">
          Northeast Medical Facility
        </h3>
        <p className="text-gray-600 mb-4">
          Natural Gas Optimization
        </p>
        <p className="text-3xl font-bold text-green-600">
          $18,000 Annual Savings
        </p>
      </div>

    </div>

  </div>
</section>

<section className="py-16 bg-black text-white text-center">
  <div className="max-w-4xl mx-auto px-8">
    <h2 className="text-3xl md:text-4xl font-bold mb-6">
      Ready to See If You’re Overpaying?
    </h2>

    <p className="text-lg text-gray-300 mb-8">
      A complimentary rate analysis takes minutes to start and could
      reduce your annual operating expenses significantly.
    </p>

    <a
      href="/upload-bill"
      className="bg-white text-black px-8 py-4 rounded text-lg font-semibold hover:opacity-90 transition"
    >
      Start My Rate Analysis
    </a>
  </div>
</section>

<section className="px-8 py-24 bg-gray-50">
  <div className="max-w-6xl mx-auto text-center">

    <h2 className="text-4xl font-bold mb-6">
      Active Across All Deregulated Energy Markets
    </h2>

    <p className="text-gray-600 text-lg mb-14 max-w-3xl mx-auto">
      We provide electricity and natural gas procurement services
      in every U.S. state with retail energy choice.
    </p>

    <div className="grid md:grid-cols-3 gap-12 text-left">

      <div>
        <h3 className="text-xl font-semibold mb-4">
          Electricity Markets
        </h3>
        <ul className="space-y-2 text-gray-700">
          <li>Texas (ERCOT)</li>
          <li>Pennsylvania</li>
          <li>Ohio</li>
          <li>Illinois</li>
          <li>New York</li>
          <li>New Jersey</li>
          <li>Maryland</li>
          <li>Massachusetts</li>
          <li>Connecticut</li>
          <li>Rhode Island</li>
          <li>Delaware</li>
          <li>Washington D.C.</li>
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">
          Natural Gas Markets
        </h3>
        <ul className="space-y-2 text-gray-700">
          <li>Texas</li>
          <li>Pennsylvania</li>
          <li>Ohio</li>
          <li>Illinois</li>
          <li>New York</li>
          <li>New Jersey</li>
          <li>Maryland</li>
          <li>Massachusetts</li>
          <li>Michigan</li>
          <li>Indiana</li>
        </ul>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">
          Multi-Location Accounts
        </h3>
        <p className="text-gray-700 mb-4">
          Managing multiple facilities across different utility territories?
        </p>
        <p className="text-gray-700">
          We centralize procurement strategy and streamline supplier coordination
          across all deregulated regions.
        </p>
      </div>

    </div>

  </div>
</section>

<div className="mt-12 text-center">
  <p className="text-gray-600 mb-4">
    Your current supplier may not be offering the most competitive rate.
  </p>
  <a
    href="/upload-bill"
    className="font-semibold underline hover:opacity-70 transition"
  >
    Request a comparison →
  </a>
</div>

<section className="py-10 text-center">
  <div className="max-w-3xl mx-auto px-8 text-gray-600 text-sm md:text-base">
    No long-term commitments to us.  
    No service interruption.  
    No operational changes required.
  </div>
</section>

      {/* BLOG PREVIEW */}
      <section id="insights" className="px-8 py-20 bg-white">
  <div className="max-w-6xl mx-auto text-center">

    <h2 className="text-4xl font-bold mb-12">
      Market Insights
    </h2>

    <div className="grid md:grid-cols-3 gap-10 text-left">

      <div className="space-y-3">
        <h3 className="text-xl font-semibold">
          How Deregulated Energy Markets Work
        </h3>
        <p className="text-gray-600">
          Understanding supplier choice and how contract structures impact long-term energy costs.
        </p>
        <a href="#" className="font-semibold text-black hover:underline">
          Read More →
        </a>
      </div>

      <div className="space-y-3">
        <h3 className="text-xl font-semibold">
          Fixed vs Variable Energy Contracts
        </h3>
        <p className="text-gray-600">
          Evaluating pricing models and mitigating exposure to wholesale volatility.
        </p>
        <a href="#" className="font-semibold text-black hover:underline">
          Read More →
        </a>
      </div>

      <div className="space-y-3">
        <h3 className="text-xl font-semibold">
          Locking In Rates Before Peak Season
        </h3>
        <p className="text-gray-600">
          Strategic timing considerations before high-demand seasonal shifts.
        </p>
        <a href="#" className="font-semibold text-black hover:underline">
          Read More →
        </a>
      </div>

    </div>

  </div>
</section>

    </main>
  );
}