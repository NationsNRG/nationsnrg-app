import { NextResponse } from 'next/server';
import { aiCloser } from '@/lib/aiCloser';

export async function GET() {
    try {
        await aiCloser.processPendingConversations();
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
    }
}