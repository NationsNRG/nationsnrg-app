// lib/deal-engine/origination/lpl-routing.ts

import type {
  DealInfrastructureAssessmentOutput,
  DealRouteType,
  JsonObject,
} from "../types";

export interface LplRoutingDecision {
  routeType: DealRouteType;
  routeDestination: string;
  routeReason: string;
  escalationFlag: boolean;
  fallbackRouteType: DealRouteType | null;
  fallbackDestination: string | null;
  routeSummary: JsonObject;
}

export function buildLplRoutingDecision(
  assessment: DealInfrastructureAssessmentOutput,
): LplRoutingDecision {
  if (assessment.autoRouteLplEligible) {
    return {
      routeType: "premium_partner",
      routeDestination: "LPL_SOLAR",
      routeReason:
        "Infrastructure-grade opportunity detected and automatically escalated to LPL based on inferred scale, complexity, and partner-fit thresholds.",
      escalationFlag: true,
      fallbackRouteType: "standard_partner",
      fallbackDestination: "SMALLER_EPC_FALLBACK",
      routeSummary: {
        autoRoute: true,
        partnerTier: assessment.autoRoutePartnerTier,
        primaryPartnerRoute: assessment.primaryPartnerRoute,
        secondaryPartnerRoute: assessment.secondaryPartnerRoute,
        lplScore: assessment.autoRouteLplScore,
        rationale: assessment.routingRationale,
      },
    };
  }

  if (assessment.infrastructureFlag) {
    return {
      routeType: assessment.premiumPartnerFlag
        ? "premium_partner"
        : "standard_partner",
      routeDestination:
        assessment.primaryPartnerRoute ?? "NATIONSNRG_STRUCTURED_DESK",
      routeReason:
        "Infrastructure or structured-midmarket signals detected, but LPL auto-routing threshold was not fully met.",
      escalationFlag: assessment.premiumPartnerFlag,
      fallbackRouteType: "small_partner",
      fallbackDestination:
        assessment.secondaryPartnerRoute ?? "SMALLER_EPC",
      routeSummary: {
        autoRoute: false,
        infrastructureClass: assessment.infrastructureClass,
        partnerTier: assessment.autoRoutePartnerTier,
        lplScore: assessment.autoRouteLplScore,
        rationale: assessment.routingRationale,
      },
    };
  }

  return {
    routeType: "vertical_adapter",
    routeDestination: "NATIONSRG_STANDARD_FLOW",
    routeReason:
      "Opportunity does not currently meet infrastructure escalation thresholds and remains in standard NationsNRG execution.",
    escalationFlag: false,
    fallbackRouteType: "small_partner",
    fallbackDestination: "SMALLER_PARTNER_NETWORK",
    routeSummary: {
      autoRoute: false,
      infrastructureClass: assessment.infrastructureClass,
      lplScore: assessment.autoRouteLplScore,
      rationale: assessment.routingRationale,
    },
  };
}