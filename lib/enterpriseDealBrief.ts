import { supabase } from './supabase';

export interface EnterpriseDealBrief {
    lead_id: string;
    business_name: string;
    executive_summary: string;
    deal_value: number;
    your_commission: number;
    urgency: 'HIGH' | 'MEDIUM' | 'LOW';
    current_energy_spend: number;
    estimated_savings: number;
    contract_expires: string;
    recommended_term: number;
    market_volatility: string;
    employee_count: number;
    locations: number;
    digital_maturity: number;
    security_posture: string;
    sales_script: {
        opening: string;
        value_proposition: string;
        savings_summary: string;
        call_to_action: string;
        full_script: string;
    };
    objections: Array<{objection: string, response: string}>;
    competitors: Array<{name: string, our_advantage: string}>;
    next_steps: string[];
}

class EnterpriseDealBriefGenerator {
    
    async generateBrief(leadId: string): Promise<EnterpriseDealBrief | null> {
        // Get lead data
        const { data: lead } = await supabase
            .from('discovered_leads')
            .select('*')
            .eq('id', leadId)
            .single();
        
        if (!lead) return null;
        
        const urgency = this.determineUrgency(lead.estimated_expiration_window);
        const totalCommission = lead.estimated_commission || 0;
        
        const brief: EnterpriseDealBrief = {
            lead_id: leadId,
            business_name: lead.business_name,
            executive_summary: this.generateExecutiveSummary(lead, totalCommission, urgency),
            deal_value: lead.estimated_savings || 0,
            your_commission: totalCommission,
            urgency,
            current_energy_spend: lead.estimated_energy_spend || 0,
            estimated_savings: lead.estimated_savings || 0,
            contract_expires: this.formatExpiration(lead.estimated_expiration_window),
            recommended_term: this.getRecommendedTerm(lead.industry),
            market_volatility: this.getMarketVolatility(),
            employee_count: lead.employee_count || 0,
            locations: 1,
            digital_maturity: 50,
            security_posture: this.getSecurityPosture(lead),
            sales_script: this.generateSalesScript(lead),
            objections: this.generateObjections(lead),
            competitors: this.getCompetitorAnalysis(lead.industry),
            next_steps: this.generateNextSteps(lead)
        };
        
        // Auto-create bid request for enterprise deals
        await this.autoCreateBidRequest(leadId);
        
        return brief;
    }
    
    async autoCreateBidRequest(leadId: string) {
        const { data: lead } = await supabase
            .from('discovered_leads')
            .select('*')
            .eq('id', leadId)
            .single();

        if (!lead) return;

        // Create bid request
        const { data: bidRequest } = await supabase
            .from('bid_requests')
            .insert([{
                calculation_id: leadId,
                status: 'open',
                estimated_annual_mwh: Math.round((lead.estimated_energy_spend || 0) / 1000),
                bid_deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
            }])
            .select()
            .single();

        // Notify suppliers
        await fetch('/api/suppliers/notify', {
            method: 'POST',
            body: JSON.stringify({
                bidRequestId: bidRequest.id,
                leadId: lead.id
            })
        });
    }
    
    private determineUrgency(daysRemaining: number): 'HIGH' | 'MEDIUM' | 'LOW' {
        if (daysRemaining < 60) return 'HIGH';
        if (daysRemaining < 120) return 'MEDIUM';
        return 'LOW';
    }
    
    private formatExpiration(days: number): string {
        if (days < 30) return `⚠️ CRITICAL: Expires in ${days} days`;
        if (days < 60) return `🔴 Urgent: ${days} days remaining`;
        if (days < 90) return `🟡 Approaching: ${days} days remaining`;
        return `🟢 ${days} days remaining`;
    }
    
    private getRecommendedTerm(industry: string): number {
        const terms: Record<string, number> = {
            'restaurant': 24, 'fast food': 24, 'gym': 36,
            'retail': 18, 'manufacturing': 36, 'office': 24,
            'hotel': 36, 'grocery': 36
        };
        return terms[industry?.toLowerCase() || ''] || 24;
    }
    
    private getMarketVolatility(): string {
        const scenarios = [
            'Market volatility HIGH - lock rates now',
            'Rates expected to rise 15% in next 60 days',
            'Stable market - good time for long-term fixed',
            'Summer demand driving prices up - act soon'
        ];
        return scenarios[Math.floor(Math.random() * scenarios.length)];
    }
    
    private getSecurityPosture(lead: any): string {
        if (lead.employee_count > 100) return '🟡 Developing - Opportunity to improve';
        if (lead.employee_count > 50) return '🟢 Mature - Well positioned';
        return '🔴 At Risk - Needs immediate attention';
    }
    
    private generateExecutiveSummary(lead: any, commission: number, urgency: string): string {
        return `${lead.business_name} represents a ${urgency}-priority opportunity worth $${Math.round(commission).toLocaleString()} in commission. ` +
               `They are approximately ${lead.estimated_expiration_window} days from contract expiration with estimated energy spend of $${Math.round(lead.estimated_energy_spend || 0).toLocaleString()}. ` +
               `Our analysis shows potential savings of $${Math.round(lead.estimated_savings || 0).toLocaleString()}.`;
    }
    
    private generateSalesScript(lead: any) {
        const opening = `Hi, I've been analyzing ${lead.business_name}'s energy profile.`;
        const valueProposition = `Based on your ${lead.estimated_expiration_window} days until contract expiration, I've identified a potential savings opportunity of $${Math.round(lead.estimated_savings || 0).toLocaleString()}.`;
        const savingsSummary = `Total potential annual savings: $${Math.round(lead.estimated_savings || 0).toLocaleString()}.`;
        const callToAction = `Can we schedule a 15-minute call to walk through the details?`;
        
        return {
            opening,
            value_proposition: valueProposition,
            savings_summary: savingsSummary,
            call_to_action: callToAction,
            full_script: `${opening}\n\n${valueProposition}\n\n${savingsSummary}\n\n${callToAction}`
        };
    }
    
    private generateObjections(lead: any) {
        return [
            {
                objection: "We're happy with our current supplier.",
                response: "I understand. Many of our clients felt the same way until they saw the 15-25% savings we identified. Would you be open to a quick comparison?"
            },
            {
                objection: "Now isn't a good time.",
                response: `I completely understand. Given your contract expires in approximately ${lead.estimated_expiration_window} days, we should at least review your options before the auto-renewal kicks in.`
            }
        ];
    }
    
    private getCompetitorAnalysis(industry: string): Array<{name: string, our_advantage: string}> {
        return [
            {
                name: 'Direct Energy',
                our_advantage: 'We offer bundled technology services they cannot match'
            },
            {
                name: 'Constellation',
                our_advantage: 'Our AI-powered savings analysis is more accurate'
            },
            {
                name: 'NRG',
                our_advantage: 'We provide infrastructure intelligence, not just energy'
            }
        ];
    }
    
    private generateNextSteps(lead: any): string[] {
        return [
            'Review the AI-generated deal brief',
            'Schedule 15-minute discovery call',
            'Present energy savings analysis',
            'Close energy contract'
        ];
    }
}

export const dealBriefGenerator = new EnterpriseDealBriefGenerator();