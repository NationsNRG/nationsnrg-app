import { supabase } from './supabase';
import { opportunityRadar } from './opportunityRadar';
import { googlePlaces } from './googlePlaces';

export interface ScraperSource {
    id: string;
    name: string;
    config: {
        type: 'google_maps' | 'yellow_pages' | 'business_directory';
        location: string;
        industries: string[];
        maxResults: number;
    };
}

export interface RawBusiness {
    business_name: string;
    industry: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
    website?: string;
    square_feet?: number;
    employee_count?: number;
    year_founded?: number;
}

class LeadScraper {
    
    // Inside LeadScraper class, replace scrapeGoogleMaps with:

async scrapeGoogleMaps(source: ScraperSource): Promise<RawBusiness[]> {
    console.log(`🔍 Using Google Places API for ${source.config.location}`);
    
    const { googlePlaces } = await import('./googlePlaces');
    
    const businesses = await googlePlaces.searchAndProcess(
        source.config.location,
        source.config.industries,
        source.config.maxResults || 50
    );
    
    return businesses;
}
    
    /**
     * Process a batch of raw businesses through the radar and save to database
     */
    async processBusinesses(businesses: RawBusiness[], teamId: string, sourceId: string) {
        const results = {
            total: businesses.length,
            new: 0,
            duplicates: 0,
            errors: 0,
            leads: [] as any[]
        };
        
        for (const business of businesses) {
            try {
                // Score with radar
                const scored = opportunityRadar.calculateSwitchProbability(business);
                
                // Insert into database
                const { data, error } = await supabase
                    .from('discovered_leads')
                    .insert([{
                        source_id: sourceId,
                        business_name: scored.business_name,
                        industry: scored.industry,
                        address: scored.address,
                        city: scored.city,
                        state: scored.state,
                        zip: scored.zip,
                        phone: scored.phone,
                        website: scored.website,
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
                    .maybeSingle(); // Use maybeSingle to avoid error on duplicate
                
                if (error) {
                    // Check if it's a duplicate error
                    if (error.message?.includes('unique_business')) {
                        results.duplicates++;
                    } else {
                        console.error('Insert error:', error);
                        results.errors++;
                    }
                } else if (data) {
                    results.new++;
                    results.leads.push(data);
                    
                    // Log activity
                    await supabase
                        .from('system_activity')
                        .insert([{
                            lead_id: data.id,
                            activity_type: 'lead_discovered',
                            details: {
                                source: sourceId,
                                score: scored.switch_probability,
                                savings: scored.estimated_savings
                            }
                        }]);
                }
                
            } catch (error) {
                console.error('Error processing business:', error);
                results.errors++;
            }
        }
        
        return results;
    }
    
    /**
     * Run a specific scraper source
     */
    async runSource(sourceId: string, teamId: string) {
        // Get source configuration
        const { data: source, error } = await supabase
            .from('lead_sources')
            .select('*')
            .eq('id', sourceId)
            .single();
        
        if (error || !source) {
            throw new Error(`Source ${sourceId} not found`);
        }
        
        // Scrape businesses based on source type
        let businesses: RawBusiness[] = [];
        if (source.config?.type === 'google_maps') {
            businesses = await this.scrapeGoogleMaps(source as ScraperSource);
        }
        
        // Process them through the radar
        const results = await this.processBusinesses(businesses, teamId, sourceId);
        
        // Update last run timestamp
        await supabase
            .from('lead_sources')
            .update({ last_run: new Date() })
            .eq('id', sourceId);
        
        return {
            source: source.name,
            ...results
        };
    }
    
    /**
     * Run all active scraper sources
     */
    async runAllSources(teamId: string) {
        const { data: sources } = await supabase
            .from('lead_sources')
            .select('*')
            .eq('is_active', true);
        
        const results = [];
        for (const source of sources || []) {
            const result = await this.runSource(source.id, teamId);
            results.push(result);
        }
        
        return results;
    }
}

export const leadScraper = new LeadScraper();