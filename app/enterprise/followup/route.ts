import { NextResponse } from 'next/server';
import { emailAutomation } from '@/lib/emailAutomation';

export async function POST(req: Request) {
    try {
        const { leadId } = await req.json();
        
        if (!leadId) {
            return NextResponse.json({ 
                success: false, 
                error: 'leadId required' 
            }, { status: 400 });
        }
        
        await emailAutomation.scheduleEnterpriseFollowup(leadId, true);
        
        return NextResponse.json({ 
            success: true,
            message: 'Followup sequence scheduled'
        });
        
    } catch (error) {
        console.error('Error scheduling followup:', error);
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 });
    }
}
