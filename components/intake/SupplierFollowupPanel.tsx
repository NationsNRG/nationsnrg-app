"use client";

interface SupplierFollowupPanelProps {
  supplierName: string;
  latestResponseType: string | null;
  latestResponseStatus: string | null;
  holdReason: string | null;
}

function buildFollowupGuidance(params: {
  latestResponseType: string | null;
  latestResponseStatus: string | null;
  holdReason: string | null;
}): string[] {
  const guidance: string[] = [];

  if (params.latestResponseType === "request_for_info") {
    guidance.push("Collect and send the requested documents or data set.");
    guidance.push("Do not escalate until missing package inputs are resolved.");
  }

  if (params.latestResponseType === "decline") {
    guidance.push("Demote this supplier and move to the next ranked fallback.");
  }

  if (params.latestResponseType === "non_starter") {
    guidance.push("Mark this path as non-viable and suppress repeat outreach.");
  }

  if (params.latestResponseType === "counter") {
    guidance.push("Review the supplier counter and compare against target economics.");
  }

  if (params.latestResponseType === "term_revision") {
    guidance.push("Update package assumptions and re-evaluate fit before proceeding.");
  }

  if (params.latestResponseStatus === "pending_followup") {
    guidance.push("Create a follow-up touchpoint and set a response deadline.");
  }

  if (params.holdReason) {
    guidance.push(`Current hold reason: ${params.holdReason}`);
  }

  if (guidance.length === 0) {
    guidance.push("No special follow-up logic triggered yet.");
  }

  return guidance;
}

export default function SupplierFollowupPanel({
  supplierName,
  latestResponseType,
  latestResponseStatus,
  holdReason,
}: SupplierFollowupPanelProps) {
  const guidance = buildFollowupGuidance({
    latestResponseType,
    latestResponseStatus,
    holdReason,
  });

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
      <h3 className="mb-2 text-lg font-semibold text-white">
        Follow-Up Workflow — {supplierName}
      </h3>
      <p className="mb-4 text-sm text-gray-400">
        System guidance based on the latest supplier posture.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-black p-4">
          <p className="text-xs uppercase text-gray-500">Latest Type</p>
          <p className="mt-2 text-sm text-gray-300">
            {latestResponseType ?? "—"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-black p-4">
          <p className="text-xs uppercase text-gray-500">Latest Status</p>
          <p className="mt-2 text-sm text-gray-300">
            {latestResponseStatus ?? "—"}
          </p>
        </div>

        <div className="rounded-xl border border-gray-800 bg-black p-4">
          <p className="text-xs uppercase text-gray-500">Hold Reason</p>
          <p className="mt-2 text-sm text-gray-300">{holdReason ?? "—"}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-gray-800 bg-black p-4">
        <p className="mb-3 text-sm font-semibold text-white">
          Suggested Next Moves
        </p>
        <ul className="space-y-2 text-sm text-gray-300">
          {guidance.map((item, index) => (
            <li key={`${item}-${index}`}>• {item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}