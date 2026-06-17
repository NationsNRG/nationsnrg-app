import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { bidRequestId, supplierIds } = await req.json();

        const { data: bidRequest } = await supabase
            .from('bid_requests')
            .select(`
                *,
                calculation:calculations (
                    business_name,
                    business_types (name),
                    total_electricity_kwh,
                    total_potential_savings
                )
            `)
            .eq('id', bidRequestId)
            .single();

        if (!bidRequest) {
            return NextResponse.json({ error: 'Bid request not found' }, { status: 404 });
        }

        const { data: suppliers } = await supabase
            .from('suppliers')
            .select('*')
            .in('id', supplierIds);

        const emailPromises = (suppliers || []).map(supplier => 
            resend.emails.send({
                from: 'NationsNRG <bids@nationsnrg.com>',
                to: [supplier.email],
                subject: `New Bid Opportunity: ${bidRequest.calculation.business_name}`,
                html: `
                    <div style="font-family: sans-serif;">
                        <h1 style="color: #2563eb;">New Bid Opportunity</h1>
                        <p>A new commercial energy contract is available:</p>
                        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h2>${bidRequest.calculation.business_name}</h2>
                            <p>Type: ${bidRequest.calculation.business_types?.name}</p>
                            <p>Annual Usage: ${bidRequest.estimated_annual_mwh} MWh</p>
                            <p>Est. Savings: $${Math.round(bidRequest.calculation.total_potential_savings).toLocaleString()}</p>
                        </div>
                        <a href="${process.env.NEXT_PUBLIC_APP_URL}/supplier/bid/${bidRequestId}"
                           style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                            View & Place Bid
                        </a>
                    </div>
                `
            })
        );

        await Promise.all(emailPromises);
        return NextResponse.json({ success: true, notified: suppliers?.length });
        
    } catch (err) {
        return NextResponse.json({ error: 'Failed to notify suppliers' }, { status: 500 });
    }
}