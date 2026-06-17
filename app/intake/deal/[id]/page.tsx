// app/intake/deal/[id]/page.tsx

import AdminNav from "@/components/admin/AdminNav";
import SupplierAttachPanel from "@/components/intake/SupplierAttachPanel";
import SupplierSequencePanel from "@/components/intake/SupplierSequencePanel";
import DealPageRefreshButton from "@/components/intake/DealPageRefreshButton";
import RankedSupplierPanel from "@/components/intake/RankedSupplierPanel";
import ReviewActionsPanel from "@/components/intake/ReviewActionsPanel";
import AutoSeedRankedSuppliersButton from "@/components/intake/AutoSeedRankedSuppliersButton";
import DealPackagePanel from "@/components/intake/DealPackagePanel";
import PackageSharePanel from "@/components/intake/PackageSharePanel";
import CounterpartyPanel from "@/components/intake/CounterpartyPanel";
import PackageShareAnalyticsPanel from "@/components/intake/PackageShareAnalyticsPanel";
import PackageVisibilityPanel from "@/components/intake/PackageVisibilityPanel";
import ShareEligibilityPanel from "@/components/intake/ShareEligibilityPanel";
import SafeSharePanel from "@/components/intake/SafeSharePanel";
import SupplierResponseAnalyticsPanel from "@/components/intake/SupplierResponseAnalyticsPanel";
import AutonomousSupplierRoutingPanel from "@/components/intake/AutonomousSupplierRoutingPanel";
import RoutingActionHistoryPanel from "@/components/intake/RoutingActionHistoryPanel";
import OpportunityTriagePanel from "@/components/intake/OpportunityTriagePanel";
import BigDealDeskPanel from "@/components/intake/BigDealDeskPanel";
import PortfolioRollupPanel from "@/components/intake/PortfolioRollupPanel";
import DealCommandCenterSummaryBar from "@/components/intake/DealCommandCenterSummaryBar";
import DealOperatingTimelineFeed from "@/components/intake/DealOperatingTimelineFeed";
import AutoProgressDealButton from "@/components/intake/AutoProgressDealButton";
import AutoProgressHistoryPanel from "@/components/intake/AutoProgressHistoryPanel";
import ContractReadinessPanel from "@/components/intake/ContractReadinessPanel";
import RequiredDocumentsPanel from "@/components/intake/RequiredDocumentsPanel";
import ContractGapsPanel from "@/components/intake/ContractGapsPanel";
import ReadinessScoreHistoryPanel from "@/components/intake/ReadinessScoreHistoryPanel";
import DocumentUploadPlaceholderPanel from "@/components/intake/DocumentUploadPlaceholderPanel";
import DocumentVerificationHistoryPanel from "@/components/intake/DocumentVerificationHistoryPanel";
import CompensationTermsPanel from "@/components/intake/CompensationTermsPanel";
import CompensationProtectionPanel from "@/components/intake/CompensationProtectionPanel";
import RetainedRightsPanel from "@/components/intake/RetainedRightsPanel";
import CompensationClaimsPanel from "@/components/intake/CompensationClaimsPanel";
import CompensationClaimHistoryPanel from "@/components/intake/CompensationClaimHistoryPanel";
import PayoutEnforcementPanel from "@/components/intake/PayoutEnforcementPanel";
import ExecutionChecklistPanel from "@/components/intake/ExecutionChecklistPanel";
import OperatorBriefPanel from "@/components/intake/OperatorBriefPanel";
import OperatorBriefEventsPanel from "@/components/intake/OperatorBriefEventsPanel";
import EpcRecommendationPanel from "@/components/intake/EpcRecommendationPanel";
import EpcSequencePanel from "@/components/intake/EpcSequencePanel";
import EpcEventsHistoryPanel from "@/components/intake/EpcEventsHistoryPanel";
import AutonomousExecutorPanel from "@/components/intake/AutonomousExecutorPanel";

interface DealReviewPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getDealReview(id: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!appUrl) {
  throw new Error("Missing NEXT_PUBLIC_APP_URL.");
}

let response: Response;

try {
  response = await fetch(
    `${appUrl}/api/intake/deal/${id}`,
    {
      cache: "no-store",
    },
  );
} catch (error) {
  throw new Error(
    error instanceof Error
      ? error.message
      : "Failed to fetch deal review.",
  );
}

if (!response.ok) {
  throw new Error(`Failed to load deal review: ${response.status}`);
}

return (await response.json()) as {
  deal: Record<string, unknown> | null;
  demandEstimate: Record<string, unknown> | null;
  orchestration: Record<string, unknown> | null;
  economicStack: Record<string, unknown> | null;
  supplierSequences: Record<string, unknown>[] | null;
  supplierRoutingDecisions: Record<string, unknown>[] | null;
};
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "—";

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return JSON.stringify(value);
}

function renderList(values: string[] | null | undefined) {
  if (!values || values.length === 0) {
    return <p className="text-sm text-gray-400">—</p>;
  }

  return (
    <ul className="space-y-1 text-sm text-gray-300">
      {values.map((value, index) => (
        <li key={index}>
  •{" "}
  {typeof value === "string"
    ? value
    : typeof value === "object" && value !== null
      ? JSON.stringify(value)
      : String(value)}
</li>
      ))}
    </ul>
  );
}

export default async function DealReviewPage({
  params,
}: DealReviewPageProps) {
  const { id } = await params;
  const data = await getDealReview(id);

  const deal = data.deal;
  const demandEstimate = data.demandEstimate;
  const orchestration = data.orchestration;
  const economicStack = data.economicStack;
  const supplierSequences = data.supplierSequences;

  return (
    <>
      <AdminNav />
      <main className="min-h-screen bg-black px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
                <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Intake Deal Review
            </h1>
            <p className="text-sm text-gray-400">Deal ID: {id}</p>
          </div>

                    <div className="flex flex-wrap items-center gap-3">
            <a
              href="/intake/deal"
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Back to List
            </a>
            <a
              href="/intake/deal/create"
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              New Deal
            </a>
            <AutoSeedRankedSuppliersButton dealId={id} />
            <AutoProgressDealButton dealId={id} />
            <DealPageRefreshButton />
          </div>
        </header>

        <ReviewActionsPanel dealId={id} />

        <DealCommandCenterSummaryBar dealId={id} />

        <OperatorBriefPanel dealId={id} />

        <AutonomousExecutorPanel dealId={id} />

        <OperatorBriefEventsPanel dealId={id} />

        <EpcRecommendationPanel dealId={id} />

        <EpcSequencePanel dealId={id} />

        <EpcEventsHistoryPanel dealId={id} />

        <DealOperatingTimelineFeed dealId={id} />

        <AutoProgressHistoryPanel dealId={id} />

        <ContractReadinessPanel dealId={id} />

        <RequiredDocumentsPanel dealId={id} />        

        <DocumentUploadPlaceholderPanel dealId={id} />

        <DocumentVerificationHistoryPanel dealId={id} />

        <ContractGapsPanel dealId={id} />        

        <ReadinessScoreHistoryPanel dealId={id} />        

        <CompensationTermsPanel dealId={id} />

        <CompensationProtectionPanel dealId={id} />

        <RetainedRightsPanel dealId={id} />

        <CompensationClaimsPanel dealId={id} />

        <CompensationClaimHistoryPanel dealId={id} />

        <PayoutEnforcementPanel dealId={id} />

        <ExecutionChecklistPanel dealId={id} />

        <DealPackagePanel dealId={id} />

        <PackageSharePanel dealId={id} />

        <PackageShareAnalyticsPanel dealId={id} />
        <CounterpartyPanel dealId={id} />

        <PackageVisibilityPanel dealId={id} />
        <ShareEligibilityPanel dealId={id} />

        <SafeSharePanel dealId={id} />

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Deal</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-gray-500">Business Name</p>
              <p className="text-sm font-medium text-white">
                {renderValue(deal?.business_name)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">State</p>
              <p className="text-sm font-medium text-white">
                {renderValue(deal?.state)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">
                Estimated Monthly Bill
              </p>
              <p className="text-sm font-medium text-white">
                {renderValue(deal?.estimated_monthly_bill)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Intake Source</p>
              <p className="text-sm font-medium text-white">
                {renderValue(deal?.intake_source)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Status</p>
              <p className="text-sm font-medium text-white">
                {renderValue(deal?.status)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500">Created At</p>
              <p className="text-sm font-medium text-white">
                {renderValue(deal?.created_at)}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Demand Estimate</h2>
          {demandEstimate ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-gray-500">
                  Estimated Annual Spend
                </p>
                <p className="text-sm font-medium text-white">
                  {renderValue(demandEstimate.estimated_annual_spend)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">
                  Estimated Annual kWh
                </p>
                <p className="text-sm font-medium text-white">
                  {renderValue(demandEstimate.estimated_annual_kwh)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">
                  Estimated Average kW
                </p>
                <p className="text-sm font-medium text-white">
                  {renderValue(demandEstimate.estimated_average_kw)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">
                  Estimated Peak kW
                </p>
                <p className="text-sm font-medium text-white">
                  {renderValue(demandEstimate.estimated_peak_kw)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">
                  Confidence Score
                </p>
                <p className="text-sm font-medium text-white">
                  {renderValue(demandEstimate.confidence_score)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">
                  Confidence Band
                </p>
                <p className="text-sm font-medium text-white">
                  {renderValue(demandEstimate.confidence_band)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Load Band</p>
                <p className="text-sm font-medium text-white">
                  {renderValue(demandEstimate.load_band)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">
                  Assumed Blended Rate
                </p>
                <p className="text-sm font-medium text-white">
                  {renderValue(demandEstimate.assumed_blended_rate_per_kwh)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No demand estimate found.</p>
          )}

          <div className="mt-6">
            <p className="mb-2 text-xs uppercase text-gray-500">Reasoning</p>
            {renderList(
              Array.isArray(demandEstimate?.reasoning)
                ? demandEstimate.reasoning
                : [],
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <SupplierAttachPanel dealId={id} />
          <RankedSupplierPanel dealId={id} />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Queues</h2>
            {Array.isArray(orchestration?.queues) &&
            orchestration.queues.length > 0 ? (
              <div className="space-y-4">
                {orchestration.queues.map((queue: Record<string, unknown>) => (
                  <div
                    key={String(queue.id)}
                    className="rounded-xl border border-gray-800 bg-black p-4"
                  >
                    <p className="text-sm font-medium text-white">
                      {String(queue.queue_type ?? "—")}
                    </p>
                    <p className="text-sm text-gray-300">
                      Priority: {String(queue.priority_score ?? "—")}
                    </p>
                    <p className="text-sm text-gray-300">
                      Reason: {String(queue.queue_reason ?? "—")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No queues found.</p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Next Best Actions</h2>
            {Array.isArray(orchestration?.nextBestActions) &&
            orchestration.nextBestActions.length > 0 ? (
              <div className="space-y-4">
                {orchestration.nextBestActions.map(
                  (action: Record<string, unknown>) => (
                    <div
                      key={String(action.id)}
                      className="rounded-xl border border-gray-800 bg-black p-4"
                    >
                      <p className="text-sm font-medium text-white">
                        {String(action.action_title ?? "—")}
                      </p>
                      <p className="text-sm text-gray-300">
                        {String(action.action_description ?? "—")}
                      </p>
                      <p className="text-sm text-gray-300">
                        Confidence: {String(action.confidence_score ?? "—")}
                      </p>
                      <p className="text-sm text-gray-300">
                        Human Review:{" "}
                        {action.requires_human_review ? "Yes" : "No"}
                      </p>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                No next best actions found.
              </p>
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Tasks</h2>
            {Array.isArray(orchestration?.tasks) &&
            orchestration.tasks.length > 0 ? (
              <div className="space-y-4">
                {orchestration.tasks.map((task: Record<string, unknown>) => (
                  <div
                    key={String(task.id)}
                    className="rounded-xl border border-gray-800 bg-black p-4"
                  >
                    <p className="text-sm font-medium text-white">
                      {String(task.task_title ?? "—")}
                    </p>
                    <p className="text-sm text-gray-300">
                      Type: {String(task.task_type ?? "—")}
                    </p>
                    <p className="text-sm text-gray-300">
                      Status: {String(task.task_status ?? "—")}
                    </p>
                    <p className="text-sm text-gray-300">
                      Owner: {String(task.owner_type ?? "—")}
                    </p>
                    <p className="text-sm text-gray-300">
                      {String(task.task_description ?? "—")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No tasks found.</p>
            )}
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Blockers</h2>
            {Array.isArray(orchestration?.blockers) &&
            orchestration.blockers.length > 0 ? (
              <div className="space-y-4">
                {orchestration.blockers.map(
                  (blocker: Record<string, unknown>) => (
                    <div
                      key={String(blocker.id)}
                      className="rounded-xl border border-gray-800 bg-black p-4"
                    >
                      <p className="text-sm font-medium text-white">
                        {String(blocker.blocker_type ?? "—")}
                      </p>
                      <p className="text-sm text-gray-300">
                        Severity: {String(blocker.severity ?? "—")}
                      </p>
                      <p className="text-sm text-gray-300">
                        Owner: {String(blocker.owner_type ?? "—")}
                      </p>
                      <p className="text-sm text-gray-300">
                        {String(blocker.unblock_condition ?? "—")}
                      </p>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No blockers found.</p>
            )}
          </div>
        </section>

                <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-white">
              Economic Stack
            </h2>
            {economicStack ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-300">
                  <span className="font-medium text-white">Stack Type:</span>{" "}
                  {String(economicStack.stack_type ?? "—")}
                </p>
                <p className="text-sm text-gray-300">
                  <span className="font-medium text-white">
                    Primary Transaction Model:
                  </span>{" "}
                  {String(economicStack.primary_transaction_model ?? "—")}
                </p>
                <p className="text-sm text-gray-300">
                  <span className="font-medium text-white">
                    Compensation Attachment:
                  </span>{" "}
                  {String(economicStack.compensation_attachment_status ?? "—")}
                </p>

                <div>
                  <p className="mb-2 text-xs uppercase text-gray-500">
                    Secondary Layers
                  </p>
                  {renderList(
                    Array.isArray(economicStack.secondary_layers)
                      ? economicStack.secondary_layers.map(String)
                      : [],
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase text-gray-500">
                    Tertiary Layers
                  </p>
                  {renderList(
                    Array.isArray(economicStack.tertiary_layers)
                      ? economicStack.tertiary_layers.map(String)
                      : [],
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No economic stack found.</p>
            )}
          </div>

                              <div className="space-y-6">
            <SupplierResponseAnalyticsPanel dealId={id} />

            <AutonomousSupplierRoutingPanel
              dealId={id}
              decisions={
                Array.isArray(data.supplierRoutingDecisions)
                  ? data.supplierRoutingDecisions
                      .map((decision) => {
                        const priority: "low" | "medium" | "high" =
                          decision.priority === "low" ||
                          decision.priority === "medium" ||
                          decision.priority === "high"
                            ? decision.priority
                            : "medium";

                        return {
                          action:
                            typeof decision.action === "string" ? decision.action : "",
                          reason:
                            typeof decision.reason === "string" ? decision.reason : "",
                          targetSequenceId:
                            typeof decision.targetSequenceId === "string"
                              ? decision.targetSequenceId
                              : null,
                          targetSupplierEntityId:
                            typeof decision.targetSupplierEntityId === "string"
                              ? decision.targetSupplierEntityId
                              : null,
                          priority,
                        };
                      })
                      .filter((decision) => decision.action.length > 0)
                  : []
              }
            />

            <RoutingActionHistoryPanel dealId={id} />

            <OpportunityTriagePanel dealId={id} />

            <BigDealDeskPanel dealId={id} />

            <PortfolioRollupPanel dealId={id} />

            <SupplierSequencePanel
              dealId={id}
              supplierSequences={
              Array.isArray(supplierSequences)
                ? supplierSequences.map((sequence: Record<string, unknown>) => ({
                    id: String(sequence.id),
                    supplier_entity_id:
                      typeof sequence.supplier_entity_id === "string"
                        ? sequence.supplier_entity_id
                        : null,
                    sequence_type:
                      typeof sequence.sequence_type === "string"
                        ? sequence.sequence_type
                        : null,
                    sequence_position:
                      typeof sequence.sequence_position === "number"
                        ? sequence.sequence_position
                        : null,
                    visibility_tier:
                      typeof sequence.visibility_tier === "string"
                        ? sequence.visibility_tier
                        : null,
                    package_audience:
                      typeof sequence.package_audience === "string"
                        ? sequence.package_audience
                        : null,
                    is_primary:
                      typeof sequence.is_primary === "boolean"
                        ? sequence.is_primary
                        : null,
                    hold_reason:
                      typeof sequence.hold_reason === "string"
                        ? sequence.hold_reason
                        : null,
                    metadata:
                      typeof sequence.metadata === "object" &&
                      sequence.metadata !== null
                        ? sequence.metadata
                        : null,
                  }))
                : []
            }
          />
          </div>
        </section>
      </div>
    </main>
    </>
  );
}