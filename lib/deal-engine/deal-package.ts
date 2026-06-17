// lib/deal-engine/deal-package.ts

import type {
  DealPackageBuildInput,
  DealPackageBuildOutput,
  JsonObject,
} from "./types";
import { parseDealPackageBuildInput } from "./validation";

function buildExecutiveSummary(input: DealPackageBuildInput): string | null {
  const parts: string[] = [];

  parts.push(
    `Deal ${input.deal.dealCode} is a ${input.opportunity.opportunityType} opportunity currently in ${input.deal.status} status.`,
  );

  if (input.infrastructureAssessment?.infrastructureFlag) {
    parts.push(
      `Infrastructure signals were detected with class ${input.infrastructureAssessment.infrastructureClass}.`,
    );
  }

  if (input.demandEstimate?.estimatedPeakMw != null) {
    parts.push(
      `Estimated peak demand is ${input.demandEstimate.estimatedPeakMw.toFixed(3)} MW.`,
    );
  }

  if (input.monetizationProfile?.monetizationProfile) {
    parts.push(
      `Primary monetization profile is ${input.monetizationProfile.monetizationProfile}.`,
    );
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

function normalizeObject(input?: JsonObject | null): JsonObject {
  return input ?? {};
}

export function buildDealPackage(
  rawInput: unknown,
): DealPackageBuildOutput {
  const input = parseDealPackageBuildInput(rawInput);

  const blockers = [...input.opportunity.blockerSummary];
  const requiredDocuments = [...input.opportunity.requiredDocuments];
  const nextBestActions =
    input.nextBestActions && input.nextBestActions.length > 0
      ? [...input.nextBestActions]
      : input.deal.nextBestAction
      ? [input.deal.nextBestAction]
      : [];

  const confidenceNotes = [...(input.confidenceNotes ?? [])];

  if (input.demandEstimate?.mwConfidenceScore != null) {
    confidenceNotes.push(
      `Demand estimation confidence score: ${input.demandEstimate.mwConfidenceScore}.`,
    );
  }

  if (input.infrastructureAssessment?.autoRouteLplEligible) {
    confidenceNotes.push(
      `Auto-routing to LPL was triggered by the embedded origination engine.`,
    );
  }

  return {
    title: `${input.deal.dealCode} — ${input.deal.title}`,
    executiveSummary: buildExecutiveSummary(input),
    opportunitySummary: {
      title: input.opportunity.title,
      description: input.opportunity.description,
      opportunityType: input.opportunity.opportunityType,
      opportunityClass: input.opportunity.opportunityClass,
      qualificationStatus: input.opportunity.qualificationStatus,
    },
    demandSummary: input.demandEstimate
      ? {
          estimationMethod: input.demandEstimate.estimationMethod,
          annualMwh: input.demandEstimate.annualMwh,
          estimatedAvgMw: input.demandEstimate.estimatedAvgMw,
          estimatedPeakMw: input.demandEstimate.estimatedPeakMw,
          estimatedPeakKw: input.demandEstimate.estimatedPeakKw,
          mwConfidenceScore: input.demandEstimate.mwConfidenceScore,
          assumptions: input.demandEstimate.assumptions,
        }
      : {},
    clusterSummary: normalizeObject(input.clusterSummary),
    infrastructureSummary: input.infrastructureAssessment
      ? {
          infrastructureClass:
            input.infrastructureAssessment.infrastructureClass,
          infrastructureGradeScore:
            input.infrastructureAssessment.infrastructureGradeScore,
          infrastructureFlag: input.infrastructureAssessment.infrastructureFlag,
          autoRouteLplEligible:
            input.infrastructureAssessment.autoRouteLplEligible,
          autoRouteLplScore: input.infrastructureAssessment.autoRouteLplScore,
          primaryPartnerRoute:
            input.infrastructureAssessment.primaryPartnerRoute,
          secondaryPartnerRoute:
            input.infrastructureAssessment.secondaryPartnerRoute,
          reasonCodes: input.infrastructureAssessment.infrastructureReasonCodes,
        }
      : {},
    economicStructureSummary: input.monetizationProfile
      ? {
          economicStructureType:
            input.monetizationProfile.economicStructureType,
          tier1ValueDriver: input.monetizationProfile.tier1ValueDriver,
          tier2ValueDriver: input.monetizationProfile.tier2ValueDriver,
          tier3ValueDriver: input.monetizationProfile.tier3ValueDriver,
          stackedMonetizationFlag:
            input.monetizationProfile.stackedMonetizationFlag,
        }
      : {},
    monetizationSummary: input.monetizationProfile
      ? {
          monetizationProfile:
            input.monetizationProfile.monetizationProfile,
          primaryRevenueModel:
            input.monetizationProfile.primaryRevenueModel,
          secondaryRevenueModels:
            input.monetizationProfile.secondaryRevenueModels,
          revenueCapturePriority:
            input.monetizationProfile.revenueCapturePriority,
          recurringRevenueFlag:
            input.monetizationProfile.recurringRevenueFlag,
        }
      : {},
    routeSummary: normalizeObject(input.routeSummary),
    blockers,
    requiredDocuments,
    nextBestActions,
    confidenceNotes,
  };
}