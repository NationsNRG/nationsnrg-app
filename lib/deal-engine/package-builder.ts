// lib/deal-engine/package-builder.ts

interface DealRecord {
  id: string;
  business_name?: string | null;
  state?: string | null;
  estimated_monthly_bill?: number | null;
  status?: string | null;
  intake_source?: string | null;
  created_at?: string | null;
}

interface DemandEstimateRecord {
  estimated_annual_spend?: number | null;
  estimated_annual_kwh?: number | null;
  estimated_average_kw?: number | null;
  estimated_peak_kw?: number | null;
  confidence_score?: number | null;
  confidence_band?: string | null;
  load_band?: string | null;
  assumed_blended_rate_per_kwh?: number | null;
  reasoning?: string[] | null;
}

interface EconomicStackRecord {
  stack_type?: string | null;
  primary_transaction_model?: string | null;
  secondary_layers?: string[] | null;
  tertiary_layers?: string[] | null;
  compensation_attachment_status?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface SupplierSequenceRecord {
  supplier_entity_id?: string | null;
  sequence_type?: string | null;
  sequence_position?: number | null;
  visibility_tier?: string | null;
  package_audience?: string | null;
  is_primary?: boolean | null;
  hold_reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface BuildDealPackageInput {
  deal: DealRecord;
  demandEstimate: DemandEstimateRecord | null;
  economicStack: EconomicStackRecord | null;
  supplierSequences: SupplierSequenceRecord[];
  packageType: "teaser" | "full";
}

export interface BuildDealPackageResult {
  title: string;
  summary: string;
  audience: "supplier";
  payload: Record<string, unknown>;
}

function safeArray(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

export function buildDealPackage(
  input: BuildDealPackageInput,
): BuildDealPackageResult {
  const deal = input.deal;
  const demand = input.demandEstimate;
  const economic = input.economicStack;

  const title =
    input.packageType === "teaser"
      ? `Teaser Package — ${deal.business_name ?? "Untitled Deal"}`
      : `Full Package — ${deal.business_name ?? "Untitled Deal"}`;

  const summary =
    input.packageType === "teaser"
      ? "Sanitized commercial teaser for initial partner review."
      : "Full internal/shareable package with demand and economics context.";

  const commonPayload: Record<string, unknown> = {
    dealId: deal.id,
    businessName:
      input.packageType === "teaser"
        ? "Confidential Commercial Opportunity"
        : deal.business_name ?? null,
    state: deal.state ?? null,
    estimatedMonthlyBill: deal.estimated_monthly_bill ?? null,
    status: deal.status ?? null,
    intakeSource: deal.intake_source ?? null,
    createdAt: deal.created_at ?? null,
    demandEstimate: demand
      ? {
          estimatedAnnualSpend: demand.estimated_annual_spend ?? null,
          estimatedAnnualKwh:
            input.packageType === "teaser"
              ? null
              : demand.estimated_annual_kwh ?? null,
          estimatedAverageKw:
            input.packageType === "teaser"
              ? null
              : demand.estimated_average_kw ?? null,
          estimatedPeakKw: demand.estimated_peak_kw ?? null,
          confidenceScore: demand.confidence_score ?? null,
          confidenceBand: demand.confidence_band ?? null,
          loadBand: demand.load_band ?? null,
          assumedBlendedRatePerKwh:
            input.packageType === "teaser"
              ? null
              : demand.assumed_blended_rate_per_kwh ?? null,
          reasoning:
            input.packageType === "teaser"
              ? []
              : Array.isArray(demand.reasoning)
              ? demand.reasoning
              : [],
        }
      : null,
    economicStack: economic
      ? {
          stackType: economic.stack_type ?? null,
          primaryTransactionModel:
            input.packageType === "teaser"
              ? null
              : economic.primary_transaction_model ?? null,
          secondaryLayers: safeArray(economic.secondary_layers),
          tertiaryLayers:
            input.packageType === "teaser"
              ? []
              : safeArray(economic.tertiary_layers),
          compensationAttachmentStatus:
            input.packageType === "teaser"
              ? null
              : economic.compensation_attachment_status ?? null,
        }
      : null,
    supplierContext:
      input.packageType === "teaser"
        ? {
            primarySupplierAttached:
              input.supplierSequences.some(
                (sequence) => sequence.is_primary === true,
              ) || false,
          }
        : {
            supplierSequences: input.supplierSequences.map((sequence) => ({
              supplierEntityId: sequence.supplier_entity_id ?? null,
              sequenceType: sequence.sequence_type ?? null,
              sequencePosition: sequence.sequence_position ?? null,
              visibilityTier: sequence.visibility_tier ?? null,
              packageAudience: sequence.package_audience ?? null,
              isPrimary: sequence.is_primary ?? false,
              holdReason: sequence.hold_reason ?? null,
            })),
          },
  };

  return {
    title,
    summary,
    audience: "supplier",
    payload: commonPayload,
  };
}