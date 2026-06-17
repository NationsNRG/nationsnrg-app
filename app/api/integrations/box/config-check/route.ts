import { NextResponse } from 'next/server'
import { getBoxConfigStatus } from '@/lib/integrations/box/config'

export async function GET() {
  const status = getBoxConfigStatus()

  return NextResponse.json({
    success: true,
    configured: status.configured,
    missing: status.missing,
    preview: status.preview,
  })
}