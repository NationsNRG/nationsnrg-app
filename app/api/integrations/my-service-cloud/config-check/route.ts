import { NextResponse } from 'next/server'
import { getMyServiceCloudConfigStatus } from '@/lib/integrations/myServiceCloud/config'

export async function GET() {
  const status = getMyServiceCloudConfigStatus()

  return NextResponse.json({
    success: true,
    configured: status.configured,
    missing: status.missing,
    preview: status.preview,
  })
}