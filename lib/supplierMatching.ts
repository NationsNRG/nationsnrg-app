import { supabase } from './supabase';
import { CalculationWithBusiness } from './types';

export interface MatchedSupplier {
    id: string;
    company_name: string;
    contact_name: string;
    email: string;
    phone: string;
    distance_score: number;
    rate_score: number;
    overall_score: number;
    best_rate?: number;
    best_term?: number;
    estimated_savings?: number;
}

export interface MatchResult {
    suppliers: MatchedSupplier[];
    topMatch: MatchedSupplier | null;
    marketAverageRate: number;
    competitivenessScore: 'HIGH' | 'MEDIUM' | 'LOW';
}

class SupplierMatchingEngine {
    
    async matchSuppliersToDeal(
        lead: CalculationWithBusiness,
        limit: number = 10
    ): Promise<MatchResult> {
        
        const annualMwh = Math.round((lead.total_electricity_kwh || 0) / 1000);
        const businessTypeId = lead.business_type_id;
        const businessState = 'FL'; // Default for now

        console.log('🔧 Calling find_suppliers_by_territory with:', {
    state: businessState,
    mwh: annualMwh,
    typeId: businessTypeId
});
        
        const { data: suppliers, error } = await supabase
            .rpc('find_suppliers_by_territory', {
                p_state: businessState,
                p_annual_mwh: annualMwh,
                p_business_type_id: businessTypeId
            });

        // 🔍 ADD THIS TO CHECK THE RESPONSE
console.log('🔧 RPC Response:', { suppliers, error });

        if (error) {
            console.error('Error matching suppliers:', error);
            return {
                suppliers: [],
                topMatch: null,
                marketAverageRate: 0.12,
                competitivenessScore: 'MEDIUM'
            };
        }

        const enrichedSuppliers: MatchedSupplier[] = [];
        let totalRate = 0;
        
        for (const s of suppliers.slice(0, limit)) {
            const { data: rateData } = await supabase
                .rpc('get_best_rate_for_deal', {
                    p_supplier_id: s.supplier_id,
                    p_business_type_id: businessTypeId,
                    p_annual_mwh: annualMwh
                });

            const bestRate = rateData?.[0];
            
            if (bestRate) {
                totalRate += bestRate.rate;
                
                const currentRate = lead.electricity_rate || 0.11;
                const savingsPerKwh = currentRate - bestRate.rate;
                const estimatedSavings = savingsPerKwh * (lead.total_electricity_kwh || 0) * 12;
                
                enrichedSuppliers.push({
                    id: s.supplier_id,
                    company_name: s.company_name,
                    contact_name: s.contact_name,
                    email: s.email,
                    phone: s.phone,
                    distance_score: s.distance_score,
                    rate_score: s.rate_score,
                    overall_score: s.overall_score,
                    best_rate: bestRate.rate,
                    best_term: bestRate.term_months,
                    estimated_savings: estimatedSavings
                });
            }
        }

        const marketAvgRate = enrichedSuppliers.length > 0 
            ? totalRate / enrichedSuppliers.length 
            : 0.12;

        const currentRate = lead.electricity_rate || 0.11;
        const rateImprovement = ((currentRate - marketAvgRate) / currentRate) * 100;
        
        let competitivenessScore: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
        if (rateImprovement > 15) competitivenessScore = 'HIGH';
        if (rateImprovement < 5) competitivenessScore = 'LOW';

        return {
            suppliers: enrichedSuppliers,
            topMatch: enrichedSuppliers[0] || null,
            marketAverageRate: marketAvgRate,
            competitivenessScore
        };
    }

    private calculatePriorityScore(lead: any): { priorityScore: number } {
        const savings = lead.total_potential_savings || 0;
        const expiration = lead.contract_expiration_date 
            ? new Date(lead.contract_expiration_date) 
            : null;
        
        const today = new Date();
        let daysRemaining = 180;
        
        if (expiration) {
            daysRemaining = Math.floor(
                (expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );
        }

        const expirationScore = Math.max(0, 180 - daysRemaining);
        const savingsScore = savings / 10000;
        const priorityScore = Math.round(expirationScore + savingsScore);

        return { priorityScore };
    }
}

export const supplierMatching = new SupplierMatchingEngine();