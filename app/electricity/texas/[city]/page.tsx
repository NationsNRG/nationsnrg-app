import { Metadata } from "next";

type Props = {
  params: Promise<{ city: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { city } = await params;

  const formattedCity = city
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    title: `${formattedCity} Commercial Electricity Rates | NationsNRG`,
    description: `Compare commercial electricity rates in ${formattedCity}, Texas. Upload your bill and receive competitive fixed-rate options for your business.`,
  };
}

export default async function CityPage({ params }: Props) {
  const { city } = await params;

  const formattedCity = city
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <main className="max-w-4xl mx-auto py-20 px-6">
      <h1 className="text-4xl font-bold mb-6">
        {formattedCity} Commercial Electricity Rates
      </h1>

      <p className="text-lg mb-8">
        NationsNRG helps businesses in {formattedCity}, Texas compare
        competitive fixed electricity rates from trusted suppliers.
      </p>

      <div className="border p-6 rounded-lg shadow-sm">
        <p className="mb-4 font-semibold">
          Get a Custom Rate Quote
        </p>
        <p>
          Upload your latest electricity bill and receive
          supplier pricing options within 24 hours.
        </p>
      </div>
    </main>
  );
}