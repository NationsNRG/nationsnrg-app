import { NextRequest, NextResponse } from "next/server";

const protectedPrefixes = [
  "/admin",
  "/dashboard",
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

  const username = process.env.INTERNAL_ADMIN_USERNAME;
  const password = process.env.INTERNAL_ADMIN_PASSWORD;

  if (!username || !password) {
    return new NextResponse("Internal access is not configured.", {
      status: 500,
    });
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Basic ")) {
    return unauthorized();
  }

  const encoded = authHeader.replace("Basic ", "");
  const decoded = atob(encoded);
  const [providedUsername, providedPassword] = decoded.split(":");

  if (providedUsername !== username || providedPassword !== password) {
    return unauthorized();
  }

  return NextResponse.next();
}

function unauthorized() {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="NationsNRG Internal"',
    },
  });
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
  ],
};