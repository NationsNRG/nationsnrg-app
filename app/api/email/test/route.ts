import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
    try {
        const { email, templateId } = await req.json();

        // Get template
        const { data: template } = await supabase
            .from('email_templates')
            .select('*')
            .eq('id', templateId)
            .single();

        if (!template) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        }

        // Send test email
        const result = await resend.emails.send({
            from: 'NationsNRG Test <test@nationsnrg.com>',
            to: [email],
            subject: `[TEST] ${template.subject}`,
            html: template.body
        });

        // Log the test
        await supabase
            .from('email_tests')
            .insert([{
                template_id: templateId,
                sent_to: email,
                status: 'sent',
                response: JSON.stringify(result)
            }]);

        return NextResponse.json({ success: true });
        
    } catch (error) {
        return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 });
    }
}