import { supabase } from '@/lib/supabase'

export type PublicContentInsight = {
  id: string
  slug: string
  title: string
  canonical_summary: string | null
  canonical_body: string | null
  angle: string | null
  audience: string | null
  seo_keyword: string | null
  source_type: string | null
  confidence_score: number | null
  status: 'published'
  created_at: string | null
  updated_at: string | null
  published_at: string
  excerpt: string
}

type ContentInsightRow = {
  id: string
  slug: string | null
  title: string | null
  canonical_summary: string | null
  canonical_body: string | null
  angle: string | null
  audience: string | null
  seo_keyword: string | null
  source_type: string | null
  confidence_score: number | null
  status: string | null
  created_at: string | null
  updated_at: string | null
  published_at: string | null
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function buildExcerpt(row: ContentInsightRow): string {
  const summary = normalizeString(row.canonical_summary)

  if (summary) {
    return summary
  }

  const body = normalizeString(row.canonical_body)

  if (!body) {
    return 'No summary available.'
  }

  return body.length > 220 ? `${body.slice(0, 217)}...` : body
}

function toPublicInsight(row: ContentInsightRow): PublicContentInsight | null {
  const slug = normalizeString(row.slug)
  const title = normalizeString(row.title)
  const publishedAt = normalizeString(row.published_at)
  const status = normalizeString(row.status)

  if (!slug || !title || !publishedAt || status !== 'published') {
    return null
  }

  return {
    id: row.id,
    slug,
    title,
    canonical_summary: row.canonical_summary,
    canonical_body: row.canonical_body,
    angle: row.angle,
    audience: row.audience,
    seo_keyword: row.seo_keyword,
    source_type: row.source_type,
    confidence_score: row.confidence_score,
    status: 'published',
    created_at: row.created_at,
    updated_at: row.updated_at,
    published_at: publishedAt,
    excerpt: buildExcerpt(row),
  }
}

export async function getPublishedContentInsights(
  limit?: number
): Promise<PublicContentInsight[]> {
  let query = supabase
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
        confidence_score,
        status,
        created_at,
        updated_at,
        published_at
      `
    )
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })

  if (typeof limit === 'number' && Number.isFinite(limit) && limit > 0) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as ContentInsightRow[])
    .map(toPublicInsight)
    .filter((row): row is PublicContentInsight => row !== null)
}

export async function getPublishedContentInsightBySlug(
  slug: string
): Promise<PublicContentInsight | null> {
  const normalizedSlug = normalizeString(slug)

  if (!normalizedSlug) {
    return null
  }

  const { data, error } = await supabase
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
        confidence_score,
        status,
        created_at,
        updated_at,
        published_at
      `
    )
    .eq('slug', normalizedSlug)
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) {
    return null
  }

  return toPublicInsight(data as ContentInsightRow)
}

export async function getRelatedPublishedContentInsights(params: {
  currentInsightId: string
  limit?: number
}): Promise<PublicContentInsight[]> {
  const { currentInsightId, limit = 3 } = params

  const { data, error } = await supabase
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
        confidence_score,
        status,
        created_at,
        updated_at,
        published_at
      `
    )
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .neq('id', currentInsightId)
    .order('published_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as ContentInsightRow[])
    .map(toPublicInsight)
    .filter((row): row is PublicContentInsight => row !== null)
}