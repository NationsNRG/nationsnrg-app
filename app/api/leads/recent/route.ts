import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 100

function normalizeString(value: string | null): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseLimit(value: string | null): number | null {
  if (!value) {
    return DEFAULT_LIMIT
  }

  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null
  }

  return Math.min(parsed, MAX_LIMIT)
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)

    const teamId = normalizeString(url.searchParams.get('teamId'))
    const limit = parseLimit(url.searchParams.get('limit'))

    if (!teamId) {
      return NextResponse.json(
        {
          success: false,
          error: 'teamId is required.',
        },
        { status: 400 }
      )
    }

    if (!isUuid(teamId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'teamId must be a valid UUID.',
        },
        { status: 400 }
      )
    }

    if (limit === null) {
      return NextResponse.json(
        {
          success: false,
          error: `limit must be a positive integer between 1 and ${MAX_LIMIT}.`,
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('discovered_leads')
      .select(`
        id,
        company_name,
        contact_name,
        email,
        phone,
        city,
        state,
        status,
        lead_score,
        created_at,
        updated_at
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('recent_leads_query_failed', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        teamId,
        limit,
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch recent leads.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      leads: data ?? [],
      count: data?.length ?? 0,
    })
  } catch (error: unknown) {
    console.error('recent_leads_route_failed', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected server error.',
      },
      { status: 500 }
    )
  }
}