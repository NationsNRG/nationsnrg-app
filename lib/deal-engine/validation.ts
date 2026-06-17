import type {
  DealClusterCandidateInput,
  DealDemandEstimateInput,
  DealInfrastructureAssessmentInput,
  DealInfrastructureClass,
  DealMonetizationProfileInput,
  DealPackageBuildInput,
  DealSizeBand,
  JsonObject,
} from "./types";

function isJsonObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readObject(
  input: JsonObject,
  key: string,
): JsonObject {
  const value = input[key];

  return isJsonObject(value) ? value : {};
}

function readOptionalObject(
  input: JsonObject,
  key: string,
): JsonObject | null {
  const value = input[key];

  return isJsonObject(value) ? value : null;
}

function readString(
  input: JsonObject,
  key: string,
  fallback = "",
): string {
  const value = input[key];

  return typeof value === "string" ? value : fallback;
}

function readNullableString(
  input: JsonObject,
  key: string,
): string | null {
  const value = input[key];

  return typeof value === "string" ? value : null;
}

function readNumber(
  input: JsonObject,
  key: string,
): number | null {
  const value = input[key];

  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function readBoolean(
  input: JsonObject,
  key: string,
): boolean {
  const value = input[key];

  return typeof value === "boolean" ? value : false;
}

function readStringArray(
  input: JsonObject,
  key: string,
): string[] {
  const value = input[key];

  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is string =>
      typeof item === "string",
  );
}

export function parseDealPackageBuildInput(
  rawInput: unknown,
): DealPackageBuildInput {
  const input = isJsonObject(rawInput) ? rawInput : {};

  const deal = readObject(input, "deal");
  const opportunity = readObject(input, "opportunity");
  const demandEstimate =
    readOptionalObject(input, "demandEstimate");
  const infrastructureAssessment =
    readOptionalObject(
      input,
      "infrastructureAssessment",
    );
  const monetizationProfile =
    readOptionalObject(input, "monetizationProfile");

  return {
    deal: {
      dealCode: readString(deal, "dealCode", "UNKNOWN"),
      title: readString(deal, "title", "Untitled Deal"),
      status: readString(deal, "status", "unknown"),
      nextBestAction: readNullableString(
        deal,
        "nextBestAction",
      ),
    },
    opportunity: {
      title: readString(
        opportunity,
        "title",
        "Untitled Opportunity",
      ),
      description: readNullableString(
        opportunity,
        "description",
      ),
      opportunityType: readString(
        opportunity,
        "opportunityType",
        "unknown",
      ),
      opportunityClass: readNullableString(
        opportunity,
        "opportunityClass",
      ),
      qualificationStatus: readNullableString(
        opportunity,
        "qualificationStatus",
      ),
      blockerSummary: readStringArray(
        opportunity,
        "blockerSummary",
      ),
      requiredDocuments: readStringArray(
        opportunity,
        "requiredDocuments",
      ),
    },
    demandEstimate: demandEstimate
      ? {
          estimationMethod: readNullableString(
            demandEstimate,
            "estimationMethod",
          ),
          annualMwh: readNumber(
            demandEstimate,
            "annualMwh",
          ),
          estimatedAvgMw: readNumber(
            demandEstimate,
            "estimatedAvgMw",
          ),
          estimatedPeakMw: readNumber(
            demandEstimate,
            "estimatedPeakMw",
          ),
          estimatedPeakKw: readNumber(
            demandEstimate,
            "estimatedPeakKw",
          ),
          mwConfidenceScore: readNumber(
            demandEstimate,
            "mwConfidenceScore",
          ),
          assumptions: readObject(
            demandEstimate,
            "assumptions",
          ),
        }
      : null,
    infrastructureAssessment:
      infrastructureAssessment
        ? {
            infrastructureClass: readNullableString(
              infrastructureAssessment,
              "infrastructureClass",
            ),
            infrastructureGradeScore: readNumber(
              infrastructureAssessment,
              "infrastructureGradeScore",
            ),
            infrastructureFlag: readBoolean(
              infrastructureAssessment,
              "infrastructureFlag",
            ),
            autoRouteLplEligible: readBoolean(
              infrastructureAssessment,
              "autoRouteLplEligible",
            ),
            autoRouteLplScore: readNumber(
              infrastructureAssessment,
              "autoRouteLplScore",
            ),
            primaryPartnerRoute: readNullableString(
              infrastructureAssessment,
              "primaryPartnerRoute",
            ),
            secondaryPartnerRoute: readNullableString(
              infrastructureAssessment,
              "secondaryPartnerRoute",
            ),
            infrastructureReasonCodes: readStringArray(
              infrastructureAssessment,
              "infrastructureReasonCodes",
            ),
          }
        : null,
    monetizationProfile: monetizationProfile
      ? {
          economicStructureType: readNullableString(
            monetizationProfile,
            "economicStructureType",
          ),
          tier1ValueDriver: readNullableString(
            monetizationProfile,
            "tier1ValueDriver",
          ),
          tier2ValueDriver: readNullableString(
            monetizationProfile,
            "tier2ValueDriver",
          ),
          tier3ValueDriver: readNullableString(
            monetizationProfile,
            "tier3ValueDriver",
          ),
          stackedMonetizationFlag: readBoolean(
            monetizationProfile,
            "stackedMonetizationFlag",
          ),
          monetizationProfile: readNullableString(
            monetizationProfile,
            "monetizationProfile",
          ),
          primaryRevenueModel: readNullableString(
            monetizationProfile,
            "primaryRevenueModel",
          ),
          secondaryRevenueModels: readStringArray(
            monetizationProfile,
            "secondaryRevenueModels",
          ),
          revenueCapturePriority: readNullableString(
            monetizationProfile,
            "revenueCapturePriority",
          ),
          recurringRevenueFlag: readBoolean(
            monetizationProfile,
            "recurringRevenueFlag",
          ),
        }
      : null,
    clusterSummary: readOptionalObject(
      input,
      "clusterSummary",
    ),
    routeSummary: readOptionalObject(input, "routeSummary"),
    nextBestActions: readStringArray(
      input,
      "nextBestActions",
    ),
    confidenceNotes: readStringArray(
      input,
      "confidenceNotes",
    ),
  };
}

function readSizeBand(value: unknown): DealSizeBand {
  const allowed: DealSizeBand[] = [
    "micro",
    "small",
    "lower_midmarket",
    "upper_midmarket",
    "large",
    "strategic",
    "infrastructure",
  ];

  return allowed.includes(value as DealSizeBand)
    ? (value as DealSizeBand)
    : "micro";
}

function readInfrastructureClass(
  value: unknown,
): DealInfrastructureClass {
  const allowed: DealInfrastructureClass[] = [
  "standard",
  "standard_commercial",
  "structured_midmarket",
  "infrastructure_grade",
  "portfolio_infrastructure",
  "uncertain",
  "unknown",
];

  return allowed.includes(value as DealInfrastructureClass)
    ? (value as DealInfrastructureClass)
    : "unknown";
}

export function parseDealMonetizationProfileInput(
  rawInput: unknown,
): DealMonetizationProfileInput {
  const input = isJsonObject(rawInput) ? rawInput : {};

  return {
    sizeBand: readSizeBand(input.sizeBand),
    infrastructureClass: readInfrastructureClass(
      input.infrastructureClass,
    ),
    recurringRevenuePossible: readBoolean(
      input,
      "recurringRevenuePossible",
    ),
    bundled: readBoolean(input, "bundled"),
    routeType: readNullableString(input, "routeType"),
    financingRelevant: readBoolean(
      input,
      "financingRelevant",
    ),
  };
}

export const dealClusterCandidateInputSchema = {
  parse(rawInput: unknown): DealClusterCandidateInput {
    const input = isJsonObject(rawInput) ? rawInput : {};

    return {
      primaryEntityId: readNullableString(
        input,
        "primaryEntityId",
      ),
      regionKey: readNullableString(input, "regionKey"),
      utilityKey: readNullableString(input, "utilityKey"),
      sectorKey: readNullableString(input, "sectorKey"),
      timeWindowKey: readNullableString(
        input,
        "timeWindowKey",
      ),
      estimatedAvgMw: readNumber(input, "estimatedAvgMw"),
      estimatedPeakMw: readNumber(input, "estimatedPeakMw"),
      estimatedValue: readNumber(input, "estimatedValue"),
    };
  },
};

export function parseDealDemandEstimateInput(
  rawInput: unknown,
): DealDemandEstimateInput {
  const input = isJsonObject(rawInput) ? rawInput : {};
  const assumptions = readOptionalObject(input, "assumptions");

  return {
    annualSpendAmount: readNumber(input, "annualSpendAmount"),
    monthlyBillAmount: readNumber(input, "monthlyBillAmount"),
    annualKwh: readNumber(input, "annualKwh"),
    monthlyKwh: readNumber(input, "monthlyKwh"),
    annualMwh: readNumber(input, "annualMwh"),
    directMwInput: readNumber(input, "directMwInput"),
    directKwInput: readNumber(input, "directKwInput"),
    siteCount: readNumber(input, "siteCount"),
    facilityType: readNullableString(input, "facilityType"),
    businessModelHint: readNullableString(
      input,
      "businessModelHint",
    ),
    assumptions: assumptions
      ? {
          inferredRatePerKwh: readNumber(
            assumptions,
            "inferredRatePerKwh",
          ),
          inferredLoadFactor: readNumber(
            assumptions,
            "inferredLoadFactor",
          ),
          peakMultiplier: readNumber(
            assumptions,
            "peakMultiplier",
          ),
          aggregationFactor: readNumber(
            assumptions,
            "aggregationFactor",
          ),
        }

      : null,
  };
}

export function parseDealInfrastructureAssessmentInput(
  rawInput: unknown,
): DealInfrastructureAssessmentInput {
  const input = isJsonObject(rawInput) ? rawInput : {};

  return {
    estimatedAvgMw: readNumber(input, "estimatedAvgMw"),
    estimatedPeakMw: readNumber(input, "estimatedPeakMw"),
    aggregatedClusterMw: readNumber(input, "aggregatedClusterMw"),
    annualSpendAmount: readNumber(input, "annualSpendAmount"),
    siteCount: readNumber(input, "siteCount"),
    facilityType: readNullableString(input, "facilityType"),
    financingRequested: readBoolean(input, "financingRequested"),
    hasLandSignal: readBoolean(input, "hasLandSignal"),
    hasRoofSignal: readBoolean(input, "hasRoofSignal"),
    hasResilienceSignal: readBoolean(input, "hasResilienceSignal"),
    hasStorageSignal: readBoolean(input, "hasStorageSignal"),
  };
}
