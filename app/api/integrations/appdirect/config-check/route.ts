import { NextResponse } from 'next/server'
import { getAppDirectConfigStatus } from '@/lib/integrations/appdirect/config'

export async function GET() {
  const status = getAppDirectConfigStatus()

  return NextResponse.json({
    success: true,
    configured: status.configured,
    missing: status.missing,
    preview: status.preview,
  })
}