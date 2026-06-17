import { NextResponse } from 'next/server'
import { testMyServiceCloudConnectivity } from '@/lib/integrations/myServiceCloud/client'

export async function GET() {
  const result = await testMyServiceCloudConnectivity()

  return NextResponse.json({
    success: true,
    result,
  })
}