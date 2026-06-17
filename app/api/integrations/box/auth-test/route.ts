import { NextResponse } from 'next/server'
import { testBoxApiConnectivity } from '@/lib/integrations/box/client'

export async function GET() {
  const result = await testBoxApiConnectivity()

  return NextResponse.json({
    success: true,
    result,
  })
}