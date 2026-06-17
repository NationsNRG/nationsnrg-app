import { NextResponse } from 'next/server';
import { aiCloser } from '@/lib/aiCloser';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { conversationId, reply } = await req.json();
        
        await aiCloser.handleReply(conversationId, reply);
        
        return NextResponse.json({ success: true });
        
    } catch (error) {
        return NextResponse.json({ error: 'Failed to process reply' }, { status: 500 });
    }
}

// This endpoint would be called by your email webhook
export async function GET(req: Request) {
    const url = new URL(req.url);
    const conversationId = url.searchParams.get('conversationId');
    const reply = url.searchParams.get('reply');
    
    if (conversationId && reply) {
        await aiCloser.handleReply(conversationId, reply);
    }
    
    return NextResponse.json({ success: true });
}
