import { NextResponse } from 'next/server';
import { auditEngine } from '@/lib/auditEngine';

export async function POST(req: Request) {
    try {
        const { leadId } = await req.json();
        
        const insightId = await auditEngine.generateAudit(leadId);
        
        return NextResponse.json({ success: true, insightId });
        
    } catch (error) {
        return NextResponse.json({ error: 'Failed to generate insight' }, { status: 500 });
    }
}
