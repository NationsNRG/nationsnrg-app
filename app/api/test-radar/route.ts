import { NextResponse } from 'next/server';
import { opportunityRadar } from '@/lib/opportunityRadar';

export async function GET() {
    try {
        const results = await opportunityRadar.test();
        return NextResponse.json({ success: true, data: results });
    } catch (error) {
        console.error('Test radar error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}