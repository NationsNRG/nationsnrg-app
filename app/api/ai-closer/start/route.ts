import { NextResponse } from 'next/server';
import { aiCloser } from '@/lib/aiCloser';

export async function POST(req: Request) {
    try {
        const { leadId } = await req.json();
        
        await aiCloser.startConversation(leadId);
        
        return NextResponse.json({ success: true });
        
    } catch (error) {
        return NextResponse.json({ error: 'Failed to start conversation' }, { status: 500 });
    }
}