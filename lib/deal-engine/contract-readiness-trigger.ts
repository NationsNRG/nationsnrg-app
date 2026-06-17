// lib/deal-engine/contract-readiness-trigger.ts

export type ContractReadinessTriggerSource =
  | "operator"
  | "document_update"
  | "package_update"
  | "supplier_response"
  | "compensation_update"
  | "auto_progression"
  | "system";

export async function triggerContractReadinessRefresh(params: {
  dealId: string;
  triggerSource: ContractReadinessTriggerSource;
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error("Missing NEXT_PUBLIC_APP_URL.");
  }

  try {
    const response = await fetch(
      `${appUrl}/api/intake/deal/${params.dealId}/contract-readiness`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          triggerSource: params.triggerSource,
        }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(
        `Contract readiness refresh failed with status ${response.status}`,
      );
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "contract_readiness_refresh_failed",
        dealId: params.dealId,
        triggerSource: params.triggerSource,
        error: error instanceof Error ? error.message : "Unknown error",
        ts: new Date().toISOString(),
      }),
    );
  }
}