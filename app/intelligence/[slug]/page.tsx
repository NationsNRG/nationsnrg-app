import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  getPublishedContentInsightBySlug,
  getRelatedPublishedContentInsights,
} from '@/lib/contentInsightsPublic'

type IntelligenceDetailPageProps = {
  params: Promise<{
    slug: string
  }>
}

function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
  }).format(date)
}

export async function generateMetadata({
  params,
}: IntelligenceDetailPageProps): Promise<Metadata> {
  const resolvedParams = await params
  const insight = await getPublishedContentInsightBySlug(resolvedParams.slug)

  if (!insight) {
    return {
      title: 'Insight Not Found | NationsNRG Intelligence',
    }
  }

  return {
    title: `${insight.title} | NationsNRG Intelligence`,
    description: insight.excerpt,
  }
}

export default async function IntelligenceDetailPage({
  params,
}: IntelligenceDetailPageProps) {
  const resolvedParams = await params
  const insight = await getPublishedContentInsightBySlug(resolvedParams.slug)

  if (!insight) {
    notFound()
  }

  const relatedInsights = await getRelatedPublishedContentInsights({
    currentInsightId: insight.id,
    limit: 3,
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <Link
            href="/intelligence"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            ← Back to Intelligence
          </Link>

          <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{formatDate(insight.published_at)}</span>
            {insight.angle ? (
              <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
                {insight.angle}
              </span>
            ) : null}
            {insight.audience ? (
              <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
                {insight.audience}
              </span>
            ) : null}
            {insight.seo_keyword ? (
              <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-1 dark:border-slate-700 dark:bg-slate-900">
                SEO: {insight.seo_keyword}
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 text-4xl font-bold tracking-tight">
            {insight.title}
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-400">
            {insight.canonical_summary || insight.excerpt}
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 xl:grid-cols-[minmax(0,1fr),320px]">
        <article className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="whitespace-pre-wrap text-base leading-8 text-slate-700 dark:text-slate-300">
            {insight.canonical_body || 'No published body available.'}
          </div>
        </article>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-lg font-semibold">Insight Details</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <div>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  Source:
                </span>{' '}
                {insight.source_type || '—'}
              </div>
              <div>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  Confidence:
                </span>{' '}
                {insight.confidence_score ?? '—'}
              </div>
              <div>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  Published:
                </span>{' '}
                {formatDate(insight.published_at)}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="text-lg font-semibold">Related Intelligence</h2>

            {relatedInsights.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                No related insights yet.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {relatedInsights.map((item) => (
                  <div key={item.id}>
                    <Link
                      href={`/intelligence/${item.slug}`}
                      className="font-medium text-slate-900 hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {item.excerpt}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}