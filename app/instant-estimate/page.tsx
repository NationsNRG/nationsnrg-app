export default function InstantEstimate() {
  return (
    <main className="min-h-screen">
      <h1 className="text-3xl font-bold text-center py-8">
        Compare Commercial Energy Rates Instantly
      </h1>

      <div className="w-full h-[900px]">
        <iframe
          src="https://myservicecloud.net/js/widgets/commercial-shopper?promo-code=YOURCODE"
          width="100%"
          height="100%"
          style={{ border: "none" }}
        />
      </div>
    </main>
  );
}