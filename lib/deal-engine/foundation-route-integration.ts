// lib/deal-engine/foundation-route-integration.ts

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { seedFoundationForDeal } from "./foundation-seeding";

type DbClient = SupabaseClient<Database>;

export interface FoundationRouteIntegrationInput {
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

export async function runFoundationRouteIntegration(
  client: DbClient,
  input: FoundationRouteIntegrationInput,
) {
    return await seedFoundationForDeal(client, {
    dealId: input.dealId,
    businessName: input.businessName,
    packageReady: input.packageReady,
    requiredDocuments: input.requiredDocuments,
    blockers: input.blockers,
    requiresHumanReview: input.requiresHumanReview,
    premiumPath: input.premiumPath,
    infrastructurePath: input.infrastructurePath,
    recurringPossible: input.recurringPossible,
    bundleCandidate: input.bundleCandidate,
    confidenceScore: input.confidenceScore,
    lplReadinessScore: input.lplReadinessScore,
    nextBestAction: input.nextBestAction,
    queuePriorityScore: input.queuePriorityScore,
    routeReason: input.routeReason,
    primarySupplierEntityId: input.primarySupplierEntityId ?? null,
    demandEstimate: input.demandEstimate ?? null,
  });
}