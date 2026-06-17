import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('read', false)
        .order('created_at', { ascending: false });
    
    return NextResponse.json({ notifications: data || [] });
}

export async function POST(req: Request) {
    const { id } = await req.json();
    
    await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
    
    return NextResponse.json({ success: true });
}