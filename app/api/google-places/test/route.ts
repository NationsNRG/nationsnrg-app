import { NextResponse } from 'next/server';
import { googlePlaces } from '@/lib/googlePlaces';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const location = url.searchParams.get('location') || 'Miami, FL';
        const type = url.searchParams.get('type') || 'restaurant';
        
        const places = await googlePlaces.searchAndProcess(
            location,
            [type],
            5 // Small test batch
        );
        
        return NextResponse.json({
            success: true,
            location,
            type,
            count: places.length,
            places: places.map(p => ({
                name: p.business_name,
                industry: p.industry,
                address: p.address,
                phone: p.phone,
                square_feet: p.square_feet,
                employee_count: p.employee_count
            }))
        });
        
    } catch (error) {
        console.error('Google Places test error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 });
    }
}