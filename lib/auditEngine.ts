import { supabase } from './supabase';
import { opportunityRadar } from './opportunityRadar';

export interface AuditContext {
    business_name: string;
    industry: string;
    city: string;
    state: string;
    estimated_savings: number;
    estimated_commission: number;
    lead_score: number;
    days_remaining: number;
}

class AuditEngine {
    
    /**
     * Generate an audit for a business
     */
    async generateAudit(leadId: string): Promise<string> {
        // Get lead data
        const { data: lead } = await supabase
            .from('discovered_leads')
            .select('*')
            .eq('id', leadId)
            .single();
        
        if (!lead) return '';
        
        // Score with radar
        const scored = opportunityRadar.calculateSwitchProbability(lead);
        
        const context = {
            business_name: lead.business_name,
            industry: lead.industry,
            city: lead.city,
            state: lead.state,
            estimated_savings: lead.estimated_savings || 0,
            estimated_commission: lead.estimated_commission || 0,
            lead_score: lead.lead_score || 0,
            days_remaining: lead.estimated_expiration_window || 180
        };
        
        // Generate audit content
        const title = this.generateTitle(context);
        const excerpt = this.generateExcerpt(context);
        const content = this.generateContent(context);
        const twitterText = this.generateTwitterText(context);
        const linkedinText = this.generateLinkedInText(context);
        
        // Create slug from title
        const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        
        // Save to database
        const { data: insight } = await supabase
            .from('insights')
            .insert([{
                lead_id: leadId,
                title,
                slug,
                excerpt,
                content,
                reading_time: Math.ceil(content.split(' ').length / 200),
                authority_score: this.calculateAuthorityScore(context),
                shareability_score: this.calculateShareability(context),
                topics: this.extractTopics(context),
                twitter_text: twitterText,
                linkedin_text: linkedinText,
                status: 'draft'
            }])
            .select()
            .single();
        
        return insight.id;
    }
    
    /**
     * Generate title based on context
     */
    private generateTitle(context: AuditContext): string {
        const templates = [
            `Why ${context.business_name} Could Be Overpaying $${Math.round(context.estimated_savings).toLocaleString()} on Energy`,
            `${context.industry} Energy Audit: ${context.business_name} Case Study`,
            `The Hidden $${Math.round(context.estimated_savings).toLocaleString()} Opportunity for ${context.business_name}`,
            `Energy Market Intelligence Report: ${context.city} ${context.industry} Sector`,
            `How ${context.business_name} Can Save $${Math.round(context.estimated_savings / 12).toLocaleString()} Per Month`
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }
    
    /**
     * Generate excerpt for blog listing
     */
    private generateExcerpt(context: AuditContext): string {
        return `Our analysis of ${context.business_name} reveals a potential $${Math.round(context.estimated_savings).toLocaleString()} savings opportunity. Learn how ${context.industry} businesses in ${context.city} are optimizing energy costs.`;
    }
    
    /**
     * Generate full audit content
     */
    private generateContent(context: AuditContext): string {
    const monthlySavings = Math.round(context.estimated_savings / 12);
    const urgency = context.days_remaining < 90 ? 'critical' : 'moderate';
    
    // Use estimated_savings as fallback since estimated_energy_spend isn't in AuditContext
    const annualSpend = context.estimated_savings * 3; // Rough estimate (since savings ~15% of spend)
    
    return `
<h1>Energy Market Intelligence Report: ${context.business_name}</h1>

<p><em>Published ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</em></p>

<h2>Executive Summary</h2>

<p>Our analysis of ${context.business_name}, a ${context.industry} business in ${context.city}, ${context.state}, reveals significant opportunities for energy cost optimization. Based on current market conditions and facility characteristics, we've identified approximately <strong>$${Math.round(context.estimated_savings).toLocaleString()} in annual savings potential</strong>.</p>

<h2>Current Energy Profile</h2>

<ul>
<li><strong>Estimated Annual Spend:</strong> $${Math.round(annualSpend).toLocaleString()}</li>
<li><strong>Industry Benchmark:</strong> ${context.industry} sector average</li>
<li><strong>Contract Status:</strong> ${context.days_remaining < 90 ? '⚠️ Approaching expiration' : '✓ Stable'}</li>
<li><strong>Market Opportunity Score:</strong> ${context.lead_score}/100</li>
</ul>

<h2>Key Findings</h2>

<h3>1. Pricing Inefficiency</h3>

<p>Like many ${context.industry} businesses, ${context.business_name} may be on standard utility rates rather than competitive supply options. Our benchmark analysis suggests potential savings of 15-25% through supplier optimization.</p>

<h3>2. Contract Timing</h3>

<p>With approximately ${context.days_remaining} days remaining on the current contract, there is ${urgency === 'critical' ? 'an urgent window' : 'adequate time'} to negotiate better terms before auto-renewal.</p>

<h3>3. Market Conditions</h3>

<p>Current wholesale energy markets are showing favorable pricing for ${context.industry} facilities. Locking in rates now could protect against projected rate increases.</p>

<h2>Recommendations</h2>

<ol>
<li><strong>Immediate Rate Analysis:</strong> Conduct a full supplier market scan</li>
<li><strong>Contract Review:</strong> Examine current terms for hidden fees</li>
<li><strong>Budget Lock:</strong> Consider fixed-rate options for budget certainty</li>
<li><strong>Efficiency Audit:</strong> Review usage patterns for additional savings</li>
</ol>

<h2>Estimated Savings Breakdown</h2>

<ul>
<li><strong>Supply Optimization:</strong> $${Math.round(context.estimated_savings * 0.6).toLocaleString()}</li>
<li><strong>Rate Structure:</strong> $${Math.round(context.estimated_savings * 0.25).toLocaleString()}</li>
<li><strong>Efficiency Measures:</strong> $${Math.round(context.estimated_savings * 0.15).toLocaleString()}</li>
<li><strong>Total Annual:</strong> $${Math.round(context.estimated_savings).toLocaleString()}</li>
<li><strong>Monthly Equivalent:</strong> $${monthlySavings.toLocaleString()}</li>
</ul>

<h2>Next Steps</h2>

<p>This audit is part of NationsNRG's ongoing market intelligence program. For a detailed, binding proposal tailored to ${context.business_name}'s specific needs, contact our energy advisory team.</p>

<hr />

<p><em>This report was automatically generated by NationsNRG's Energy Market Intelligence Engine. Data sources include public utility records, market benchmarks, and proprietary analytics.</em></p>
        `;
}
    
    /**
     * Generate Twitter/X post
     */
    private generateTwitterText(context: AuditContext): string {
        const savings = Math.round(context.estimated_savings).toLocaleString();
        return `💰 Just analyzed ${context.business_name}'s energy profile. Found $${savings} in potential annual savings. 

${context.industry} businesses in ${context.city} are leaving money on the table. 

#EnergySavings #${context.industry} #BusinessIntelligence`;
    }
    
    /**
     * Generate LinkedIn post
     */
    private generateLinkedInText(context: AuditContext): string {
        const savings = Math.round(context.estimated_savings).toLocaleString();
        return `📊 **Energy Market Intelligence Report**

Just completed an energy audit for ${context.business_name}, a ${context.industry} business in ${context.city}.

**Key findings:**
• Estimated annual savings: $${savings}
• Contract expiration: ${context.days_remaining} days
• Market opportunity score: ${context.lead_score}/100

This is exactly why businesses need dedicated energy advisors. The market is too complex to navigate alone.

Want to see how your business compares? Drop a comment or DM me. 🔋

#EnergyManagement #BusinessStrategy #CostOptimization #${context.industry}`;
    }
    
    /**
     * Calculate authority score (0-100)
     */
    private calculateAuthorityScore(context: AuditContext): number {
        let score = 70; // Base
        
        if (context.estimated_savings > 50000) score += 15;
        if (context.lead_score > 80) score += 10;
        if (context.days_remaining < 60) score += 5;
        
        return Math.min(100, score);
    }
    
    /**
     * Calculate shareability score
     */
    private calculateShareability(context: AuditContext): number {
        let score = 50;
        
        if (context.estimated_savings > 25000) score += 20;
        if (context.industry === 'restaurant' || context.industry === 'retail') score += 15;
        
        return Math.min(100, score);
    }
    
    /**
     * Extract topics for categorization
     */
    private extractTopics(context: AuditContext): string[] {
        const topics = ['energy', 'savings', context.industry];
        
        if (context.estimated_savings > 50000) topics.push('big-savings');
        if (context.days_remaining < 90) topics.push('urgent');
        
        return topics;
    }
}

export const auditEngine = new AuditEngine();