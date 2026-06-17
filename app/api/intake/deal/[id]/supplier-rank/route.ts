// app/api/intake/deal/[id]/supplier-rank/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  rankSuppliersForDeal,
  type DealSupplierFitInput,
  type SupplierCatalogRecord,
} from "@/lib/nationsnrg/supplier-intelligence";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

function normalizeArray(values: unknown): string[] {
  return Array.isArray(values)
    ? values.filter((value): value is string => typeof value === "string")
    : [];
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const [
      { data: deal, error: dealError },
      { data: demandEstimate, error: demandError },
      { data: economicStack, error: economicError },
      { data: suppliers, error: suppliersError },
    ] = await Promise.all([
      supabase
        .from("deals")
        .select("*")
        .eq("id", id)
        .single(),

      supabase
        .from("deal_demand_estimates")
        .select("*")
        .eq("deal_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("deal_economic_stack_decisions")
        .select("*")
        .eq("deal_id", id)
        .maybeSingle(),

      supabase
        .from("suppliers")
        .select("*")
        .eq("status", "active"),
    ]);

    if (dealError || !deal) {
      throw new Error(dealError?.message ?? "Deal not found");
    }

    if (demandError) {
      throw new Error(demandError.message);
    }

    if (economicError) {
      throw new Error(economicError.message);
    }

    if (suppliersError) {
      throw new Error(suppliersError.message);
    }

    const supplierCatalog: SupplierCatalogRecord[] = (suppliers ?? []).map((supplier) => ({
      supplierEntityId: String(supplier.supplier_entity_id),
      supplierName: String(supplier.supplier_name),
      supplierClass: String(supplier.supplier_class),
      status: String(supplier.status),
      commodityTypes: normalizeArray(supplier.commodity_types),
      serviceStates: normalizeArray(supplier.service_states),
      utilities: normalizeArray(supplier.utilities),
      capabilities: normalizeArray(supplier.capabilities),
      notes: typeof supplier.notes === "string" ? supplier.notes : null,
      metadata:
        supplier.metadata && typeof supplier.metadata === "object"
          ? (supplier.metadata as Record<string, unknown>)
          : null,
    }));

    const fitInput: DealSupplierFitInput = {
      dealId: String(deal.id),
      state: typeof deal.state === "string" ? deal.state : null,
      commodityType: "electricity",
      estimatedMonthlyBill:
        typeof deal.estimated_monthly_bill === "number"
          ? deal.estimated_monthly_bill
          : null,
      estimatedPeakKw:
        demandEstimate && typeof demandEstimate.estimated_peak_kw === "number"
          ? demandEstimate.estimated_peak_kw
          : null,
      premiumPath:
        economicStack?.stack_type === "premium_escalation",
      infrastructurePath:
        demandEstimate && typeof demandEstimate.load_band === "string"
          ? demandEstimate.load_band === "infrastructure_candidate"
          : false,
      utilityName: null,
    };

    const rankedSuppliers = rankSuppliersForDeal({
      deal: fitInput,
      suppliers: supplierCatalog,
    });

    return NextResponse.json(
      {
        ok: true,
        dealId: id,
        rankedSuppliers,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}