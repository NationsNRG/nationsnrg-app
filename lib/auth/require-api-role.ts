import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getUserRole } from "@/lib/auth/get-user-role";

type UserRole = "admin" | "operator" | "supplier";

export async function requireApiRole(
  request: Request,
  allowedRoles: UserRole[],
) {
  let response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    },
  );

  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "Missing authorization." },
        { status: 401 },
      ),
    };
  }

  const token = authHeader.replace("Bearer ", "");

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 },
      ),
    };
  }

  const role = await getUserRole(user.id);

  if (!role || !allowedRoles.includes(role)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "Forbidden." },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    user,
    role,
    response,
  };
}