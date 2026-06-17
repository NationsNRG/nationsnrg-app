import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Database, Json } from '@/types/supabase'

type PublicSchema = Database['public']
type ContentInsightUpdate = PublicSchema['Tables']['content_insights']['Update']
type SystemActivityInsert = PublicSchema['Tables']['system_activity']['Insert']

type InsightStatus = 'draft' | 'approved' | 'published' | 'archived'
type AllowedInsightStatus = 'approved' | 'published' | 'archived'

interface StatusRequestBody {
  insightId?: string
  status?: string
}

const ALLOWED_TRANSITIONS: Record<InsightStatus, AllowedInsightStatus[]> = {
  draft: ['approved'],
  approved: ['published'],
  published: ['archived'],
  archived: [],
}

function nowIso(): string {
  return new Date().toISOString()
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isAllowedInsightStatus(value: string): value is AllowedInsightStatus {
  return value === 'approved' || value === 'published' || value === 'archived'
}

function isInsightStatus(value: string): value is InsightStatus {
  return (
    value === 'draft' ||
    value === 'approved' ||
    value === 'published' ||
    value === 'archived'
  )
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
    console.error('content_insight_status_log_failed', error.message)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as StatusRequestBody
    const insightId = normalizeString(body?.insightId)
    const status = normalizeString(body?.status)

    if (insightId.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing insightId',
        },
        { status: 400 }
      )
    }

    if (!isAllowedInsightStatus(status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid status. Allowed values: approved, published, archived',
        },
        { status: 400 }
      )
    }

    const { data: existingInsight, error: lookupError } = await supabase
      .from('content_insights')
      .select('id, status, published_at, updated_at')
      .eq('id', insightId)
      .maybeSingle()

    if (lookupError) {
      await logSystemActivity({
        activityType: 'content_insight_status_lookup_failed',
        message: lookupError.message,
        details: {
          insightId,
          requestedStatus: status,
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to load insight',
        },
        { status: 500 }
      )
    }

    if (!existingInsight) {
      await logSystemActivity({
        activityType: 'content_insight_status_missing',
        message: 'Insight not found during status lookup',
        details: {
          insightId,
          requestedStatus: status,
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Insight not found',
        },
        { status: 404 }
      )
    }

    const currentStatus = normalizeString(existingInsight.status)

    if (!isInsightStatus(currentStatus)) {
      await logSystemActivity({
        activityType: 'content_insight_status_invalid_existing_state',
        message: 'Insight has invalid existing status',
        details: {
          insightId,
          currentStatus,
          requestedStatus: status,
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Insight has an invalid existing status',
        },
        { status: 500 }
      )
    }

    if (currentStatus === status) {
      return NextResponse.json({
        success: true,
        insight: existingInsight,
      })
    }

    const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus]

    if (!allowedNextStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid transition from "${currentStatus}" to "${status}"`,
        },
        { status: 409 }
      )
    }

    const updatePayload: ContentInsightUpdate = {
      status,
      updated_at: nowIso(),
    }

    if (status === 'published' && !existingInsight.published_at) {
      updatePayload.published_at = nowIso()
    }

    const { data, error } = await supabase
      .from('content_insights')
      .update(updatePayload)
      .eq('id', insightId)
      .select('id, status, published_at, updated_at')
      .maybeSingle()

    if (error) {
      await logSystemActivity({
        activityType: 'content_insight_status_update_failed',
        message: error.message,
        details: {
          insightId,
          fromStatus: currentStatus,
          toStatus: status,
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update insight status',
        },
        { status: 500 }
      )
    }

    if (!data) {
      await logSystemActivity({
        activityType: 'content_insight_status_update_missing',
        message: 'Insight not found during status update',
        details: {
          insightId,
          fromStatus: currentStatus,
          toStatus: status,
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Insight not found',
        },
        { status: 404 }
      )
    }

    await logSystemActivity({
      activityType: 'content_insight_status_updated',
      message: 'Content insight status updated successfully',
      details: {
        insightId: data.id,
        fromStatus: currentStatus,
        toStatus: data.status,
        publishedAt: data.published_at,
        updatedAt: data.updated_at,
      },
    })

    return NextResponse.json({
      success: true,
      insight: data,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    await logSystemActivity({
      activityType: 'content_insight_status_route_failed',
      message,
      details: null,
    })

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    )
  }
}