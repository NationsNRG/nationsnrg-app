// lib/deal-engine/monetization.ts

import type {
  DealInfrastructureClass,
  DealMonetizationProfileInput,
  DealMonetizationProfileOutput,
  DealMonetizationProfileType,
  DealSizeBand,
} from "./types";
import { parseDealMonetizationProfileInput } from "./validation";

function sizeBandRevenueModel(sizeBand: DealSizeBand): {
  primaryRevenueModel: string;
  secondaryRevenueModels: string[];
  revenueCapturePriority: string[];
} {
  switch (sizeBand) {
    case "micro":
    case "small":
      return {
        primaryRevenueModel: "fast-turn referral or light-touch execution margin",
        secondaryRevenueModels: [
          "small partner referral fee",
          "recurring optimization attachment",
        ],
        revenueCapturePriority: [
          "speed_to_close",
          "low_touch_routing",
          "preserve_volume",
        ],
      };
    case "lower_midmarket":
    case "upper_midmarket":
      return {
        primaryRevenueModel: "direct execution economics",
        secondaryRevenueModels: [
          "advisory support",
          "financing attachment",
          "optimization add-on",
        ],
        revenueCapturePriority: [
          "direct_margin",
          "cross_sell",
          "recurring_revenue",
        ],
      };
    case "large":
    case "strategic":
    case "infrastructure":
      return {
        primaryRevenueModel: "premium partner or structured infrastructure revenue capture",
        secondaryRevenueModels: [
          "project advisory",
          "financing economics",
          "post-close optimization services",
        ],
        revenueCapturePriority: [
          "deal_structure_quality",
          "partner_economics",
          "tiered_stack",
          "recurring_layer",
        ],
      };
    default:
      return {
        primaryRevenueModel: "custom revenue model",
        secondaryRevenueModels: [],
        revenueCapturePriority: ["custom_review"],
      };
  }
}

function profileTypeFromContext(params: {
  sizeBand: DealSizeBand;
  infrastructureClass: DealInfrastructureClass;
  recurringRevenuePossible: boolean;
  bundled: boolean;
}): DealMonetizationProfileType {
  const { sizeBand, infrastructureClass, recurringRevenuePossible, bundled } = params;

  if (
    infrastructureClass === "infrastructure_grade" ||
    infrastructureClass === "portfolio_infrastructure"
  ) {
    return "infrastructure_stack";
  }

  if (sizeBand === "large" || sizeBand === "strategic" || bundled) {
    return "premium_partner";
  }

  if (sizeBand === "lower_midmarket" || sizeBand === "upper_midmarket") {
    return recurringRevenuePossible ? "blended_services" : "direct_execution";
  }

  if (recurringRevenuePossible) {
    return "recurring_optimization";
  }

  return "light_touch_volume";
}

export function buildMonetizationProfile(
  rawInput: unknown,
): DealMonetizationProfileOutput {
  const input = parseDealMonetizationProfileInput(rawInput);

  const recurringRevenuePossible = input.recurringRevenuePossible === true;
  const bundled = input.bundled === true;

  const monetizationProfile = profileTypeFromContext({
    sizeBand: input.sizeBand,
    infrastructureClass: input.infrastructureClass,
    recurringRevenuePossible,
    bundled,
  });

  const base = sizeBandRevenueModel(input.sizeBand);

  let tier1ValueDriver: string | null = null;
  let tier2ValueDriver: string | null = null;
  let tier3ValueDriver: string | null = null;
  let economicStructureType: string | null = null;
  let stackedMonetizationFlag = false;

  switch (monetizationProfile) {
    case "light_touch_volume":
      tier1ValueDriver = "Core transaction volume";
      tier2ValueDriver = "Partner-side referral economics";
      tier3ValueDriver = recurringRevenuePossible
        ? "Light recurring optimization layer"
        : null;
      economicStructureType = "light_touch_volume";
      stackedMonetizationFlag = recurringRevenuePossible;
      break;

    case "direct_execution":
      tier1ValueDriver = "Primary transaction margin";
      tier2ValueDriver = "Execution-side support services";
      tier3ValueDriver = recurringRevenuePossible
        ? "Retention and optimization services"
        : null;
      economicStructureType = "direct_execution";
      stackedMonetizationFlag = recurringRevenuePossible;
      break;

    case "blended_services":
      tier1ValueDriver = "Primary commercial transaction";
      tier2ValueDriver = "Structured advisory / service layer";
      tier3ValueDriver = "Recurring optimization or account expansion";
      economicStructureType = "blended";
      stackedMonetizationFlag = true;
      break;

    case "premium_partner":
      tier1ValueDriver = "Premium routed deal economics";
      tier2ValueDriver = "Structured support / financing / advisory";
      tier3ValueDriver = recurringRevenuePossible
        ? "Post-close optimization and recurring services"
        : "Expansion or secondary monetization layer";
      economicStructureType = "premium_partner_stack";
      stackedMonetizationFlag = true;
      break;

    case "infrastructure_stack":
      tier1ValueDriver = "Infrastructure-grade core transaction";
      tier2ValueDriver = "Financing / advisory / coordination layer";
      tier3ValueDriver = "Monitoring / optimization / recurring commercial layer";
      economicStructureType = "infrastructure_stack";
      stackedMonetizationFlag = true;
      break;

    case "recurring_optimization":
      tier1ValueDriver = "Initial service activation";
      tier2ValueDriver = "Support / onboarding / partner economics";
      tier3ValueDriver = "Recurring optimization revenue";
      economicStructureType = "recurring_service_stack";
      stackedMonetizationFlag = true;
      break;

    default:
      tier1ValueDriver = "Custom value driver";
      economicStructureType = "custom";
      stackedMonetizationFlag = false;
  }

  return {
    monetizationProfile,
    primaryRevenueModel: base.primaryRevenueModel,
    secondaryRevenueModels: base.secondaryRevenueModels,
    revenueCapturePriority: base.revenueCapturePriority,
    tier1ValueDriver,
    tier2ValueDriver,
    tier3ValueDriver,
    economicStructureType,
    stackedMonetizationFlag,
    recurringRevenueFlag: recurringRevenuePossible,
    assumptions: {
      sizeBand: input.sizeBand,
      infrastructureClass: input.infrastructureClass,
      routeType: input.routeType ?? null,
      financingRelevant: input.financingRelevant ?? false,
      recurringRevenuePossible,
      bundled,
    },
    rationale: {
      monetizationProfile,
      sizeBand: input.sizeBand,
      infrastructureClass: input.infrastructureClass,
    },
  };
}