import { NextRequest, NextResponse } from "next/server";

const protectedPrefixes = [
  "/admin",
  "/intake/deal",
  "/system/deal-runner",
  "/big-deal-desk",
  "/portfolio-rollup",
  "/pipeline",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/intake/deal/:path*",
    "/system/deal-runner/:path*",
    "/big-deal-desk/:path*",
    "/portfolio-rollup/:path*",
    "/pipeline/:path*",
  ],
};