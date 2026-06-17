import { supabase } from './supabase';
import { opportunityRadar } from './opportunityRadar';

export interface DealBrief {
    lead_id: string;
    business_name: string;
    
    // Summary
    executive_summary: string;
    deal_value: number;
    your_commission: number;
    urgency: 'HIGH' | 'MEDIUM' | 'LOW';
    
    // Energy Analysis
    current_energy_spend: number;
    estimated_savings: number;
    contract_expires: string;
    recommended_term: number;
    market_volatility: string;
    
    // Infrastructure
    employee_count: number;
    locations: number;
    digital_maturity: number;
    security_posture: string;
    
    // Sales Script
    sales_script: {
        opening: string;
        value_proposition: string;
        savings_summary: string;
        call_to_action: string;
        full_script: string;
    };
    
    // Objections
    objections: Array<{
        objection: string;
        response: string;
    }>;
    
    // Competitors
    competitors: Array<{
        name: string;
        our_advantage: string;
    }>;
    
    // Next Steps
    next_steps: string[];
}

class DealBriefGenerator {
    
    async generateBrief(leadId: string): Promise<DealBrief | null> {
        // Get lead data
        const { data: lead } = await supabase
            .from('discovered_leads')
            .select('*')
            .eq('id', leadId)
            .single();
        
        if (!lead) return null;
        
        // Score with radar to get latest metrics
        const scored = opportunityRadar.calculateSwitchProbability({
            business_name: lead.business_name,
            industry: lead.industry,
            city: lead.city,
            state: lead.state,
            square_feet: lead.square_feet,
            employee_count: lead.employee_count,
            year_founded: lead.year_founded
        });
        
        // Calculate urgency
        const urgency = this.determineUrgency(lead.estimated_expiration_window);
        
        // Generate brief
        const brief: DealBrief = {
            lead_id: leadId,
            business_name: lead.business_name,
            
            executive_summary: this.generateExecutiveSummary(lead, scored),
            deal_value: lead.estimated_savings || 0,
            your_commission: lead.estimated_commission || 0,
            urgency,
            
            current_energy_spend: lead.estimated_energy_spend || 0,
            estimated_savings: lead.estimated_savings || 0,
            contract_expires: this.formatExpiration(lead.estimated_expiration_window),
            recommended_term: this.getRecommendedTerm(lead.industry),
            market_volatility: this.getMarketVolatility(),
            
            employee_count: lead.employee_count || 0,
            locations: 1, // Default, would come from enrichment
            digital_maturity: 50, // Default
            security_posture: this.getSecurityPosture(lead),
            
            sales_script: this.generateSalesScript(lead, scored),
            objections: this.generateObjections(lead),
            competitors: this.getCompetitorAnalysis(lead.industry),
            next_steps: this.generateNextSteps(lead)
        };
        
        // Save to database
        await supabase
            .from('deal_briefs')
            .upsert([{
                lead_id: leadId,
                executive_summary: brief.executive_summary,
                deal_value: brief.deal_value,
                your_commission: brief.your_commission,
                urgency: brief.urgency,
                current_energy_spend: brief.current_energy_spend,
                estimated_savings: brief.estimated_savings,
                contract_expires: brief.contract_expires,
                recommended_term: brief.recommended_term,
                market_volatility: brief.market_volatility,
                employee_count: brief.employee_count,
                locations: brief.locations,
                digital_maturity: brief.digital_maturity,
                security_posture: brief.security_posture,
                sales_script: brief.sales_script,
                objections: brief.objections,
                competitors: brief.competitors,
                next_steps: brief.next_steps
            }]);
        
        return brief;
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
        // Simple heuristic - can be enhanced with actual data
        if (lead.employee_count > 100) return '🟡 Developing - Opportunity to improve';
        if (lead.employee_count > 50) return '🟢 Mature - Well positioned';
        return '🔴 At Risk - Needs immediate attention';
    }
    
    private generateExecutiveSummary(lead: any, scored: any): string {
        const commission = lead.estimated_commission || 0;
        const urgency = this.determineUrgency(lead.estimated_expiration_window);
        
        return `${lead.business_name} represents a ${urgency}-priority opportunity worth $${Math.round(commission).toLocaleString()} in commission. ` +
               `They are approximately ${lead.estimated_expiration_window} days from contract expiration with estimated energy spend of $${Math.round(lead.estimated_energy_spend || 0).toLocaleString()}. ` +
               `Our analysis shows potential savings of $${Math.round(lead.estimated_savings || 0).toLocaleString()} on energy alone.`;
    }
    
    private generateSalesScript(lead: any, scored: any) {
    const monthlySavings = Math.round((lead.estimated_savings || 0) / 12);
    const totalSavings = Math.round(lead.estimated_savings || 0);
    const industry = lead.industry?.toLowerCase() || '';
    
    // Value-driven benefits
    let valueProp = '';
    if (industry.includes('restaurant')) {
        valueProp = `That's 40 more covers per month — or an extra weekend of payroll during slow season.`;
    } else if (industry.includes('gym')) {
        valueProp = `That's 20 new memberships worth of profit without spending a dollar on marketing.`;
    } else if (industry.includes('retail')) {
        valueProp = `That's your best sales week of the year, every year, just from operational savings.`;
    } else if (industry.includes('manufacturing')) {
        valueProp = `That's a new piece of equipment every 18 months funded entirely by efficiency.`;
    } else if (industry.includes('office')) {
        valueProp = `That's two months of free rent annually — imagine what that does to your P&L.`;
    } else if (industry.includes('hotel')) {
        valueProp = `That's 50 room-nights of pure profit during your slow season.`;
    } else {
        valueProp = `That's pure profit back to your bottom line without changing a thing about your operations.`;
    }
    
    const opening = `Hi [Name], it's [Your Name] with NationsNRG. I was reviewing ${lead.business_name}'s energy profile and noticed something urgent — your contract expires in ${lead.estimated_expiration_window} days.`;
    
    const valueProposition = `Based on your usage patterns, we've identified approximately $${monthlySavings.toLocaleString()} in monthly savings. ${valueProp} We can lock this in before the auto-renewal hits.`;
    
    const assumptiveClose = `I've already prepared your custom savings breakdown. Let's block 15 minutes this Tuesday at 10 AM to review it. I'll send a calendar invite now — does that work for you?`;
    
    const fullScript = `${opening}\n\n${valueProposition}\n\n${assumptiveClose}`;
    
    return {
        opening,
        value_proposition: valueProposition,
        savings_summary: `Total annual savings: $${totalSavings.toLocaleString()}`,
        call_to_action: assumptiveClose,
        full_script: fullScript
    };
}
    
    private generateObjections(lead: any): Array<{objection: string, response: string}> {
    const monthlySavings = Math.round((lead.estimated_savings || 0) / 12);
    const industry = lead.industry?.toLowerCase() || '';
    
    // Industry-specific benefits
    const benefits = {
        restaurant: "That's 40 more covers per month just from energy savings",
        gym: "That's 20 new memberships worth of profit without adding a single member",
        retail: "That's an extra week of payroll during the holiday season",
        manufacturing: "That's a new piece of equipment every 18 months",
        office: "That's two months of free rent annually",
        hotel: "That's 50 room-nights of pure profit"
    };
    
    let industryBenefit = "that's pure profit back to your business";
    if (industry.includes('restaurant')) industryBenefit = benefits.restaurant;
    else if (industry.includes('gym') || industry.includes('fitness')) industryBenefit = benefits.gym;
    else if (industry.includes('retail')) industryBenefit = benefits.retail;
    else if (industry.includes('manufacturing')) industryBenefit = benefits.manufacturing;
    else if (industry.includes('office')) industryBenefit = benefits.office;
    else if (industry.includes('hotel')) industryBenefit = benefits.hotel;
    
    return [
        {
            objection: "We're happy with our current supplier.",
            response: `I understand. Quick question: If I could show you a way to save $${monthlySavings.toLocaleString()} every month — ${industryBenefit} — without changing your service quality, would you want to at least see the breakdown?`
        },
        {
            objection: "Now isn't a good time.",
            response: `I get that. Yes or no: With your contract expiring in ${lead.estimated_expiration_window} days, does it make sense to understand what ${industryBenefit} could mean for your business before you're locked in for another term?`
        },
        {
            objection: "Send me information via email.",
            response: `Of course. Quick question: Would you prefer I email the savings breakdown now and schedule 10 minutes this week to walk through how this translates to ${industryBenefit}?`
        },
        {
            objection: "I need to discuss with my partner/team.",
            response: `Absolutely. Yes or no: If I send a one-page summary showing exactly how this delivers ${industryBenefit}, would you include me in that discussion so I can answer any questions?`
        }
    ];
}
    
    private getCompetitorAnalysis(industry: string): Array<{name: string, our_advantage: string}> {
        return [
            {
                name: 'Direct Energy',
                our_advantage: 'Our AI-powered savings analysis is more accurate'
            },
            {
                name: 'Constellation',
                our_advantage: 'We provide infrastructure intelligence, not just energy'
            },
            {
                name: 'NRG',
                our_advantage: 'We offer bundled technology services they cannot match'
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

export const dealBriefGenerator = new DealBriefGenerator();