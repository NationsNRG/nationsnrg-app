import { NextResponse } from 'next/server';
import { emailAutomation } from '@/lib/emailAutomation';

export async function POST() {
    try {
        await emailAutomation.processPendingEmails();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error processing emails:', error);
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 });
    }
}