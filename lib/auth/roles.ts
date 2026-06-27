export type UserRole = "admin" | "operator" | "supplier";

export const routeAccess: Record<string, UserRole[]> = {
  "/admin": ["admin"],
  "/dashboard": ["admin", "operator"],
  "/leads": ["admin", "operator"],
  "/command-center": ["admin", "operator"],
  "/analytics": ["admin", "operator"],
  "/pricing-intakes": ["admin", "operator"],
  "/intake/deal": ["admin", "operator"],
  "/pipeline": ["admin", "operator"],
  "/system/deal-runner": ["admin"],
  "/big-deal-desk": ["admin", "operator"],
  "/portfolio-rollup": ["admin", "operator"],
  "/supplier/dashboard": ["admin", "operator", "supplier"],
  "/supplier/bids": ["admin", "operator", "supplier"],
};

export function getAllowedRoles(pathname: string): UserRole[] | null {
  const match = Object.entries(routeAccess).find(
    ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  return match ? match[1] : null;
}