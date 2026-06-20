import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getAllowedRoles } from "@/lib/auth/roles";
import { getUserRole } from "@/lib/auth/get-user-role";

const protectedPrefixes = [
  "/admin",
  "/dashboard",
  "/intake/deal",
  "/system/deal-runner",
  "/big-deal-desk",
  "/portfolio-rollup",
  "/pipeline",
  "/leads",
  "/command-center",
  "/analytics",
  "/pricing-intakes",
  "/supplier/dashboard",
  "/supplier/bids",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  const { response, user } = await updateSession(request);

  if (!isProtected) {
    return response;
  }

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  const allowedRoles = getAllowedRoles(pathname);

  if (!allowedRoles) {
    return response;
  }

  const role = await getUserRole(user.id);

  if (!role || !allowedRoles.includes(role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/intake/deal/:path*",
    "/system/deal-runner/:path*",
    "/big-deal-desk/:path*",
    "/portfolio-rollup/:path*",
    "/pipeline/:path*",
    "/leads/:path*",
    "/command-center/:path*",
    "/analytics/:path*",
    "/pricing-intakes/:path*",
    "/supplier/dashboard/:path*",
    "/supplier/bids/:path*",
  ],
};