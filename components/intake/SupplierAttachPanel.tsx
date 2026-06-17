"use client";

import { useState } from "react";
import SupplierSelector from "@/components/intake/SupplierSelector";

interface SupplierAttachPanelProps {
  dealId: string;
}

type AttachResult =
  | {
      ok: true;
      supplierSequence: {
        id: string;
        supplier_entity_id: string;
        sequence_type: string;
        sequence_position: number;
        visibility_tier: string;
        package_audience: string;
        is_primary: boolean;
      };
    }
  | {
      ok: false;
      error: string;
    };

export default function SupplierAttachPanel({
  dealId,
}: SupplierAttachPanelProps) {
  const [supplierEntityId, setSupplierEntityId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [sequenceType, setSequenceType] = useState("sequential_waterfall");
  const [visibilityTier, setVisibilityTier] = useState("tier_2_qualified");
  const [packageAudience, setPackageAudience] = useState("supplier_qualified");
  const [isPrimary, setIsPrimary] = useState(true);
  const [holdReason, setHoldReason] = useState("");
  const [fitScore, setFitScore] = useState("80");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AttachResult | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        `/api/intake/deal/${dealId}/supplier-attach`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            supplierEntityId,
            supplierName,
            sequenceType,
            visibilityTier,
            packageAudience,
            isPrimary,
            holdReason: holdReason.trim() === "" ? null : holdReason.trim(),
            fitScore: fitScore.trim() === "" ? undefined : Number(fitScore),
          }),
        },
      );

      const data = (await response.json()) as
        | {
            ok: true;
            supplierSequence: {
              id: string;
              supplier_entity_id: string;
              sequence_type: string;
              sequence_position: number;
              visibility_tier: string;
              package_audience: string;
              is_primary: boolean;
            };
          }
        | {
            ok: false;
            error?: string;
          };

      if (!response.ok) {
        setResult({
          ok: false,
          error:
            "error" in data && data.error
              ? data.error
              : "Failed to attach supplier.",
        });
        return;
      }

      if (!data.ok) {
        setResult({
          ok: false,
          error: data.error ?? "Failed to attach supplier.",
        });
        return;
      }

      setResult({
        ok: true,
        supplierSequence: data.supplierSequence,
      });

      setSupplierEntityId("");
      setSupplierName("");
      setSequenceType("sequential_waterfall");
      setVisibilityTier("tier_2_qualified");
      setPackageAudience("supplier_qualified");
      setIsPrimary(true);
      setHoldReason("");
      setFitScore("80");
    } catch (error) {
      setResult({
        ok: false,
        error:
          error instanceof Error ? error.message : "Failed to attach supplier.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-white">
        Attach Supplier
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
          <SupplierSelector
            value={supplierEntityId}
            onChange={setSupplierEntityId}
            onNameChange={setSupplierName}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Supplier Entity ID
            </label>
            <input
              type="text"
              required
              value={supplierEntityId}
              onChange={(e) => setSupplierEntityId(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              placeholder="supplier_test_001"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">
            Supplier Name
          </label>
          <input
            type="text"
            required
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            placeholder="Test Supplier One"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Sequence Type
            </label>
            <select
              value={sequenceType}
              onChange={(e) => setSequenceType(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            >
              <option value="sequential_waterfall">sequential_waterfall</option>
              <option value="fallback_only">fallback_only</option>
              <option value="premium_first_look">premium_first_look</option>
              <option value="hold_until_ready">hold_until_ready</option>
              <option value="do_not_show_yet">do_not_show_yet</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Visibility Tier
            </label>
            <select
              value={visibilityTier}
              onChange={(e) => setVisibilityTier(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            >
              <option value="tier_0_internal">tier_0_internal</option>
              <option value="tier_1_teaser">tier_1_teaser</option>
              <option value="tier_2_qualified">tier_2_qualified</option>
              <option value="tier_3_execution">tier_3_execution</option>
              <option value="tier_4_premium">tier_4_premium</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Package Audience
            </label>
            <select
              value={packageAudience}
              onChange={(e) => setPackageAudience(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
            >
              <option value="internal">internal</option>
              <option value="supplier_teaser">supplier_teaser</option>
              <option value="supplier_qualified">supplier_qualified</option>
              <option value="epc">epc</option>
              <option value="lpl">lpl</option>
              <option value="buyer">buyer</option>
              <option value="negotiation">negotiation</option>
              <option value="execution">execution</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Fit Score
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={fitScore}
              onChange={(e) => setFitScore(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              placeholder="82"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              Hold Reason
            </label>
            <input
              type="text"
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="isPrimary"
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="isPrimary" className="text-sm text-gray-200">
            Set as primary supplier
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {loading ? "Attaching..." : "Attach Supplier"}
        </button>
      </form>

      {result?.ok === false ? (
        <div className="mt-4 rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-300">
          {result.error}
        </div>
      ) : null}

      {result?.ok === true ? (
        <div className="mt-4 rounded-lg border border-green-800 bg-green-950 p-4 text-sm text-green-300">
          Supplier attached at sequence position{" "}
          {result.supplierSequence.sequence_position}.
        </div>
      ) : null}
    </section>
  );
}