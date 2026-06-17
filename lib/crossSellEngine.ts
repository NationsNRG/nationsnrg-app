import { supabase } from './supabase';
import type { Json } from '@/types/supabase';

interface LeadRow {
  id: string;
  business_name: string | null;
  industry: string | null;
  employee_count: number | null;
  estimated_energy_spend: number | null;
  locations: number | null;
}

interface ServiceCatalogRow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  monthly_price: number | null;
  annual_price: number | null;
  commission_rate: number | null;
  commission_type: 'one-time' | 'recurring' | null;
  target_industries: string[] | null;
  target_employee_min: number | null;
  target_employee_max: number | null;
  target_locations_min: number | null;
  target_energy_spend_min: number | null;
  synergy_score: number | null;
  bundle_discount: number | null;
  provider: string | null;
  provider_service_id: string | null;
  is_active: boolean | null;
}

interface BundleServiceRow {
  bundle_id: string;
  service_id: string;
}

interface BundleRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  total_monthly_price: number | null;
  total_annual_price: number | null;
  bundle_discount: number | null;
  final_price: number | null;
  commission_total: number | null;
  popularity_score: number | null;
  is_active: boolean | null;
  bundle_services?: BundleServiceRow[] | null;
}

interface CrossSellRecommendationRow {
  id: string;
  lead_id: string;
  service_id: string;
  relevance_score: number | null;
  estimated_savings: number | null;
  estimated_commission: number | null;
  recommended_bundle: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'converted';
  viewed_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CrossSellRecommendationInsert {
  lead_id: string;
  service_id: string;
  relevance_score: number;
  estimated_savings: number;
  estimated_commission: number;
  recommended_bundle?: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'converted';
  viewed_at?: string | null;
  accepted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface CrossSellRecommendationUpdate {
  relevance_score?: number;
  estimated_savings?: number;
  estimated_commission?: number;
  recommended_bundle?: string | null;
  status?: 'pending' | 'accepted' | 'declined' | 'converted';
  viewed_at?: string | null;
  accepted_at?: string | null;
  updated_at?: string;
}

interface SystemActivityInsert {
  event_type: string;
  entity_id: string;
  error_message: string | null;
  metadata: Json | null;
  created_at: string;
}

export interface ServiceRecommendation {
  serviceId: string;
  serviceName: string;
  category: string;
  relevanceScore: number;
  monthlyPrice: number;
  annualPrice: number;
  commissionPotential: number;
  rationale: string;
}

export interface BundleRecommendation {
  bundleId: string;
  bundleName: string;
  description: string;
  services: string[];
  totalPrice: number;
  bundleDiscount: number;
  finalPrice: number;
  savingsVsAlaCarte: number;
  commissionTotal: number;
  relevanceScore: number;
}

interface RecommendationResult {
  services: ServiceRecommendation[];
  bundles: BundleRecommendation[];
}

const MAX_SERVICE_RECOMMENDATIONS = 5;
const MIN_RELEVANCE_SCORE = 60;
const DEFAULT_COMMISSION_RATE = 0.15;
const DEFAULT_BUNDLE_DISCOUNT = 0.1;
const DEFAULT_SYNERGY_SCORE = 50;

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

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function asJson(value: Record<string, Json | undefined>): Json {
  return value;
}

function normalizeLeadRow(value: unknown): LeadRow | null {
  if (!isRecord(value)) return null;

  const id = normalizeString(value.id);
  if (id.length === 0) return null;

  return {
    id,
    business_name: normalizeNullableString(value.business_name),
    industry: normalizeNullableString(value.industry),
    employee_count: normalizeNullableNumber(value.employee_count),
    estimated_energy_spend: normalizeNullableNumber(value.estimated_energy_spend),
    locations: normalizeNullableNumber(value.locations),
  };
}

function normalizeServiceCatalogRow(value: unknown): ServiceCatalogRow | null {
  if (!isRecord(value)) return null;

  const id = normalizeString(value.id);
  const name = normalizeString(value.name);
  const category = normalizeString(value.category);

  if (id.length === 0 || name.length === 0 || category.length === 0) {
    return null;
  }

  const commissionType = normalizeString(value.commission_type);
  const normalizedCommissionType =
    commissionType === 'one-time' || commissionType === 'recurring'
      ? commissionType
      : null;

  return {
    id,
    name,
    category,
    description: normalizeNullableString(value.description),
    monthly_price: normalizeNullableNumber(value.monthly_price),
    annual_price: normalizeNullableNumber(value.annual_price),
    commission_rate: normalizeNullableNumber(value.commission_rate),
    commission_type: normalizedCommissionType,
    target_industries: normalizeStringArray(value.target_industries),
    target_employee_min: normalizeNullableNumber(value.target_employee_min),
    target_employee_max: normalizeNullableNumber(value.target_employee_max),
    target_locations_min: normalizeNullableNumber(value.target_locations_min),
    target_energy_spend_min: normalizeNullableNumber(value.target_energy_spend_min),
    synergy_score: normalizeNullableNumber(value.synergy_score),
    bundle_discount: normalizeNullableNumber(value.bundle_discount),
    provider: normalizeNullableString(value.provider),
    provider_service_id: normalizeNullableString(value.provider_service_id),
    is_active: normalizeBoolean(value.is_active),
  };
}

function normalizeBundleServiceRow(value: unknown): BundleServiceRow | null {
  if (!isRecord(value)) return null;

  const bundleId = normalizeString(value.bundle_id);
  const serviceId = normalizeString(value.service_id);

  if (bundleId.length === 0 || serviceId.length === 0) {
    return null;
  }

  return {
    bundle_id: bundleId,
    service_id: serviceId,
  };
}

function normalizeBundleRow(value: unknown): BundleRow | null {
  if (!isRecord(value)) return null;

  const id = normalizeString(value.id);
  const name = normalizeString(value.name);

  if (id.length === 0 || name.length === 0) {
    return null;
  }

  const rawBundleServices = Array.isArray(value.bundle_services)
    ? value.bundle_services
    : [];

  return {
    id,
    name,
    description: normalizeNullableString(value.description),
    category: normalizeNullableString(value.category),
    total_monthly_price: normalizeNullableNumber(value.total_monthly_price),
    total_annual_price: normalizeNullableNumber(value.total_annual_price),
    bundle_discount: normalizeNullableNumber(value.bundle_discount),
    final_price: normalizeNullableNumber(value.final_price),
    commission_total: normalizeNullableNumber(value.commission_total),
    popularity_score: normalizeNullableNumber(value.popularity_score),
    is_active: normalizeBoolean(value.is_active),
    bundle_services: rawBundleServices
      .map(normalizeBundleServiceRow)
      .filter((item): item is BundleServiceRow => item !== null),
  };
}

function normalizeCrossSellRecommendationRow(
  value: unknown
): CrossSellRecommendationRow | null {
  if (!isRecord(value)) return null;

  const id = normalizeString(value.id);
  const leadId = normalizeString(value.lead_id);
  const serviceId = normalizeString(value.service_id);
  const status = normalizeString(value.status);

  if (
    id.length === 0 ||
    leadId.length === 0 ||
    serviceId.length === 0 ||
    !['pending', 'accepted', 'declined', 'converted'].includes(status)
  ) {
    return null;
  }

  return {
    id,
    lead_id: leadId,
    service_id: serviceId,
    relevance_score: normalizeNullableNumber(value.relevance_score),
    estimated_savings: normalizeNullableNumber(value.estimated_savings),
    estimated_commission: normalizeNullableNumber(value.estimated_commission),
    recommended_bundle: normalizeNullableString(value.recommended_bundle),
    status: status as CrossSellRecommendationRow['status'],
    viewed_at: normalizeNullableString(value.viewed_at),
    accepted_at: normalizeNullableString(value.accepted_at),
    created_at: normalizeString(value.created_at),
    updated_at: normalizeString(value.updated_at),
  };
}

async function logSystemActivity(payload: SystemActivityInsert): Promise<void> {
  const { error } = await supabase.from('system_activity').insert(payload);

  if (error) {
    console.error('cross_sell_system_activity_failed', error.message);
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
      event_type: 'cross_sell_lead_fetch_failed',
      entity_id: leadId,
      error_message: error.message,
      metadata: asJson({ operation: 'fetchLeadById' }),
      created_at: nowIso(),
    });
    return null;
  }

  return Array.isArray(data) && data.length > 0
    ? normalizeLeadRow(data[0])
    : null;
}

async function fetchActiveServices(): Promise<ServiceCatalogRow[]> {
  const { data, error } = await supabase
    .from('service_catalog')
    .select('*')
    .eq('is_active', true);

  if (error) {
    await logSystemActivity({
      event_type: 'cross_sell_services_fetch_failed',
      entity_id: 'service_catalog',
      error_message: error.message,
      metadata: asJson({ operation: 'fetchActiveServices' }),
      created_at: nowIso(),
    });
    return [];
  }

  return Array.isArray(data)
    ? data
        .map(normalizeServiceCatalogRow)
        .filter((item): item is ServiceCatalogRow => item !== null)
    : [];
}

async function fetchActiveBundles(): Promise<BundleRow[]> {
  const { data, error } = await supabase
    .from('bundles')
    .select('*, bundle_services(bundle_id, service_id)')
    .eq('is_active', true);

  if (error) {
    await logSystemActivity({
      event_type: 'cross_sell_bundles_fetch_failed',
      entity_id: 'bundles',
      error_message: error.message,
      metadata: asJson({ operation: 'fetchActiveBundles' }),
      created_at: nowIso(),
    });
    return [];
  }

  return Array.isArray(data)
    ? data
        .map(normalizeBundleRow)
        .filter((item): item is BundleRow => item !== null)
    : [];
}

async function fetchOpenRecommendation(
  leadId: string,
  serviceId: string
): Promise<CrossSellRecommendationRow | null> {
  const { data, error } = await supabase
    .from('cross_sell_recommendations')
    .select('*')
    .eq('lead_id', leadId)
    .eq('service_id', serviceId)
    .in('status', ['pending', 'accepted'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    await logSystemActivity({
      event_type: 'cross_sell_existing_fetch_failed',
      entity_id: leadId,
      error_message: error.message,
      metadata: asJson({ serviceId }),
      created_at: nowIso(),
    });
    return null;
  }

  return Array.isArray(data) && data.length > 0
    ? normalizeCrossSellRecommendationRow(data[0])
    : null;
}

async function persistRecommendation(
  leadId: string,
  recommendation: ServiceRecommendation,
  estimatedSavings: number
): Promise<void> {
  const existing = await fetchOpenRecommendation(leadId, recommendation.serviceId);

  if (existing) {
    const updatePayload: CrossSellRecommendationUpdate = {
      relevance_score: recommendation.relevanceScore,
      estimated_savings: estimatedSavings,
      estimated_commission: recommendation.commissionPotential,
      updated_at: nowIso(),
    };

    const { error } = await supabase
      .from('cross_sell_recommendations')
      .update(updatePayload)
      .eq('id', existing.id);

    if (error) {
      await logSystemActivity({
        event_type: 'cross_sell_recommendation_update_failed',
        entity_id: existing.id,
        error_message: error.message,
        metadata: asJson({ leadId, serviceId: recommendation.serviceId }),
        created_at: nowIso(),
      });
    }

    return;
  }

  const insertPayload: CrossSellRecommendationInsert = {
    lead_id: leadId,
    service_id: recommendation.serviceId,
    relevance_score: recommendation.relevanceScore,
    estimated_savings: estimatedSavings,
    estimated_commission: recommendation.commissionPotential,
    status: 'pending',
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  const { error } = await supabase
    .from('cross_sell_recommendations')
    .insert(insertPayload);

  if (error) {
    await logSystemActivity({
      event_type: 'cross_sell_recommendation_insert_failed',
      entity_id: leadId,
      error_message: error.message,
      metadata: asJson({ serviceId: recommendation.serviceId }),
      created_at: nowIso(),
    });
  }
}

class CrossSellEngine {
  async recommendForLead(leadId: string): Promise<RecommendationResult> {
    const lead = await fetchLeadById(leadId);

    if (!lead) {
      return { services: [], bundles: [] };
    }

    const services = await fetchActiveServices();
    if (services.length === 0) {
      return { services: [], bundles: [] };
    }

    const scoredServices = services.map((service) => this.scoreService(service, lead));
    const topServices = scoredServices
      .filter((service) => service.relevanceScore > MIN_RELEVANCE_SCORE)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, MAX_SERVICE_RECOMMENDATIONS);

    const bundles = await fetchActiveBundles();
    const scoredBundles = bundles
      .map((bundle) => this.scoreBundle(bundle, lead, topServices))
      .filter((bundle) => bundle.relevanceScore > MIN_RELEVANCE_SCORE)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    for (const service of topServices) {
      const estimatedSavings = this.calculateServiceSavings(service);
      await persistRecommendation(leadId, service, estimatedSavings);
    }

    return {
      services: topServices,
      bundles: scoredBundles,
    };
  }

  private scoreService(
    service: ServiceCatalogRow,
    lead: LeadRow
  ): ServiceRecommendation {
    let score = 50;

    const leadIndustry = normalizeString(lead.industry).toLowerCase();
    const targetIndustries = normalizeStringArray(service.target_industries).map(
      (industry) => industry.toLowerCase()
    );

    if (leadIndustry.length > 0 && targetIndustries.includes(leadIndustry)) {
      score += 25;
    }

    const employeeCount = normalizeNullableNumber(lead.employee_count);
    const employeeMin = normalizeNullableNumber(service.target_employee_min) ?? 0;
    const employeeMax =
      normalizeNullableNumber(service.target_employee_max) ?? Number.MAX_SAFE_INTEGER;

    if (
      employeeCount !== null &&
      employeeCount >= employeeMin &&
      employeeCount <= employeeMax
    ) {
      score += 15;
    }

    const locations = normalizeNullableNumber(lead.locations) ?? 0;
    const locationMin = normalizeNullableNumber(service.target_locations_min) ?? 0;
    if (locations >= locationMin && locationMin > 0) {
      score += 10;
    }

    const energySpend = normalizeNullableNumber(lead.estimated_energy_spend) ?? 0;
    const targetEnergySpendMin =
      normalizeNullableNumber(service.target_energy_spend_min) ?? 0;

    if (energySpend >= targetEnergySpendMin && targetEnergySpendMin > 0) {
      score += 10;
    }

    score += (normalizeNullableNumber(service.synergy_score) ?? DEFAULT_SYNERGY_SCORE) * 0.3;

    if (energySpend > 100000) score += 10;
    if (energySpend > 250000) score += 5;

    if (locations > 1 && normalizeString(service.category) === 'Communications') {
      score += 15;
    }

    const annualPrice = normalizeNullableNumber(service.annual_price) ?? 0;
    const monthlyPrice = normalizeNullableNumber(service.monthly_price) ?? 0;
    const commissionRate =
      normalizeNullableNumber(service.commission_rate) ?? DEFAULT_COMMISSION_RATE;
    const commissionPotential = roundCurrency(annualPrice * commissionRate);
    const relevanceScore = clamp(Math.round(score), 0, 100);

    return {
      serviceId: service.id,
      serviceName: service.name,
      category: service.category,
      relevanceScore,
      monthlyPrice,
      annualPrice,
      commissionPotential,
      rationale: this.generateRationale(service, lead, relevanceScore),
    };
  }

  private scoreBundle(
    bundle: BundleRow,
    lead: LeadRow,
    topServices: ServiceRecommendation[]
  ): BundleRecommendation {
    const bundleServiceIds = Array.isArray(bundle.bundle_services)
      ? bundle.bundle_services.map((item) => item.service_id)
      : [];

    const matchingServices = topServices.filter((service) =>
      bundleServiceIds.includes(service.serviceId)
    );

    const alaCarteTotal = roundCurrency(
      matchingServices.reduce((sum, service) => sum + service.annualPrice, 0)
    );

    const bundleDiscount =
      normalizeNullableNumber(bundle.bundle_discount) ?? DEFAULT_BUNDLE_DISCOUNT;
    const persistedFinalPrice = normalizeNullableNumber(bundle.final_price);
    const finalPrice =
      persistedFinalPrice !== null
        ? persistedFinalPrice
        : roundCurrency(alaCarteTotal * (1 - bundleDiscount));

    const savings = roundCurrency(Math.max(0, alaCarteTotal - finalPrice));
    const commissionTotal = roundCurrency(
      matchingServices.reduce((sum, service) => sum + service.commissionPotential, 0)
    );

    const baseScore = matchingServices.reduce(
      (sum, service) => sum + service.relevanceScore,
      0
    );
    const averageServiceScore =
      matchingServices.length > 0 ? baseScore / matchingServices.length : 0;
    const popularityScore = normalizeNullableNumber(bundle.popularity_score) ?? 50;
    const leadEnergySpend = normalizeNullableNumber(lead.estimated_energy_spend) ?? 0;
    const spendBoost = leadEnergySpend > 100000 ? 5 : 0;

    const relevanceScore = clamp(
      Math.round(averageServiceScore * 0.7 + popularityScore * 0.2 + spendBoost),
      0,
      100
    );

    return {
      bundleId: bundle.id,
      bundleName: bundle.name,
      description: bundle.description ?? '',
      services: matchingServices.map((service) => service.serviceName),
      totalPrice: alaCarteTotal,
      bundleDiscount: roundCurrency(bundleDiscount * 100),
      finalPrice,
      savingsVsAlaCarte: savings,
      commissionTotal,
      relevanceScore,
    };
  }

  private generateRationale(
    service: ServiceCatalogRow,
    lead: LeadRow,
    score: number
  ): string {
    const businessName = normalizeString(lead.business_name) || 'this business';
    const industryContext = this.getIndustryContext(lead.industry);
    const annualPrice = normalizeNullableNumber(service.annual_price) ?? 0;
    const modeledSavings = Math.round(annualPrice * 0.15);

    if (score > 85) {
      return `${service.name} is an ideal fit for ${businessName} given their ${industryContext}. This typically delivers approximately $${modeledSavings.toLocaleString()} in annual efficiency value.`;
    }

    if (score > 70) {
      return `${service.name} would complement ${businessName}'s operations well. It aligns strongly with their ${industryContext}.`;
    }

    return `${service.name} may be relevant based on their ${industryContext}. It is worth exploring as part of a broader advisory conversation.`;
  }

  private calculateServiceSavings(service: ServiceRecommendation): number {
    const savingsPercent = service.category === 'Energy' ? 0.2 : 0.15;
    return roundCurrency(service.annualPrice * savingsPercent);
  }

  private getIndustryContext(industry: string | null): string {
    const contexts: Record<string, string> = {
      restaurant: 'high energy usage and customer-facing operations',
      retail: 'customer traffic patterns and POS systems',
      manufacturing: 'production schedules and equipment needs',
      office: 'hybrid work and collaboration needs',
      hotel: 'guest experience and operational efficiency',
      medical: 'patient data security and compliance needs',
      finance: 'security, resilience, and compliance priorities',
      warehouse: 'facility operations and logistics workflows',
    };

    const key = normalizeString(industry).toLowerCase();
    return contexts[key] ?? 'business profile';
  }

  async acceptRecommendation(recommendationId: string): Promise<void> {
    const normalizedId = normalizeString(recommendationId);

    if (normalizedId.length === 0) {
      throw new Error('Invalid recommendationId');
    }

    const { error } = await supabase
      .from('cross_sell_recommendations')
      .update({
        status: 'accepted',
        accepted_at: nowIso(),
        updated_at: nowIso(),
      })
      .eq('id', normalizedId);

    if (error) {
      await logSystemActivity({
        event_type: 'cross_sell_accept_failed',
        entity_id: normalizedId,
        error_message: error.message,
        metadata: asJson({ operation: 'acceptRecommendation' }),
        created_at: nowIso(),
      });
      throw new Error(error.message);
    }

    try {
      const moduleValue: unknown = await import('./eventEmitter');
      if (
        isRecord(moduleValue) &&
        'eventEmitter' in moduleValue &&
        isRecord(moduleValue.eventEmitter) &&
        'emit' in moduleValue.eventEmitter &&
        typeof moduleValue.eventEmitter.emit === 'function'
      ) {
        const emitFn = moduleValue.eventEmitter.emit as (
          eventType: string,
          payload: { metadata?: Record<string, Json | undefined> }
        ) => Promise<string>;

        await emitFn('cross_sell_accepted', {
          metadata: { recommendationId: normalizedId },
        });
      }
    } catch (error) {
      await logSystemActivity({
        event_type: 'cross_sell_accept_event_failed',
        entity_id: normalizedId,
        error_message: safeErrorMessage(error),
        metadata: asJson({ operation: 'acceptRecommendation.emitEvent' }),
        created_at: nowIso(),
      });
    }
  }

  async generateBundleProposal(leadId: string, bundleId: string): Promise<string> {
    const normalizedLeadId = normalizeString(leadId);
    const normalizedBundleId = normalizeString(bundleId);

    if (normalizedLeadId.length === 0 || normalizedBundleId.length === 0) {
      return '';
    }

    const recommendations = await this.recommendForLead(normalizedLeadId);
    const bundle = recommendations.bundles.find(
      (item) => item.bundleId === normalizedBundleId
    );

    if (!bundle) {
      return '';
    }

    const servicesMarkup = bundle.services
      .map((serviceName) => `<li>${this.escapeHtml(serviceName)}</li>`)
      .join('');

    return `
<h2>📦 Recommended Bundle: ${this.escapeHtml(bundle.bundleName)}</h2>
<p>${this.escapeHtml(bundle.description)}</p>

<h3>What's Included:</h3>
<ul>
  ${servicesMarkup}
</ul>

<h3>Pricing:</h3>
<ul>
  <li>A la carte price: $${bundle.totalPrice.toLocaleString()}/year</li>
  <li>Bundle discount: ${bundle.bundleDiscount}%</li>
  <li><strong>Your price: $${bundle.finalPrice.toLocaleString()}/year</strong></li>
  <li><strong>Total savings: $${bundle.savingsVsAlaCarte.toLocaleString()}/year</strong></li>
</ul>

<h3>Commission Potential:</h3>
<p>$${bundle.commissionTotal.toLocaleString()} estimated commission</p>

<p><a href="/api/bundles/accept/${encodeURIComponent(bundle.bundleId)}?lead=${encodeURIComponent(normalizedLeadId)}">Accept This Bundle</a></p>
    `.trim();
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}

export const crossSellEngine = new CrossSellEngine();