import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { eventEmitter } from './eventEmitter';
import type { Database, Json } from '@/types/supabase';

type EmailJobStatus = 'pending' | 'sent' | 'failed';

interface DiscoveredLeadRow {
  id: string;
  business_name: string | null;
  email: string | null;
  contact_name: string | null;
  industry: string | null;
  lead_score: number | null;
  estimated_savings: number | null;
  estimated_energy_spend: number | null;
  estimated_commission: number | null;
  estimated_expiration_window: number | null;
  is_enterprise: boolean | null;
}

interface EmailTemplateRow {
  id: string;
  name: string | null;
  category: string | null;
  subject: string;
  body: string;
  is_active: boolean | null;
}

interface EmailJobRow {
  id: string;
  lead_id: string;
  template_id: string;
  scheduled_for: string;
  status: EmailJobStatus;
  sent_at: string | null;
  error: string | null;
}

interface EmailJobInsert {
  lead_id: string;
  template_id: string;
  scheduled_for: string;
  status: EmailJobStatus;
}

interface EmailJobUpdate {
  status?: EmailJobStatus;
  sent_at?: string | null;
  error?: string | null;
}

interface NotificationInsert {
  type: string;
  lead_id: string;
  title: string;
  message: string;
  read: boolean;
  brief_url?: string;
  created_at: string;
}

interface LeadFollowupUpsert {
  lead_id: string;
  template_ids: string[];
  status: string;
}

interface SystemActivityInsert {
  event_type: string;
  entity_id: string;
  error_message: string | null;
  metadata: Json | null;
  created_at: string;
}

interface EmailJobsJoinedRow {
  id: string;
  lead_id: string;
  template_id: string;
  scheduled_for: string;
  status: EmailJobStatus;
  sent_at: string | null;
  error: string | null;
  lead: DiscoveredLeadRow | DiscoveredLeadRow[] | null;
  template: EmailTemplateRow | EmailTemplateRow[] | null;
}

export interface EmailJob {
  lead_id: string;
  template_id: string;
  scheduled_for: Date;
  status: EmailJobStatus;
}

const DEFAULT_PENDING_LIMIT = 100;
const DEFAULT_RETRY_ERROR = 'Unknown error';

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

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;

  if (typeof key !== 'string' || key.length === 0) {
    return null;
  }

  return new Resend(key);
}

function nowIso(): string {
  return new Date().toISOString();
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : DEFAULT_RETRY_ERROR;
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

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function firstName(fullName: string | null): string {
  const normalized = normalizeString(fullName);
  if (normalized.length === 0) {
    return 'there';
  }

  const pieces = normalized.split(/\s+/);
  return pieces[0] ?? 'there';
}

function appUrl(): string {
  const value = process.env.NEXT_PUBLIC_APP_URL;
  return typeof value === 'string' && value.length > 0
    ? value.replace(/\/+$/, '')
    : 'http://localhost:3000';
}

function isDiscoveredLeadRow(value: unknown): value is DiscoveredLeadRow {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string';
}

function isEmailTemplateRow(value: unknown): value is EmailTemplateRow {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.subject === 'string';
}

function normalizeLeadJoin(
  value: DiscoveredLeadRow | DiscoveredLeadRow[] | null
): DiscoveredLeadRow | null {
  if (Array.isArray(value)) {
    return value.length > 0 && isDiscoveredLeadRow(value[0]) ? value[0] : null;
  }

  return isDiscoveredLeadRow(value) ? value : null;
}

function normalizeTemplateJoin(
  value: EmailTemplateRow | EmailTemplateRow[] | null
): EmailTemplateRow | null {
  if (Array.isArray(value)) {
    return value.length > 0 && isEmailTemplateRow(value[0]) ? value[0] : null;
  }

  return isEmailTemplateRow(value) ? value : null;
}

async function logSystemActivity(
  supabase: SupabaseClient,
  payload: SystemActivityInsert
): Promise<void> {
  const { error } = await supabase.from('system_activity').insert(payload);

  if (error) {
    console.error('system_activity_log_failed', error.message);
  }
}

class EmailAutomation {
  private readonly supabase: SupabaseClient;
  private readonly resend: Resend | null;

  constructor() {
    this.supabase = getSupabaseClient();
    this.resend = getResendClient();
  }

  async scheduleEmailsForLead(leadId: string): Promise<void> {
    const lead = await this.getLead(leadId);

    if (!lead) {
      return;
    }

    const estimatedEnergySpend = normalizeNumber(lead.estimated_energy_spend);
    const leadScore = normalizeNumber(lead.lead_score);
    const isEnterprise = normalizeBoolean(lead.is_enterprise);

    if (estimatedEnergySpend < 150000 && leadScore < 70) {
      await this.scheduleSmallDealSequence(lead);
      return;
    }

    if (isEnterprise) {
      await this.alertEnterpriseDeal(lead);
      return;
    }

    await this.scheduleNurtureSequence(lead);
  }

  private async scheduleSmallDealSequence(lead: DiscoveredLeadRow): Promise<void> {
    const templates = await this.getTemplatesByCategory([
      'welcome',
      'proposal',
      'auto_close',
    ]);

    if (templates.length < 3) {
      await logSystemActivity(this.supabase, {
        event_type: 'email_sequence_templates_missing',
        entity_id: lead.id,
        error_message: 'Small deal sequence requires 3 templates',
        metadata: {
          categories: ['welcome', 'proposal', 'auto_close'],
          found: templates.length,
        },
        created_at: nowIso(),
      });
      return;
    }

    await this.scheduleEmail({
      lead_id: lead.id,
      template_id: templates[0].id,
      scheduled_for: new Date(),
      status: 'pending',
    });

    await this.scheduleEmail({
      lead_id: lead.id,
      template_id: templates[1].id,
      scheduled_for: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      status: 'pending',
    });

    await this.scheduleEmail({
      lead_id: lead.id,
      template_id: templates[2].id,
      scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'pending',
    });
  }

  private async scheduleNurtureSequence(lead: DiscoveredLeadRow): Promise<void> {
    const templates = await this.getTemplatesByCategory(['welcome', 'follow_up']);

    if (templates.length < 2) {
      await logSystemActivity(this.supabase, {
        event_type: 'email_sequence_templates_missing',
        entity_id: lead.id,
        error_message: 'Nurture sequence requires 2 templates',
        metadata: {
          categories: ['welcome', 'follow_up'],
          found: templates.length,
        },
        created_at: nowIso(),
      });
      return;
    }

    await this.scheduleEmail({
      lead_id: lead.id,
      template_id: templates[0].id,
      scheduled_for: new Date(),
      status: 'pending',
    });

    await this.scheduleEmail({
      lead_id: lead.id,
      template_id: templates[1].id,
      scheduled_for: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      status: 'pending',
    });
  }

  private async alertEnterpriseDeal(lead: DiscoveredLeadRow): Promise<void> {
    try {
      const { dealBriefGenerator } = await import('./dealBriefGenerator');
      await dealBriefGenerator.generateBrief(lead.id);
    } catch (error) {
      await logSystemActivity(this.supabase, {
        event_type: 'enterprise_brief_generation_failed',
        entity_id: lead.id,
        error_message: safeErrorMessage(error),
        metadata: {
          leadId: lead.id,
        },
        created_at: nowIso(),
      });
    }

    const commission = normalizeNumber(lead.estimated_commission);
    const businessName = normalizeString(lead.business_name) || 'Unknown business';

    await this.insertNotification({
      type: 'enterprise_lead',
      lead_id: lead.id,
      title: '🎯 Enterprise Deal Ready',
      message: `${businessName} - $${commission.toLocaleString()} commission potential`,
      brief_url: `/enterprise/brief/${lead.id}`,
      read: false,
      created_at: nowIso(),
    });

    await this.scheduleEnterpriseFollowup(lead.id, false);
  }

  async scheduleEnterpriseFollowup(
    leadId: string,
    startImmediately: boolean = false
  ): Promise<void> {
    const lead = await this.getLead(leadId);

    if (!lead) {
      return;
    }

    const templates = await this.getTemplatesByCategory(['enterprise_followup']);

    if (templates.length === 0) {
      await logSystemActivity(this.supabase, {
        event_type: 'enterprise_followup_templates_missing',
        entity_id: leadId,
        error_message: 'No enterprise followup templates found',
        metadata: null,
        created_at: nowIso(),
      });
      return;
    }

    if (startImmediately) {
      await this.scheduleEmail({
        lead_id: leadId,
        template_id: templates[0].id,
        scheduled_for: new Date(),
        status: 'pending',
      });

      await this.scheduleEmail({
        lead_id: leadId,
        template_id: templates[1]?.id ?? templates[0].id,
        scheduled_for: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: 'pending',
      });

      await this.scheduleEmail({
        lead_id: leadId,
        template_id: templates[2]?.id ?? templates[0].id,
        scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'pending',
      });

      return;
    }

    const upsertPayload: LeadFollowupUpsert = {
      lead_id: leadId,
      template_ids: templates.map((template) => template.id),
      status: 'pending_call',
    };

    const { error } = await this.supabase
      .from('lead_followup')
      .upsert(upsertPayload);

    if (error) {
      await logSystemActivity(this.supabase, {
        event_type: 'enterprise_followup_upsert_failed',
        entity_id: leadId,
        error_message: error.message,
        metadata: {
          templateCount: templates.length,
        },
        created_at: nowIso(),
      });
    }
  }

  async processPendingEmails(limit: number = DEFAULT_PENDING_LIMIT): Promise<number> {
    const safeLimit =
      typeof limit === 'number' && Number.isFinite(limit) && limit > 0
        ? Math.trunc(limit)
        : DEFAULT_PENDING_LIMIT;

    const now = nowIso();

    const { data, error } = await this.supabase
      .from('email_jobs')
      .select('*, lead:discovered_leads(*), template:email_templates(*)')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(safeLimit);

    if (error) {
      await logSystemActivity(this.supabase, {
        event_type: 'pending_email_fetch_failed',
        entity_id: 'email_jobs',
        error_message: error.message,
        metadata: {
          limit: safeLimit,
          now,
        },
        created_at: nowIso(),
      });
      return 0;
    }

    if (!Array.isArray(data) || data.length === 0) {
      return 0;
    }

    let processed = 0;

    for (const rawJob of data as EmailJobsJoinedRow[]) {
      const sent = await this.sendEmail(rawJob);
      if (sent) {
        processed += 1;
      }
    }

    return processed;
  }

  private async sendEmail(job: EmailJobsJoinedRow): Promise<boolean> {
    const lead = normalizeLeadJoin(job.lead);
    const template = normalizeTemplateJoin(job.template);

    if (!lead || !template) {
      await this.markJobFailed(job.id, 'Missing lead or template relation');
      return false;
    }

    const emailAddress = normalizeNullableString(lead.email);
    if (!emailAddress) {
      await this.markJobFailed(job.id, 'Lead has no email address');
      return false;
    }

    if (!this.resend) {
      await this.markJobFailed(job.id, 'Missing RESEND_API_KEY');
      return false;
    }

    try {
      const estimatedSavings = normalizeNumber(lead.estimated_savings);
      const monthlySavings = Math.round(estimatedSavings / 12);
      const businessName = normalizeString(lead.business_name) || 'your business';
      const expirationWindow = normalizeNumber(lead.estimated_expiration_window) || 60;

      const html = template.body
        .replace(/{{business_name}}/g, businessName)
        .replace(/{{first_name}}/g, firstName(lead.contact_name))
        .replace(/{{estimated_savings}}/g, `$${Math.round(estimatedSavings).toLocaleString()}`)
        .replace(/{{monthly_savings}}/g, `$${monthlySavings.toLocaleString()}`)
        .replace(/{{expiration_window}}/g, expirationWindow.toString())
        .replace(/{{accept_link}}/g, `${appUrl()}/api/accept/${lead.id}`);

      const response = await this.resend.emails.send({
        from: 'NationsNRG <deals@nationsnrg.com>',
        to: [emailAddress],
        subject: template.subject,
        html: `<div>${escapeHtml(html).replace(/\n/g, '<br>')}</div>`,
      });

      if (response.error) {
        await this.markJobFailed(job.id, response.error.message);
        return false;
      }

      await this.markJobSent(job.id);

      await eventEmitter.emit('ai_response_sent', {
        leadId: lead.id,
        metadata: {
          emailJobId: job.id,
          templateId: template.id,
          subject: template.subject,
        },
        dedupeKey: `ai_response_sent:${job.id}`,
      });

      await this.insertSystemActivity({
        event_type: 'email_sent',
        entity_id: lead.id,
        error_message: null,
        metadata: {
          templateName: normalizeString(template.name),
          templateId: template.id,
          subject: template.subject,
          emailJobId: job.id,
        },
        created_at: nowIso(),
      });

      return true;
    } catch (error) {
      await this.markJobFailed(job.id, safeErrorMessage(error));
      return false;
    }
  }

  private async getTemplatesByCategory(
    categories: string[]
  ): Promise<EmailTemplateRow[]> {
    const cleanCategories = categories
      .map((category) => normalizeString(category))
      .filter((category) => category.length > 0);

    if (cleanCategories.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('email_templates')
      .select('*')
      .in('category', cleanCategories)
      .eq('is_active', true);

    if (error) {
      await logSystemActivity(this.supabase, {
        event_type: 'email_templates_fetch_failed',
        entity_id: 'email_templates',
        error_message: error.message,
        metadata: {
          categories: cleanCategories,
        },
        created_at: nowIso(),
      });
      return [];
    }

    return Array.isArray(data)
      ? data.filter((row): row is EmailTemplateRow => isEmailTemplateRow(row))
      : [];
  }

  private async getLead(leadId: string): Promise<DiscoveredLeadRow | null> {
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

    const lead = Array.isArray(data) && data.length > 0 ? data[0] : null;
    return isDiscoveredLeadRow(lead) ? lead : null;
  }

  async trackEmailEngagement(
    emailJobId: string,
    eventType: 'opened' | 'clicked'
  ): Promise<void> {
    const { data, error } = await this.supabase
      .from('email_jobs')
      .select('lead_id')
      .eq('id', emailJobId)
      .limit(1);

    if (error) {
      await logSystemActivity(this.supabase, {
        event_type: 'email_job_lookup_failed',
        entity_id: emailJobId,
        error_message: error.message,
        metadata: {
          eventType,
        },
        created_at: nowIso(),
      });
      return;
    }

    const job = Array.isArray(data) && data.length > 0 ? data[0] : null;
    const leadId =
      job && typeof (job as Record<string, unknown>).lead_id === 'string'
        ? ((job as Record<string, unknown>).lead_id as string)
        : null;

    if (!leadId) {
      return;
    }

    const { error: rpcError } = await this.supabase.rpc('increment_engagement', {
      p_lead_id: leadId,
      p_event_type: eventType,
    });

    if (rpcError) {
      await logSystemActivity(this.supabase, {
        event_type: 'increment_engagement_failed',
        entity_id: leadId,
        error_message: rpcError.message,
        metadata: {
          emailJobId,
          eventType,
        },
        created_at: nowIso(),
      });
      return;
    }

    await eventEmitter.emit(
      eventType === 'opened' ? 'email_opened' : 'email_clicked',
      {
        leadId,
        emailId: emailJobId,
        metadata: {
          emailJobId,
          engagementType: eventType,
        },
        dedupeKey: `${eventType}:${emailJobId}`,
      }
    );

    if (eventType === 'clicked') {
      await this.notifyLeadEngagement(leadId, 'clicked');
    }
  }

  private async notifyLeadEngagement(
    leadId: string,
    eventType: string
  ): Promise<void> {
    const lead = await this.getLead(leadId);
    const businessName = normalizeString(lead?.business_name) || 'A lead';

    await this.insertNotification({
      type: 'lead_engagement',
      lead_id: leadId,
      title: '👀 Lead Engaged',
      message: `${businessName} ${eventType} your email`,
      read: false,
      created_at: nowIso(),
    });
  }

  private async scheduleEmail(job: EmailJob): Promise<void> {
    const scheduledAt = normalizeDate(job.scheduled_for);

    if (!scheduledAt) {
      await logSystemActivity(this.supabase, {
        event_type: 'email_job_schedule_failed',
        entity_id: job.lead_id,
        error_message: 'Invalid scheduled_for date',
        metadata: {
          templateId: job.template_id,
        },
        created_at: nowIso(),
      });
      return;
    }

    const payload: EmailJobInsert = {
      lead_id: job.lead_id,
      template_id: job.template_id,
      scheduled_for: scheduledAt.toISOString(),
      status: job.status,
    };

    const { error } = await this.supabase.from('email_jobs').insert(payload);

    if (error) {
      await logSystemActivity(this.supabase, {
        event_type: 'email_job_insert_failed',
        entity_id: job.lead_id,
        error_message: error.message,
        metadata: {
          templateId: job.template_id,
          scheduledFor: payload.scheduled_for,
        },
        created_at: nowIso(),
      });
    }
  }

  private async markJobSent(jobId: string): Promise<void> {
    const payload: EmailJobUpdate = {
      status: 'sent',
      sent_at: nowIso(),
      error: null,
    };

    const { error } = await this.supabase
      .from('email_jobs')
      .update(payload)
      .eq('id', jobId)
      .eq('status', 'pending');

    if (error) {
      await logSystemActivity(this.supabase, {
        event_type: 'email_job_mark_sent_failed',
        entity_id: jobId,
        error_message: error.message,
        metadata: null,
        created_at: nowIso(),
      });
    }
  }

  private async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
    const payload: EmailJobUpdate = {
      status: 'failed',
      error: errorMessage,
    };

    const { error } = await this.supabase
      .from('email_jobs')
      .update(payload)
      .eq('id', jobId);

    if (error) {
      await logSystemActivity(this.supabase, {
        event_type: 'email_job_mark_failed_failed',
        entity_id: jobId,
        error_message: error.message,
        metadata: {
          originalError: errorMessage,
        },
        created_at: nowIso(),
      });
      return;
    }

    await logSystemActivity(this.supabase, {
      event_type: 'email_send_failed',
      entity_id: jobId,
      error_message: errorMessage,
      metadata: null,
      created_at: nowIso(),
    });
  }

  private async insertNotification(payload: NotificationInsert): Promise<void> {
    const { error } = await this.supabase.from('notifications').insert(payload);

    if (error) {
      await logSystemActivity(this.supabase, {
        event_type: 'notification_insert_failed',
        entity_id: payload.lead_id,
        error_message: error.message,
        metadata: {
          title: payload.title,
          type: payload.type,
        },
        created_at: nowIso(),
      });
    }
  }

  private async insertSystemActivity(payload: SystemActivityInsert): Promise<void> {
    await logSystemActivity(this.supabase, payload);
  }
}

export const emailAutomation = new EmailAutomation();