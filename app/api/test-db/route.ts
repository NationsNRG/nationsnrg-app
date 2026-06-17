import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        // Test 1: Can we connect to Supabase?
        const { data: test, error: testError } = await supabase
            .from('discovered_leads')
            .select('count')
            .limit(1);
            
        if (testError) {
            return NextResponse.json({ 
                success: false, 
                step: 'connection_test',
                error: testError.message 
            }, { status: 500 });
        }
        
        // Test 2: Can we insert a record?
        const { data: insertData, error: insertError } = await supabase
            .from('discovered_leads')
            .insert([{
                business_name: "API Test",
                industry: "test",
                city: "Miami",
                state: "FL",
                team_id: '79445aa9-1616-4ffe-b0c3-4aa48534b56d',
                status: 'new'
            }])
            .select()
            .single();
            
        if (insertError) {
            return NextResponse.json({ 
                success: false, 
                step: 'insert_test',
                error: insertError.message 
            }, { status: 500 });
        }
        
        return NextResponse.json({ 
            success: true, 
            message: 'Database working!',
            inserted: insertData 
        });
        
    } catch (error) {
        return NextResponse.json({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }, { status: 500 });
    }
}