import { NextResponse } from 'next/server';
import { dealBriefGenerator } from '@/lib/dealBriefGenerator';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { leadId } = await req.json();
        
        if (!leadId) {
            return NextResponse.json({ 
                success: false, 
                error: 'leadId is required' 
            }, { status: 400 });
        }
        
        const brief = await dealBriefGenerator.generateBrief(leadId);
        
        if (!brief) {
            return NextResponse.json({ 
                success: false, 
                error: 'Lead not found' 
            }, { status: 404 });
        }
        
        return NextResponse.json({ 
            success: true, 
            brief 
        });
        
    } catch (error) {
        console.error('Error generating deal brief:', error);
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const leadId = url.searchParams.get('leadId');
        
        if (!leadId) {
            return NextResponse.json({ 
                success: false, 
                error: 'leadId is required' 
            }, { status: 400 });
        }
        
        const { data: brief } = await supabase
            .from('deal_briefs')
            .select('*')
            .eq('lead_id', leadId)
            .single();
        
        return NextResponse.json({ 
            success: true, 
            brief 
        });
        
    } catch (error) {
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 });
    }
}