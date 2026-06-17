import { NextResponse } from 'next/server'
import { getMyServiceCloudLoginDiagnostics } from '@/lib/integrations/myServiceCloud/loginDiagnostics'

export async function GET() {
  const result = await getMyServiceCloudLoginDiagnostics()

  return NextResponse.json({
    success: true,
    result,
  })
}