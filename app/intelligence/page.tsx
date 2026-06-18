import Link from 'next/link'
import type { Metadata } from 'next'
import { getPublishedContentInsights } from '@/lib/contentInsightsPublic'

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: 'NationsNRG Intelligence',
  description:
    'Published market intelligence, strategic insights, and business energy analysis from NationsNRG.',
}

function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(date)
}

export default async function IntelligencePage() {
  const insights = await getPublishedContentInsights()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            NationsNRG Intelligence
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">
            Published Market Intelligence
          </h1>
          <p className="mt-4 max-w-3xl text-base text-slate-600 dark:text-slate-400">
            Public-facing insight pages generated from the new content insights system.
            This route stays separate from the legacy insights page while the new
            pipeline proves itself in production.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {insights.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950">
            <div className="text-lg font-semibold">No published content insights yet.</div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Publish a content insight from the studio and it will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {insights.map((insight) => (
              <article
                key={insight.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
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
                </div>

                <h2 className="text-xl font-semibold tracking-tight">
                  <Link
                    href={`/intelligence/${insight.slug}`}
                    className="hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {insight.title}
                  </Link>
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {insight.excerpt}
                </p>

                <div className="mt-5">
                  <Link
                    href={`/intelligence/${insight.slug}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Read insight →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}