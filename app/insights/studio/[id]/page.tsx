import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatInsightTaxonomyLabel } from '../../../../lib/insights/taxonomy'
import InsightStatusActions from '../../../../components/insights/InsightStatusActions'
import VariantStatusActions from '../../../../components/insights/VariantStatusActions'
import QueueDistributionActions from '../../../../components/insights/QueueDistributionActions'

interface StudioInsightPageProps {
  params: Promise<{
    id: string
  }>
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeNullableString(value: unknown): string | null {
  const normalized = normalizeString(value)
  return normalized.length > 0 ? normalized : null
}

function normalizeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString()
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'published':
      return 'border-green-200 bg-green-100 text-green-700'
    case 'approved':
      return 'border-blue-200 bg-blue-100 text-blue-700'
    case 'archived':
      return 'border-gray-300 bg-gray-200 text-gray-700'
    case 'failed':
      return 'border-red-200 bg-red-100 text-red-700'
    default:
      return 'border-yellow-200 bg-yellow-100 text-yellow-700'
  }
}

function assetTypeLabel(value: string): string {
  switch (value) {
    case 'hero_image_prompt':
      return 'Hero Image Prompt'
    case 'thumbnail_prompt':
      return 'Thumbnail Prompt'
    case 'video_prompt':
      return 'Video Prompt'
    case 'avatar_script':
      return 'Avatar Script'
    case 'voiceover_script':
      return 'Voiceover Script'
    case 'short_caption':
      return 'Short Caption'
    default:
      return value
  }
}

export default async function InsightStudioDetailPage({
  params,
}: StudioInsightPageProps) {
  const resolvedParams = await params
  const insightId = normalizeString(resolvedParams.id)

  if (insightId.length === 0) {
    notFound()
  }

  const [insightRes, variantsRes, assetsRes] = await Promise.all([
    supabase
      .from('content_insights')
      .select(
        `
          id,
          slug,
          title,
          canonical_summary,
          canonical_body,
          angle,
          audience,
          seo_keyword,
          source_type,
          source_data,
          confidence_score,
          status,
          created_at,
          updated_at,
          published_at
        `
      )
      .eq('id', insightId)
      .maybeSingle(),
    supabase
      .from('content_insight_variants')
      .select(
        `
          id,
          insight_id,
          variant_type,
          title,
          body,
          cta,
          metadata,
          status,
          created_at,
          updated_at
        `
      )
      .eq('insight_id', insightId)
      .order('created_at', { ascending: false }),
    supabase
      .from('content_insight_assets')
      .select(
        `
          id,
          insight_id,
          asset_type,
          content,
          metadata,
          created_at
        `
      )
      .eq('insight_id', insightId)
      .order('created_at', { ascending: false }),
  ])

  if (insightRes.error || !insightRes.data) {
    notFound()
  }

  const insight = insightRes.data
  const variants = Array.isArray(variantsRes.data) ? variantsRes.data : []
  const assets = Array.isArray(assetsRes.data) ? assetsRes.data : []

  const approvedVariantCount = variants.filter(
    (variant) => normalizeString(variant.status) === 'approved'
  ).length

  const publishedVariantCount = variants.filter(
    (variant) => normalizeString(variant.status) === 'published'
  ).length

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Insight Review
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900">
              {normalizeString(insight.title) || 'Untitled Insight'}
            </h1>
            <p className="mt-3 max-w-3xl text-gray-600">
              Review the canonical insight, generated variants, and production assets
              before full distribution.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/insights/studio"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-100"
            >
              Back to Studio
            </Link>

            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-100"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Insight Status</p>
            <div className="mt-3">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${statusBadgeClass(
                  normalizeString(insight.status)
                )}`}
              >
                {normalizeString(insight.status) || 'draft'}
              </span>
            </div>
            <div className="mt-4">
              <InsightStatusActions
                insightId={insight.id}
                currentStatus={normalizeString(insight.status) || 'draft'}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Confidence</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {normalizeNumber(insight.confidence_score)}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Variants</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{variants.length}</p>
            <p className="mt-1 text-xs text-gray-500">
              {approvedVariantCount} approved · {publishedVariantCount} published
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Assets</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{assets.length}</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-xl font-bold text-gray-900">Canonical Insight</h2>
              </div>

              <div className="space-y-5 px-6 py-5">
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                      normalizeString(insight.status)
                    )}`}
                  >
                    {normalizeString(insight.status) || 'draft'}
                  </span>

                  <span className="inline-flex rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                    {normalizeString(insight.angle) || 'No angle'}
                  </span>

                  <span className="inline-flex rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                    {normalizeString(insight.audience) || 'No audience'}
                  </span>
                </div>

                <div className="grid gap-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-700 md:grid-cols-2">
                  <div>
                    <span className="font-semibold text-gray-900">Slug:</span>{' '}
                    {normalizeNullableString(insight.slug) ?? '—'}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">SEO Keyword:</span>{' '}
                    {normalizeString(insight.seo_keyword) || '—'}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">Source Type:</span>{' '}
                    {normalizeString(insight.source_type) || '—'}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">Published:</span>{' '}
                    {formatDateTime(insight.published_at)}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">Created:</span>{' '}
                    {formatDateTime(insight.created_at)}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">Updated:</span>{' '}
                    {formatDateTime(insight.updated_at)}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Summary
                  </h3>
                  <p className="whitespace-pre-wrap text-gray-700">
                    {normalizeString(insight.canonical_summary) || 'No summary available.'}
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Canonical Body
                  </h3>
                  <div className="max-h-[420px] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-700">
                    {normalizeString(insight.canonical_body) || 'No canonical body available.'}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Source Data
                  </h3>
                  <pre className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-gray-900 p-4 text-xs leading-6 text-gray-100">
                    {JSON.stringify(insight.source_data ?? {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-xl font-bold text-gray-900">Generated Assets</h2>
              </div>

              <div className="px-6 py-5">
                {assets.length === 0 ? (
                  <p className="text-sm text-gray-500">No assets generated yet.</p>
                ) : (
                  <div className="space-y-4">
                    {assets.map((asset) => (
                      <div
                        key={asset.id}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {assetTypeLabel(normalizeString(asset.asset_type))}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDateTime(asset.created_at)}
                          </span>
                        </div>

                        <div className="whitespace-pre-wrap text-sm text-gray-700">
                          {normalizeString(asset.content) || 'No content.'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">Content Variants</h2>
            </div>

            <div className="max-h-[1200px] overflow-y-auto px-6 py-5">
              {variants.length === 0 ? (
                <p className="text-sm text-gray-500">No variants generated yet.</p>
              ) : (
                <div className="space-y-4">
                  {variants.map((variant) => (
                    <div
                      key={variant.id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="mb-3 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {formatInsightTaxonomyLabel(normalizeString(variant.variant_type))}
                            </span>

                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(
                                normalizeString(variant.status)
                              )}`}
                            >
                              {normalizeString(variant.status) || 'draft'}
                            </span>
                          </div>

                          <VariantStatusActions
                            variantId={variant.id}
                            currentStatus={normalizeString(variant.status) || 'draft'}
                          />
                        </div>

                        <QueueDistributionActions
                          variantId={variant.id}
                          currentStatus={normalizeString(variant.status) || 'draft'}
                        />
                      </div>

                      <h3 className="mb-2 text-sm font-semibold text-gray-800">
                        {normalizeString(variant.title) || 'Untitled Variant'}
                      </h3>

                      <div className="max-h-56 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-gray-700">
                        {normalizeString(variant.body) || 'No body available.'}
                      </div>

                      {normalizeString(variant.cta) ? (
                        <div className="mt-3 text-xs font-medium text-blue-700">
                          CTA: {normalizeString(variant.cta)}
                        </div>
                      ) : null}

                      <div className="mt-3 text-xs text-gray-500">
                        Created: {formatDateTime(variant.created_at)} · Updated:{' '}
                        {formatDateTime(variant.updated_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}