"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export default function UploadBillPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    state: "",
    city: "",
    product_type: "",
    monthly_usage: "",
    bill_file: null as File | null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const usage = Number(form.monthly_usage);

    let assigned_agent = "auto_pool";
    let status = "new";

    if (form.product_type === "natural_gas") {
      assigned_agent = "owner_review";
    }

    if (form.product_type === "electricity" && usage > 75000) {
      assigned_agent = "owner_review";
    }

    let bill_id: string | null = null;
    let bill_url: string | null = null;

    console.log("Uploaded File:", form.bill_file);

    /* ---------- FILE UPLOAD ---------- */

    if (form.bill_file) {
      const file = form.bill_file;

      const allowedTypes = ["pdf", "jpg", "jpeg", "png"];
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (!ext || !allowedTypes.includes(ext)) {
        setError("Invalid file type. Please upload PDF, JPG, or PNG.");
        setLoading(false);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("File too large. Max size is 10MB.");
        setLoading(false);
        return;
      }

      const safeName = crypto.randomUUID();
      const filePath = `${safeName}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("utility-bills")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload Error:", uploadError);
        setError(uploadError.message);
        setLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("utility-bills")
        .getPublicUrl(filePath);

      bill_url = publicUrlData.publicUrl;

      const { data: billData, error: billError } = await supabase
        .from("bills")
        .insert([
          {
            file_url: bill_url,
          },
        ])
        .select()
        .single();

      if (billError) {
        console.error("Bill Insert Error:", billError);
        setError(billError.message);
        setLoading(false);
        return;
      }

      bill_id = billData.id;
    }

    /* ---------- CREATE LEAD ---------- */

    const { error: leadError } = await supabase.from("leads").insert([
      {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        state: form.state,
        city: form.city,
        product_type: form.product_type,
        monthly_usage: usage,
        assigned_agent,
        status,
        bill_id,
      },
    ]);

    if (leadError) {
      console.error("Lead Insert Error:", leadError);
      setError(leadError.message);
      setLoading(false);
      return;
    }

    /* ---------- GOOGLE ANALYTICS EVENT ---------- */

    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "generate_lead", {
        event_category: "engagement",
        event_label: "utility_bill_submission",
      });
    }

    router.push("/thank-you");
  };

  return (
    <main className="max-w-2xl mx-auto py-20 px-6">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-4">
          Get A Complimentary Rate Analysis
        </h1>

        <p className="text-gray-600 text-lg">
          Would you like energy suppliers competing for your business?
        </p>

        <p className="text-gray-600">
          The process starts with just a copy of your most recent utility bill.
        </p>
      </div>

      {/* Pain Point Section */}
      <div className="bg-gray-50 p-6 rounded mb-10 text-sm text-gray-700">
        <p className="mb-2 font-semibold">Are you currently:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Unsure if you're paying competitive rates?</li>
          <li>Concerned about future energy price increases?</li>
          <li>Locked into a contract you haven’t reviewed recently?</li>
          <li>Managing multiple locations with unpredictable costs?</li>
        </ul>
        <p className="mt-4">
          If you answered yes to any of these, a rate analysis can identify
          immediate opportunities.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="first_name"
          placeholder="First Name"
          onChange={handleChange}
          required
          className="w-full border p-3 rounded"
        />

        <input
          name="last_name"
          placeholder="Last Name"
          onChange={handleChange}
          required
          className="w-full border p-3 rounded"
        />

        <input
          name="email"
          type="email"
          placeholder="Business Email"
          onChange={handleChange}
          required
          className="w-full border p-3 rounded"
        />

        <input
          name="phone"
          placeholder="Phone Number"
          onChange={handleChange}
          className="w-full border p-3 rounded"
        />

        <input
          name="city"
          placeholder="City"
          onChange={handleChange}
          className="w-full border p-3 rounded"
        />

        <input
          name="state"
          placeholder="State"
          onChange={handleChange}
          className="w-full border p-3 rounded"
        />

        <select
          name="product_type"
          onChange={handleChange}
          required
          className="w-full border p-3 rounded"
        >
          <option value="">Select Energy Type</option>
          <option value="electricity">Electricity</option>
          <option value="natural_gas">Natural Gas</option>
          <option value="both">Electricity & Natural Gas</option>
        </select>

        <input
          name="monthly_usage"
          type="number"
          placeholder="Average Monthly Usage (kWh or Therms)"
          onChange={handleChange}
          required
          className="w-full border p-3 rounded"
        />

        <div>
          <label className="block text-sm font-medium mb-1">
            Upload Utility Bill (PDF or Image)
          </label>

          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) =>
              setForm({
                ...form,
                bill_file: e.target.files ? e.target.files[0] : null,
              })
            }
            className="w-full border p-3 rounded"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white p-4 rounded text-lg font-semibold"
        >
          {loading ? "Analyzing..." : "Start My Complimentary Rate Analysis"}
        </button>

        {error && <p className="text-red-500">{error}</p>}
      </form>

      {/* Authority Section */}
      <div className="mt-12 text-sm text-gray-600">
        <p className="font-semibold mb-2">What Happens Next?</p>
        <ul className="list-disc list-inside space-y-1">
          <li>We analyze your current usage and pricing structure.</li>
          <li>We scour a network of 90+ energy suppliers.</li>
          <li>We evaluate pricing, terms, and contract conditions.</li>
          <li>We recommend the best-fit supplier and rate.</li>
          <li>We oversee paperwork and supplier transition.</li>
        </ul>
      </div>
    </main>
  );
}