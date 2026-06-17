// lib/deal-engine/auto-progress-trigger.ts

export type AutoProgressTriggerSource =
  | "operator"
  | "intake_created"
  | "package_generated"
  | "supplier_response"
  | "safe_share"
  | "big_deal_desk"
  | "portfolio_rollup"
  | "system";

export async function triggerDealAutoProgression(params: {
  dealId: string;
  triggerSource: AutoProgressTriggerSource;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
  throw new Error("Missing NEXT_PUBLIC_APP_URL");
}

  try {
    const response = await fetch(`${appUrl}/api/intake/deal/${params.dealId}/auto-progress`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        triggerSource: params.triggerSource,
      }),
      cache: "no-store",
    });

if (!response.ok) {
  throw new Error(
    `Auto progression failed with status ${response.status}`,
  );
}

  } catch (error) {
    console.error(
      JSON.stringify({
        event: "auto_progress_trigger_failed",
        dealId: params.dealId,
        triggerSource: params.triggerSource,
        error: error instanceof Error ? error.message : "Unknown error",
        ts: new Date().toISOString(),
      }),
    );
  }
}