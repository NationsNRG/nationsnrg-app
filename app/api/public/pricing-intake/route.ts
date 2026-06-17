import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateCreatePublicPricingIntake } from '@/lib/publicPricing/validation'
import type { CreatePublicPricingIntakeRequestBody } from '@/lib/publicPricing/types'
import type { Database, Json } from '@/types/supabase'

type PublicSchema = Database['public']
type PricingIntakeInsert = PublicSchema['Tables']['public_pricing_intakes']['Insert']
type SystemActivityInsert = PublicSchema['Tables']['system_activity']['Insert']

function nowIso(): string {
  return new Date().toISOString()
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
    console.error('public_pricing_intake_log_failed', error.message)
  }
}

export async function POST(request: Request) {
  let body: CreatePublicPricingIntakeRequestBody

  try {
    body = (await request.json()) as CreatePublicPricingIntakeRequestBody
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON body.',
      },
      { status: 400 }
    )
  }

  const validation = validateCreatePublicPricingIntake(body)

  if (!validation.ok) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error,
      },
      { status: 400 }
    )
  }

  try {
    const insertPayload: PricingIntakeInsert = {
      source: 'box_widget',
      provider: 'box',
      widget_type: 'comm-pricing',
      status: 'new',
      commodity: validation.value.commodity,
      company_name: validation.value.companyName,
      contact_name: validation.value.contactName,
      email: validation.value.email,
      phone: validation.value.phone,
      state: validation.value.state,
      zip_code: validation.value.zipCode,
      utility: validation.value.utility,
      average_monthly_bill: validation.value.averageMonthlyBill,
      average_monthly_usage: validation.value.averageMonthlyUsage,
      notes: validation.value.notes,
      metadata: validation.value.metadata as Json,
      created_at: nowIso(),
      updated_at: nowIso(),
    }

    const { data, error } = await supabase
      .from('public_pricing_intakes')
      .insert(insertPayload)
      .select('*')
      .maybeSingle()

    if (error || !data) {
      await logSystemActivity({
        activityType: 'public_pricing_intake_create_failed',
        message: error?.message ?? 'Insert returned no row.',
        details: {
          email: validation.value.email,
          zipCode: validation.value.zipCode,
          utility: validation.value.utility,
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create pricing intake.',
        },
        { status: 500 }
      )
    }

    await logSystemActivity({
      activityType: 'public_pricing_intake_created',
      message: 'Public pricing intake created successfully.',
      details: {
        intakeId: data.id,
        email: data.email,
        zipCode: data.zip_code,
        utility: data.utility,
        commodity: data.commodity,
      },
    })

    return NextResponse.json({
      success: true,
      intake: data,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    await logSystemActivity({
      activityType: 'public_pricing_intake_route_failed',
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