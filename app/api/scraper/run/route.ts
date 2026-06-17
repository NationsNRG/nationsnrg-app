import { NextResponse } from 'next/server';
import { leadScraper } from '@/lib/leadScraper';

export async function POST(req: Request) {
    try {
        const { sourceId, teamId } = await req.json();
        
        if (!teamId) {
            return NextResponse.json({ 
                success: false, 
                error: 'teamId is required' 
            }, { status: 400 });
        }
        
        let results;
        if (sourceId) {
            // Run specific source
            results = await leadScraper.runSource(sourceId, teamId);
        } else {
            // Run all sources
            results = await leadScraper.runAllSources(teamId);
        }
        
        return NextResponse.json({ 
            success: true, 
            results 
        });
        
    } catch (error) {
        console.error('Scraper error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 });
    }
}