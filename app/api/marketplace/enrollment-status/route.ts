import { NextResponse } from 'next/server'
import { getBoxEnrollmentStatus } from '@/lib/integrations/box/client'
import { validateEnrollmentStatusRequest } from '@/lib/marketplace/validation'
import type { EnrollmentStatusRequestBody } from '@/lib/marketplace/types'

export async function POST(request: Request) {
  let body: EnrollmentStatusRequestBody

  try {
    body = (await request.json()) as EnrollmentStatusRequestBody
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid JSON body.',
      },
      { status: 400 }
    )
  }

  const validation = validateEnrollmentStatusRequest(body)

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
      enrollmentId: validation.value.enrollmentId,
      contractId: validation.value.contractId,
      externalId: validation.value.externalId,
      metadata: validation.value.metadata,
    }

    const providerResponse = await getBoxEnrollmentStatus(providerPayload)

    if (!providerResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Upstream enrollment status request failed.',
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
      message.includes('BOX_ENROLLMENT_STATUS_PATH') ||
      message.includes('BOX_API')
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