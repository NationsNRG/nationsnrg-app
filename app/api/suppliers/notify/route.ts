import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { bidRequestId, leadId } = await req.json();

        // Get bid request details
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

        // Get all active suppliers
        const { data: suppliers } = await supabase
            .from('suppliers')
            .select('*')
            .eq('is_active', true);

        // Send emails in parallel
        const emailPromises = (suppliers || []).map(supplier =>
            resend.emails.send({
                from: 'NationsNRG <bids@nationsnrg.com>',
                to: [supplier.email],
                subject: `🔋 New Energy Bid: ${bidRequest.calculation.business_name}`,
                html: `
                    <h1>New Bid Opportunity</h1>
                    <p>A new energy contract is available for bidding:</p>
                    <ul>
                        <li>Business: ${bidRequest.calculation.business_name}</li>
                        <li>Type: ${bidRequest.calculation.business_types?.name}</li>
                        <li>Est. Annual Usage: ${bidRequest.estimated_annual_mwh} MWh</li>
                        <li>Est. Savings: $${Math.round(bidRequest.calculation.total_potential_savings).toLocaleString()}</li>
                    </ul>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL}/supplier/bids/${bidRequestId}">
                        View & Place Bid
                    </a>
                `
            })
        );

        await Promise.all(emailPromises);

        return NextResponse.json({ success: true, notified: suppliers?.length });
        
    } catch (error) {
        return NextResponse.json({ error: 'Failed to notify suppliers' }, { status: 500 });
    }
}