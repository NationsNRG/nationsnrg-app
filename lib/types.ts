// Database row types (what Supabase returns)
export interface CalculationRow {
    id: string;
    user_email: string;
    business_name: string;
    business_type_id: number;
    locations: number;
    sqft_per_location: number;
    electricity_rate: number;
    gas_rate: number;
    total_electricity_kwh: number;
    total_gas_therms: number;
    total_electricity_cost: number;
    total_gas_cost: number;
    total_energy_cost: number;
    potential_savings_electricity: number;
    potential_savings_gas: number;
    total_potential_savings: number;
    contract_expiration_date: string | null;
    last_contacted: string | null;
    status: 'lead' | 'contacted' | 'proposal' | 'negotiation' | 'closed'
    created_at: string;
}

export interface BusinessTypeRow {
    id: number;
    name: string;
    electricity_kwh_per_sqft: number;
    gas_therms_per_sqft: number;
    created_at: string;
}

// Team Interfaces
export interface Team {
    id: string;
    name: string;
    owner_id: string;
    created_at: string;
}

export interface TeamMember {
    id: string;
    team_id: string;
    user_id: string;
    role: 'admin' | 'member' | 'viewer';
    created_at: string;
}

// Joined query result with business types and team
export interface CalculationWithBusiness extends CalculationRow {
    business_types: BusinessTypeRow | null;
    team_id: string | null;
}

// For the dashboard display (flattened for easier use)
export interface CalculationDisplay {
    id: string;
    business_name: string;
    user_email: string;
    business_type_name: string;
    status: 'lead' | 'contacted' | 'proposal' | 'negotiation' | 'closed'
    created_at: string;
    contract_expiration_date: string | null;
    total_potential_savings: number;
    total_energy_cost: number;
}

// For team member queries with joined team data
export interface TeamMemberWithTeam extends TeamMember {
    teams: Team;
}