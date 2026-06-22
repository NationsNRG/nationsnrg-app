import { Resend } from 'resend';
import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/auth/require-api-role';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {

    const auth = await requireApiRole(
        req,
        ['admin', 'operator'],
    );

    if (!auth.ok) {
        return NextResponse.json(
            {
                error: 'Unauthorized',
            },
            {
                status: 401,
            },
        );
    }

    try {
        const { 
            user_email, 
            business_name, 
            total_potential_savings,
            id 
        } = await req.json();

        const data = await resend.emails.send({
            from: 'NationsNRG <proposals@nationsnrg.com>',
            to: [user_email],
            subject: `Energy savings proposal for ${business_name}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #2563eb;">Energy Savings Proposal</h1>
                    <p>Dear ${business_name} Team,</p>
                    
                    <p>Based on our analysis, we've identified a potential savings opportunity of:</p>
                    
                    <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                        <span style="font-size: 36px; font-weight: bold; color: #059669;">
                            ${new Intl.NumberFormat('en-US', { 
                                style: 'currency', 
                                currency: 'USD',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0 
                            }).format(total_potential_savings * 12)}
                        </span>
                        <p style="color: #4b5563;">estimated annual savings</p>
                    </div>
                    
                    <p>This analysis is based on your current usage patterns and market rates.</p>
                    
                    <div style="margin: 30px 0;">
                        <a href="${process.env.NEXT_PUBLIC_APP_URL}/proposals/${id}" 
                           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                            View Full Proposal
                        </a>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 14px; margin-top: 40px;">
                        NationsNRG - Commercial Energy Optimization<br>
                        Reply to this email or call us to discuss.
                    </p>
                </div>
            `
        });

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error }, { status: 500 });
    }
}