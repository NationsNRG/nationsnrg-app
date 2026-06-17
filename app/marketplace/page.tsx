import { supabase } from "@/lib/supabase";

export default async function MarketplacePage() {
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("category");

  if (error) {
    return <div>Error loading products: {error.message}</div>;
  }

  const grouped = products?.reduce((acc: any, product: any) => {
    acc[product.category] = acc[product.category] || [];
    acc[product.category].push(product);
    return acc;
  }, {});

  return (
    <main className="max-w-6xl mx-auto py-20 px-6">
      <h1 className="text-4xl font-bold mb-12">
        NationsNRG Marketplace
      </h1>

      {grouped &&
        Object.keys(grouped).map((category) => (
          <div key={category} className="mb-16">
            <h2 className="text-2xl font-semibold mb-6 capitalize">
              {category}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {grouped[category].map((product: any) => (
                <div
                  key={product.id}
                  className="border rounded-xl p-6 shadow-sm hover:shadow-md transition"
                >
                  <h3 className="text-lg font-semibold mb-2">
                    {product.name}
                  </h3>

                  <p className="text-gray-600 text-sm mb-4">
                    {product.description}
                  </p>

                  {product.base_price && (
                    <p className="font-bold mb-4">
                      From ${product.base_price}
                    </p>
                  )}

                  <a
                    href="/upload-bill"
                    className="inline-block bg-black text-white px-4 py-2 rounded-md text-sm"
                  >
                    Request Quote
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
    </main>
  );
}