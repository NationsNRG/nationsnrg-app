import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

type DistributionStatus =
  | 'queued'
  | 'scheduled'
  | 'published'
  | 'failed'
  | 'archived'

type DistributionRow =
  Database['public']['Tables']['content_insight_distribution']['Row']

type DistributionUpdate =
  Database['public']['Tables']['content_insight_distribution']['Update']

type UpdateDistributionStatusBody = {
  distributionId?: string
  status?: string
  scheduledAt?: string | null
  externalUrl?: string | null
  externalId?: string | null
}

const ACTIVE_DISTRIBUTION_STATUSES: DistributionStatus[] = [
  'queued',
  'scheduled',
  'published',
]

const ALLOWED_TRANSITIONS: Record<DistributionStatus, DistributionStatus[]> = {
  queued: ['scheduled', 'published', 'failed', 'archived'],
  scheduled: ['published', 'failed', 'archived'],
  failed: ['scheduled', 'published', 'archived'],
  published: ['archived'],
  archived: [],
}

function isDistributionStatus(value: unknown): value is DistributionStatus {
  return (
    value === 'queued' ||
    value === 'scheduled' ||
    value === 'published' ||
    value === 'failed' ||
    value === 'archived'
  )
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeNullableString(value: unknown): string | null {
  const normalized = normalizeString(value)
  return normalized.length > 0 ? normalized : null
}

function parseOptionalIsoDateTime(value: unknown): string | null | 'invalid' {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    return null
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return 'invalid'
  }

  return parsed.toISOString()
}

function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 })
}

function conflict(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 409 })
}

function serverError(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 500 })
}

export async function POST(request: Request) {
  let body: UpdateDistributionStatusBody

  try {
    body = (await request.json()) as UpdateDistributionStatusBody
  } catch {
    return badRequest('Invalid JSON body.')
  }

  const distributionId = normalizeString(body.distributionId)
  const targetStatus = normalizeString(body.status)
  const scheduledAt = parseOptionalIsoDateTime(body.scheduledAt)
  const externalUrl = normalizeNullableString(body.externalUrl)
  const externalId = normalizeNullableString(body.externalId)

  if (!distributionId) {
    return badRequest('distributionId is required.')
  }

  if (!isDistributionStatus(targetStatus)) {
    return badRequest(
      'status must be one of: queued, scheduled, published, failed, archived.'
    )
  }

  if (scheduledAt === 'invalid') {
    return badRequest('scheduledAt must be a valid ISO datetime.')
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return serverError(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })

  const { data: existingRow, error: existingRowError } = await supabase
    .from('content_insight_distribution')
    .select(
      'id, variant_id, channel, status, scheduled_at, published_at, external_url, external_id, updated_at'
    )
    .eq('id', distributionId)
    .maybeSingle()

  if (existingRowError) {
    return NextResponse.json(
      { success: false, error: existingRowError.message },
      { status: 500 }
    )
  }

  if (!existingRow) {
    return NextResponse.json(
      { success: false, error: 'Distribution row not found.' },
      { status: 404 }
    )
  }

  if (!isDistributionStatus(existingRow.status)) {
    return serverError('Existing distribution row has an invalid status.')
  }

  const currentStatus: DistributionStatus = existingRow.status

  if (currentStatus === targetStatus) {
    return NextResponse.json({
      success: true,
      distribution: existingRow,
    })
  }

  const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus]

  if (!allowedNextStatuses.includes(targetStatus)) {
    return conflict(
      `Invalid distribution transition: ${currentStatus} -> ${targetStatus}.`
    )
  }

  if (
    ACTIVE_DISTRIBUTION_STATUSES.includes(targetStatus) &&
    existingRow.variant_id &&
    existingRow.channel
  ) {
    const { data: duplicateActiveRows, error: duplicateCheckError } =
      await supabase
        .from('content_insight_distribution')
        .select('id')
        .eq('variant_id', existingRow.variant_id)
        .eq('channel', existingRow.channel)
        .neq('id', existingRow.id)
        .in('status', ACTIVE_DISTRIBUTION_STATUSES)

    if (duplicateCheckError) {
      return serverError(duplicateCheckError.message)
    }

    if ((duplicateActiveRows ?? []).length > 0) {
      return conflict(
        'An active distribution row already exists for this variant and channel.'
      )
    }
  }

  const now = new Date().toISOString()

  const updatePayload: DistributionUpdate = {
    status: targetStatus,
    updated_at: now,
  }

  if (targetStatus === 'scheduled') {
    updatePayload.scheduled_at = scheduledAt ?? now
  }

  if (targetStatus === 'published') {
    updatePayload.published_at = now

    if (externalUrl !== null) {
      updatePayload.external_url = externalUrl
    }

    if (externalId !== null) {
      updatePayload.external_id = externalId
    }
  }

  const { data: updatedRow, error: updateError } = await supabase
    .from('content_insight_distribution')
    .update(updatePayload)
    .eq('id', existingRow.id)
    .select(
      'id, variant_id, channel, status, scheduled_at, published_at, external_url, external_id, updated_at'
    )
    .maybeSingle()

  if (updateError) {
    return serverError(updateError.message)
  }

  if (!updatedRow) {
    return serverError('Distribution row was not returned after update.')
  }

  return NextResponse.json({
    success: true,
    distribution: updatedRow,
  })
}