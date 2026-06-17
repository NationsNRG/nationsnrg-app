'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface LeadSource {
  id: string;
  name: string;
  type: string | null;
  config: unknown;
  is_active: boolean | null;
  last_run: string | null;
}

interface LeadSummary {
  business_name: string | null;
  email: string | null;
  estimated_commission: number | null;
}

interface ConversationRow {
  id: string;
  lead_id: string | null;
  conversation_stage: string | null;
  sentiment: string | null;
  last_message: string | null;
  next_action_at: string | null;
  lead: LeadSummary | LeadSummary[] | null;
}

interface Conversation {
  id: string;
  leadId: string | null;
  conversationStage: string;
  sentiment: string;
  lastMessage: string;
  nextActionAt: string | null;
  lead: LeadSummary;
}

interface EmailTemplate {
  id: string;
  name: string;
  category: string | null;
  subject: string | null;
}

interface ForecastItem {
  month: string;
  amount: number;
  confidence: number;
}

interface TopDealItem {
  id: string;
  businessName: string;
  estimatedCommission: number;
  score: number;
}

interface DealsForecastApiResponse {
  success?: boolean;
  data?: unknown;
  error?: string;
}

interface TopProfitabilityApiResponse {
  success?: boolean;
  deals?: unknown;
  error?: string;
}

interface ScraperRunResultItem {
  new?: number;
}

interface ScraperRunResponse {
  results?: ScraperRunResultItem[];
  error?: string;
}

interface AiStartResponse {
  success?: boolean;
  error?: string;
}

interface EmailTestResponse {
  success?: boolean;
  error?: string;
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

function normalizeLeadSummary(value: LeadSummary | LeadSummary[] | null): LeadSummary {
  if (Array.isArray(value)) {
    return normalizeLeadSummary(value[0] ?? null);
  }

  if (value === null) {
    return {
      business_name: null,
      email: null,
      estimated_commission: null,
    };
  }

  return {
    business_name: normalizeNullableString(value.business_name),
    email: normalizeNullableString(value.email),
    estimated_commission: normalizeNumber(value.estimated_commission),
  };
}

function normalizeConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    leadId: normalizeNullableString(row.lead_id),
    conversationStage: normalizeString(row.conversation_stage) || 'unknown',
    sentiment: normalizeString(row.sentiment) || 'neutral',
    lastMessage: normalizeString(row.last_message),
    nextActionAt: normalizeNullableString(row.next_action_at),
    lead: normalizeLeadSummary(row.lead),
  };
}

function isForecastItem(value: unknown): value is ForecastItem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.month === 'string';
}

function normalizeForecastItems(value: unknown): ForecastItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isForecastItem)
    .map((item) => ({
      month: normalizeString(item.month),
      amount: normalizeNumber(item.amount),
      confidence: normalizeNumber(item.confidence),
    }))
    .filter((item) => item.month.length > 0);
}

function isTopDealItem(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeTopDeals(value: unknown): TopDealItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isTopDealItem)
    .map((item, index) => ({
      id: normalizeString(item.id) || `top-deal-${index}`,
      businessName: normalizeString(item.business_name) || normalizeString(item.businessName) || 'Unknown Business',
      estimatedCommission: normalizeNumber(item.estimated_commission ?? item.estimatedCommission),
      score: normalizeNumber(item.score),
    }));
}

function safeAlert(message: string): void {
  if (typeof window !== 'undefined') {
    window.alert(message);
  }
}

function safeConfirm(message: string): boolean {
  if (typeof window !== 'undefined') {
    return window.confirm(message);
  }

  return false;
}

async function safeJsonParse<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return null;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function formatMonth(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-US', { month: 'short' });
}

function sentimentBadgeClass(sentiment: string): string {
  if (sentiment === 'positive') {
    return 'bg-green-600';
  }

  if (sentiment === 'negative' || sentiment === 'angry') {
    return 'bg-red-600';
  }

  return 'bg-yellow-600';
}

export default function CommandCenter() {
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [topDeals, setTopDeals] = useState<TopDealItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [running, setRunning] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [testEmail, setTestEmail] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [pageError, setPageError] = useState<string | null>(null);
  const [topDealsError, setTopDealsError] = useState<string | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);

  const activeSources = useMemo(
    () => sources.filter((source) => normalizeBoolean(source.is_active)),
    [sources]
  );

  const awaitingReplyCount = useMemo(
    () =>
      conversations.filter((conversation) => {
        if (!conversation.nextActionAt) {
          return false;
        }

        const nextActionDate = new Date(conversation.nextActionAt);
        if (Number.isNaN(nextActionDate.getTime())) {
          return false;
        }

        return nextActionDate < new Date();
      }).length,
    [conversations]
  );

  const loadSupplementalData = useCallback(async (): Promise<void> => {
    const [forecastResponse, topDealsResponse] = await Promise.allSettled([
      fetch('/api/deals/forecast?months=6', { cache: 'no-store' }),
      fetch('/api/deals/top-profitability', { cache: 'no-store' }),
    ]);

    if (forecastResponse.status === 'fulfilled') {
      const json = await safeJsonParse<DealsForecastApiResponse>(forecastResponse.value);

      if (!forecastResponse.value.ok) {
        setForecast([]);
        setForecastError(
          json?.error ??
            `Failed to load forecast (${forecastResponse.value.status})`
        );
      } else {
        setForecast(normalizeForecastItems(json?.data));
        setForecastError(null);
      }
    } else {
      setForecast([]);
      setForecastError(forecastResponse.reason instanceof Error ? forecastResponse.reason.message : 'Failed to load forecast');
    }

    if (topDealsResponse.status === 'fulfilled') {
      const json = await safeJsonParse<TopProfitabilityApiResponse>(topDealsResponse.value);

      if (!topDealsResponse.value.ok) {
        setTopDeals([]);
        setTopDealsError(
          json?.error ??
            `Failed to load best rate (${topDealsResponse.value.status})`
        );
      } else {
        setTopDeals(normalizeTopDeals(json?.deals));
        setTopDealsError(null);
      }
    } else {
      setTopDeals([]);
      setTopDealsError(topDealsResponse.reason instanceof Error ? topDealsResponse.reason.message : 'Failed to load best rate');
    }
  }, []);

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setPageError(null);

    const [sourcesRes, convRes, templatesRes] = await Promise.all([
      supabase.from('lead_sources').select('*').order('name'),
      supabase
        .from('ai_conversations')
        .select('id, lead_id, conversation_stage, sentiment, last_message, next_action_at, lead:discovered_leads(business_name, email, estimated_commission)')
        .not('conversation_stage', 'eq', 'closed'),
      supabase.from('email_templates').select('id, name, category, subject').eq('is_active', true),
    ]);

    const errors = [sourcesRes.error, convRes.error, templatesRes.error].filter(
      (error): error is NonNullable<typeof sourcesRes.error> => error !== null
    );

    if (errors.length > 0) {
      setPageError(errors.map((error) => error.message).join(' | '));
    }

    setSources(
      Array.isArray(sourcesRes.data)
        ? sourcesRes.data.map((row) => ({
            id: row.id,
            name: normalizeString(row.name) || 'Unnamed Source',
            type: normalizeNullableString(row.type),
            config: row.config ?? null,
            is_active: row.is_active ?? false,
            last_run: row.last_run ?? null,
          }))
        : []
    );

    setConversations(
      Array.isArray(convRes.data)
        ? convRes.data.map((row) => normalizeConversation(row as ConversationRow))
        : []
    );

    setTemplates(
      Array.isArray(templatesRes.data)
        ? templatesRes.data.map((row) => ({
            id: row.id,
            name: normalizeString(row.name) || 'Untitled Template',
            category: normalizeNullableString(row.category),
            subject: normalizeNullableString(row.subject),
          }))
        : []
    );

    await loadSupplementalData();
    setLoading(false);
  }, [loadSupplementalData]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const runScraper = useCallback(
    async (sourceId?: string, customCity?: string): Promise<void> => {
      try {
        setRunning('scraper');

        const body: Record<string, unknown> = {};
        const currentTeam = typeof window !== 'undefined' ? window.localStorage.getItem('currentTeam') : null;

        if (currentTeam) {
          body.teamId = currentTeam;
        }

        if (sourceId) {
          body.sourceId = sourceId;
        }

        if (customCity) {
          body.customCity = customCity;
          body.industries = selectedIndustries;
        }

        const response = await fetch('/api/scraper/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const json = await safeJsonParse<ScraperRunResponse>(response);

        if (!response.ok) {
          safeAlert(json?.error ?? `Scraper failed (${response.status})`);
          return;
        }

        const totalNew = Array.isArray(json?.results)
          ? json.results.reduce((sum, item) => sum + normalizeNumber(item.new), 0)
          : 0;

        safeAlert(`✅ Scraper finished! Found ${totalNew} new leads`);
        await loadData();
      } catch (error: unknown) {
        safeAlert(error instanceof Error ? error.message : 'Failed to run scraper');
      } finally {
        setRunning(null);
      }
    },
    [loadData, selectedIndustries]
  );

  const startAICloser = useCallback(
    async (leadId: string): Promise<void> => {
      try {
        const response = await fetch('/api/ai-closer/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId }),
        });

        const json = await safeJsonParse<AiStartResponse>(response);

        if (!response.ok) {
          safeAlert(json?.error ?? `Failed to activate AI closer (${response.status})`);
          return;
        }

        safeAlert('✅ AI Closer activated');
        await loadData();
      } catch (error: unknown) {
        safeAlert(error instanceof Error ? error.message : 'Failed to activate AI closer');
      }
    },
    [loadData]
  );

  const sendTestEmail = useCallback(async (): Promise<void> => {
    if (!testEmail || !selectedTemplate) {
      return;
    }

    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          templateId: selectedTemplate,
        }),
      });

      const json = await safeJsonParse<EmailTestResponse>(response);

      if (!response.ok) {
        safeAlert(json?.error ?? `Failed to send test email (${response.status})`);
        return;
      }

      safeAlert('✅ Test email sent');
    } catch (error: unknown) {
      safeAlert(error instanceof Error ? error.message : 'Failed to send test email');
    }
  }, [selectedTemplate, testEmail]);

  const runAllScrapers = useCallback((): void => {
    if (safeConfirm('Run all active scrapers? This will generate many leads.')) {
      void runScraper();
    }
  }, [runScraper]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="text-cyan-400 animate-pulse">Loading command center...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8 text-gray-100">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-cyan-400">🤖 NNRG COMMAND CENTER</h1>
            <p className="mt-2 text-gray-400">Control all autonomous systems</p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600"
          >
            ← Back
          </Link>
        </div>

        {pageError ? (
          <div className="mb-6 rounded-lg border border-red-700 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {pageError}
          </div>
        ) : null}

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-cyan-800 bg-gray-800 p-4">
            <p className="text-sm text-cyan-400">ACTIVE SCRAPERS</p>
            <p className="text-3xl font-bold">{activeSources.length}</p>
          </div>
          <div className="rounded-lg border border-green-800 bg-gray-800 p-4">
            <p className="text-sm text-green-400">ACTIVE CONVERSATIONS</p>
            <p className="text-3xl font-bold">{conversations.length}</p>
          </div>
          <div className="rounded-lg border border-yellow-800 bg-gray-800 p-4">
            <p className="text-sm text-yellow-400">AWAITING REPLY</p>
            <p className="text-3xl font-bold">{awaitingReplyCount}</p>
          </div>
          <div className="rounded-lg border border-purple-800 bg-gray-800 p-4">
            <p className="text-sm text-purple-400">EMAIL TEMPLATES</p>
            <p className="text-3xl font-bold">{templates.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h2 className="mb-4 text-xl font-bold text-cyan-400">🕷️ SCRAPER CONSOLE</h2>

            <div className="mb-6">
              <h3 className="mb-2 text-sm text-gray-400">QUICK SCRAPE</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="City, State (e.g. Austin, TX)"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full rounded bg-gray-700 px-3 py-2 text-white"
                />
                <select
                  multiple
                  value={selectedIndustries}
                  onChange={(e) =>
                    setSelectedIndustries(
                      Array.from(e.target.selectedOptions, (opt) => opt.value)
                    )
                  }
                  className="h-24 w-full rounded bg-gray-700 px-3 py-2 text-white"
                >
                  <option value="restaurant">Restaurants</option>
                  <option value="gym">Gyms</option>
                  <option value="retail">Retail</option>
                  <option value="hotel">Hotels</option>
                  <option value="medical">Medical</option>
                  <option value="office">Offices</option>
                </select>
                <button
                  onClick={() => void runScraper(undefined, selectedCity)}
                  disabled={!selectedCity || running === 'scraper'}
                  className="w-full rounded bg-cyan-600 py-2 text-white hover:bg-cyan-700 disabled:bg-gray-600"
                >
                  {running === 'scraper' ? 'RUNNING...' : '🚀 RUN CUSTOM SCRAPE'}
                </button>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm text-gray-400">ACTIVE SOURCES</h3>
              <div className="max-h-60 space-y-2 overflow-y-auto">
                {activeSources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between rounded bg-gray-700 p-2"
                  >
                    <span className="text-sm">{source.name}</span>
                    <button
                      onClick={() => void runScraper(source.id)}
                      disabled={running === 'scraper'}
                      className="rounded bg-cyan-600 px-2 py-1 text-xs hover:bg-cyan-700"
                    >
                      RUN
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={runAllScrapers}
                disabled={running === 'scraper'}
                className="mt-4 w-full rounded bg-purple-600 py-2 text-white hover:bg-purple-700 disabled:bg-gray-600"
              >
                RUN ALL ACTIVE SCRAPERS
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h2 className="mb-4 text-xl font-bold text-green-400">🤖 AI CLOSER CONSOLE</h2>

            <div className="max-h-96 space-y-4 overflow-y-auto">
              {conversations.map((conversation) => (
                <div key={conversation.id} className="rounded bg-gray-700 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">
                        {conversation.lead.business_name ?? 'Unknown Business'}
                      </p>
                      <p className="text-xs text-gray-400">
                        Stage: {conversation.conversationStage} | Sentiment: {conversation.sentiment}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Last:{' '}
                        {conversation.lastMessage.length > 0
                          ? `${conversation.lastMessage.substring(0, 30)}...`
                          : 'No message yet'}
                      </p>
                      {conversation.leadId ? (
                        <button
                          onClick={() => void startAICloser(conversation.leadId as string)}
                          className="mt-2 rounded bg-green-600 px-2 py-1 text-xs hover:bg-green-700"
                        >
                          Restart AI Closer
                        </button>
                      ) : null}
                    </div>
                    <span
                      className={`rounded px-2 py-1 text-xs ${sentimentBadgeClass(
                        conversation.sentiment
                      )}`}
                    >
                      {conversation.sentiment}
                    </span>
                  </div>
                </div>
              ))}
              {conversations.length === 0 ? (
                <p className="py-4 text-center text-gray-500">No active conversations</p>
              ) : null}
            </div>

            <button
              onClick={() => void fetch('/api/ai-closer/process', { cache: 'no-store' })}
              className="mt-4 w-full rounded bg-green-600 py-2 text-white hover:bg-green-700"
            >
              PROCESS PENDING CONVERSATIONS
            </button>
          </div>

          <div className="rounded-lg border border-gray-700 bg-gray-800 p-6">
            <h2 className="mb-4 text-xl font-bold text-yellow-400">📧 EMAIL CONSOLE</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Test Email Address</label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded bg-gray-700 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">Select Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full rounded bg-gray-700 px-3 py-2 text-white"
                >
                  <option value="">Choose template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                      {template.category ? ` (${template.category})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => void sendTestEmail()}
                disabled={!testEmail || !selectedTemplate}
                className="w-full rounded bg-yellow-600 py-2 text-white hover:bg-yellow-700 disabled:bg-gray-600"
              >
                SEND TEST EMAIL
              </button>

              <div className="mt-4 border-t border-gray-700 pt-4">
                <h3 className="mb-2 text-sm text-gray-400">EMAIL TEMPLATES</h3>
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {templates.map((template) => (
                    <div key={template.id} className="rounded bg-gray-700 p-2 text-xs">
                      <p className="font-bold">{template.name}</p>
                      <p className="text-gray-400">
                        {(template.subject ?? '').length > 0
                          ? `${template.subject?.substring(0, 40)}...`
                          : 'No subject'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h2 className="mb-4 text-xl font-bold text-green-400">💰 COMMISSION FORECAST</h2>

          {forecastError ? (
            <div className="rounded border border-yellow-700 bg-yellow-950/30 px-4 py-3 text-sm text-yellow-300">
              {forecastError}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {forecast.map((item) => (
              <div key={item.month} className="text-center">
                <p className="text-sm text-gray-400">{formatMonth(item.month)}</p>
                <p className="text-lg font-bold">${item.amount.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{item.confidence}% confidence</p>
              </div>
            ))}
            {forecast.length === 0 && !forecastError ? (
              <p className="col-span-full text-sm text-gray-500">No forecast data available.</p>
            ) : null}
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h2 className="mb-4 text-xl font-bold text-cyan-400">🏆 TOP PROFITABILITY</h2>

          {topDealsError ? (
            <div className="rounded border border-yellow-700 bg-yellow-950/30 px-4 py-3 text-sm text-yellow-300">
              {topDealsError}
            </div>
          ) : null}

          <div className="space-y-3">
            {topDeals.map((deal) => (
              <div
                key={deal.id}
                className="flex items-center justify-between rounded bg-gray-700 px-4 py-3"
              >
                <div>
                  <p className="font-semibold">{deal.businessName}</p>
                  <p className="text-xs text-gray-400">Score: {deal.score}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-400">
                    ${deal.estimatedCommission.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {topDeals.length === 0 && !topDealsError ? (
              <p className="text-sm text-gray-500">No top profitability data available.</p>
            ) : null}
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-gray-700 bg-gray-800 p-6">
          <h2 className="mb-4 text-xl font-bold text-purple-400">📊 SYSTEM STATUS</h2>
          <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
            <div>
              <p className="text-2xl font-bold">{sources.length}</p>
              <p className="text-xs text-gray-400">TOTAL SOURCES</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{conversations.length}</p>
              <p className="text-xs text-gray-400">ACTIVE CHATS</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{templates.length}</p>
              <p className="text-xs text-gray-400">EMAIL TEMPLATES</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {sources.filter((source) => normalizeNullableString(source.last_run) !== null).length}
              </p>
              <p className="text-xs text-gray-400">SCRAPERS RUN TODAY</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}