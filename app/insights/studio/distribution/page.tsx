import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import DistributionStatusActions from '../../../../components/insights/DistributionStatusActions'
import DistributionPerformanceEditor from '../../../../components/insights/DistributionPerformanceEditor'
import SyncedHorizontalScroll from '../../../../components/insights/SyncedHorizontalScroll'
import {
  formatInsightTaxonomyLabel,
  getVariantDisplayTitle,
  getVariantDisplayType,
  toTitleCase,
} from '../../../../lib/insights/taxonomy'
import {
  type DistributionPerformance,
  DISTRIBUTION_PERFORMANCE_FIELDS,
  formatPerformanceMetricLabel,
  normalizeDistributionPerformance,
} from '../../../../lib/insights/distributionPerformance'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type SearchParamValue = string | string[] | undefined

type DistributionPageProps = {
  searchParams?: Promise<{
    q?: SearchParamValue
    channel?: SearchParamValue
    status?: SearchParamValue
    sort?: SearchParamValue
  }>
}

type InsightRecord = {
  id: string
  title: string | null
  slug: string | null
  status: string | null
}

type VariantRecord = {
  id: string
  title: string | null
  status: string | null
  variant_type: string | null
}

type DistributionRow = {
  id: string
  insight_id: string
  variant_id: string
  channel: string | null
  status: string | null
  scheduled_at: string | null
  published_at: string | null
  created_at: string
  performance: unknown
}

type ViewDistributionRow = DistributionRow & {
  insight: InsightRecord | null
  variant: VariantRecord | null
  normalizedPerformance: DistributionPerformance
}

type DistributionStatus =
  | 'queued'
  | 'scheduled'
  | 'published'
  | 'failed'
  | 'archived'

const BADGE_STYLES: Record<string, string> = {
  draft:
    'border border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
  queued:
    'border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  scheduled:
    'border border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
  approved:
    'border border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
  processing:
    'border border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300',
  published:
    'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  archived:
    'border border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
  failed:
    'border border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300',
}

const CHANNEL_OPTIONS = [
  'blog',
  'newsletter',
  'linkedin',
  'twitter',
  'youtube',
  'short_video',
  'email',
  'sales_enablement',
] as const

const STATUS_OPTIONS: DistributionStatus[] = [
  'queued',
  'scheduled',
  'published',
  'failed',
  'archived',
]

function getSearchParamValue(value: SearchParamValue): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? ''
  }

  return typeof value === 'string' ? value.trim() : ''
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getBadgeClass(status: string | null | undefined): string {
  if (!status) {
    return 'border border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
  }

  return (
    BADGE_STYLES[status] ??
    'border border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
  )
}

function sortDistributionRows(
  rows: ViewDistributionRow[],
  sortMode: string
): ViewDistributionRow[] {
  const nextRows = [...rows]

  if (sortMode === 'scheduled_first') {
    nextRows.sort((a, b) => {
      const aScheduled = a.scheduled_at
        ? new Date(a.scheduled_at).getTime()
        : Number.MAX_SAFE_INTEGER
      const bScheduled = b.scheduled_at
        ? new Date(b.scheduled_at).getTime()
        : Number.MAX_SAFE_INTEGER

      if (aScheduled !== bScheduled) {
        return aScheduled - bScheduled
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return nextRows
  }

  nextRows.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return nextRows
}

function getPerformanceScore(performance: DistributionPerformance): number {
  return (
    performance.clicks +
    performance.engagement +
    performance.replies +
    performance.conversions +
    performance.booked_consultations +
    performance.bill_uploads
  )
}

async function getDistributionRows(params: {
  query: string
  channel: string
  status: string
  sort: string
}): Promise<{
  rows: ViewDistributionRow[]
  error: string | null
}> {
  let distributionQuery = supabase.from('content_insight_distribution').select(`
      id,
      insight_id,
      variant_id,
      channel,
      status,
      scheduled_at,
      published_at,
      created_at,
      performance
    `)

  if (params.channel) {
    distributionQuery = distributionQuery.eq('channel', params.channel)
  }

  if (params.status) {
    distributionQuery = distributionQuery.eq('status', params.status)
  }

  const { data: distributionData, error: distributionError } = await distributionQuery

  if (distributionError) {
    return {
      rows: [],
      error: distributionError.message,
    }
  }

  const baseRows = ((distributionData ?? []) as DistributionRow[]).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const insightIds = Array.from(
    new Set(baseRows.map((row) => row.insight_id).filter(Boolean))
  )

  const variantIds = Array.from(
    new Set(baseRows.map((row) => row.variant_id).filter(Boolean))
  )

  let insightsById = new Map<string, InsightRecord>()
  let variantsById = new Map<string, VariantRecord>()

  if (insightIds.length > 0) {
    const { data: insightsData, error: insightsError } = await supabase
      .from('content_insights')
      .select('id, title, slug, status')
      .in('id', insightIds)

    if (insightsError) {
      return {
        rows: [],
        error: insightsError.message,
      }
    }

    insightsById = new Map(
      ((insightsData ?? []) as InsightRecord[]).map((insight) => [
        insight.id,
        insight,
      ])
    )
  }

  if (variantIds.length > 0) {
    const { data: variantsData, error: variantsError } = await supabase
      .from('content_insight_variants')
      .select('id, title, status, variant_type')
      .in('id', variantIds)

    if (variantsError) {
      return {
        rows: [],
        error: variantsError.message,
      }
    }

    variantsById = new Map(
      ((variantsData ?? []) as VariantRecord[]).map((variant) => [
        variant.id,
        variant,
      ])
    )
  }

  let rows: ViewDistributionRow[] = baseRows.map((row) => ({
    ...row,
    insight: insightsById.get(row.insight_id) ?? null,
    variant: variantsById.get(row.variant_id) ?? null,
    normalizedPerformance: normalizeDistributionPerformance(row.performance),
  }))

  if (params.query) {
    const loweredQuery = params.query.toLowerCase()

    rows = rows.filter((row) => {
      const insightTitle = row.insight?.title?.toLowerCase() ?? ''
      const insightSlug = row.insight?.slug?.toLowerCase() ?? ''
      const variantTitle = row.variant?.title?.toLowerCase() ?? ''
      const variantType = row.variant?.variant_type?.toLowerCase() ?? ''
      const channel = row.channel?.toLowerCase() ?? ''

      return (
        insightTitle.includes(loweredQuery) ||
        insightSlug.includes(loweredQuery) ||
        variantTitle.includes(loweredQuery) ||
        variantType.includes(loweredQuery) ||
        channel.includes(loweredQuery)
      )
    })
  }

  rows = sortDistributionRows(rows, params.sort)

  return {
    rows,
    error: null,
  }
}

function SummaryCard({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  )
}

export default async function InsightsDistributionPage({
  searchParams,
}: DistributionPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {}

  const query = getSearchParamValue(resolvedSearchParams.q)
  const channel = getSearchParamValue(resolvedSearchParams.channel)
  const status = getSearchParamValue(resolvedSearchParams.status)
  const sort = getSearchParamValue(resolvedSearchParams.sort) || 'newest'

  const { rows, error } = await getDistributionRows({
    query,
    channel,
    status,
    sort,
  })

  const totalCount = rows.length
  const queuedCount = rows.filter((row) => row.status === 'queued').length
  const scheduledCount = rows.filter((row) => row.status === 'scheduled').length
  const publishedCount = rows.filter((row) => row.status === 'published').length
  const failedCount = rows.filter((row) => row.status === 'failed').length

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            NationsNRG Insights Studio
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Distribution Queue
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
                Operations console for scheduled, queued, published, failed, archived, and tracked distribution rows.
              </p>
            </div>

            <Link
              href="/insights/studio"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Back to Studio
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="Total Rows" value={totalCount} />
          <SummaryCard label="Queued" value={queuedCount} />
          <SummaryCard label="Scheduled" value={scheduledCount} />
          <SummaryCard label="Published" value={publishedCount} />
          <SummaryCard label="Failed" value={failedCount} />
        </div>

        <form
          action="/insights/studio/distribution"
          method="get"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Search
              </label>
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Insight title, variant title, type, or channel"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Channel
              </label>
              <select
                name="channel"
                defaultValue={channel}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">All channels</option>
                {CHANNEL_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatInsightTaxonomyLabel(option)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Status
              </label>
              <select
                name="status"
                defaultValue={status}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {toTitleCase(option)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Sort
              </label>
              <select
                name="sort"
                defaultValue={sort}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="newest">Newest first</option>
                <option value="scheduled_first">Scheduled first</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Apply Filters
            </button>

            <Link
              href="/insights/studio/distribution"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Clear
            </Link>
          </div>
        </form>

        {error ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
            <div className="font-semibold">Unable to load distribution rows.</div>
            <div className="mt-1">{error}</div>
          </div>
        ) : null}

        {!error && rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <div className="text-lg font-semibold">No distribution rows found.</div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Try changing filters or create a new queued or scheduled distribution item.
            </p>
          </div>
        ) : null}

        {!error && rows.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="p-4">
              <SyncedHorizontalScroll>
                <table className="min-w-[1720px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-900">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                        Insight
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                        Variant
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                        Channel
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                        Distribution Status
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                        Variant Status
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                        Scheduled
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                        Published
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                        Performance
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                        Created
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                        Operations
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className="align-top transition hover:bg-slate-50 dark:hover:bg-slate-900/60"
                      >
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            {row.insight_id ? (
                              <Link
                                href={`/insights/studio/${row.insight_id}`}
                                className="font-medium text-slate-900 hover:underline dark:text-slate-100"
                              >
                                {row.insight?.title?.trim() || 'Untitled insight'}
                              </Link>
                            ) : (
                              <div className="font-medium text-slate-900 dark:text-slate-100">
                                {row.insight?.title?.trim() || 'Untitled insight'}
                              </div>
                            )}

                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {row.insight?.slug ? `/${row.insight.slug}` : row.insight_id}
                            </div>

                            <div className="mt-1">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getBadgeClass(
                                  row.insight?.status
                                )}`}
                              >
                                {toTitleCase(row.insight?.status)}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2">
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {getVariantDisplayTitle({
                                title: row.variant?.title,
                                variantType: row.variant?.variant_type,
                              })}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                {getVariantDisplayType(row.variant?.variant_type)}
                              </span>
                            </div>

                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {row.variant_id}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className="font-medium">
                            {formatInsightTaxonomyLabel(row.channel)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getBadgeClass(
                              row.status
                            )}`}
                          >
                            {toTitleCase(row.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getBadgeClass(
                              row.variant?.status
                            )}`}
                          >
                            {toTitleCase(row.variant?.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                          {formatDateTime(row.scheduled_at)}
                        </td>

                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                          {formatDateTime(row.published_at)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="min-w-[320px]">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                              {DISTRIBUTION_PERFORMANCE_FIELDS.map((field) => (
                                <div key={field} className="flex items-center justify-between gap-2">
                                  <span>{formatPerformanceMetricLabel(field)}</span>
                                  <span className="font-medium text-slate-900 dark:text-slate-100">
                                    {row.normalizedPerformance[field]}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <div className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                              Activity Score {getPerformanceScore(row.normalizedPerformance)}
                            </div>

                            <DistributionPerformanceEditor
                              distributionId={row.id}
                              initialPerformance={row.normalizedPerformance}
                            />
                          </div>
                        </td>

                        <td className="px-4 py-4 text-slate-700 dark:text-slate-300">
                          {formatDateTime(row.created_at)}
                        </td>

                        <td className="px-4 py-4">
                          <DistributionStatusActions
                            distributionId={row.id}
                            status={row.status}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SyncedHorizontalScroll>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}