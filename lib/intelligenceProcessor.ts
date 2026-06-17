import { supabase } from './supabase';
import { opportunityRadar } from './opportunityRadar';
import { emailAutomation } from './emailAutomation'; // ADD THIS IMPORT

export async function processLead(leadData: any, teamId: string) {
    try {
        // Score the lead using radar
        const scored = opportunityRadar.calculateSwitchProbability(leadData);
        
        // Insert with all scored fields
        const { data, error } = await supabase
            .from('discovered_leads')
            .insert([{
                business_name: scored.business_name,
                industry: scored.industry,
                city: scored.city,
                state: scored.state,
                square_feet: scored.square_feet,
                employee_count: scored.employee_count,
                year_founded: scored.year_founded,
                
                estimated_energy_spend: scored.estimated_energy_spend,
                estimated_expiration_window: scored.estimated_expiration_window,
                lead_score: Math.round(scored.switch_probability * 100),
                estimated_savings: scored.estimated_savings,
                estimated_commission: scored.estimated_commission,
                broker_value_score: scored.broker_value_score,
                
                team_id: teamId,
                status: scored.estimated_expiration_window < 90 ? 'enterprise_review' : 'new',
                is_enterprise: scored.estimated_energy_spend > 150000
            }])
            .select()
            .single();

        if (error) throw error;

        // ✅ ADD THIS LINE - Schedule emails for the new lead
        await emailAutomation.scheduleEmailsForLead(data.id);
        
        return data;
        
    } catch (error) {
        console.error('Error in processLead:', error);
        throw error;
    }
}