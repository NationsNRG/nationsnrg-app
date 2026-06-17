import { supabase } from './supabase';
import type { Database, Json } from '@/types/supabase';

type PublicSchema = Database['public'];

type AnalyticsDailyRow = PublicSchema['Tables']['analytics_daily']['Row'];
type AnalyticsDailyInsert = PublicSchema['Tables']['analytics_daily']['Insert'];
type ExecutiveSummaryInsert = PublicSchema['Tables']['executive_summaries']['Insert'];
type AIConversationRow = PublicSchema['Tables']['ai_conversations']['Row'];
type AIMessageLogRow = PublicSchema['Tables']['ai_message_log']['Row'];
type DealEconomicsRow = PublicSchema['Tables']['deal_economics']['Row'];
type DiscoveredLeadRow = PublicSchema['Tables']['discovered_leads']['Row'];
type SystemActivityInsert = PublicSchema['Tables']['system_activity']['Insert'];

interface DailyMetrics {
  date: string;
  newLeads: number;
  totalLeads: number;
  qualifiedLeads: number;
  enterpriseLeads: number;
  leadsContacted: number;
  proposalsSent: number;
  dealsClosed: number;
  conversionRate: number;
  totalCommission: number;
  avgCommission: number;
  projectedCommission: number;
  aiConversationsStarted: number;
  aiMessagesSent: number;
  aiCloseRate: number;
  emailOpens: number;
  emailClicks: number;
  smsSent: number;
  smsResponses: number;
  linkedinMessages: number;
}

interface FunnelStage {
  stage: string;
  count: number;
  conversion: number;
}

interface AIEffectiveness {
  objectionType: string;
  timesUsed: number;
  successRate: number;
  sampleSize: number;
}

interface ExecutiveSummary {
  title: string;
  summary: string;
  highlights: string[];
  recommendations: string[];
  metrics: DailyMetrics;
  topPerformers: Array<{ name: string; value: number }>;
  aiInsights: AIEffectiveness[];
}

interface ConversationInsightRecord {
  objection_type: string | null;
  led_to_close: boolean | null;
  led_to_interest: boolean | null;
}

interface LeadProjectionRecord {
  estimatedCommission: number;
  leadScore: number;
  status: string | null;
}

interface TopDealRecord {
  businessName: string;
  estimatedCommission: number;
}

interface DayBounds {
  isoDate: string;
  startIso: string;
  endIso: string;
}

const DEFAULT_SMS_SENT = 0;
const DEFAULT_SMS_RESPONSES = 0;
const DEFAULT_LINKEDIN_MESSAGES = 0;
const QUALIFIED_LEAD_SCORE_THRESHOLD = 50;
const PROJECTED_COMMISSION_SCORE_THRESHOLD = 40;
const PERCENT_SCALE = 100;

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

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 100) {
    return 100;
  }

  return Number(value.toFixed(2));
}

function buildDayBounds(date: Date): DayBounds {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

  return {
    isoDate: start.toISOString().slice(0, 10),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function buildWeekBounds(weekStart: Date): { startDate: string; endDate: string; weekEnd: Date } {
  const start = new Date(Date.UTC(
    weekStart.getUTCFullYear(),
    weekStart.getUTCMonth(),
    weekStart.getUTCDate(),
    0,
    0,
    0,
    0
  ));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    weekEnd: end,
  };
}

function calculateRate(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  return clampPercentage((numerator / denominator) * PERCENT_SCALE);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getObjectValue(record: unknown, key: string): unknown {
  const objectRecord = asRecord(record);
  if (!objectRecord) {
    return undefined;
  }

  return objectRecord[key];
}

function extractLeadStatus(lead: DiscoveredLeadRow): string | null {
  return normalizeNullableString(getObjectValue(lead, 'status'));
}

function extractLeadScore(lead: DiscoveredLeadRow): number {
  return normalizeNumber(getObjectValue(lead, 'lead_score'));
}

function extractIsEnterprise(lead: DiscoveredLeadRow): boolean {
  return normalizeBoolean(getObjectValue(lead, 'is_enterprise'));
}

function extractEstimatedCommissionFromLead(lead: DiscoveredLeadRow): number {
  return normalizeNumber(getObjectValue(lead, 'estimated_commission'));
}

function normalizeDailyMetricsRow(row: AnalyticsDailyRow): DailyMetrics {
  return {
    date: row.date,
    newLeads: normalizeNumber(row.new_leads),
    totalLeads: normalizeNumber(row.total_leads),
    qualifiedLeads: normalizeNumber(row.qualified_leads),
    enterpriseLeads: normalizeNumber(row.enterprise_leads),
    leadsContacted: normalizeNumber(row.leads_contacted),
    proposalsSent: normalizeNumber(row.proposals_sent),
    dealsClosed: normalizeNumber(row.deals_closed),
    conversionRate: clampPercentage(normalizeNumber(row.conversion_rate)),
    totalCommission: normalizeNumber(row.total_commission),
    avgCommission: normalizeNumber(row.avg_commission),
    projectedCommission: normalizeNumber(row.projected_commission),
    aiConversationsStarted: normalizeNumber(row.ai_conversations_started),
    aiMessagesSent: normalizeNumber(row.ai_messages_sent),
    aiCloseRate: clampPercentage(normalizeNumber(row.ai_close_rate)),
    emailOpens: normalizeNumber(row.email_opens),
    emailClicks: normalizeNumber(row.email_clicks),
    smsSent: normalizeNumber(row.sms_sent),
    smsResponses: normalizeNumber(row.sms_responses),
    linkedinMessages: normalizeNumber(row.linkedin_messages),
  };
}

function aggregateDailyMetrics(rows: AnalyticsDailyRow[], label: string): DailyMetrics {
  const totals = rows.reduce<DailyMetrics>(
    (accumulator, row) => {
      const normalized = normalizeDailyMetricsRow(row);

      accumulator.newLeads += normalized.newLeads;
      accumulator.totalLeads = Math.max(accumulator.totalLeads, normalized.totalLeads);
      accumulator.qualifiedLeads = Math.max(accumulator.qualifiedLeads, normalized.qualifiedLeads);
      accumulator.enterpriseLeads = Math.max(accumulator.enterpriseLeads, normalized.enterpriseLeads);
      accumulator.leadsContacted += normalized.leadsContacted;
      accumulator.proposalsSent += normalized.proposalsSent;
      accumulator.dealsClosed += normalized.dealsClosed;
      accumulator.totalCommission += normalized.totalCommission;
      accumulator.projectedCommission += normalized.projectedCommission;
      accumulator.aiConversationsStarted += normalized.aiConversationsStarted;
      accumulator.aiMessagesSent += normalized.aiMessagesSent;
      accumulator.emailOpens += normalized.emailOpens;
      accumulator.emailClicks += normalized.emailClicks;
      accumulator.smsSent += normalized.smsSent;
      accumulator.smsResponses += normalized.smsResponses;
      accumulator.linkedinMessages += normalized.linkedinMessages;

      return accumulator;
    },
    {
      date: label,
      newLeads: 0,
      totalLeads: 0,
      qualifiedLeads: 0,
      enterpriseLeads: 0,
      leadsContacted: 0,
      proposalsSent: 0,
      dealsClosed: 0,
      conversionRate: 0,
      totalCommission: 0,
      avgCommission: 0,
      projectedCommission: 0,
      aiConversationsStarted: 0,
      aiMessagesSent: 0,
      aiCloseRate: 0,
      emailOpens: 0,
      emailClicks: 0,
      smsSent: 0,
      smsResponses: 0,
      linkedinMessages: 0,
    }
  );

  totals.conversionRate = calculateRate(totals.dealsClosed, totals.newLeads);
  totals.avgCommission = totals.dealsClosed > 0 ? Number((totals.totalCommission / totals.dealsClosed).toFixed(2)) : 0;
  totals.aiCloseRate = calculateRate(totals.dealsClosed, totals.aiConversationsStarted);

  return totals;
}

function normalizeConversationInsightRow(row: unknown): ConversationInsightRecord | null {
  const objectionType = normalizeNullableString(getObjectValue(row, 'objection_type'));
  const ledToClose = getObjectValue(row, 'led_to_close');
  const ledToInterest = getObjectValue(row, 'led_to_interest');

  if (objectionType === null) {
    return null;
  }

  return {
    objection_type: objectionType,
    led_to_close: ledToClose === true,
    led_to_interest: ledToInterest === true,
  };
}

function normalizeTopDealRow(row: DiscoveredLeadRow): TopDealRecord | null {
  const businessName = normalizeNullableString(row.business_name);
  const estimatedCommission = extractEstimatedCommissionFromLead(row);

  if (businessName === null || estimatedCommission <= 0) {
    return null;
  }

  return {
    businessName,
    estimatedCommission,
  };
}

async function logSystemActivity(params: {
  activityType: string;
  leadId?: string | null;
  message: string;
  details?: Json;
}): Promise<void> {
  const payload: SystemActivityInsert = {
    activity_type: params.activityType,
    lead_id: params.leadId ?? null,
    details: {
      message: params.message,
      payload: params.details ?? null,
    },
    created_at: nowIso(),
  };

  const { error } = await supabase.from('system_activity').insert(payload);

  if (error) {
    console.error('system_activity_log_failed', error.message);
  }
}

class AnalyticsEngine {
  async generateDailyMetrics(date: Date = new Date()): Promise<DailyMetrics> {
    const bounds = buildDayBounds(date);

    const [leadResult, conversationResult, dealResult, messageResult] = await Promise.all([
      supabase
        .from('discovered_leads')
        .select('*')
        .gte('created_at', bounds.startIso)
        .lte('created_at', bounds.endIso),
      supabase
        .from('ai_conversations')
        .select('*')
        .gte('created_at', bounds.startIso)
        .lte('created_at', bounds.endIso),
      supabase
        .from('deal_economics')
        .select('*')
        .gte('closed_at', bounds.startIso)
        .lte('closed_at', bounds.endIso),
      supabase
        .from('ai_message_log')
        .select('*')
        .gte('created_at', bounds.startIso)
        .lte('created_at', bounds.endIso),
    ]);

    if (leadResult.error || conversationResult.error || dealResult.error || messageResult.error) {
      await logSystemActivity({
        activityType: 'analytics_daily_generation_failed',
        message: 'One or more daily analytics queries failed',
        details: {
          date: bounds.isoDate,
          leadsError: leadResult.error?.message ?? null,
          conversationsError: conversationResult.error?.message ?? null,
          dealsError: dealResult.error?.message ?? null,
          messagesError: messageResult.error?.message ?? null,
        },
      });

      throw new Error('Failed to generate daily metrics');
    }

    const leads = Array.isArray(leadResult.data) ? leadResult.data : [];
    const conversations = Array.isArray(conversationResult.data) ? conversationResult.data : [];
    const deals = Array.isArray(dealResult.data) ? dealResult.data : [];
    const messages = Array.isArray(messageResult.data) ? messageResult.data : [];

    const totalLeads = await this.getTotalLeadCount();
    const qualifiedLeads = await this.getQualifiedLeadCount();
    const enterpriseLeads = await this.getEnterpriseLeadCount();
    const projectedCommission = await this.calculateProjectedCommission();
    const emailOpens = await this.getEventCount('email_opened', bounds.startIso, bounds.endIso);
    const emailClicks = await this.getEventCount('email_clicked', bounds.startIso, bounds.endIso);

    const newLeads = leads.length;
    const leadsContacted = leads.filter((lead) => extractLeadStatus(lead) === 'contacted').length;
    const proposalsSent = leads.filter((lead) => {
      const status = extractLeadStatus(lead);
      return status === 'proposal' || status === 'proposals_sent';
    }).length;
    const dealsClosed = deals.length;

    const totalCommission = Number(
      deals.reduce((sum, deal) => sum + normalizeNumber(deal.estimated_commission), 0).toFixed(2)
    );
    const avgCommission = dealsClosed > 0 ? Number((totalCommission / dealsClosed).toFixed(2)) : 0;

    const aiConversationsStarted = conversations.length;
    const aiMessagesSent = messages.filter((message) => message.sender === 'ai').length;
    const closedConversationCount = conversations.filter(
      (conversation) => normalizeNullableString(conversation.conversation_stage) === 'closed'
    ).length;
    const aiCloseRate = calculateRate(closedConversationCount, aiConversationsStarted);
    const conversionRate = calculateRate(dealsClosed, newLeads);

    const metrics: DailyMetrics = {
      date: bounds.isoDate,
      newLeads,
      totalLeads,
      qualifiedLeads,
      enterpriseLeads,
      leadsContacted,
      proposalsSent,
      dealsClosed,
      conversionRate,
      totalCommission,
      avgCommission,
      projectedCommission,
      aiConversationsStarted,
      aiMessagesSent,
      aiCloseRate,
      emailOpens,
      emailClicks,
      smsSent: DEFAULT_SMS_SENT,
      smsResponses: DEFAULT_SMS_RESPONSES,
      linkedinMessages: DEFAULT_LINKEDIN_MESSAGES,
    };

    const upsertPayload: AnalyticsDailyInsert = {
      date: metrics.date,
      new_leads: metrics.newLeads,
      total_leads: metrics.totalLeads,
      qualified_leads: metrics.qualifiedLeads,
      enterprise_leads: metrics.enterpriseLeads,
      leads_contacted: metrics.leadsContacted,
      proposals_sent: metrics.proposalsSent,
      deals_closed: metrics.dealsClosed,
      conversion_rate: metrics.conversionRate,
      total_commission: metrics.totalCommission,
      avg_commission: metrics.avgCommission,
      projected_commission: metrics.projectedCommission,
      ai_conversations_started: metrics.aiConversationsStarted,
      ai_messages_sent: metrics.aiMessagesSent,
      ai_close_rate: metrics.aiCloseRate,
      email_opens: metrics.emailOpens,
      email_clicks: metrics.emailClicks,
      sms_sent: metrics.smsSent,
      sms_responses: metrics.smsResponses,
      linkedin_messages: metrics.linkedinMessages,
    };

    const { error: upsertError } = await supabase
      .from('analytics_daily')
      .upsert(upsertPayload, { onConflict: 'date' });

    if (upsertError) {
      await logSystemActivity({
        activityType: 'analytics_daily_upsert_failed',
        message: upsertError.message,
        details: {
          date: metrics.date,
        },
      });

      throw new Error(`Failed to persist daily metrics: ${upsertError.message}`);
    }

    return metrics;
  }

  async getFunnelAnalysis(): Promise<FunnelStage[]> {
    const stages = ['new', 'contacted', 'proposal', 'negotiation', 'closed'] as const;
    const funnel: FunnelStage[] = [];

    let previousCount: number | null = null;

    for (const stage of stages) {
      const { count, error } = await supabase
        .from('discovered_leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', stage);

      if (error) {
        await logSystemActivity({
          activityType: 'analytics_funnel_stage_failed',
          message: error.message,
          details: {
            stage,
          },
        });

        throw new Error(`Failed to fetch funnel analysis for stage "${stage}"`);
      }

      const safeCount = normalizeNumber(count);
      const conversion = previousCount !== null && previousCount > 0
        ? calculateRate(safeCount, previousCount)
        : 0;

      funnel.push({
        stage,
        count: safeCount,
        conversion,
      });

      previousCount = safeCount;
    }

    return funnel;
  }

  async getAIEffectiveness(): Promise<AIEffectiveness[]> {
    const { data, error } = await supabase
      .from('conversation_insights')
      .select('objection_type, led_to_close, led_to_interest')
      .not('objection_type', 'is', null);

    if (error) {
      await logSystemActivity({
        activityType: 'analytics_ai_effectiveness_failed',
        message: error.message,
      });

      throw new Error(`Failed to fetch AI effectiveness: ${error.message}`);
    }

    const grouped = new Map<string, { total: number; successes: number }>();

    const rows = Array.isArray(data) ? data : [];
    for (const row of rows) {
      const normalized = normalizeConversationInsightRow(row);
      if (!normalized || normalized.objection_type === null) {
        continue;
      }

      const existing = grouped.get(normalized.objection_type) ?? {
        total: 0,
        successes: 0,
      };

      existing.total += 1;
      if (normalized.led_to_close === true || normalized.led_to_interest === true) {
        existing.successes += 1;
      }

      grouped.set(normalized.objection_type, existing);
    }

    return Array.from(grouped.entries())
      .map(([objectionType, stats]) => ({
        objectionType,
        timesUsed: stats.total,
        successRate: calculateRate(stats.successes, stats.total),
        sampleSize: stats.total,
      }))
      .sort((left, right) => right.timesUsed - left.timesUsed);
  }

  async generateExecutiveSummary(weekStart: Date): Promise<ExecutiveSummary> {
    const { startDate, endDate, weekEnd } = buildWeekBounds(weekStart);

    const { data: metricRows, error: metricError } = await supabase
      .from('analytics_daily')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (metricError) {
      await logSystemActivity({
        activityType: 'executive_summary_metrics_fetch_failed',
        message: metricError.message,
        details: {
          weekStart: startDate,
          weekEnd: endDate,
        },
      });

      throw new Error(`Failed to fetch executive summary metrics: ${metricError.message}`);
    }

    const normalizedMetricRows = Array.isArray(metricRows) ? metricRows : [];
    const weeklyMetrics = aggregateDailyMetrics(
      normalizedMetricRows,
      `${startDate} to ${endDate}`
    );

    const { data: topDealRows, error: topDealError } = await supabase
      .from('discovered_leads')
      .select('*')
      .order('estimated_commission', { ascending: false })
      .limit(5);

    if (topDealError) {
      await logSystemActivity({
        activityType: 'executive_summary_top_deals_fetch_failed',
        message: topDealError.message,
        details: {
          weekStart: startDate,
          weekEnd: endDate,
        },
      });

      throw new Error(`Failed to fetch top deals: ${topDealError.message}`);
    }

    const topPerformers = (Array.isArray(topDealRows) ? topDealRows : [])
      .map(normalizeTopDealRow)
      .filter((row): row is TopDealRecord => row !== null)
      .map((row) => ({
        name: row.businessName,
        value: row.estimatedCommission,
      }));

    const aiInsights = await this.getAIEffectiveness();

    const highlights: string[] = [];
    if (weeklyMetrics.newLeads > 0) {
      highlights.push(`${weeklyMetrics.newLeads} new leads discovered this week`);
    }
    if (weeklyMetrics.dealsClosed > 0) {
      highlights.push(
        `${weeklyMetrics.dealsClosed} deals closed for $${Math.round(weeklyMetrics.totalCommission).toLocaleString()} commission`
      );
    }
    if (weeklyMetrics.emailOpens > 0) {
      highlights.push(`${weeklyMetrics.emailOpens} emails opened`);
    }

    const recommendations: string[] = [];
    const weakestInsight = aiInsights.find((item) => item.sampleSize >= 5 && item.successRate < 50);
    if (weakestInsight) {
      recommendations.push(
        `AI objection handling for "${weakestInsight.objectionType}" is ${Math.round(weakestInsight.successRate)}% effective - review and improve the response`
      );
    }
    if (weeklyMetrics.proposalsSent > 0 && weeklyMetrics.dealsClosed === 0) {
      recommendations.push('Proposal-to-close conversion is lagging - review follow-up cadence and closing scripts');
    }

    const title = `Weekly Executive Summary: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
    const summary = `This week: ${weeklyMetrics.dealsClosed} deals closed, ${weeklyMetrics.newLeads} new leads. Total commission: $${Math.round(weeklyMetrics.totalCommission).toLocaleString()}.`;

    const executiveSummary: ExecutiveSummary = {
      title,
      summary,
      highlights,
      recommendations,
      metrics: weeklyMetrics,
      topPerformers,
      aiInsights: aiInsights.slice(0, 5),
    };

    const insertPayload: ExecutiveSummaryInsert = {
      week_start: startDate,
      week_end: endDate,
      title: executiveSummary.title,
      summary: executiveSummary.summary,
      highlights: executiveSummary.highlights,
      recommendations: executiveSummary.recommendations,
      metrics: {
  date: executiveSummary.metrics.date,
  newLeads: executiveSummary.metrics.newLeads,
  totalLeads: executiveSummary.metrics.totalLeads,
  qualifiedLeads: executiveSummary.metrics.qualifiedLeads,
  enterpriseLeads: executiveSummary.metrics.enterpriseLeads,
  leadsContacted: executiveSummary.metrics.leadsContacted,
  proposalsSent: executiveSummary.metrics.proposalsSent,
  dealsClosed: executiveSummary.metrics.dealsClosed,
  conversionRate: executiveSummary.metrics.conversionRate,
  totalCommission: executiveSummary.metrics.totalCommission,
  avgCommission: executiveSummary.metrics.avgCommission,
  projectedCommission: executiveSummary.metrics.projectedCommission,
  aiConversationsStarted: executiveSummary.metrics.aiConversationsStarted,
  aiMessagesSent: executiveSummary.metrics.aiMessagesSent,
  aiCloseRate: executiveSummary.metrics.aiCloseRate,
  emailOpens: executiveSummary.metrics.emailOpens,
  emailClicks: executiveSummary.metrics.emailClicks,
  smsSent: executiveSummary.metrics.smsSent,
  smsResponses: executiveSummary.metrics.smsResponses,
  linkedinMessages: executiveSummary.metrics.linkedinMessages,
},
      status: 'draft',
    };

    const { error: insertError } = await supabase
      .from('executive_summaries')
      .insert(insertPayload);

    if (insertError) {
      await logSystemActivity({
        activityType: 'executive_summary_insert_failed',
        message: insertError.message,
        details: {
          weekStart: startDate,
          weekEnd: endDate,
        },
      });

      throw new Error(`Failed to persist executive summary: ${insertError.message}`);
    }

    return executiveSummary;
  }

  private async getTotalLeadCount(): Promise<number> {
    const { count, error } = await supabase
      .from('discovered_leads')
      .select('*', { count: 'exact', head: true });

    if (error) {
      await logSystemActivity({
        activityType: 'analytics_total_leads_failed',
        message: error.message,
      });

      throw new Error(`Failed to fetch total leads: ${error.message}`);
    }

    return normalizeNumber(count);
  }

  private async getQualifiedLeadCount(): Promise<number> {
    const { data, error } = await supabase
      .from('discovered_leads')
      .select('*');

    if (error) {
      await logSystemActivity({
        activityType: 'analytics_qualified_leads_failed',
        message: error.message,
      });

      throw new Error(`Failed to fetch qualified leads: ${error.message}`);
    }

    const leads = Array.isArray(data) ? data : [];
    return leads.filter((lead) => extractLeadScore(lead) > QUALIFIED_LEAD_SCORE_THRESHOLD).length;
  }

  private async getEnterpriseLeadCount(): Promise<number> {
    const { data, error } = await supabase
      .from('discovered_leads')
      .select('*');

    if (error) {
      await logSystemActivity({
        activityType: 'analytics_enterprise_leads_failed',
        message: error.message,
      });

      throw new Error(`Failed to fetch enterprise leads: ${error.message}`);
    }

    const leads = Array.isArray(data) ? data : [];
    return leads.filter((lead) => extractIsEnterprise(lead)).length;
  }

  private async getEventCount(
    eventType: string,
    startIso: string,
    endIso: string
  ): Promise<number> {
    const { count, error } = await supabase
      .from('event_queue')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', eventType)
      .gte('triggered_at', startIso)
      .lte('triggered_at', endIso);

    if (error) {
      await logSystemActivity({
        activityType: 'analytics_event_count_failed',
        message: error.message,
        details: {
          eventType,
          startIso,
          endIso,
        },
      });

      throw new Error(`Failed to fetch event count for ${eventType}: ${error.message}`);
    }

    return normalizeNumber(count);
  }

  private async calculateProjectedCommission(): Promise<number> {
    const { data, error } = await supabase
      .from('discovered_leads')
      .select('*');

    if (error) {
      await logSystemActivity({
        activityType: 'analytics_projected_commission_failed',
        message: error.message,
      });

      throw new Error(`Failed to calculate projected commission: ${error.message}`);
    }

    const leads = Array.isArray(data) ? data : [];
    const total = leads.reduce((sum, lead) => {
      const normalized: LeadProjectionRecord = {
        estimatedCommission: extractEstimatedCommissionFromLead(lead),
        leadScore: extractLeadScore(lead),
        status: extractLeadStatus(lead),
      };

      if (normalized.status !== 'new' || normalized.leadScore <= PROJECTED_COMMISSION_SCORE_THRESHOLD) {
        return sum;
      }

      const weight = Math.min(1, normalized.leadScore / 100);
      return sum + normalized.estimatedCommission * weight;
    }, 0);

    return Number(total.toFixed(2));
  }
}

export const analyticsEngine = new AnalyticsEngine();