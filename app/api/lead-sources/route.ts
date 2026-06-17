import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('lead_sources')
            .select('*')
            .order('created_at');
        
        if (error) throw error;
        
        return NextResponse.json({ 
            success: true, 
            sources: data 
        });
        
    } catch (error) {
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 });
    }
}