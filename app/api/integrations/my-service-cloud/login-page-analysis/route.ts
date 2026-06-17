import { NextResponse } from 'next/server'
import { getMyServiceCloudLoginPageAnalysis } from '@/lib/integrations/myServiceCloud/loginPageAnalysis'

export async function GET() {
  const result = await getMyServiceCloudLoginPageAnalysis()

  return NextResponse.json({
    success: true,
    result,
  })
}