// lib/deal-engine/disclosure-gates.ts

export type VisibilityLevel =
  | "internal_only"
  | "teaser_ok"
  | "qualified_ok"
  | "execution_ok";

export type PackageType = "teaser" | "full" | "epc" | "lpl" | "buyer";

export type AudienceType = "internal" | "supplier" | "epc" | "lpl" | "buyer";

export interface DisclosureCounterparty {
  counterpartyId: string;
  counterpartyType: string;
  counterpartyName: string;
  status: string;
  visibilityLevel: VisibilityLevel;
}

export interface DisclosurePackageContext {
  packageType: PackageType;
  audience: AudienceType;
  packageStatus: string;
}

export interface DisclosureDecision {
  allowed: boolean;
  reason: string;
  sanitized: boolean;
  maxAllowedPackageType: PackageType | null;
}

const VISIBILITY_RANK: Record<VisibilityLevel, number> = {
  internal_only: 0,
  teaser_ok: 1,
  qualified_ok: 2,
  execution_ok: 3,
};

const PACKAGE_RANK: Record<PackageType, number> = {
  teaser: 1,
  full: 2,
  buyer: 2,
  epc: 3,
  lpl: 3,
};

function maxPackageTypeForVisibility(
  visibilityLevel: VisibilityLevel,
): PackageType | null {
  if (visibilityLevel === "internal_only") {
    return null;
  }

  if (visibilityLevel === "teaser_ok") {
    return "teaser";
  }

  if (visibilityLevel === "qualified_ok") {
    return "full";
  }

  return "lpl";
}

export function canCounterpartyReceivePackage(params: {
  counterparty: DisclosureCounterparty;
  packageContext: DisclosurePackageContext;
}): DisclosureDecision {
  const { counterparty, packageContext } = params;

  if (counterparty.status !== "active") {
    return {
      allowed: false,
      reason: `Counterparty is not active. Current status: ${counterparty.status}.`,
      sanitized: false,
      maxAllowedPackageType: null,
    };
  }

  const maxAllowedPackageType = maxPackageTypeForVisibility(
    counterparty.visibilityLevel,
  );

  if (!maxAllowedPackageType) {
    return {
      allowed: false,
      reason: "Counterparty is internal-only and cannot receive external package disclosure.",
      sanitized: false,
      maxAllowedPackageType: null,
    };
  }

  const requestedRank = PACKAGE_RANK[packageContext.packageType];
  const allowedRank = PACKAGE_RANK[maxAllowedPackageType];

  if (requestedRank > allowedRank) {
    return {
      allowed: false,
      reason: `Requested package type ${packageContext.packageType} exceeds visibility level ${counterparty.visibilityLevel}.`,
      sanitized: false,
      maxAllowedPackageType,
    };
  }

  const sanitized = packageContext.packageType === "teaser";

  return {
    allowed: true,
    reason: `Package type ${packageContext.packageType} is allowed for visibility level ${counterparty.visibilityLevel}.`,
    sanitized,
    maxAllowedPackageType,
  };
}

export function getAllowedCounterpartiesForPackage(params: {
  counterparties: DisclosureCounterparty[];
  packageContext: DisclosurePackageContext;
}): Array<DisclosureCounterparty & { disclosureDecision: DisclosureDecision }> {
  return params.counterparties.map((counterparty) => ({
    ...counterparty,
    disclosureDecision: canCounterpartyReceivePackage({
      counterparty,
      packageContext: params.packageContext,
    }),
  }));
}

export function shouldSanitizePackageForAudience(params: {
  audience: AudienceType;
  visibilityLevel: VisibilityLevel;
  packageType: PackageType;
}): boolean {
  if (params.audience === "internal") {
    return false;
  }

  if (params.packageType === "teaser") {
    return true;
  }

  return VISIBILITY_RANK[params.visibilityLevel] < VISIBILITY_RANK.execution_ok;
}