import { NextResponse } from 'next/server'
import { lookupBoxPricing } from '@/lib/integrations/box/client'
import { validatePricingRequest } from '@/lib/marketplace/validation'
import type { PricingRequestBody } from '@/lib/marketplace/types'

export async function POST(request: Request) {
  let body: PricingRequestBody

  try {
    body = (await request.json()) as PricingRequestBody
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON body.',
      },
      { status: 400 }
    )
  }

  const validation = validatePricingRequest(body)

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
    const providerPayload = {
      provider: validation.value.provider,
      commodity: validation.value.commodity,
      customerType: validation.value.customerType,
      state: validation.value.state,
      zipCode: validation.value.zipCode,
      utility: validation.value.utility,
      annualUsage: validation.value.annualUsage,
      averageMonthlyBill: validation.value.averageMonthlyBill,
      businessName: validation.value.businessName,
      contactName: validation.value.contactName,
      email: validation.value.email,
      phone: validation.value.phone,
      metadata: validation.value.metadata,
    }

    const providerResponse = await lookupBoxPricing(providerPayload)

    if (!providerResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Upstream pricing request failed.',
          request: validation.value,
          upstream: providerResponse,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      request: validation.value,
      upstream: providerResponse,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'

    const status =
      message.includes('BOX_PRICING_PATH') || message.includes('BOX_API')
        ? 503
        : 500

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    )
  }
}