import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { updateLeadUtility } from '@/lib/utilityDetector';

export async function POST() {
    try {
        // Get leads without utility provider
        const { data: leads } = await supabase
            .from('discovered_leads')
            .select('id, zip')
            .is('utility_provider', null)
            .limit(100);
        
        let updated = 0;
        for (const lead of leads || []) {
            if (lead.zip) {
                await updateLeadUtility(lead.id, lead.zip);
                updated++;
            }
        }
        
        return NextResponse.json({ 
            success: true, 
            updated,
            total: leads?.length || 0
        });
        
    } catch (error) {
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 });
    }
}