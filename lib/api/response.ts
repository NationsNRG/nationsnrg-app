export function ok<T>(data: T, init?: ResponseInit) {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status: init?.status ?? 200,
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

export function fail(
  message: string,
  status = 400,
  meta?: Record<string, unknown>,
) {
  return new Response(
    JSON.stringify({
      ok: false,
      error: message,
      ...(meta ?? {}),
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    },
  );
}