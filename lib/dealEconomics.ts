import { supabase } from './supabase';
import type { Database, Json } from '@/types/supabase';

type LeadRow = Database['public']['Tables']['discovered_leads']['Row'];
type DealEconomicsRow = Database['public']['Tables']['deal_economics']['Row'];
type DealEconomicsInsert = Database['public']['Tables']['deal_economics']['Insert'];
type CommissionForecastInsert =
  Database['public']['Tables']['commission_forecasts']['Insert'];
type SupplierCommissionRow =
  Database['public']['Tables']['supplier_commissions']['Row'];
type SystemActivityInsert =
  Database['public']['Tables']['system_activity']['Insert'];

type CommissionType = 'fixed' | 'percentage' | 'tiered';
type SupportedTerm = 12 | 24 | 36 | 48 | 60;

interface SupplierRow {
  id: string;
  company_name: string | null;
}

interface SupplierRateTermMap {
  12: number | null;
  24: number | null;
  36: number | null;
  48: number | null;
  60: number | null;
}

export interface DealEconomics {
  leadId: string;
  supplierId: string;
  termMonths: number;
  volumeMwh: number;
  rate: number;
  estimatedSavings: number;
  commissionRate: number;
  estimatedCommission: number;
  expectedRetention: number;
  lifetimeValue: number;
  profitabilityScore: number;
}

export interface CommissionForecast {
  month: Date;
  amount: number;
  confidence: number;
}

export interface OptimizedDealRecommendation {
  recommendedTerm: number;
  recommendedSupplier: string;
  expectedCommission: number;
  rationale: string;
}

const DEFAULT_PERCENTAGE_COMMISSION_RATE = 0.1;
const DEFAULT_RENEWAL_PROBABILITY = 0.7;
const DEFAULT_EXPECTED_RETENTION_MONTHS = 36;
const DEFAULT_FORECAST_CONFIDENCE = 50;
const SUPPORTED_TERMS: readonly SupportedTerm[] = [12, 24, 36, 48, 60];
const TOP_DEALS_DEFAULT_LIMIT = 10;
const FORECAST_DEFAULT_MONTHS = 12;
const PROFIT_SCALE_MAX = 5000;

function nowIso(): string {
  return new Date().toISOString();
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : null;
}

function normalizeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.trunc(value);
  }

  return fallback;
}

function isSupportedTerm(value: number): value is SupportedTerm {
  return SUPPORTED_TERMS.includes(value as SupportedTerm);
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function monthsBetween(start: Date, end: Date): number {
  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  return yearDiff * 12 + monthDiff;
}

function asJsonObject(
  value: Record<string, Json | undefined>
): Json {
  return value;
}

function supplierTermRates(
  commission: SupplierCommissionRow
): SupplierRateTermMap {
  return {
    12: normalizeNullableNumber(commission.term_12_months),
    24: normalizeNullableNumber(commission.term_24_months),
    36: normalizeNullableNumber(commission.term_36_months),
    48: normalizeNullableNumber(commission.term_48_months),
    60: normalizeNullableNumber(commission.term_60_months),
  };
}

async function logSystemActivity(params: {
  activityType: 'some_string',
  leadId?: string | null;
  message: string;
  details?: Json;
  createdAt?: string;
}): Promise<void> {
  const insertPayload: SystemActivityInsert = {
    activity_type: params.activityType,
    lead_id: params.leadId ?? null,
    details: {
      message: params.message,
      payload: params.details ?? null,
    },
    created_at: params.createdAt ?? nowIso(),
  };

  const { error } = await supabase.from('system_activity').insert(insertPayload);

  if (error) {
    console.error('deal_economics_log_failed', error.message);
  }
}
  
async function fetchLeadById(leadId: string): Promise<LeadRow | null> {
  const { data, error } = await supabase
    .from('discovered_leads')
    .select('*')
    .eq('id', leadId)
    .limit(1);

  if (error) {
    await logSystemActivity({
      activityType: 'some_string', 
      leadId: leadId,
      message: error.message,
      details: asJsonObject({ operation: 'fetchLeadById' }),
    });
    return null;
  }

  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

async function fetchActiveCommissionAgreement(
  supplierId: string
): Promise<SupplierCommissionRow | null> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('supplier_commissions')
    .select('*')
    .eq('supplier_id', supplierId)
    .eq('is_active', true)
    .lte('effective_date', today)
    .or(`expiration_date.is.null,expiration_date.gte.${today}`)
    .order('effective_date', { ascending: false })
    .limit(1);

  if (error) {
    await logSystemActivity({
      activityType: 'some_string',
      leadId: supplierId,
      message: error.message,
      details: asJsonObject({ operation: 'fetchActiveCommissionAgreement' }),
    });
    return null;
  }

  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

async function insertDealEconomics(
  payload: DealEconomicsInsert
): Promise<void> {
  const { error } = await supabase.from('deal_economics').insert(payload);

  if (error) {
    await logSystemActivity({
      activityType: 'some_string',
      leadId: payload.lead_id,
      message: error.message,
      details: asJsonObject({
        supplierId: payload.supplier_id ?? undefined,
        bidId: payload.bid_id ?? undefined,
      }),
    });
  }
}

async function upsertCommissionForecast(
  payload: CommissionForecastInsert
): Promise<void> {
  const { error } = await supabase
    .from('commission_forecasts')
    .upsert(payload, {
      onConflict: 'month,source',
      ignoreDuplicates: false,
    });

  if (error) {
    await logSystemActivity({
      activityType: 'some_string',
      leadId: typeof payload.month === 'string' ? payload.month : 'forecast',
      message: error.message,
      details: asJsonObject({
        source: normalizeNullableString(payload.source) ?? undefined,
      }),
    });
  }
}

class DealEconomicsEngine {
  async calculateDealEconomics(
    leadId: string,
    supplierId: string,
    termMonths: number,
    rate: number
  ): Promise<DealEconomics | null> {
    const safeTermMonths = normalizePositiveInteger(termMonths, 36);
    const safeRate = normalizeNumber(rate);

    if (!isSupportedTerm(safeTermMonths) || safeRate < 0) {
      await logSystemActivity({
        activityType: 'some_string',
        leadId: leadId,
        message: 'Invalid term or rate',
        details: asJsonObject({
          supplierId,
          termMonths: safeTermMonths,
          rate: safeRate,
        }),
      });
      return null;
    }

    return this.calculateAndOptionallyPersist(
      leadId,
      supplierId,
      safeTermMonths,
      safeRate,
      true
    );
  }

  private async calculateAndOptionallyPersist(
    leadId: string,
    supplierId: string,
    termMonths: SupportedTerm,
    rate: number,
    persist: boolean
  ): Promise<DealEconomics | null> {
    const lead = await fetchLeadById(leadId);
    if (!lead) {
      return null;
    }

    const commission = await fetchActiveCommissionAgreement(supplierId);
    if (!commission) {
      return null;
    }

    const estimatedEnergySpend = normalizeNumber(
      (lead as LeadRow & { estimated_energy_spend?: number | null })
        .estimated_energy_spend
    );
    const estimatedSavings = normalizeNumber(lead.estimated_savings);
    const leadScore = normalizeNumber(
      (lead as LeadRow & { lead_score?: number | null }).lead_score
    );
    const acquisitionCost = normalizeNumber(
      (lead as LeadRow & { acquisition_cost?: number | null }).acquisition_cost
    );
    const volumeMwh = estimatedEnergySpend > 0 ? estimatedEnergySpend / 1000 : 0;

    const commissionRate = this.resolveCommissionRate(
      commission,
      termMonths,
      volumeMwh
    );
    const estimatedCommission =
      commission.commission_type === 'fixed'
        ? commissionRate
        : estimatedSavings * commissionRate;

    const expectedRetention = Math.min(
      termMonths,
      DEFAULT_EXPECTED_RETENTION_MONTHS
    );
    const renewalProbability = this.calculateRenewalProbability(
      leadScore,
      termMonths
    );
    const lifetimeValue =
      estimatedCommission * (expectedRetention / 12) * renewalProbability;
    const profitabilityScore = this.calculateProfitabilityScore(
      estimatedCommission,
      acquisitionCost,
      renewalProbability
    );

    const economics: DealEconomics = {
      leadId,
      supplierId,
      termMonths,
      volumeMwh,
      rate,
      estimatedSavings,
      commissionRate,
      estimatedCommission,
      expectedRetention,
      lifetimeValue,
      profitabilityScore,
    };

    if (persist) {
      const insertPayload: DealEconomicsInsert = {
        lead_id: leadId,
        supplier_id: supplierId,
        bid_id: null,
        term_months: termMonths,
        volume_mwh: Math.round(volumeMwh),
        rate,
        estimated_savings: estimatedSavings,
        estimated_commission: estimatedCommission,
        actual_commission: null,
        commission_rate_used: commissionRate,
        expected_retention_months: expectedRetention,
        lifetime_value: lifetimeValue,
        renewal_probability: renewalProbability,
        acquisition_cost: acquisitionCost,
        margin: estimatedCommission - acquisitionCost,
        profitability_score: profitabilityScore,
        closed_at: null,
        first_payment_at: null,
        last_payment_at: null,
      };

      await insertDealEconomics(insertPayload);
    }

    return economics;
  }

  private resolveCommissionRate(
    commission: SupplierCommissionRow,
    termMonths: SupportedTerm,
    volumeMwh: number
  ): number {
    const termRate = supplierTermRates(commission)[termMonths];
    if (termRate !== null) {
      return termRate;
    }

    const baseCommissionRate = normalizeNullableNumber(commission.commission_rate);

    if (commission.commission_type === 'percentage') {
      return baseCommissionRate ?? DEFAULT_PERCENTAGE_COMMISSION_RATE;
    }

    if (commission.commission_type === 'tiered') {
      const tierMin = normalizeNullableNumber(commission.tier_min_volume) ?? 0;
      const tierMax =
        normalizeNullableNumber(commission.tier_max_volume) ?? Number.MAX_SAFE_INTEGER;

      if (volumeMwh >= tierMin && volumeMwh <= tierMax) {
        return baseCommissionRate ?? DEFAULT_PERCENTAGE_COMMISSION_RATE;
      }

      return DEFAULT_PERCENTAGE_COMMISSION_RATE;
    }

    if (commission.commission_type === 'fixed') {
      return baseCommissionRate ?? 0;
    }

    return DEFAULT_PERCENTAGE_COMMISSION_RATE;
  }

  private calculateRenewalProbability(
    leadScore: number,
    termMonths: number
  ): number {
    let probability = 0.5;

    if (leadScore > 80) probability = 0.85;
    else if (leadScore > 60) probability = 0.7;
    else if (leadScore > 40) probability = 0.55;

    if (termMonths > 36) probability += 0.1;
    else if (termMonths > 24) probability += 0.05;

    return clamp(probability, 0, 0.95);
  }

  private calculateProfitabilityScore(
    commission: number,
    acquisitionCost: number,
    renewalProbability: number
  ): number {
    const profit = commission * renewalProbability - acquisitionCost;
    const score = (profit / PROFIT_SCALE_MAX) * 100;
    return Math.round(clamp(score, 0, 100));
  }

  async generateForecast(
    months: number = FORECAST_DEFAULT_MONTHS
  ): Promise<CommissionForecast[]> {
    const safeMonths = normalizePositiveInteger(months, FORECAST_DEFAULT_MONTHS);

    const { data: dealsData, error: dealsError } = await supabase
      .from('deal_economics')
      .select('*')
      .not('closed_at', 'is', null);

    if (dealsError) {
      await logSystemActivity({
        activityType: 'some_string',
        leadId: 'deal_economics',
        message: dealsError.message,
        details: asJsonObject({ months: safeMonths }),
      });
      return [];
    }

    const { data: pipelineData, error: pipelineError } = await supabase
      .from('discovered_leads')
      .select('*')
      .eq('status', 'enterprise_review')
      .gt('close_probability', 50);

    if (pipelineError) {
      await logSystemActivity({
        activityType: 'some_string',
        leadId: 'discovered_leads',
        message: pipelineError.message,
        details: asJsonObject({ months: safeMonths }),
      });
    }

    const deals = Array.isArray(dealsData) ? dealsData : [];
    const pipeline = Array.isArray(pipelineData) ? pipelineData : [];
    const forecasts: CommissionForecast[] = [];
    const currentMonth = monthStart(new Date());

    for (let i = 0; i < safeMonths; i += 1) {
      const month = addMonths(currentMonth, i);
      let projectedAmount = 0;
      let confidenceNumerator = 0;
      let confidenceCount = 0;

      for (const deal of deals) {
        const closedAt = normalizeNullableString(deal.closed_at);
        if (!closedAt) {
          continue;
        }

        const closeDate = monthStart(new Date(closedAt));
        if (Number.isNaN(closeDate.getTime())) {
          continue;
        }

        const monthsSinceClose = monthsBetween(closeDate, month);
        const expectedRetentionMonths = normalizePositiveInteger(
          deal.expected_retention_months,
          DEFAULT_EXPECTED_RETENTION_MONTHS
        );

        if (monthsSinceClose < 0 || monthsSinceClose >= expectedRetentionMonths) {
          continue;
        }

        const estimatedCommission = normalizeNumber(deal.estimated_commission);
        const renewalProbability =
          normalizeNullableNumber(deal.renewal_probability) ??
          DEFAULT_RENEWAL_PROBABILITY;

        const monthlyCommission =
          expectedRetentionMonths > 0
            ? estimatedCommission / expectedRetentionMonths
            : 0;

        projectedAmount += monthlyCommission;
        confidenceNumerator += renewalProbability * 100;
        confidenceCount += 1;
      }

      for (const lead of pipeline) {
        const estimatedCommission = normalizeNumber(
          (lead as LeadRow & { estimated_commission?: number | null })
            .estimated_commission
        );
        const closeProbability = normalizeNumber(
          (lead as LeadRow & { close_probability?: number | null })
            .close_probability
        );

        if (estimatedCommission <= 0 || closeProbability <= 0) {
          continue;
        }

        const pipelineCommission = estimatedCommission * (closeProbability / 100);
        projectedAmount += pipelineCommission / 12;
        confidenceNumerator += closeProbability;
        confidenceCount += 1;
      }

      const confidence =
        confidenceCount > 0
          ? Math.min(100, Math.round(confidenceNumerator / confidenceCount))
          : DEFAULT_FORECAST_CONFIDENCE;

      const forecast: CommissionForecast = {
        month,
        amount: Math.round(projectedAmount),
        confidence,
      };

      forecasts.push(forecast);

      const insertPayload: CommissionForecastInsert = {
        month: month.toISOString().slice(0, 10),
        projected_amount: forecast.amount,
        actual_amount: null,
        confidence_score: forecast.confidence,
        source: 'pipeline',
      };

      await upsertCommissionForecast(insertPayload);
    }

    return forecasts;
  }

  async getTopDealsByProfitability(
    limit: number = TOP_DEALS_DEFAULT_LIMIT
  ): Promise<
    Array<
      DealEconomicsRow & {
        discovered_leads?: { business_name: string | null } | null;
      }
    >
  > {
    const safeLimit = normalizePositiveInteger(limit, TOP_DEALS_DEFAULT_LIMIT);

    const { data, error } = await supabase
      .from('deal_economics')
      .select('*, discovered_leads(business_name)')
      .order('profitability_score', { ascending: false })
      .limit(safeLimit);

    if (error) {
      await logSystemActivity({
        activityType: 'some_string',
        leadId: 'deal_economics',
        message: error.message,
        details: asJsonObject({ limit: safeLimit }),
      });
      return [];
    }

    return Array.isArray(data)
      ? (data as Array<
          DealEconomicsRow & {
            discovered_leads?: { business_name: string | null } | null;
          }
        >)
      : [];
  }

  async optimizeDeal(leadId: string): Promise<OptimizedDealRecommendation> {
    const lead = await fetchLeadById(leadId);

    if (!lead) {
      throw new Error('Lead not found');
    }

    const { data: suppliersData, error: suppliersError } = await supabase
      .from('suppliers')
      .select('id, company_name')
      .eq('is_active', true);

    if (suppliersError) {
      await logSystemActivity({
        activityType: 'some_string',
        leadId: leadId,
        message: suppliersError.message,
        details: null,
      });
      throw new Error(suppliersError.message);
    }

    const suppliers: SupplierRow[] = Array.isArray(suppliersData)
      ? suppliersData
          .map((row) => {
            const record = row as Record<string, unknown>;
            const id = normalizeString(record.id);
            if (id.length === 0) {
              return null;
            }

            return {
              id,
              company_name: normalizeNullableString(record.company_name),
            };
          })
          .filter((row): row is SupplierRow => row !== null)
      : [];

    let bestTerm: SupportedTerm = 36;
    let bestSupplier = '';
    let bestCommission = 0;
    let rationale =
      'No qualified supplier commission structure was found for this lead.';

    for (const supplier of suppliers) {
      for (const term of SUPPORTED_TERMS) {
        const economics = await this.calculateAndOptionallyPersist(
          leadId,
          supplier.id,
          term,
          0.11,
          false
        );

        if (!economics) {
          continue;
        }

        if (economics.estimatedCommission > bestCommission) {
          bestCommission = economics.estimatedCommission;
          bestTerm = term;
          bestSupplier =
            normalizeString(supplier.company_name) || 'Unknown supplier';
          rationale = `${bestSupplier} offers the strongest commission outcome for a ${term}-month term, yielding an estimated ${Math.round(bestCommission).toLocaleString()} in commissions.`;
        }
      }
    }

    return {
      recommendedTerm: bestTerm,
      recommendedSupplier: bestSupplier,
      expectedCommission: bestCommission,
      rationale,
    };
  }
}

export const dealEconomics = new DealEconomicsEngine();