import { NextResponse } from 'next/server';
import { processLead } from '@/lib/intelligenceProcessor';

export async function POST(req: Request) {
    try {
        const { lead, teamId } = await req.json();
        
        const result = await processLead(lead, teamId);
        
        return NextResponse.json({ 
            success: true, 
            lead: result 
        });
        
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 });
    }
}