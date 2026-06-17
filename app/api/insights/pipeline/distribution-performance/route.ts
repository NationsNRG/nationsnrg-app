import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database, Json } from '@/types/supabase'
import {
  mergeDistributionPerformance,
  normalizeDistributionPerformance,
  sanitizeDistributionPerformancePatch,
} from '@/lib/insights/distributionPerformance'

type UpdateDistributionPerformanceBody = {
  distributionId?: string
  performance?: unknown
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function badRequest(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 400 })
}

function serverError(message: string) {
  return NextResponse.json({ success: false, error: message }, { status: 500 })
}

export async function POST(request: Request) {
  let body: UpdateDistributionPerformanceBody

  try {
    body = (await request.json()) as UpdateDistributionPerformanceBody
  } catch {
    return badRequest('Invalid JSON body.')
  }

  const distributionId = normalizeString(body.distributionId)

  if (!distributionId) {
    return badRequest('distributionId is required.')
  }

  const { patch, error: patchError } = sanitizeDistributionPerformancePatch(
    body.performance
  )

  if (patchError) {
    return badRequest(patchError)
  }

  if (!patch || Object.keys(patch).length === 0) {
    return badRequest('At least one performance field is required.')
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
    .select('id, performance, updated_at')
    .eq('id', distributionId)
    .maybeSingle()

  if (existingRowError) {
    return serverError(existingRowError.message)
  }

  if (!existingRow) {
    return NextResponse.json(
      { success: false, error: 'Distribution row not found.' },
      { status: 404 }
    )
  }

  const currentPerformance = normalizeDistributionPerformance(
    existingRow.performance
  )

  const nextPerformance = mergeDistributionPerformance(currentPerformance, patch)

  const { data: updatedRow, error: updateError } = await supabase
    .from('content_insight_distribution')
    .update({
      performance: nextPerformance as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', distributionId)
    .select('id, performance, updated_at')
    .maybeSingle()

  if (updateError) {
    return serverError(updateError.message)
  }

  if (!updatedRow) {
    return serverError('Distribution row was not returned after update.')
  }

  return NextResponse.json({
    success: true,
    distribution: {
      id: updatedRow.id,
      performance: updatedRow.performance,
      updated_at: updatedRow.updated_at,
    },
  })
}