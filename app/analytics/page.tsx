'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { authenticatedFetch } from '@/lib/auth/authenticated-fetch';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

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

interface ApiSuccessResponse<TData, TKey extends string> {
  success: true;
  [key: string]: TData | boolean;
}

interface ApiErrorResponse {
  success: false;
  error: string;
}

type DailyMetricsResponse =
  | { success: true; metrics: DailyMetrics }
  | ApiErrorResponse;

type FunnelResponse =
  | { success: true; funnel: FunnelStage[] }
  | ApiErrorResponse;

type AIEffectivenessResponse =
  | { success: true; effectiveness: AIEffectiveness[] }
  | ApiErrorResponse;

interface AnalyticsPageState {
  metrics: DailyMetrics | null;
  funnel: FunnelStage[];
  aiEffectiveness: AIEffectiveness[];
  loading: boolean;
  error: string | null;
}

const EMPTY_METRICS: DailyMetrics = {
  date: '',
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
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  if (value > 100) {
    return 100;
  }

  return value;
}

function normalizeDailyMetrics(value: unknown): DailyMetrics {
  if (!isRecord(value)) {
    return EMPTY_METRICS;
  }

  return {
    date: normalizeString(value.date),
    newLeads: normalizeNumber(value.newLeads),
    totalLeads: normalizeNumber(value.totalLeads),
    qualifiedLeads: normalizeNumber(value.qualifiedLeads),
    enterpriseLeads: normalizeNumber(value.enterpriseLeads),
    leadsContacted: normalizeNumber(value.leadsContacted),
    proposalsSent: normalizeNumber(value.proposalsSent),
    dealsClosed: normalizeNumber(value.dealsClosed),
    conversionRate: clampPercentage(normalizeNumber(value.conversionRate)),
    totalCommission: normalizeNumber(value.totalCommission),
    avgCommission: normalizeNumber(value.avgCommission),
    projectedCommission: normalizeNumber(value.projectedCommission),
    aiConversationsStarted: normalizeNumber(value.aiConversationsStarted),
    aiMessagesSent: normalizeNumber(value.aiMessagesSent),
    aiCloseRate: clampPercentage(normalizeNumber(value.aiCloseRate)),
    emailOpens: normalizeNumber(value.emailOpens),
    emailClicks: normalizeNumber(value.emailClicks),
    smsSent: normalizeNumber(value.smsSent),
    smsResponses: normalizeNumber(value.smsResponses),
    linkedinMessages: normalizeNumber(value.linkedinMessages),
  };
}

function normalizeFunnelStage(value: unknown): FunnelStage | null {
  if (!isRecord(value)) {
    return null;
  }

  const stage = normalizeString(value.stage);
  if (stage.length === 0) {
    return null;
  }

  return {
    stage,
    count: normalizeNumber(value.count),
    conversion: clampPercentage(normalizeNumber(value.conversion)),
  };
}

function normalizeAIEffectiveness(value: unknown): AIEffectiveness | null {
  if (!isRecord(value)) {
    return null;
  }

  const objectionType = normalizeString(value.objectionType);
  if (objectionType.length === 0) {
    return null;
  }

  return {
    objectionType,
    timesUsed: normalizeNumber(value.timesUsed),
    successRate: clampPercentage(normalizeNumber(value.successRate)),
    sampleSize: normalizeNumber(value.sampleSize),
  };
}

async function fetchJson<T>(input: string, signal: AbortSignal): Promise<T> {
const response = await authenticatedFetch(input, {
  method: 'GET',
  signal,
  cache: 'no-store',
});

  let payload: unknown = null;

  try {
    payload = (await response.json()) as unknown;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.error === 'string'
        ? payload.error
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [state, setState] = useState<AnalyticsPageState>({
    metrics: null,
    funnel: [],
    aiEffectiveness: [],
    loading: true,
    error: null,
  });

  const loadData = useCallback(async (signal: AbortSignal): Promise<void> => {
    setState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace('/login?next=/analytics');
        return;
      }

      const [metricsPayload, funnelPayload, aiPayload] = await Promise.all([
        fetchJson<DailyMetricsResponse>('/api/analytics/daily', signal),
        fetchJson<FunnelResponse>('/api/analytics/funnel', signal),
        fetchJson<AIEffectivenessResponse>(
          '/api/analytics/ai-effectiveness',
          signal
        ),
      ]);

      if (!metricsPayload.success) {
        throw new Error(metricsPayload.error);
      }

      if (!funnelPayload.success) {
        throw new Error(funnelPayload.error);
      }

      if (!aiPayload.success) {
        throw new Error(aiPayload.error);
      }

      const normalizedMetrics = normalizeDailyMetrics(metricsPayload.metrics);
      const normalizedFunnel = Array.isArray(funnelPayload.funnel)
        ? funnelPayload.funnel
            .map(normalizeFunnelStage)
            .filter((item): item is FunnelStage => item !== null)
        : [];
      const normalizedEffectiveness = Array.isArray(aiPayload.effectiveness)
        ? aiPayload.effectiveness
            .map(normalizeAIEffectiveness)
            .filter((item): item is AIEffectiveness => item !== null)
        : [];

      if (!signal.aborted) {
        setState({
          metrics: normalizedMetrics,
          funnel: normalizedFunnel,
          aiEffectiveness: normalizedEffectiveness,
          loading: false,
          error: null,
        });
      }
    } catch (error: unknown) {
      if (signal.aborted) {
        return;
      }

      const message =
        error instanceof Error ? error.message : 'Failed to load analytics';

      setState({
        metrics: null,
        funnel: [],
        aiEffectiveness: [],
        loading: false,
        error: message,
      });
    }
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadData]);

  const metrics = useMemo<DailyMetrics>(
    () => state.metrics ?? EMPTY_METRICS,
    [state.metrics]
  );

  if (state.loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="text-cyan-400 animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  if (state.error !== null) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-cyan-400">📊 Analytics</h1>
              <p className="text-gray-400 mt-2">
                Performance metrics and insights
              </p>
            </div>
            <Link
              href="/dashboard"
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              ← Back
            </Link>
          </div>

          <div className="bg-red-950/40 border border-red-800 rounded-lg p-6">
            <p className="text-red-300 font-semibold">Failed to load analytics</p>
            <p className="text-red-200 mt-2">{state.error}</p>
            <button
              type="button"
              onClick={() => {
                const controller = new AbortController();
                void loadData(controller.signal);
              }}
              className="mt-4 bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-cyan-400">📊 Analytics</h1>
            <p className="text-gray-400 mt-2">Performance metrics and insights</p>
          </div>
          <Link
            href="/dashboard"
            className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            ← Back
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg border border-cyan-800">
            <p className="text-cyan-400 text-sm">TOTAL LEADS</p>
            <p className="text-3xl font-bold">{metrics.totalLeads}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-green-800">
            <p className="text-green-400 text-sm">DEALS CLOSED</p>
            <p className="text-3xl font-bold">{metrics.dealsClosed}</p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-yellow-800">
            <p className="text-yellow-400 text-sm">CONVERSION RATE</p>
            <p className="text-3xl font-bold">
              {metrics.conversionRate.toFixed(1)}%
            </p>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-purple-800">
            <p className="text-purple-400 text-sm">PROJECTED COMMISSION</p>
            <p className="text-3xl font-bold">
              {formatCurrency(metrics.projectedCommission)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-cyan-400 mb-4">🎯 Deal Funnel</h2>
            <div className="space-y-3">
              {state.funnel.length > 0 ? (
                state.funnel.map((stage, index) => (
                  <div key={`${stage.stage}-${index}`}>
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{stage.stage}</span>
                      <span>{stage.count} leads</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                      <div
                        className="bg-cyan-500 h-2 rounded-full"
                        style={{ width: `${stage.conversion}%` }}
                      />
                    </div>
                    {index < state.funnel.length - 1 && (
                      <div className="text-right text-xs text-gray-500 mt-1">
                        {stage.conversion.toFixed(1)}% conversion
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No funnel data available
                </p>
              )}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-purple-400 mb-4">
              🤖 AI Effectiveness
            </h2>
            <div className="space-y-4">
              {state.aiEffectiveness.length > 0 ? (
                state.aiEffectiveness.map((effect) => (
                  <div key={effect.objectionType}>
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">
                        {effect.objectionType} objections
                      </span>
                      <span>{effect.timesUsed} uses</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Success rate:</span>
                      <span
                        className={
                          effect.successRate > 50
                            ? 'text-green-400'
                            : 'text-yellow-400'
                        }
                      >
                        {effect.successRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                      <div
                        className={`h-1.5 rounded-full ${
                          effect.successRate > 50
                            ? 'bg-green-500'
                            : 'bg-yellow-500'
                        }`}
                        style={{ width: `${effect.successRate}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No AI effectiveness data yet
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
            <p className="text-gray-400 text-sm">Email Opens</p>
            <p className="text-2xl font-bold">{metrics.emailOpens}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
            <p className="text-gray-400 text-sm">AI Messages Sent</p>
            <p className="text-2xl font-bold">{metrics.aiMessagesSent}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 text-center">
            <p className="text-gray-400 text-sm">Avg Commission</p>
            <p className="text-2xl font-bold">
              {formatCurrency(metrics.avgCommission)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}