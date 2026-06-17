// components/intake/SupplierSequencePanel.tsx

import SupplierFollowupPanel from "@/components/intake/SupplierFollowupPanel";
import SupplierResponsePanel from "@/components/intake/SupplierResponsePanel";
import SupplierSequenceActions from "@/components/intake/SupplierSequenceActions";

interface SupplierSequence {
  id: string;
  supplier_entity_id: string | null;
  sequence_type: string | null;
  sequence_position: number | null;
  visibility_tier: string | null;
  package_audience: string | null;
  is_primary: boolean | null;
  hold_reason: string | null;
  metadata: unknown;
}

interface SupplierSequencePanelProps {
  dealId: string;
  supplierSequences: SupplierSequence[];
}

function getSupplierName(metadata: unknown): string | null {
  if (
    metadata &&
    typeof metadata === "object" &&
    "supplierName" in metadata &&
    typeof (metadata as { supplierName?: unknown }).supplierName === "string"
  ) {
    return (metadata as { supplierName: string }).supplierName;
  }

  return null;
}

function getFitScore(metadata: unknown): string {
  if (
    metadata &&
    typeof metadata === "object" &&
    "fitScore" in metadata &&
    typeof (metadata as { fitScore?: unknown }).fitScore === "number"
  ) {
    return String((metadata as { fitScore: number }).fitScore);
  }

  return "—";
}

export default function SupplierSequencePanel({
  dealId,
  supplierSequences,
}: SupplierSequencePanelProps) {
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-white">
        Supplier Sequences
      </h2>

      {supplierSequences.length === 0 ? (
        <p className="text-sm text-gray-400">No supplier sequences found.</p>
      ) : (
        <div className="space-y-4">
          {supplierSequences.map((sequence) => {
            const supplierName = getSupplierName(sequence.metadata);

            return (
              <div
                key={sequence.id}
                className="rounded-xl border border-gray-800 bg-black p-4"
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs uppercase text-gray-500">
                      Supplier Entity ID
                    </p>
                    <p className="text-sm font-medium text-white">
                      {sequence.supplier_entity_id ?? "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-gray-500">
                      Supplier Name
                    </p>
                    <p className="text-sm font-medium text-white">
                      {supplierName ?? "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-gray-500">
                      Sequence Position
                    </p>
                    <p className="text-sm font-medium text-white">
                      {sequence.sequence_position ?? "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-gray-500">
                      Primary
                    </p>
                    <p className="text-sm font-medium text-white">
                      {sequence.is_primary ? "Yes" : "No"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-gray-500">
                      Sequence Type
                    </p>
                    <p className="text-sm text-gray-300">
                      {sequence.sequence_type ?? "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-gray-500">
                      Visibility Tier
                    </p>
                    <p className="text-sm text-gray-300">
                      {sequence.visibility_tier ?? "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-gray-500">
                      Package Audience
                    </p>
                    <p className="text-sm text-gray-300">
                      {sequence.package_audience ?? "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-gray-500">
                      Fit Score
                    </p>
                    <p className="text-sm text-gray-300">
                      {getFitScore(sequence.metadata)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-xs uppercase text-gray-500">
                      Hold Reason
                    </p>
                    <p className="text-sm text-gray-300">
                      {sequence.hold_reason ?? "—"}
                    </p>
                  </div>

                  <SupplierSequenceActions
                    dealId={dealId}
                    sequenceId={sequence.id}
                    isPrimary={sequence.is_primary}
                    holdReason={sequence.hold_reason}
                  />

                  <SupplierFollowupPanel
                    supplierName={supplierName ?? sequence.supplier_entity_id ?? "Supplier"}
                    latestResponseType={
                      sequence.metadata &&
                      typeof sequence.metadata === "object" &&
                      "latestResponseType" in sequence.metadata &&
                      typeof (sequence.metadata as { latestResponseType?: unknown })
                        .latestResponseType === "string"
                        ? (sequence.metadata as { latestResponseType: string })
                            .latestResponseType
                        : null
                    }
                    latestResponseStatus={
                      sequence.metadata &&
                      typeof sequence.metadata === "object" &&
                      "latestResponseStatus" in sequence.metadata &&
                      typeof (sequence.metadata as { latestResponseStatus?: unknown })
                        .latestResponseStatus === "string"
                        ? (sequence.metadata as { latestResponseStatus: string })
                            .latestResponseStatus
                        : null
                    }
                    holdReason={sequence.hold_reason}
                  />

                  <SupplierResponsePanel
                    dealId={dealId}
                    sequenceId={sequence.id}
                    supplierName={supplierName ?? sequence.supplier_entity_id ?? "Supplier"}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}