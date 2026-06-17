// lib/deal-engine/foundation-seeding.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";
import {
  buildFoundationControlDecision,
  buildFoundationEconomicDecision,
  buildFoundationLplDecision,
  buildFoundationPortfolioDecision,
  buildFoundationRiskDecision,
  buildFoundationSupplierStrategyDecision,
} from "./foundation-decisions";
import {
  createFoundationBlocker,
  createFoundationNextBestAction,
  createFoundationQueue,
  createFoundationSupplierSequence,
  createFoundationTask,
  upsertFoundationEconomicStack,
} from "./foundation-persistence";

type DbClient = SupabaseClient<Database>;

interface FoundationSeedingInput {
  dealId: string;
  businessName: string | null;
  packageReady: boolean;
  requiredDocuments: string[];
  blockers: string[];
  requiresHumanReview: boolean;
  premiumPath: boolean;
  infrastructurePath: boolean;
  recurringPossible: boolean;
  bundleCandidate: boolean;
  confidenceScore: number;
  lplReadinessScore: number;
  nextBestAction: string;
  queuePriorityScore: number;
  routeReason: string | null;
  primarySupplierEntityId?: string | null;
  demandEstimate?: {
    estimatedAnnualSpend: number;
    estimatedAnnualKwh: number;
    estimatedAverageKw: number;
    estimatedPeakKw: number;
    confidenceScore: number;
    confidenceBand: "low" | "medium" | "high";
    loadBand:
      | "micro"
      | "small_commercial"
      | "mid_commercial"
      | "large_commercial"
      | "infrastructure_candidate";
    assumedBlendedRatePerKwh: number;
  } | null;
}

interface FoundationSeedingResult {
  queueId: string;
  taskIds: string[];
  blockerIds: string[];
  nextBestActionId: string;
  supplierSequenceId: string | null;
  economicStackDealId: string;
  controlDecision: ReturnType<typeof buildFoundationControlDecision>;
  supplierStrategyDecision: ReturnType<typeof buildFoundationSupplierStrategyDecision>;
  economicDecision: ReturnType<typeof buildFoundationEconomicDecision>;
  lplDecision: ReturnType<typeof buildFoundationLplDecision>;
  portfolioDecision: ReturnType<typeof buildFoundationPortfolioDecision>;
  riskDecision: ReturnType<typeof buildFoundationRiskDecision>;
}

function buildEconomicMetadata(params: {
  lplDecision: ReturnType<typeof buildFoundationLplDecision>;
  portfolioDecision: ReturnType<typeof buildFoundationPortfolioDecision>;
  riskDecision: ReturnType<typeof buildFoundationRiskDecision>;
  routeReason: string | null;
  demandEstimate?: FoundationSeedingInput["demandEstimate"];
}): Json {
  return {
    lplCandidateStatus: params.lplDecision.candidateStatus,
    lplReadinessScore: params.lplDecision.readinessScore,
    lplFallbackPath: params.lplDecision.fallbackPath,
    portfolioDecision: params.portfolioDecision.decision,
    portfolioValueScore: params.portfolioDecision.portfolioValueScore,
    portfolioHoldReason: params.portfolioDecision.holdReason,
    portfolioReleaseTrigger: params.portfolioDecision.releaseTrigger,
    riskType: params.riskDecision.riskType,
    riskScore: params.riskDecision.riskScore,
    riskReviewRequired: params.riskDecision.reviewRequired,
    routeReason: params.routeReason,
    demandEstimate: params.demandEstimate ?? null,
  };
}

export async function seedFoundationForDeal(
  client: DbClient,
  input: FoundationSeedingInput,
): Promise<FoundationSeedingResult> {
  const controlDecision = buildFoundationControlDecision({
    requiresHumanReview: input.requiresHumanReview,
    packageReady: input.packageReady,
    premiumPath: input.premiumPath,
  });

  const supplierStrategyDecision = buildFoundationSupplierStrategyDecision({
    premiumPath: input.premiumPath,
    packageReady: input.packageReady,
  });

  const economicDecision = buildFoundationEconomicDecision({
    premiumPath: input.premiumPath,
    infrastructurePath: input.infrastructurePath,
    recurringPossible: input.recurringPossible,
  });

  const lplDecision = buildFoundationLplDecision({
    premiumPath: input.premiumPath,
    packageReady: input.packageReady,
    readinessScore: input.lplReadinessScore,
  });

  const portfolioDecision = buildFoundationPortfolioDecision({
    bundleCandidate: input.bundleCandidate,
    premiumPath: input.premiumPath,
  });

  const riskDecision = buildFoundationRiskDecision({
    packageReady: input.packageReady,
    confidenceScore: input.confidenceScore,
  });

    const queueId = await createFoundationQueue(client, {
    dealId: input.dealId,
    queueType: input.requiresHumanReview
      ? "review"
      : input.premiumPath
      ? "escalation"
      : "qualification",
    priorityScore: input.queuePriorityScore,
    queueReason: input.routeReason ?? "Initial foundation seeding",
    metadata: {
      packageAudience: controlDecision.packageAudience,
      disclosureTier: controlDecision.disclosureTier,
      releaseHeld: controlDecision.releaseHeld,
      demandEstimate: input.demandEstimate ?? null,
    } satisfies Json,
  });

  const taskIds: string[] = [];

  taskIds.push(
    await createFoundationTask(client, {
      dealId: input.dealId,
      taskType: input.requiresHumanReview ? "operator" : "system",
      taskTitle: input.requiresHumanReview
        ? "Review deal posture"
        : "Continue automated progression",
      taskDescription: input.nextBestAction,
      ownerType: input.requiresHumanReview ? "operator" : "system",
      ownerIdentifier: null,
      dueAt: null,
      metadata: {
        routeReason: input.routeReason,
        premiumPath: input.premiumPath,
        demandEstimate: input.demandEstimate ?? null,
      } satisfies Json,
    }),
  );

  if (input.premiumPath) {
    taskIds.push(
      await createFoundationTask(client, {
        dealId: input.dealId,
        taskType: "supervisory",
        taskTitle: "Review premium escalation posture",
        taskDescription: "Confirm premium path timing, disclosure posture, and compensation readiness.",
        ownerType: "premium_review_desk",
        ownerIdentifier: null,
        dueAt: null,
        metadata: {
          lplCandidateStatus: lplDecision.candidateStatus,
          lplReadinessScore: lplDecision.readinessScore,
        } satisfies Json,
      }),
    );
  }

  const blockerIds: string[] = [];

  if (input.requiredDocuments.length > 0 || input.blockers.length > 0 || !input.packageReady) {
    blockerIds.push(
      await createFoundationBlocker(client, {
        dealId: input.dealId,
        blockerType: "missing_required_docs",
        severity: 3,
        ownerType: "operator",
        unblockCondition: "Required documents are collected and package is refreshed.",
        metadata: {
          requiredDocuments: input.requiredDocuments,
          blockers: input.blockers,
        } satisfies Json,
      }),
    );
  }

  if (riskDecision.reviewRequired) {
    blockerIds.push(
      await createFoundationBlocker(client, {
        dealId: input.dealId,
        blockerType: "counterparty_risk_flag",
        severity: 4,
        ownerType: "risk_engine",
        unblockCondition: "Risk is reviewed and cleared for progression.",
        metadata: {
          riskType: riskDecision.riskType,
          riskScore: riskDecision.riskScore,
          notes: riskDecision.notes,
        } satisfies Json,
      }),
    );
  }

  const nextBestActionId = await createFoundationNextBestAction(client, {
    dealId: input.dealId,
    actionTitle: input.nextBestAction,
    actionDescription: input.routeReason ?? "Initial seeded action",
    confidenceScore: Math.max(0, Math.min(100, input.confidenceScore)),
    requiresHumanReview: input.requiresHumanReview,
    sourceEngine: "foundation_seeding",
    metadata: {
      premiumPath: input.premiumPath,
      packageReady: input.packageReady,
      demandEstimate: input.demandEstimate ?? null,
    } satisfies Json,
  });

  let supplierSequenceId: string | null = null;

  if (input.primarySupplierEntityId) {
    supplierSequenceId = await createFoundationSupplierSequence(client, {
      dealId: input.dealId,
      supplierEntityId: input.primarySupplierEntityId,
      sequenceType: supplierStrategyDecision.sequenceType,
      sequencePosition: 1,
      visibilityTier: supplierStrategyDecision.visibilityTier,
      packageAudience: supplierStrategyDecision.packageAudience,
      isPrimary: true,
      holdReason: supplierStrategyDecision.holdReason,
      metadata: {
        seededBy: "foundation_seeding",
      } satisfies Json,
    });
  }

  const economicStackDealId = await upsertFoundationEconomicStack(client, {
    dealId: input.dealId,
    stackType: economicDecision.stackType,
    primaryTransactionModel: economicDecision.primaryTransactionModel,
    secondaryLayers: economicDecision.secondaryLayers,
    tertiaryLayers: economicDecision.tertiaryLayers,
    compensationAttachmentStatus: economicDecision.compensationAttachmentStatus,
    retainedRights: [],
    marginProtectionFlags: [],
    metadata: buildEconomicMetadata({
      lplDecision,
      portfolioDecision,
      riskDecision,
      routeReason: input.routeReason,
      demandEstimate: input.demandEstimate ?? null,
    }),
  });

  return {
    queueId,
    taskIds,
    blockerIds,
    nextBestActionId,
    supplierSequenceId,
    economicStackDealId,
    controlDecision,
    supplierStrategyDecision,
    economicDecision,
    lplDecision,
    portfolioDecision,
    riskDecision,
  };
}