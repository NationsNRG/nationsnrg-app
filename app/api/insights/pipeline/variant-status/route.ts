import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Database, Json } from '@/types/supabase'

type PublicSchema = Database['public']
type ContentInsightVariantUpdate =
  PublicSchema['Tables']['content_insight_variants']['Update']
type SystemActivityInsert = PublicSchema['Tables']['system_activity']['Insert']

type VariantStatus = 'draft' | 'approved' | 'published' | 'archived'
type AllowedVariantStatus = 'approved' | 'published' | 'archived'

interface VariantStatusRequestBody {
  variantId?: string
  status?: string
}

const ALLOWED_TRANSITIONS: Record<VariantStatus, AllowedVariantStatus[]> = {
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

function isAllowedVariantStatus(value: string): value is AllowedVariantStatus {
  return value === 'approved' || value === 'published' || value === 'archived'
}

function isVariantStatus(value: string): value is VariantStatus {
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
    console.error('content_variant_status_log_failed', error.message)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VariantStatusRequestBody
    const variantId = normalizeString(body?.variantId)
    const status = normalizeString(body?.status)

    if (!variantId) {
      return NextResponse.json(
        { success: false, error: 'Missing variantId' },
        { status: 400 }
      )
    }

    if (!isAllowedVariantStatus(status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid status. Allowed values: approved, published, archived',
        },
        { status: 400 }
      )
    }

    const { data: existingVariant, error: lookupError } = await supabase
      .from('content_insight_variants')
      .select('id, insight_id, variant_type, status, updated_at')
      .eq('id', variantId)
      .maybeSingle()

    if (lookupError) {
      await logSystemActivity({
        activityType: 'content_variant_status_lookup_failed',
        message: lookupError.message,
        details: { variantId, status },
      })

      return NextResponse.json(
        { success: false, error: 'Failed to load variant' },
        { status: 500 }
      )
    }

    if (!existingVariant) {
      return NextResponse.json(
        { success: false, error: 'Variant not found' },
        { status: 404 }
      )
    }

    const currentStatus = normalizeString(existingVariant.status)

    if (!isVariantStatus(currentStatus)) {
      await logSystemActivity({
        activityType: 'content_variant_status_invalid_existing_state',
        message: 'Variant has invalid existing status',
        details: {
          variantId,
          currentStatus,
          requestedStatus: status,
        },
      })

      return NextResponse.json(
        { success: false, error: 'Variant has an invalid existing status' },
        { status: 500 }
      )
    }

    if (currentStatus === status) {
      return NextResponse.json({
        success: true,
        variant: existingVariant,
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

    const updatePayload: ContentInsightVariantUpdate = {
      status,
      updated_at: nowIso(),
    }

    const { data, error } = await supabase
      .from('content_insight_variants')
      .update(updatePayload)
      .eq('id', variantId)
      .select('id, insight_id, variant_type, status, updated_at')
      .maybeSingle()

    if (error) {
      await logSystemActivity({
        activityType: 'content_variant_status_update_failed',
        message: error.message,
        details: {
          variantId,
          fromStatus: currentStatus,
          toStatus: status,
        },
      })

      return NextResponse.json(
        { success: false, error: 'Failed to update variant status' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Variant not found after update' },
        { status: 404 }
      )
    }

    await logSystemActivity({
      activityType: 'content_variant_status_updated',
      message: 'Content insight variant status updated successfully',
      details: {
        variantId: data.id,
        insightId: data.insight_id,
        variantType: data.variant_type,
        fromStatus: currentStatus,
        toStatus: data.status,
        updatedAt: data.updated_at,
      },
    })

    return NextResponse.json({
      success: true,
      variant: data,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    await logSystemActivity({
      activityType: 'content_variant_status_route_failed',
      message,
      details: null,
    })

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}