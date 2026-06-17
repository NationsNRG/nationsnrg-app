import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { leadId, timestamp } = await req.json();
        
        // Log the call attempt
        await supabase
            .from('call_logs')
            .insert([{
                lead_id: leadId,
                called_at: timestamp,
                status: 'attempted'
            }]);
        
        // Update lead status
        await supabase
            .from('discovered_leads')
            .update({ 
                status: 'contacted',
                last_contacted_at: timestamp
            })
            .eq('id', leadId);
        
        return NextResponse.json({ success: true });
        
    } catch (error) {
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 });
    }
}