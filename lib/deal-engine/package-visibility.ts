// lib/deal-engine/package-visibility.ts

import {
  canCounterpartyReceivePackage,
  getAllowedCounterpartiesForPackage,
  shouldSanitizePackageForAudience,
  type AudienceType,
  type DisclosureCounterparty,
  type DisclosureDecision,
  type PackageType,
  type VisibilityLevel,
} from "./disclosure-gates";

export interface PackageVisibilityInput {
  packageType: PackageType;
  audience: AudienceType;
  packageStatus: string;
  counterparties: DisclosureCounterparty[];
}

export interface PackageVisibilityResult {
  eligibleCounterparties: Array<
    DisclosureCounterparty & { disclosureDecision: DisclosureDecision }
  >;
  blockedCounterparties: Array<
    DisclosureCounterparty & { disclosureDecision: DisclosureDecision }
  >;
}

export function evaluatePackageVisibility(
  input: PackageVisibilityInput,
): PackageVisibilityResult {
  const evaluated = getAllowedCounterpartiesForPackage({
    counterparties: input.counterparties,
    packageContext: {
      packageType: input.packageType,
      audience: input.audience,
      packageStatus: input.packageStatus,
    },
  });

  return {
    eligibleCounterparties: evaluated.filter(
      (counterparty) => counterparty.disclosureDecision.allowed,
    ),
    blockedCounterparties: evaluated.filter(
      (counterparty) => !counterparty.disclosureDecision.allowed,
    ),
  };
}

export function buildDisclosurePreview(params: {
  packageType: PackageType;
  audience: AudienceType;
  visibilityLevel: VisibilityLevel;
}): {
  sanitized: boolean;
  disclosureMode: "blocked" | "sanitized" | "full";
} {
  const allowed =
    canCounterpartyReceivePackage({
      counterparty: {
        counterpartyId: "preview",
        counterpartyType: "preview",
        counterpartyName: "preview",
        status: "active",
        visibilityLevel: params.visibilityLevel,
      },
      packageContext: {
        packageType: params.packageType,
        audience: params.audience,
        packageStatus: "draft",
      },
    }).allowed;

  if (!allowed) {
    return {
      sanitized: false,
      disclosureMode: "blocked",
    };
  }

  const sanitized = shouldSanitizePackageForAudience({
    audience: params.audience,
    visibilityLevel: params.visibilityLevel,
    packageType: params.packageType,
  });

  return {
    sanitized,
    disclosureMode: sanitized ? "sanitized" : "full",
  };
}