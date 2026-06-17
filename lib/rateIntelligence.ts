import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { eventEmitter } from './eventEmitter';
import type { Database, Json } from '@/types/supabase';

interface RateData {
  supplierId: string;
  region: string;
  businessTypeId: number;
  fixedRate: number;
  termMonths: number;
  effectiveDate: Date;
  marketIndex?: string;
  volatilityScore?: number;
}

export interface MarketTrend {
  region: string;
  direction: 'rising' | 'falling' | 'stable';
  percentChange: number;
  recommendation: 'lock_now' | 'wait' | 'monitor';
}

interface SupplierRateInsert {
  supplier_id: string;
  region: string;
  business_type_id: number;
  fixed_rate: number;
  term_months: number;
  effective_date: string;
  market_index?: string | null;
  volatility_score: number;
  source: string;
  is_active?: boolean;
  scraped_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface SupplierRateRow {
  id: string;
  supplier_id: string;
  region: string;
  business_type_id: number | null;
  fixed_rate: number | null;
  variable_discount: number | null;
  term_months: number | null;
  effective_date: string;
  expiration_date: string | null;
  market_index: string | null;
  volatility_score: number | null;
  source: string | null;
  scraped_at: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  suppliers?: {
    company_name: string | null;
  } | {
    company_name: string | null;
  }[] | null;
}

interface MarketPriceRow {
  id: string;
  region: string;
  market_index: string | null;
  delivery_date: string;
  price: number;
  price_type: 'spot' | 'forward' | 'futures';
  source: string | null;
  recorded_at: string;
  created_at: string | null;
  updated_at: string | null;
}

interface RateAlertInsert {
  lead_id: string;
  old_rate?: number | null;
  new_rate?: number | null;
  savings_impact?: number | null;
  alert_type: 'price_drop' | 'competitor_beat' | 'expiration';
  sent_at?: string | null;
  viewed?: boolean;
  alert_date?: string;
  created_at?: string;
  updated_at?: string;
}

interface LeadRow {
  id: string;
  state: string | null;
  business_type_id: number | null;
  status: string | null;
  current_rate: number | null;
  estimated_energy_spend: number | null;
  estimated_savings: number | null;
  estimated_commission: number | null;
}

interface LeadUpdate {
  estimated_savings?: number;
  estimated_commission?: number;
}

interface SystemActivityInsert {
  event_type: string;
  entity_id: string;
  error_message: string | null;
  metadata: Json | null;
  created_at: string;
}

interface BestRateResult {
  rate: number;
  supplier: string;
  savings: number;
}

const DEFAULT_RATE_FALLBACK = 0.12;
const DEFAULT_VOLATILITY_SCORE = 50;
const DEFAULT_MARKET_TREND_DAYS = 90;
const MAX_CHECK_LEADS_BATCH = 500;

function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  if (typeof key !== 'string' || key.length === 0) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
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

function normalizeDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isLeadRow(value: unknown): value is LeadRow {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string';
}

function isSupplierRateRow(value: unknown): value is SupplierRateRow {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string';
}

function isMarketPriceRow(value: unknown): value is MarketPriceRow {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string' && typeof row.delivery_date === 'string';
}

function parseSupplierName(
  suppliers: SupplierRateRow['suppliers']
): string {
  if (Array.isArray(suppliers)) {
    const first = suppliers[0];
    return normalizeString(first?.company_name) || 'Unknown supplier';
  }

  if (suppliers && typeof suppliers === 'object') {
    return normalizeString(suppliers.company_name) || 'Unknown supplier';
  }

  return 'Unknown supplier';
}

async function logSystemActivity(
  supabase: SupabaseClient,
  payload: SystemActivityInsert
): Promise<void> {
  const { error } = await supabase.from('system_activity').insert(payload);

  if (error) {
    console.error('rate_intelligence_log_failed', error.message);
  }
}

async function emitBetterRateAvailableEvent(
  leadId: string,
  metadata: Record<string, Json | undefined>
): Promise<void> {
  try {
    const typedEmitter = eventEmitter as unknown as {
      emit: (
        eventType: string,
        data: {
          leadId?: string;
          conversationId?: string;
          emailId?: string;
          metadata?: Record<string, Json | undefined>;
          scheduledFor?: Date;
          priority?: number;
          dedupeKey?: string;
          maxRetries?: number;
        }
      ) => Promise<string>;
    };

    await typedEmitter.emit('better_rate_available', {
      leadId,
      metadata,
      dedupeKey: `better_rate_available:${leadId}:${normalizeString(
        String(metadata.newRate ?? '')
      )}:${todayIsoDate()}`,
    });
  } catch {
    // Intentionally swallow; caller logs durable activity separately.
  }
}

class RateIntelligence {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = getSupabaseClient();
  }

  async ingestRate(rate: RateData): Promise<string> {
    const normalizedRate = this.normalizeRateInput(rate);
    if (!normalizedRate) {
      throw new Error('Invalid rate data');
    }

    const volatilityScore = clamp(
      normalizeNumber(normalizedRate.volatilityScore ?? DEFAULT_VOLATILITY_SCORE),
      0,
      100
    );

    const payload: SupplierRateInsert = {
      supplier_id: normalizedRate.supplierId,
      region: normalizedRate.region,
      business_type_id: normalizedRate.businessTypeId,
      fixed_rate: normalizedRate.fixedRate,
      term_months: normalizedRate.termMonths,
      effective_date: normalizedRate.effectiveDate.toISOString().slice(0, 10),
      market_index: normalizedRate.marketIndex ?? null,
      volatility_score: volatilityScore,
      source: 'api',
      is_active: true,
      scraped_at: nowIso(),
      created_at: nowIso(),
      updated_at: nowIso(),
    };

    const { data, error } = await this.supabase
      .from('supplier_rates_live')
      .insert(payload)
      .select('*');

    if (error) {
      await logSystemActivity(this.supabase, {
        event_type: 'supplier_rate_ingest_failed',
        entity_id: normalizedRate.supplierId,
        error_message: error.message,
        metadata: {
          region: normalizedRate.region,
          businessTypeId: normalizedRate.businessTypeId,
          termMonths: normalizedRate.termMonths,
        },
        created_at: nowIso(),
      });
      throw new Error(error.message);
    }

    const inserted =
      Array.isArray(data) && data.length > 0 && isSupplierRateRow(data[0])
        ? data[0]
        : null;

    if (!inserted) {
      await logSystemActivity(this.supabase, {
        event_type: 'supplier_rate_ingest_empty',
        entity_id: normalizedRate.supplierId,
        error_message: 'Insert returned no row',
        metadata: {
          region: normalizedRate.region,
          businessTypeId: normalizedRate.businessTypeId,
        },
        created_at: nowIso(),
      });
      throw new Error('Insert returned no row');
    }

    await this.checkForBetterRates(normalizedRate);

    return inserted.id;
  }

  async findBestRate(
    leadId: string,
    termMonths: number = 36
  ): Promise<BestRateResult | null> {
    const lead = await this.fetchLeadById(leadId);
    if (!lead) {
      return null;
    }

    const region = normalizeNullableString(lead.state);
    const businessTypeId = normalizeNullableNumber(lead.business_type_id);
    const currentRate = normalizeNullableNumber(lead.current_rate);
    const estimatedEnergySpend = normalizeNumber(lead.estimated_energy_spend);

    if (!region || businessTypeId === null || currentRate === null || currentRate <= 0) {
      return null;
    }

    const { data, error } = await this.supabase
      .from('supplier_rates_live')
      .select('*, suppliers(company_name)')
      .eq('region', region)
      .eq('business_type_id', businessTypeId)
      .eq('term_months', termMonths)
      .eq('is_active', true)
      .lte('effective_date', todayIsoDate())
      .order('fixed_rate', { ascending: true })
      .limit(1);

    if (error) {
      await logSystemActivity(this.supabase, {
        event_type: 'best_rate_lookup_failed',
        entity_id: leadId,
        error_message: error.message,
        metadata: {
          region,
          businessTypeId,
          termMonths,
        },
        created_at: nowIso(),
      });
      return null;
    }

    const bestRate =
      Array.isArray(data) && data.length > 0 && isSupplierRateRow(data[0])
        ? data[0]
        : null;

    const fixedRate = normalizeNullableNumber(bestRate?.fixed_rate);
    if (!bestRate || fixedRate === null) {
      return null;
    }

    const savings =
      currentRate > 0
        ? (estimatedEnergySpend * (currentRate - fixedRate)) / currentRate
        : 0;

    return {
      rate: fixedRate,
      supplier: parseSupplierName(bestRate.suppliers),
      savings: Number.isFinite(savings) ? savings : 0,
    };
  }

  async getMarketTrends(
    region: string,
    days: number = DEFAULT_MARKET_TREND_DAYS
  ): Promise<MarketTrend> {
    const normalizedRegion = normalizeString(region);
    const safeDays =
      typeof days === 'number' && Number.isFinite(days) && days > 0
        ? Math.trunc(days)
        : DEFAULT_MARKET_TREND_DAYS;

    if (normalizedRegion.length === 0) {
      return {
        region: '',
        direction: 'stable',
        percentChange: 0,
        recommendation: 'monitor',
      };
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - safeDays);

    const { data, error } = await this.supabase
      .from('market_prices')
      .select('*')
      .eq('region', normalizedRegion)
      .gte('delivery_date', startDate.toISOString().slice(0, 10))
      .order('delivery_date', { ascending: true });

    if (error) {
      await logSystemActivity(this.supabase, {
        event_type: 'market_trend_lookup_failed',
        entity_id: normalizedRegion,
        error_message: error.message,
        metadata: {
          days: safeDays,
        },
        created_at: nowIso(),
      });

      return {
        region: normalizedRegion,
        direction: 'stable',
        percentChange: 0,
        recommendation: 'monitor',
      };
    }

    const prices = Array.isArray(data) ? data.filter(isMarketPriceRow) : [];
    if (prices.length === 0) {
      return {
        region: normalizedRegion,
        direction: 'stable',
        percentChange: 0,
        recommendation: 'monitor',
      };
    }

    const oldestPrice = normalizeNumber(prices[0].price);
    const newestPrice = normalizeNumber(prices[prices.length - 1].price);

    if (oldestPrice <= 0) {
      return {
        region: normalizedRegion,
        direction: 'stable',
        percentChange: 0,
        recommendation: 'monitor',
      };
    }

    const percentChange = ((newestPrice - oldestPrice) / oldestPrice) * 100;

    let direction: MarketTrend['direction'] = 'stable';
    let recommendation: MarketTrend['recommendation'] = 'monitor';

    if (percentChange > 5) {
      direction = 'rising';
      recommendation = 'lock_now';
    } else if (percentChange < -5) {
      direction = 'falling';
      recommendation = 'wait';
    }

    return {
      region: normalizedRegion,
      direction,
      percentChange,
      recommendation,
    };
  }

  async refreshProposal(leadId: string): Promise<LeadRow | null> {
    const bestRate = await this.findBestRate(leadId);
    if (!bestRate) {
      return null;
    }

    const updatePayload: LeadUpdate = {
      estimated_savings: bestRate.savings,
      estimated_commission: bestRate.savings * 0.1,
    };

    const { data, error } = await this.supabase
      .from('discovered_leads')
      .update(updatePayload)
      .eq('id', leadId)
      .select('*');

    if (error) {
      await logSystemActivity(this.supabase, {
        event_type: 'proposal_refresh_failed',
        entity_id: leadId,
        error_message: error.message,
        metadata: {
          estimatedSavings: bestRate.savings,
          estimatedCommission: bestRate.savings * 0.1,
        },
        created_at: nowIso(),
      });
      return null;
    }

    const updatedLead =
      Array.isArray(data) && data.length > 0 && isLeadRow(data[0])
        ? data[0]
        : null;

    return updatedLead;
  }

  private normalizeRateInput(rate: RateData): RateData | null {
    const supplierId = normalizeString(rate.supplierId);
    const region = normalizeString(rate.region);
    const businessTypeId = normalizeNumber(rate.businessTypeId);
    const fixedRate = normalizeNumber(rate.fixedRate);
    const termMonths = normalizeNumber(rate.termMonths);
    const effectiveDate = normalizeDate(rate.effectiveDate);
    const marketIndex = normalizeNullableString(rate.marketIndex);
    const volatilityScore = clamp(
      normalizeNumber(rate.volatilityScore ?? DEFAULT_VOLATILITY_SCORE),
      0,
      100
    );

    if (
      supplierId.length === 0 ||
      region.length === 0 ||
      businessTypeId <= 0 ||
      fixedRate <= 0 ||
      ![12, 24, 36, 48, 60].includes(termMonths) ||
      effectiveDate === null
    ) {
      return null;
    }

    return {
      supplierId,
      region,
      businessTypeId,
      fixedRate,
      termMonths,
      effectiveDate,
      marketIndex: marketIndex ?? undefined,
      volatilityScore,
    };
  }

  private async checkForBetterRates(newRate: RateData): Promise<void> {
    const { data, error } = await this.supabase
      .from('discovered_leads')
      .select('*')
      .eq('state', newRate.region)
      .eq('business_type_id', newRate.businessTypeId)
      .neq('status', 'closed')
      .limit(MAX_CHECK_LEADS_BATCH);

    if (error) {
      await logSystemActivity(this.supabase, {
        event_type: 'better_rate_lead_scan_failed',
        entity_id: newRate.supplierId,
        error_message: error.message,
        metadata: {
          region: newRate.region,
          businessTypeId: newRate.businessTypeId,
        },
        created_at: nowIso(),
      });
      return;
    }

    const leads = Array.isArray(data) ? data.filter(isLeadRow) : [];
    for (const lead of leads) {
      const currentBest = await this.findBestRate(lead.id);
      const leadCurrentRate =
        normalizeNullableNumber(lead.current_rate) ?? DEFAULT_RATE_FALLBACK;

      if (!currentBest || currentBest.rate >= leadCurrentRate) {
        continue;
      }

      const alertPayload: RateAlertInsert = {
        lead_id: lead.id,
        old_rate: lead.current_rate,
        new_rate: currentBest.rate,
        savings_impact: currentBest.savings,
        alert_type: 'price_drop',
        sent_at: nowIso(),
        viewed: false,
        alert_date: todayIsoDate(),
        created_at: nowIso(),
        updated_at: nowIso(),
      };

      const { error: alertError } = await this.supabase
        .from('rate_alerts')
        .insert(alertPayload);

      if (alertError) {
        await logSystemActivity(this.supabase, {
          event_type: 'rate_alert_insert_failed',
          entity_id: lead.id,
          error_message: alertError.message,
          metadata: {
            oldRate: lead.current_rate,
            newRate: currentBest.rate,
            savings: currentBest.savings,
          },
          created_at: nowIso(),
        });
      }

      await emitBetterRateAvailableEvent(lead.id, {
        oldRate: normalizeNullableNumber(lead.current_rate),
        newRate: currentBest.rate,
        savings: currentBest.savings,
        supplier: currentBest.supplier,
      });
    }
  }

  private async fetchLeadById(leadId: string): Promise<LeadRow | null> {
    const { data, error } = await this.supabase
      .from('discovered_leads')
      .select('*')
      .eq('id', leadId)
      .limit(1);

    if (error) {
      await logSystemActivity(this.supabase, {
        event_type: 'lead_fetch_failed',
        entity_id: leadId,
        error_message: error.message,
        metadata: null,
        created_at: nowIso(),
      });
      return null;
    }

    const lead =
      Array.isArray(data) && data.length > 0 && isLeadRow(data[0])
        ? data[0]
        : null;

    return lead;
  }
}

export const rateIntelligence = new RateIntelligence();