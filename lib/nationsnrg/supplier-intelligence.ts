// lib/nationsnrg/supplier-intelligence.ts

export interface SupplierCatalogRecord {
  supplierEntityId: string;
  supplierName: string;
  supplierClass: string;
  status: string;
  commodityTypes: string[];
  serviceStates: string[];
  utilities: string[];
  capabilities: string[];
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface DealSupplierFitInput {
  dealId: string;
  state: string | null;
  commodityType: string | null;
  estimatedMonthlyBill: number | null;
  estimatedPeakKw: number | null;
  premiumPath: boolean;
  infrastructurePath: boolean;
  utilityName?: string | null;
}

export interface SupplierScoreBreakdown {
  capabilityFitScore: number;
  geographyFitScore: number;
  responsivenessScore: number;
  economicFitScore: number;
  totalScore: number;
  rationale: Record<string, unknown>;
}

export interface RankedSupplierMatch {
  supplierEntityId: string;
  supplierName: string;
  supplierClass: string;
  totalScore: number;
  matchRank: number;
  matchStatus: "recommended" | "fallback";
  capabilityFitScore: number;
  geographyFitScore: number;
  responsivenessScore: number;
  economicFitScore: number;
  rationale: Record<string, unknown>;
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeList(values: string[] | null | undefined): string[] {
  return Array.isArray(values)
    ? values.map((value) => value.trim().toLowerCase()).filter(Boolean)
    : [];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scoreCapability(params: {
  supplier: SupplierCatalogRecord;
  commodityType: string | null;
  infrastructurePath: boolean;
}): { score: number; reasons: string[] } {
  const capabilities = normalizeList(params.supplier.capabilities);
  const commodityTypes = normalizeList(params.supplier.commodityTypes);
  const commodity = normalize(params.commodityType);
  const reasons: string[] = [];

  let score = 35;

  if (commodity && commodityTypes.includes(commodity)) {
    score += 30;
    reasons.push(`Commodity match for ${commodity}.`);
  }

  if (!commodity && commodityTypes.length > 0) {
    score += 8;
    reasons.push("Supplier has declared commodity coverage.");
  }

  if (params.infrastructurePath) {
    if (
      capabilities.includes("solar_development") ||
      capabilities.includes("infrastructure_projects") ||
      capabilities.includes("epc")
    ) {
      score += 25;
      reasons.push("Infrastructure capability match.");
    } else {
      score -= 10;
      reasons.push("No explicit infrastructure capability.");
    }
  } else if (
    capabilities.includes("commercial_accounts") ||
    capabilities.includes("broker_supply")
  ) {
    score += 15;
    reasons.push("Commercial execution capability match.");
  }

  if (params.supplier.supplierClass === "premium_partner") {
    score += 10;
    reasons.push("Premium partner class boosts capability fit.");
  }

  return {
    score: clamp(score, 0, 100),
    reasons,
  };
}

function scoreGeography(params: {
  supplier: SupplierCatalogRecord;
  state: string | null;
  utilityName: string | null | undefined;
}): { score: number; reasons: string[] } {
  const serviceStates = normalizeList(params.supplier.serviceStates);
  const utilities = normalizeList(params.supplier.utilities);
  const state = normalize(params.state);
  const utilityName = normalize(params.utilityName);
  const reasons: string[] = [];

  let score = 20;

  if (state && serviceStates.includes(state)) {
    score += 55;
    reasons.push(`Supplier serves state ${state.toUpperCase()}.`);
  } else if (state) {
    score -= 10;
    reasons.push(`No explicit state coverage for ${state.toUpperCase()}.`);
  }

  if (utilityName && utilities.includes(utilityName)) {
    score += 20;
    reasons.push(`Utility coverage match for ${utilityName}.`);
  }

  return {
    score: clamp(score, 0, 100),
    reasons,
  };
}

function scoreResponsiveness(params: {
  supplier: SupplierCatalogRecord;
  premiumPath: boolean;
}): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 50;

  if (params.supplier.status === "active") {
    score += 20;
    reasons.push("Supplier is active.");
  } else {
    score -= 25;
    reasons.push("Supplier is not active.");
  }

  if (params.supplier.supplierClass === "premium_partner") {
    score += 15;
    reasons.push("Premium partner receives responsiveness uplift.");
  }

  if (params.premiumPath && params.supplier.supplierClass === "small_partner") {
    score -= 15;
    reasons.push("Small partner penalized on premium path.");
  }

  return {
    score: clamp(score, 0, 100),
    reasons,
  };
}

function scoreEconomics(params: {
  supplier: SupplierCatalogRecord;
  estimatedMonthlyBill: number | null;
  estimatedPeakKw: number | null;
  premiumPath: boolean;
  infrastructurePath: boolean;
}): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const monthlyBill = params.estimatedMonthlyBill ?? 0;
  const peakKw = params.estimatedPeakKw ?? 0;

  let score = 35;

  if (monthlyBill >= 10000) {
    score += 20;
    reasons.push("Deal size supports stronger economics.");
  } else if (monthlyBill >= 5000) {
    score += 12;
    reasons.push("Deal size supports mid-tier economics.");
  }

  if (peakKw >= 500) {
    score += 20;
    reasons.push("High peak demand supports larger execution value.");
  } else if (peakKw >= 150) {
    score += 10;
    reasons.push("Mid-market peak demand supports deal value.");
  }

  if (params.premiumPath && params.supplier.supplierClass === "premium_partner") {
    score += 15;
    reasons.push("Premium path aligns with premium partner economics.");
  }

  if (params.infrastructurePath) {
    if (
      params.supplier.supplierClass === "premium_partner" ||
      normalizeList(params.supplier.capabilities).includes("infrastructure_projects")
    ) {
      score += 15;
      reasons.push("Infrastructure path aligns with supplier economics.");
    } else {
      score -= 10;
      reasons.push("Supplier is weaker for infrastructure economics.");
    }
  }

  return {
    score: clamp(score, 0, 100),
    reasons,
  };
}

function computeTotalScore(breakdown: Omit<SupplierScoreBreakdown, "totalScore" | "rationale">): number {
  return clamp(
    Math.round(
      breakdown.capabilityFitScore * 0.35 +
        breakdown.geographyFitScore * 0.25 +
        breakdown.responsivenessScore * 0.15 +
        breakdown.economicFitScore * 0.25,
    ),
    0,
    100,
  );
}

export function rankSuppliersForDeal(params: {
  deal: DealSupplierFitInput;
  suppliers: SupplierCatalogRecord[];
}): RankedSupplierMatch[] {
  const ranked = params.suppliers
    .filter((supplier) => supplier.status === "active")
    .map((supplier) => {
      const capability = scoreCapability({
        supplier,
        commodityType: params.deal.commodityType,
        infrastructurePath: params.deal.infrastructurePath,
      });

      const geography = scoreGeography({
        supplier,
        state: params.deal.state,
        utilityName: params.deal.utilityName,
      });

      const responsiveness = scoreResponsiveness({
        supplier,
        premiumPath: params.deal.premiumPath,
      });

      const economics = scoreEconomics({
        supplier,
        estimatedMonthlyBill: params.deal.estimatedMonthlyBill,
        estimatedPeakKw: params.deal.estimatedPeakKw,
        premiumPath: params.deal.premiumPath,
        infrastructurePath: params.deal.infrastructurePath,
      });

      const totalScore = computeTotalScore({
        capabilityFitScore: capability.score,
        geographyFitScore: geography.score,
        responsivenessScore: responsiveness.score,
        economicFitScore: economics.score,
      });

      const rationale = {
        dealId: params.deal.dealId,
        supplierClass: supplier.supplierClass,
        reasons: {
          capability: capability.reasons,
          geography: geography.reasons,
          responsiveness: responsiveness.reasons,
          economics: economics.reasons,
        },
      };

      return {
        supplierEntityId: supplier.supplierEntityId,
        supplierName: supplier.supplierName,
        supplierClass: supplier.supplierClass,
        totalScore,
        capabilityFitScore: capability.score,
        geographyFitScore: geography.score,
        responsivenessScore: responsiveness.score,
        economicFitScore: economics.score,
        rationale,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((row, index) => ({
      ...row,
      matchRank: index + 1,
      matchStatus: index === 0 ? "recommended" as const : "fallback" as const,
    }));

  return ranked;
}