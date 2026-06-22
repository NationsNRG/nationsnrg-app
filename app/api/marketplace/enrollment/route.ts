import { NextResponse } from 'next/server'
import { submitBoxEnrollment } from '@/lib/integrations/box/client'
import { validateEnrollmentRequest } from '@/lib/marketplace/validation'
import type { EnrollmentRequestBody } from '@/lib/marketplace/types'
import { requireApiRole } from '@/lib/auth/require-api-role'

export async function POST(request: Request) {

  const auth = await requireApiRole(
    request,
    ['admin', 'operator'],
  )

  if (!auth.ok) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
      },
      { status: 401 },
    )
  }

  let body: EnrollmentRequestBody

  try {
    body = (await request.json()) as EnrollmentRequestBody
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON body.',
      },
      { status: 400 }
    )
  }

  const validation = validateEnrollmentRequest(body)

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
      offerId: validation.value.offerId,
      planCode: validation.value.planCode,
      utility: validation.value.utility,
      annualUsage: validation.value.annualUsage,
      averageMonthlyBill: validation.value.averageMonthlyBill,
      businessName: validation.value.businessName,
      contactName: validation.value.contactName,
      email: validation.value.email,
      phone: validation.value.phone,
      serviceAddress: validation.value.serviceAddress,
      metadata: validation.value.metadata,
    }

    const providerResponse = await submitBoxEnrollment(providerPayload)

    if (!providerResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Upstream enrollment request failed.',
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
      message.includes('BOX_ENROLLMENT_PATH') || message.includes('BOX_API')
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