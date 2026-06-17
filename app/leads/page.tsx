'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Lead {
    id: string;
    business_name: string;
    industry: string;
    city: string;
    state: string;
    phone?: string;
    email?: string;
    square_feet?: number;
    employee_count?: number;
    
    estimated_energy_spend: number;
    estimated_expiration_window: number;
    lead_score: number;
    estimated_savings: number;
    estimated_commission: number;
    broker_value_score: number;
    
    status: 'new' | 'nurturing' | 'auto_proposal_sent' | 'enterprise_review' | 'contacted' | 'closed' | 'lost';
    is_enterprise: boolean;

     // ADD THESE TWO LINES
    ai_conversation_id?: string;
    insight_id?: string;
    
    created_at: string;
}

export default function LeadDashboard() {
    const router = useRouter();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<string>('broker_value_score');
    const [sortDirection, setSortDirection] = useState<'asc'|'desc'>('desc');
    const [teamId, setTeamId] = useState<string | null>(null);

    useEffect(() => {
        const team = localStorage.getItem('currentTeam');
        setTeamId(team);
        loadLeads(team);
    }, []);

    const loadLeads = async (teamId: string | null) => {
        if (!teamId) return;
        
        setLoading(true);
        const { data } = await supabase
            .from('discovered_leads')
            .select('*')
            .eq('team_id', teamId)
            .order('created_at', { ascending: false });
        
        setLeads(data || []);
        setLoading(false);
    };

    const getFilteredLeads = () => {
        let filtered = [...leads];
        
        // Apply status filter
        if (filter !== 'all') {
            filtered = filtered.filter(lead => lead.status === filter);
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
            const aVal = a[sortBy as keyof Lead] || 0;
            const bVal = b[sortBy as keyof Lead] || 0;
            
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortDirection === 'asc' 
                    ? aVal.localeCompare(bVal) 
                    : bVal.localeCompare(aVal);
            }
            
            return sortDirection === 'asc' 
                ? (aVal as number) - (bVal as number) 
                : (bVal as number) - (aVal as number);
        });
        
        return filtered;
    };

    const updateLeadStatus = async (leadId: string, newStatus: Lead['status']) => {
        await supabase
            .from('discovered_leads')
            .update({ status: newStatus })
            .eq('id', leadId);
        
        // Update local state
        setLeads(leads.map(lead => 
            lead.id === leadId ? { ...lead, status: newStatus } : lead
        ));
    };

    const startAIConversation = async (leadId: string) => {
    await fetch('/api/ai-closer/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId })
    });
    alert('✅ AI Closer activated!');
    loadLeads(teamId);
};

const generateInsight = async (leadId: string) => {
    const res = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId })
    });
    const data = await res.json();
    if (data.success) {
        alert('✅ Insight generated! Check /insights');
        loadLeads(teamId);
    }
};

    const getStatusColor = (status: string) => {
        const colors = {
            'new': 'bg-blue-100 text-blue-700',
            'nurturing': 'bg-purple-100 text-purple-700',
            'auto_proposal_sent': 'bg-yellow-100 text-yellow-700',
            'enterprise_review': 'bg-orange-100 text-orange-700',
            'contacted': 'bg-green-100 text-green-700',
            'closed': 'bg-gray-100 text-gray-700',
            'lost': 'bg-red-100 text-red-700'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700';
    };

    const formatCurrency = (n: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(n);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const filteredLeads = getFilteredLeads();
    const stats = {
        total: leads.length,
        enterprise: leads.filter(l => l.is_enterprise).length,
        expiringSoon: leads.filter(l => l.estimated_expiration_window < 90).length,
        totalCommission: leads.reduce((sum, l) => sum + (l.estimated_commission || 0), 0)
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 w-1/4 mb-6"></div>
                        <div className="grid grid-cols-4 gap-4 mb-8">
                            {[1,2,3,4].map(i => (
                                <div key={i} className="h-24 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                        <div className="h-96 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
<div className="flex justify-between items-center mb-6">
    <div>
        <h1 className="text-3xl font-bold">Lead Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage and prioritize your energy opportunities</p>
    </div>
    <div className="flex space-x-3">
        <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
            ↻ Refresh
        </button>
        <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
            ← Dark Pool
        </Link>
    </div>
</div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-sm text-gray-500 uppercase">Total Leads</p>
                        <p className="text-3xl font-bold">{stats.total}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-sm text-gray-500 uppercase">Enterprise</p>
                        <p className="text-3xl font-bold text-orange-600">{stats.enterprise}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-sm text-gray-500 uppercase">Expiring Soon</p>
                        <p className="text-3xl font-bold text-red-600">{stats.expiringSoon}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-sm text-gray-500 uppercase">Total Commission</p>
                        <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.totalCommission)}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="flex flex-wrap gap-4">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Status</label>
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="border rounded-lg px-3 py-2"
                            >
                                <option value="all">All Statuses</option>
                                <option value="new">New</option>
                                <option value="enterprise_review">Enterprise Review</option>
                                <option value="nurturing">Nurturing</option>
                                <option value="contacted">Contacted</option>
                                <option value="closed">Closed</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Sort By</label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="border rounded-lg px-3 py-2"
                            >
                                <option value="broker_value_score">Broker Value</option>
                                <option value="estimated_commission">Commission</option>
                                <option value="estimated_savings">Savings</option>
                                <option value="lead_score">Score</option>
                                <option value="estimated_expiration_window">Expiration</option>
                                <option value="business_name">Business Name</option>
                                <option value="created_at">Date Discovered</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Direction</label>
                            <select
                                value={sortDirection}
                                onChange={(e) => setSortDirection(e.target.value as 'asc'|'desc')}
                                className="border rounded-lg px-3 py-2"
                            >
                                <option value="desc">High to Low</option>
                                <option value="asc">Low to High</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Leads Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Industry</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Savings</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredLeads.map(lead => {
                                    const isExpiringSoon = lead.estimated_expiration_window < 90;
                                    const isHighValue = lead.broker_value_score > 1000;
                                    
                                    return (
                                        <tr key={lead.id} className={`hover:bg-gray-50 ${isExpiringSoon ? 'bg-red-50' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="font-medium">{lead.business_name}</div>
                                                <div className="text-sm text-gray-500">{lead.city}, {lead.state}</div>
                                            </td>
                                            <td className="px-6 py-4 capitalize">{lead.industry}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    lead.lead_score >= 70 ? 'bg-green-100 text-green-700' :
                                                    lead.lead_score >= 40 ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {lead.lead_score}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-green-600">
                                                {formatCurrency(lead.estimated_savings)}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-green-600">
                                                {formatCurrency(lead.estimated_commission)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`font-bold ${
                                                    lead.estimated_expiration_window < 60 ? 'text-red-600' :
                                                    lead.estimated_expiration_window < 90 ? 'text-orange-600' :
                                                    'text-gray-600'
                                                }`}>
                                                    {lead.estimated_expiration_window} days
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={lead.status}
                                                    onChange={(e) => updateLeadStatus(lead.id, e.target.value as Lead['status'])}
                                                    className={`text-xs rounded-full px-2 py-1 border-0 ${getStatusColor(lead.status)}`}
                                                >
                                                    <option value="new">New</option>
                                                    <option value="enterprise_review">Enterprise</option>
                                                    <option value="nurturing">Nurturing</option>
                                                    <option value="contacted">Contacted</option>
                                                    <option value="closed">Closed</option>
                                                    <option value="lost">Lost</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 font-bold">
                                                {formatCurrency(lead.broker_value_score)}
                                            </td>
                                            <td className="px-6 py-4">
    <div className="flex space-x-2">
        {lead.phone && (
            <button
                onClick={() => {
                    window.open(`tel:${lead.phone}`, '_blank');
                    // Track this call attempt
                    fetch('/api/track-call', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            leadId: lead.id,
                            timestamp: new Date()
                        })
                    });
                }}
                className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
            >
                Call
            </button>
        )}
        {lead.is_enterprise && (
            <>
                <button
                    onClick={() => router.push(`/enterprise/brief/${lead.id}`)}
                    className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700"
                >
                    Brief
                </button>
                <button
                    onClick={() => {
                        // Schedule followup emails
                        fetch('/api/enterprise/followup', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ leadId: lead.id })
                        });
                        alert('✅ Followup sequence scheduled');
                    }}
                    className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                >
                    📧 Schedule Followup
                </button>
            </>
        )}

        {!lead.ai_conversation_id && (
    <button
        onClick={() => startAIConversation(lead.id)}
        className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
    >
        🤖 AI Closer
    </button>
)}

{!lead.insight_id && (
            <button
                onClick={() => generateInsight(lead.id)}
                className="bg-yellow-600 text-white px-3 py-1 rounded text-xs hover:bg-yellow-700"
            >
                📝 Generate Insight
            </button>
        )}
    </div>
</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    
                    {filteredLeads.length === 0 && (
                        <div className="p-12 text-center text-gray-500">
                            <p className="text-4xl mb-3">📭</p>
                            <p>No leads found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}