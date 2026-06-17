import { supabase } from './supabase';

export interface MarketOpportunity {
    business_name: string;
    industry: string;
    city?: string;
    state?: string;
    square_feet?: number;
    employee_count?: number;
    year_founded?: number;
    iso_region?: string;
    utility_provider?: string;
}

export interface ScoredOpportunity extends MarketOpportunity {
    // Add these missing fields
    address?: string;
    zip?: string;
    phone?: string;
    website?: string;
    
    estimated_energy_spend: number;
    estimated_expiration_window: number;
    expiration_urgency: number;
    switch_probability: number;
    estimated_savings: number;
    estimated_commission: number;
    priority_score: number;
    broker_value_score: number;
    confidence_score: number;
    months_into_contract: number;
    months_remaining: number;
}

class OpportunityRadar {
    
    calculateSwitchProbability(company: MarketOpportunity): ScoredOpportunity {
    // Build contract intelligence with improved rolling window logic
    const intelligence = this.buildContractIntelligence(company);
    
    // Get fuel types if available (from utility provider data)
    const fuelTypes = (company as any).fuel_types || ['electricity'];

    // Adjust scoring based on available fuels
    let fuelMultiplier = 1.0;
    if (fuelTypes.includes('electricity') && fuelTypes.includes('gas')) {
        fuelMultiplier = 1.8; // 80% higher value for hybrid opportunities
    } else if (fuelTypes.includes('electricity')) {
        fuelMultiplier = 1.2; // 20% higher for electricity (higher spend)
    }
        
        // Calculate base score
        let score = 0;
        
        // Signal 1: Expiration window (most important)
        const expirationScore = this.calculateExpirationScore(intelligence.expirationWindowDays);
        score += expirationScore * 0.4;
        
        // Signal 2: Industry patterns
        const industryMultiplier = this.getIndustrySwitchMultiplier(company.industry);
        score += industryMultiplier * 20 * 0.2;
        
        // Signal 3: Estimated savings
        const estimatedSavings = this.estimateSavings(company);
        const savingsScore = Math.min(25, estimatedSavings / 2000);
        score += savingsScore * 0.2;
        
        // Signal 4: Energy spend
        const estimatedSpend = this.estimateEnergySpend(company);
        const spendScore = Math.min(20, estimatedSpend / 5000);
        score += spendScore * 0.2;
        
        const finalScore = Math.min(100, score);
        const commission = estimatedSavings * 0.10;
        
        // Priority score combines probability and urgency
        const priorityScore = Math.round(
            (finalScore * 0.6) + 
            (intelligence.expirationUrgency * 40) +
            (estimatedSavings / 5000)
        );
        
        // Broker value score = commission * switch_probability
        const brokerValueScore = commission * (finalScore / 100);
        
        return {
            ...company,
            estimated_energy_spend: estimatedSpend,
            estimated_expiration_window: intelligence.expirationWindowDays,
            expiration_urgency: intelligence.expirationUrgency,
            switch_probability: finalScore / 100,
            estimated_savings: estimatedSavings,
            estimated_commission: commission,
            priority_score: Math.min(100, priorityScore),
            broker_value_score: brokerValueScore,
            confidence_score: this.calculateConfidence(company),
            months_into_contract: intelligence.monthsIntoContract,
            months_remaining: intelligence.monthsRemaining
        };
    }
    
    private buildContractIntelligence(company: MarketOpportunity) {
        // Get contract term based on industry
        const termYears = this.estimateContractTerm(company.industry);
        const termMonths = termYears * 12;
        
        // Generate a random point in the contract cycle (0 to termMonths)
        // This simulates the rolling window approach - businesses are at random points in their contracts
        const randomSeed = this.getRandomSeed(company);
        const monthsIntoContract = Math.floor(randomSeed * termMonths);
        const monthsRemaining = termMonths - monthsIntoContract;
        
        // Calculate expiration date based on current date + months remaining
        const estimatedExpirationDate = new Date();
        estimatedExpirationDate.setMonth(estimatedExpirationDate.getMonth() + monthsRemaining);
        
        // Calculate days remaining
        const daysRemaining = monthsRemaining * 30; // Approximate
        
        // Calculate urgency (0-1)
        let urgency = 0.1;
        if (monthsRemaining < 1) urgency = 1.0;
        else if (monthsRemaining < 2) urgency = 0.9;
        else if (monthsRemaining < 3) urgency = 0.8;
        else if (monthsRemaining < 4) urgency = 0.7;
        else if (monthsRemaining < 6) urgency = 0.5;
        else if (monthsRemaining < 9) urgency = 0.3;
        else if (monthsRemaining < 12) urgency = 0.2;
        
        return {
            contractTermYears: termYears,
            monthsIntoContract,
            monthsRemaining,
            estimatedExpirationDate,
            expirationWindowDays: daysRemaining,
            expirationUrgency: urgency
        };
    }
    
    private getRandomSeed(company: MarketOpportunity): number {
        // Create a deterministic but seemingly random seed based on business name
        // This ensures the same business gets the same contract position each time
        let hash = 0;
        const str = company.business_name + (company.city || '') + (company.industry || '');
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0; // Convert to 32-bit integer
        }
        // Convert to 0-1 range
        return Math.abs(hash % 100) / 100;
    }
    
    private estimateContractTerm(industry: string = ''): number {
        const map: Record<string, number> = {
            'restaurant': 1, 'fast food': 1,
            'retail': 2, 'gym': 3, 'fitness': 3,
            'hotel': 2, 'manufacturing': 3,
            'office': 2, 'warehouse': 3, 'grocery': 3,
            'medical': 2, 'education': 2
        };
        
        const lower = industry?.toLowerCase() || '';
        for (const [key, value] of Object.entries(map)) {
            if (lower.includes(key)) return value;
        }
        return 2; // Default 24 months
    }
    
    private calculateExpirationScore(daysRemaining: number): number {
        if (daysRemaining < 30) return 100;
        if (daysRemaining < 60) return 90;
        if (daysRemaining < 90) return 80;
        if (daysRemaining < 120) return 70;
        if (daysRemaining < 150) return 60;
        if (daysRemaining < 180) return 50;
        if (daysRemaining < 270) return 30;
        if (daysRemaining < 365) return 20;
        return 10;
    }
    
    private getIndustrySwitchMultiplier(industry: string = ''): number {
        const highSwitch = ['restaurant', 'fast food', 'retail', 'gym', 'fitness'];
        const mediumSwitch = ['office', 'medical', 'warehouse', 'hotel'];
        
        const lower = industry.toLowerCase();
        if (highSwitch.some(i => lower.includes(i))) return 0.9;
        if (mediumSwitch.some(i => lower.includes(i))) return 0.6;
        return 0.4;
    }
    
    private estimateEnergySpend(company: MarketOpportunity): number {
        if (company.square_feet) {
            const avgRate = 0.12;
            const kwhPerSqFt = this.getKwhPerSqFt(company.industry);
            return Math.round(company.square_feet * kwhPerSqFt * avgRate * 12);
        }
        
        const industrySpend: Record<string, number> = {
            'restaurant': 85000, 'fast food': 110000, 'gym': 75000,
            'fitness': 75000, 'retail': 45000, 'grocery': 200000,
            'manufacturing': 350000, 'office': 60000, 'hotel': 180000,
            'warehouse': 120000, 'medical': 150000, 'education': 90000
        };
        
        return industrySpend[company.industry?.toLowerCase() || ''] || 50000;
    }
    
    private getKwhPerSqFt(industry: string = ''): number {
        const averages: Record<string, number> = {
            'restaurant': 5.0, 'fast food': 5.5, 'gym': 4.0,
            'retail': 2.5, 'grocery': 6.0, 'manufacturing': 3.5,
            'office': 1.8, 'hotel': 3.5, 'warehouse': 1.2,
            'medical': 2.8, 'education': 1.9
        };
        return averages[industry?.toLowerCase() || ''] || 2.5;
    }
    
    private estimateSavings(company: MarketOpportunity): number {
        const spend = this.estimateEnergySpend(company);
        return Math.round(spend * 0.15); // 15% average savings
    }
    
    private calculateConfidence(company: MarketOpportunity): number {
        let confidence = 50;
        if (company.square_feet) confidence += 15;
        if (company.employee_count) confidence += 10;
        if (company.year_founded) confidence += 15;
        if (company.industry) confidence += 10;
        if (company.iso_region) confidence += 10;
        if (company.utility_provider) confidence += 10;
        return Math.min(100, confidence);
    }
    
    // Test with multiple scenarios
    async test() {
        console.log('🔍 TESTING OPPORTUNITY RADAR WITH ROLLING WINDOW LOGIC\n');
        
        const testCases = [
            {
                name: "Small Restaurant",
                business_name: "Miami Pizza House",
                industry: "restaurant",
                square_feet: 3500,
                employee_count: 12,
                year_founded: 2020
            },
            {
                name: "Large Grocery Store",
                business_name: "Sunset Grocery Market",
                industry: "grocery",
                square_feet: 25000,
                employee_count: 45,
                year_founded: 2015
            },
            {
                name: "Small Office",
                business_name: "Brickell Business Center",
                industry: "office",
                square_feet: 8000,
                employee_count: 30,
                year_founded: 2018
            },
            {
                name: "Manufacturing Plant",
                business_name: "Doral Manufacturing Co",
                industry: "manufacturing",
                square_feet: 50000,
                employee_count: 120,
                year_founded: 2010
            }
        ];
        
        for (const testCase of testCases) {
            const scored = this.calculateSwitchProbability(testCase);
            console.log(`📊 ${testCase.name}:`, {
                energy_spend: `$${scored.estimated_energy_spend.toLocaleString()}`,
                savings: `$${scored.estimated_savings.toLocaleString()}`,
                commission: `$${scored.estimated_commission.toLocaleString()}`,
                months_into_contract: scored.months_into_contract,
                months_remaining: scored.months_remaining,
                expiration_window: `${scored.estimated_expiration_window} days`,
                switch_probability: `${Math.round(scored.switch_probability * 100)}%`,
                broker_value: `$${Math.round(scored.broker_value_score).toLocaleString()}`,
                priority_score: scored.priority_score
            });
            console.log('---');
        }
        
        return testCases.map(t => this.calculateSwitchProbability(t));
    }
}

export const opportunityRadar = new OpportunityRadar();