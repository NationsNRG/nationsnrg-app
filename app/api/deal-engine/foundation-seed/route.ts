// app/api/deal-engine/foundation-seed/route.ts

import { ok, fail } from "@/lib/api/response";
import { getServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { runFoundationRouteIntegration } from "@/lib/deal-engine/foundation-route-integration";

const requestSchema = z.object({
  dealId: z.string().trim().min(1),
  businessName: z.string().trim().nullable().optional(),
  packageReady: z.boolean(),
  requiredDocuments: z.array(z.string().trim().min(1)).default([]),
  blockers: z.array(z.string().trim().min(1)).default([]),
  requiresHumanReview: z.boolean(),
  premiumPath: z.boolean(),
  infrastructurePath: z.boolean(),
  recurringPossible: z.boolean(),
  bundleCandidate: z.boolean(),
  confidenceScore: z.number().finite().min(0).max(100),
  lplReadinessScore: z.number().finite().min(0).max(100),
  nextBestAction: z.string().trim().min(1),
  queuePriorityScore: z.number().finite().min(0),
  routeReason: z.string().trim().nullable().optional(),
  primarySupplierEntityId: z.string().trim().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    const supabase = getServiceClient();

    const result = await runFoundationRouteIntegration(supabase, {
      dealId: body.dealId,
      businessName: body.businessName ?? null,
      packageReady: body.packageReady,
      requiredDocuments: body.requiredDocuments,
      blockers: body.blockers,
      requiresHumanReview: body.requiresHumanReview,
      premiumPath: body.premiumPath,
      infrastructurePath: body.infrastructurePath,
      recurringPossible: body.recurringPossible,
      bundleCandidate: body.bundleCandidate,
      confidenceScore: body.confidenceScore,
      lplReadinessScore: body.lplReadinessScore,
      nextBestAction: body.nextBestAction,
      queuePriorityScore: body.queuePriorityScore,
      routeReason: body.routeReason ?? null,
      primarySupplierEntityId: body.primarySupplierEntityId ?? null,
    });

    return ok({
      result,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unknown error");
  }
}