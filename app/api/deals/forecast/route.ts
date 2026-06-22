import { NextResponse } from "next/server";

import { dealEconomics } from "@/lib/dealEconomics";
import { requireApiRole } from "@/lib/auth/require-api-role";

const MAX_MONTHS = 36;
const MIN_MONTHS = 1;

function parseMonths(value: string | null): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return 12;

  return Math.min(
    MAX_MONTHS,
    Math.max(MIN_MONTHS, Math.floor(parsed)),
  );
}

function errorResponse(
  message: string,
  status: number = 500,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
    },
  );
}

export async function GET(
  req: Request,
): Promise<Response> {
  const startTime = Date.now();

  try {
    const url = new URL(req.url);
    const months = parseMonths(
      url.searchParams.get("months"),
    );

    if (months > MAX_MONTHS) {
      return errorResponse(
        `Max months allowed is ${MAX_MONTHS}`,
        400,
      );
    }

    const forecast =
      await dealEconomics.generateForecast(months);

    return NextResponse.json({
      success: true,
      data: forecast,
      meta: {
        months,
        executionTimeMs:
          Date.now() - startTime,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    console.error("forecast_error", {
      message,
      stack:
        error instanceof Error
          ? error.stack
          : undefined,
    });

    return errorResponse(message);
  }
}