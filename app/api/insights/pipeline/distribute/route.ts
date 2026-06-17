import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Database, Json } from '@/types/supabase'

type PublicSchema = Database['public']
type DistributionInsert =
  PublicSchema['Tables']['content_insight_distribution']['Insert']
type SystemActivityInsert = PublicSchema['Tables']['system_activity']['Insert']

type DistributionChannel =
  | 'blog'
  | 'newsletter'
  | 'linkedin'
  | 'twitter'
  | 'youtube'
  | 'short_video'
  | 'email'
  | 'sales_enablement'

type DistributionCreateStatus = 'queued' | 'scheduled'
type ActiveDistributionStatus = 'queued' | 'scheduled' | 'published'

interface DistributeRequestBody {
  variantId?: string
  channel?: string
  status?: string
  scheduledAt?: string | null
}

function nowIso(): string {
  return new Date().toISOString()
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isDistributionChannel(value: string): value is DistributionChannel {
  return (
    value === 'blog' ||
    value === 'newsletter' ||
    value === 'linkedin' ||
    value === 'twitter' ||
    value === 'youtube' ||
    value === 'short_video' ||
    value === 'email' ||
    value === 'sales_enablement'
  )
}

function normalizeRequestedStatus(
  value: unknown
): DistributionCreateStatus | null {
  const normalized = normalizeString(value).toLowerCase()

  if (normalized.length === 0 || normalized === 'queued') {
    return 'queued'
  }

  if (normalized === 'draft') {
    return 'queued'
  }

  if (normalized === 'scheduled') {
    return 'scheduled'
  }

  return null
}

function parseScheduledAt(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString()
}

function isConflictError(code: string | undefined): boolean {
  return code === '23505'
}

async function logSystemActivity(params: {
  activityType: string
  message: string
  details?: Json
}): Promise<void> {
  const payload: SystemActivityInsert = {
    activity_type: params.activityType,
    lead_id: null,
    details: {
      message: params.message,
      payload: params.details ?? null,
    },
    created_at: nowIso(),
  }

  const { error } = await supabase.from('system_activity').insert(payload)

  if (error) {
    console.error('content_distribution_log_failed', error.message)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DistributeRequestBody

    const variantId = normalizeString(body?.variantId)
    const channel = normalizeString(body?.channel)
    const status = normalizeRequestedStatus(body?.status)
    const scheduledAt = parseScheduledAt(body?.scheduledAt)

    if (!variantId) {
      return NextResponse.json(
        { success: false, error: 'Missing variantId' },
        { status: 400 }
      )
    }

    if (!isDistributionChannel(channel)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid channel. Allowed: blog, newsletter, linkedin, twitter, youtube, short_video, email, sales_enablement',
        },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid status. Allowed: queued, scheduled',
        },
        { status: 400 }
      )
    }

    if (status === 'scheduled' && !scheduledAt) {
      return NextResponse.json(
        {
          success: false,
          error: 'scheduledAt is required when status is scheduled',
        },
        { status: 400 }
      )
    }

    const { data: variant, error: variantError } = await supabase
      .from('content_insight_variants')
      .select('id, insight_id, status, variant_type')
      .eq('id', variantId)
      .maybeSingle()

    if (variantError) {
      await logSystemActivity({
        activityType: 'content_distribution_variant_lookup_failed',
        message: variantError.message,
        details: { variantId, channel, status },
      })

      return NextResponse.json(
        { success: false, error: 'Failed to load variant' },
        { status: 500 }
      )
    }

    if (!variant) {
      return NextResponse.json(
        { success: false, error: 'Variant not found' },
        { status: 404 }
      )
    }

    const variantStatus = normalizeString(variant.status)

    if (variantStatus !== 'approved' && variantStatus !== 'published') {
      return NextResponse.json(
        {
          success: false,
          error: 'Variant must be approved or published before distribution',
        },
        { status: 400 }
      )
    }

    const insightId = normalizeString(variant.insight_id)

    if (!insightId) {
      return NextResponse.json(
        { success: false, error: 'Variant is missing insight association' },
        { status: 500 }
      )
    }

    const { data: insight, error: insightError } = await supabase
      .from('content_insights')
      .select('id, status')
      .eq('id', insightId)
      .maybeSingle()

    if (insightError) {
      await logSystemActivity({
        activityType: 'content_distribution_insight_lookup_failed',
        message: insightError.message,
        details: { variantId, insightId, channel, status },
      })

      return NextResponse.json(
        { success: false, error: 'Failed to load insight' },
        { status: 500 }
      )
    }

    if (!insight) {
      return NextResponse.json(
        { success: false, error: 'Insight not found' },
        { status: 404 }
      )
    }

    const insightStatus = normalizeString(insight.status)

    if (insightStatus !== 'approved' && insightStatus !== 'published') {
      return NextResponse.json(
        {
          success: false,
          error: 'Insight must be approved or published before distribution',
        },
        { status: 400 }
      )
    }

    const activeStatuses: ActiveDistributionStatus[] = [
      'queued',
      'scheduled',
      'published',
    ]

    const { data: existing, error: existingError } = await supabase
      .from('content_insight_distribution')
      .select('id, status, channel, variant_id, scheduled_at, published_at')
      .eq('variant_id', variantId)
      .eq('channel', channel)
      .in('status', activeStatuses)
      .maybeSingle()

    if (existingError) {
      await logSystemActivity({
        activityType: 'content_distribution_existing_lookup_failed',
        message: existingError.message,
        details: { variantId, channel, status },
      })

      return NextResponse.json(
        { success: false, error: 'Failed to check existing distribution' },
        { status: 500 }
      )
    }

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: `An active distribution already exists for this variant and channel in status "${existing.status}"`,
          distribution: existing,
        },
        { status: 409 }
      )
    }

    const insertPayload: DistributionInsert = {
      insight_id: insightId,
      variant_id: variantId,
      channel,
      status,
      scheduled_at: status === 'scheduled' ? scheduledAt : null,
      published_at: null,
      external_url: null,
      external_id: null,
      performance: {} as Json,
      created_at: nowIso(),
      updated_at: nowIso(),
    }

    const { data: distribution, error: insertError } = await supabase
      .from('content_insight_distribution')
      .insert(insertPayload)
      .select('*')
      .maybeSingle()

    if (insertError || !distribution) {
      const message = insertError?.message ?? 'Insert returned no row'

      await logSystemActivity({
        activityType: 'content_distribution_insert_failed',
        message,
        details: { variantId, insightId, channel, status, scheduledAt },
      })

      if (isConflictError(insertError?.code)) {
        return NextResponse.json(
          {
            success: false,
            error: 'An active distribution already exists for this variant and channel',
          },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { success: false, error: 'Failed to create distribution row' },
        { status: 500 }
      )
    }

    await logSystemActivity({
      activityType: 'content_distribution_created',
      message: 'Distribution row created successfully',
      details: {
        distributionId: distribution.id,
        variantId,
        insightId,
        variantType: variant.variant_type,
        channel,
        status: distribution.status,
        scheduledAt: distribution.scheduled_at,
      },
    })

    return NextResponse.json({
      success: true,
      distribution,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    await logSystemActivity({
      activityType: 'content_distribution_route_failed',
      message,
      details: null,
    })

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}