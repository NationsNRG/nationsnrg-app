import { supabase } from './supabase';

// Map zip codes to utility providers and ISO regions
// Source: Based on Florida utility territories and national grid data
interface UtilityInfo {
    utility: string;
    iso: string;
    region: string;
    fuel_types: ('electricity' | 'gas')[];
}

export const utilityMap: Record<string, UtilityInfo> = {
    // Florida (FRCC - Florida Reliability Coordinating Council)
    '33101': { utility: 'FPL', iso: 'FRCC', region: 'South Florida', fuel_types: ['electricity'] },
    '33130': { utility: 'FPL', iso: 'FRCC', region: 'South Florida', fuel_types: ['electricity'] },
    '33131': { utility: 'FPL', iso: 'FRCC', region: 'South Florida', fuel_types: ['electricity'] },
    '33132': { utility: 'FPL', iso: 'FRCC', region: 'South Florida', fuel_types: ['electricity'] },
    '33133': { utility: 'FPL', iso: 'FRCC', region: 'South Florida', fuel_types: ['electricity'] },
    '33134': { utility: 'FPL', iso: 'FRCC', region: 'South Florida', fuel_types: ['electricity'] },
    
    // TECO Peoples Gas territories (Tampa Bay area)
    '33601': { utility: 'TECO Peoples Gas', iso: 'FRCC', region: 'Tampa Bay', fuel_types: ['gas'] },
    '33602': { utility: 'TECO Peoples Gas', iso: 'FRCC', region: 'Tampa Bay', fuel_types: ['gas'] },
    '33603': { utility: 'TECO Peoples Gas', iso: 'FRCC', region: 'Tampa Bay', fuel_types: ['gas'] },
    '33604': { utility: 'TECO Peoples Gas', iso: 'FRCC', region: 'Tampa Bay', fuel_types: ['gas'] },
    
    // Florida City Gas territories (South Florida)
    '33401': { utility: 'Florida City Gas', iso: 'FRCC', region: 'Palm Beach', fuel_types: ['gas'] },
    '33431': { utility: 'Florida City Gas', iso: 'FRCC', region: 'Boca Raton', fuel_types: ['gas'] },
    '33432': { utility: 'Florida City Gas', iso: 'FRCC', region: 'Boca Raton', fuel_types: ['gas'] },
    
    // Central Florida Gas (Polk County area)
    '33801': { utility: 'Central Florida Gas', iso: 'FRCC', region: 'Lakeland', fuel_types: ['gas'] },
    '33803': { utility: 'Central Florida Gas', iso: 'FRCC', region: 'Lakeland', fuel_types: ['gas'] },
    '33805': { utility: 'Central Florida Gas', iso: 'FRCC', region: 'Lakeland', fuel_types: ['gas'] },
    
    // Texas (ERCOT)
    '75001': { utility: 'ONCOR', iso: 'ERCOT', region: 'Dallas', fuel_types: ['electricity'] },
    '75002': { utility: 'ONCOR', iso: 'ERCOT', region: 'Dallas', fuel_types: ['electricity'] },
    '75006': { utility: 'ONCOR', iso: 'ERCOT', region: 'Dallas', fuel_types: ['electricity'] },
    '75007': { utility: 'ONCOR', iso: 'ERCOT', region: 'Dallas', fuel_types: ['electricity'] },
    
    '77001': { utility: 'CenterPoint', iso: 'ERCOT', region: 'Houston', fuel_types: ['electricity'] },
    '77002': { utility: 'CenterPoint', iso: 'ERCOT', region: 'Houston', fuel_types: ['electricity'] },
    '77003': { utility: 'CenterPoint', iso: 'ERCOT', region: 'Houston', fuel_types: ['electricity'] },
    '77004': { utility: 'CenterPoint', iso: 'ERCOT', region: 'Houston', fuel_types: ['electricity'] },
    
    '78201': { utility: 'CPS Energy', iso: 'ERCOT', region: 'San Antonio', fuel_types: ['electricity'] },
    '78202': { utility: 'CPS Energy', iso: 'ERCOT', region: 'San Antonio', fuel_types: ['electricity'] },
    '78203': { utility: 'CPS Energy', iso: 'ERCOT', region: 'San Antonio', fuel_types: ['electricity'] },
    
    // Pennsylvania (PJM)
    '17501': { utility: 'PPL', iso: 'PJM', region: 'Lancaster', fuel_types: ['electricity', 'gas'] },
    '17502': { utility: 'PPL', iso: 'PJM', region: 'Lancaster', fuel_types: ['electricity', 'gas'] },
    '17401': { utility: 'PPL', iso: 'PJM', region: 'York', fuel_types: ['electricity', 'gas'] },
    '17402': { utility: 'PPL', iso: 'PJM', region: 'York', fuel_types: ['electricity', 'gas'] },
    
    // Ohio (PJM)
    '45401': { utility: 'AES Ohio', iso: 'PJM', region: 'Dayton', fuel_types: ['electricity', 'gas'] },
    '45402': { utility: 'AES Ohio', iso: 'PJM', region: 'Dayton', fuel_types: ['electricity', 'gas'] },
    '45403': { utility: 'AES Ohio', iso: 'PJM', region: 'Dayton', fuel_types: ['electricity', 'gas'] },
    
    // Illinois (PJM)
    '61101': { utility: 'ComEd', iso: 'PJM', region: 'Rockford', fuel_types: ['electricity', 'gas'] },
    '61102': { utility: 'ComEd', iso: 'PJM', region: 'Rockford', fuel_types: ['electricity', 'gas'] },
    '61103': { utility: 'ComEd', iso: 'PJM', region: 'Rockford', fuel_types: ['electricity', 'gas'] },
};

export function detectUtility(zip: string): UtilityInfo {
    return utilityMap[zip] || { 
        utility: 'Unknown', 
        iso: 'Unknown', 
        region: 'Unknown',
        fuel_types: ['electricity'] // Default to electricity
    };
}

export function getAvailableFuelTypes(zip: string): ('electricity' | 'gas')[] {
    return utilityMap[zip]?.fuel_types || ['electricity'];
}

// Batch update function for leads
export async function updateLeadUtility(leadId: string, zip: string) {
    const { utility, iso, region, fuel_types } = detectUtility(zip);
    
    const { error } = await supabase
        .from('discovered_leads')
        .update({ 
            utility_provider: utility,
            iso_region: iso,
            // You might want to add a region field
        })
        .eq('id', leadId);
    
    if (error) {
        console.error('Error updating lead utility:', error);
    }
    
    return { utility, iso, region, fuel_types };
}