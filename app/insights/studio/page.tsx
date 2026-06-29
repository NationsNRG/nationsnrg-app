'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { authenticatedFetch } from '@/lib/auth/authenticated-fetch';
import { formatInsightTaxonomyLabel } from '../../../lib/insights/taxonomy'

type InsightStatus = 'draft' | 'approved' | 'published' | 'archived' | 'failed';
type VariantStatus = 'draft' | 'approved' | 'published' | 'archived' | 'failed';

interface ContentInsightRow {
  id: string;
  slug: string | null;
  title: string;
  canonical_summary: string | null;
  canonical_body: string | null;
  angle: string | null;
  audience: string | null;
  seo_keyword: string | null;
  source_type: string | null;
  confidence_score: number | null;
  status: InsightStatus;
  created_at: string | null;
  updated_at: string | null;
  published_at?: string | null;
}

interface ContentInsightVariantRow {
  id: string;
  insight_id: string;
  variant_type: string;
  title: string | null;
  body: string | null;
  cta: string | null;
  status: VariantStatus;
  created_at: string | null;
  updated_at: string | null;
}

interface ProcessInsightsResponse {
  success: boolean;
  created?: number;
  insightIds?: string[];
  error?: string;
}

interface GenerateVariantsResponse {
  success: boolean;
  result?: {
    success: boolean;
  };
  error?: string;
}

interface UpdateInsightStatusResponse {
  success: boolean;
  insight?: {
    id: string;
    status: InsightStatus;
    published_at: string | null;
  };
  error?: string;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeDateTime(value: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'published':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'approved':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'failed':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'archived':
      return 'bg-gray-200 text-gray-700 border-gray-300';
    default:
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  }
}

export default function InsightsStudioPage() {
  const [insights, setInsights] = useState<ContentInsightRow[]>([]);
  const [variants, setVariants] = useState<ContentInsightVariantRow[]>([]);
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [generatingInsightId, setGeneratingInsightId] = useState<string | null>(null);
  const [updatingInsightId, setUpdatingInsightId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadStudioData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setPageError(null);

const response = await authenticatedFetch('/api/insights/pipeline/studio-data', {
  method: 'GET',
  cache: 'no-store',
});

const json = await response.json();

if (!response.ok || !json.success) {
  setPageError(json.error ?? 'Failed to load insights studio data');
  setInsights([]);
  setVariants([]);
  setLoading(false);
  return;
}

const loadedInsights: ContentInsightRow[] = Array.isArray(json.insights)
  ? (json.insights as ContentInsightRow[])
  : [];

const loadedVariants: ContentInsightVariantRow[] = Array.isArray(json.variants)
  ? (json.variants as ContentInsightVariantRow[])
  : [];

    setInsights(loadedInsights);
    setVariants(loadedVariants);

    if (loadedInsights.length > 0) {
      setSelectedInsightId((current) =>
        current && loadedInsights.some((insight) => insight.id === current)
          ? current
          : loadedInsights[0].id
      );
    } else {
      setSelectedInsightId(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadStudioData();
  }, [loadStudioData]);

  const selectedInsight = useMemo(
    () => insights.find((insight) => insight.id === selectedInsightId) ?? null,
    [insights, selectedInsightId]
  );

  const selectedInsightVariants = useMemo(
    () => variants.filter((variant) => variant.insight_id === selectedInsightId),
    [variants, selectedInsightId]
  );

  async function handleProcessInsights(): Promise<void> {
    try {
      setProcessing(true);
      setPageError(null);

      const response = await fetch('/api/insights/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error(`Insights process route returned non-JSON response (${response.status})`);
      }

      const json = (await response.json()) as ProcessInsightsResponse;

      if (!response.ok || !json.success) {
        throw new Error(json.error ?? 'Failed to process insights');
      }

      await loadStudioData();
      window.alert(`Created ${json.created ?? 0} content insight draft(s).`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to process insights';
      setPageError(message);
      window.alert(message);
    } finally {
      setProcessing(false);
    }
  }

  async function handleGenerateVariants(insightId: string): Promise<void> {
    try {
      setGeneratingInsightId(insightId);
      setPageError(null);

      const response = await fetch('/api/insights/pipeline/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId }),
      });

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error(`Generate route returned non-JSON response (${response.status})`);
      }

      const json = (await response.json()) as GenerateVariantsResponse;

      if (!response.ok || !json.success) {
        throw new Error(json.error ?? 'Failed to generate variants');
      }

      await loadStudioData();
      window.alert('Variants generated successfully.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to generate variants';
      setPageError(message);
      window.alert(message);
    } finally {
      setGeneratingInsightId(null);
    }
  }

  async function handleUpdateInsightStatus(
    insightId: string,
    status: 'approved' | 'published' | 'archived'
  ): Promise<void> {
    try {
      setUpdatingInsightId(insightId);
      setPageError(null);

      const response = await fetch('/api/insights/pipeline/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightId, status }),
      });

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error(`Status route returned non-JSON response (${response.status})`);
      }

      const json = (await response.json()) as UpdateInsightStatusResponse;

      if (!response.ok || !json.success) {
        throw new Error(json.error ?? 'Failed to update insight status');
      }

      await loadStudioData();
      window.alert(`Insight marked as ${status}.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update insight status';
      setPageError(message);
      window.alert(message);
    } finally {
      setUpdatingInsightId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Insights Studio
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900">
              Autonomous Content Insights Engine
            </h1>
            <p className="mt-3 max-w-3xl text-gray-600">
              Generate market and business insights, convert them into content variants,
              and manage the editorial pipeline from a single control surface.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-100"
            >
              Back to Dashboard
            </Link>

            <button
              onClick={() => void handleProcessInsights()}
              disabled={processing}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {processing ? 'Processing...' : 'Generate Draft Insights'}
            </button>
          </div>
        </div>

        {pageError ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        ) : null}

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Total Insights</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{insights.length}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Draft Insights</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {insights.filter((insight) => insight.status === 'draft').length}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Generated Variants</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{variants.length}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Published Insights</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {insights.filter((insight) => insight.status === 'published').length}
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr,1fr]">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">Content Insights Queue</h2>
              <p className="mt-1 text-sm text-gray-500">
                Drafts generated by the new autonomous content insights pipeline.
              </p>
            </div>

            <div className="max-h-[720px] overflow-y-auto">
              {loading ? (
                <div className="px-6 py-8 text-sm text-gray-500">Loading insights...</div>
              ) : insights.length === 0 ? (
                <div className="px-6 py-8 text-sm text-gray-500">
                  No content insights yet. Generate a batch to begin.
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {insights.map((insight) => {
                    const isSelected = selectedInsightId === insight.id;

                    return (
                      <div
                        key={insight.id}
                        onClick={() => setSelectedInsightId(insight.id)}
                        className={`w-full cursor-pointer px-6 py-5 text-left transition ${
                          isSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                        }`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedInsightId(insight.id);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                                  insight.status
                                )}`}
                              >
                                {insight.status}
                              </span>

                              <span className="text-xs font-medium text-gray-500">
                                Confidence {normalizeNumber(insight.confidence_score)}
                              </span>
                            </div>

                            <h3 className="text-lg font-semibold text-gray-900">
                              {normalizeString(insight.title) || 'Untitled Insight'}
                            </h3>

                            <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                              {normalizeString(insight.canonical_summary) || 'No summary available.'}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                              <span>Source: {normalizeString(insight.source_type) || '—'}</span>
                              <span>Keyword: {normalizeString(insight.seo_keyword) || '—'}</span>
                              <span>Created: {normalizeDateTime(insight.created_at)}</span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/insights/studio/${insight.id}`}
                                onClick={(event) => event.stopPropagation()}
                                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 transition hover:bg-gray-100"
                              >
                                Review
                              </Link>

                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleGenerateVariants(insight.id);
                                }}
                                disabled={generatingInsightId === insight.id}
                                className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
                              >
                                {generatingInsightId === insight.id ? 'Generating...' : 'Generate Variants'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-xl font-bold text-gray-900">Selected Insight</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Review the canonical content before promotion and publishing workflows.
                </p>
              </div>

              <div className="px-6 py-5">
                {selectedInsight ? (
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                            selectedInsight.status
                          )}`}
                        >
                          {selectedInsight.status}
                        </span>
                        <span className="inline-flex rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                          {normalizeString(selectedInsight.angle) || 'No angle'}
                        </span>
                        <span className="inline-flex rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                          {normalizeString(selectedInsight.audience) || 'No audience'}
                        </span>
                      </div>

                      <h3 className="text-2xl font-bold text-gray-900">
                        {normalizeString(selectedInsight.title) || 'Untitled Insight'}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleUpdateInsightStatus(selectedInsight.id, 'approved')}
                        disabled={updatingInsightId === selectedInsight.id}
                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                      >
                        {updatingInsightId === selectedInsight.id ? 'Updating...' : 'Approve'}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleUpdateInsightStatus(selectedInsight.id, 'published')}
                        disabled={updatingInsightId === selectedInsight.id}
                        className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
                      >
                        {updatingInsightId === selectedInsight.id ? 'Updating...' : 'Publish'}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleUpdateInsightStatus(selectedInsight.id, 'archived')}
                        disabled={updatingInsightId === selectedInsight.id}
                        className="rounded-lg bg-gray-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {updatingInsightId === selectedInsight.id ? 'Updating...' : 'Archive'}
                      </button>
                    </div>

                    <div className="grid gap-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                      <div>
                        <span className="font-semibold text-gray-900">Slug:</span>{' '}
                        {normalizeString(selectedInsight.slug) || '—'}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">SEO Keyword:</span>{' '}
                        {normalizeString(selectedInsight.seo_keyword) || '—'}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">Source:</span>{' '}
                        {normalizeString(selectedInsight.source_type) || '—'}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-900">Updated:</span>{' '}
                        {normalizeDateTime(selectedInsight.updated_at)}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                        Canonical Summary
                      </h4>
                      <p className="whitespace-pre-wrap text-gray-700">
                        {normalizeString(selectedInsight.canonical_summary) || 'No summary available.'}
                      </p>
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                        Canonical Body
                      </h4>
                      <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
                        {normalizeString(selectedInsight.canonical_body) || 'No body available.'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Select an insight to inspect details.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-xl font-bold text-gray-900">Generated Variants</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Content outputs tied to the selected insight.
                </p>
              </div>

              <div className="max-h-[420px] overflow-y-auto px-6 py-5">
                {!selectedInsight ? (
                  <p className="text-sm text-gray-500">Select an insight to view its variants.</p>
                ) : selectedInsightVariants.length === 0 ? (
                  <p className="text-sm text-gray-500">No variants generated yet for this insight.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedInsightVariants.map((variant) => (
                      <div
                        key={variant.id}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {formatInsightTaxonomyLabel(normalizeString(variant.variant_type))}
                          </span>
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(
                              variant.status
                            )}`}
                          >
                            {variant.status}
                          </span>
                        </div>

                        <p className="mb-2 text-sm font-medium text-gray-800">
                          {normalizeString(variant.title) || 'Untitled Variant'}
                        </p>

                        <div className="max-h-32 overflow-y-auto whitespace-pre-wrap text-sm text-gray-600">
                          {normalizeString(variant.body) || 'No body available.'}
                        </div>

                        {normalizeString(variant.cta) ? (
                          <div className="mt-3 text-xs font-medium text-blue-700">
                            CTA: {normalizeString(variant.cta)}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}