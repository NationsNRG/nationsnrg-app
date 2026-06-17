'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface DealBrief {
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

export default function DealBriefPage() {
    const params = useParams();
    const router = useRouter();
    const [brief, setBrief] = useState<DealBrief | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadBrief();
    }, [params.id]);

    const loadBrief = async () => {
        const { data } = await supabase
            .from('deal_briefs')
            .select('*')
            .eq('lead_id', params.id)
            .single();
        
        if (data) {
            setBrief(data as any);
        }
        setLoading(false);
    };

    const generateBrief = async () => {
        setGenerating(true);
        const response = await fetch('/api/deal-brief', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadId: params.id })
        });
        
        const data = await response.json();
        if (data.success) {
            setBrief(data.brief);
        }
        setGenerating(false);
    };

    const formatCurrency = (n: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(n);
    };

    const getUrgencyColor = (urgency: string) => {
        switch(urgency) {
            case 'HIGH': return 'bg-red-100 text-red-700';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-green-100 text-green-700';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-4xl mx-auto animate-pulse">
                    <div className="h-8 bg-gray-200 w-1/3 mb-6"></div>
                    <div className="space-y-4">
                        <div className="h-32 bg-gray-200 rounded"></div>
                        <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!brief && !generating) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h1 className="text-3xl font-bold mb-4">Generate Deal Brief</h1>
                    <p className="text-gray-600 mb-8">Create an AI-powered sales brief for this enterprise lead</p>
                    <button
                        onClick={generateBrief}
                        disabled={generating}
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
                    >
                        {generating ? 'Generating...' : 'Generate Brief'}
                    </button>
                </div>
            </div>
        );
    }

    if (!brief) return null;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">Deal Brief</h1>
                        <p className="text-gray-600">{brief.business_name}</p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Export PDF
                        </button>
                        <Link
                            href="/leads"
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                        >
                            ← Back
                        </Link>
                    </div>
                </div>

                {/* Urgency Banner */}
                <div className={`mb-6 p-4 rounded-lg ${getUrgencyColor(brief.urgency)}`}>
                    <p className="font-bold text-lg">
                        {brief.urgency} PRIORITY • {brief.contract_expires}
                    </p>
                </div>

                {/* Executive Summary */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4">Executive Summary</h2>
                    <p className="text-gray-700">{brief.executive_summary}</p>
                    
                    <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-500">Deal Value</p>
                            <p className="text-xl font-bold">{formatCurrency(brief.deal_value)}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-500">Your Commission</p>
                            <p className="text-xl font-bold text-green-600">{formatCurrency(brief.your_commission)}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-500">Expiration</p>
                            <p className="text-xl font-bold">{brief.contract_expires}</p>
                        </div>
                    </div>
                </div>

                {/* Energy Analysis */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4">⚡ Energy Analysis</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Current Spend</p>
                            <p className="text-lg font-bold">{formatCurrency(brief.current_energy_spend)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Estimated Savings</p>
                            <p className="text-lg font-bold text-green-600">{formatCurrency(brief.estimated_savings)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Recommended Term</p>
                            <p className="text-lg font-bold">{brief.recommended_term} months</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Market Outlook</p>
                            <p className="text-lg font-bold">{brief.market_volatility}</p>
                        </div>
                    </div>
                </div>

                {/* Infrastructure */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4">🏢 Infrastructure Profile</h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Employees</p>
                            <p className="text-lg font-bold">{brief.employee_count}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Locations</p>
                            <p className="text-lg font-bold">{brief.locations}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Digital Maturity</p>
                            <p className="text-lg font-bold">{brief.digital_maturity}/100</p>
                        </div>
                    </div>
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                        <p className="text-sm font-medium">Security Posture</p>
                        <p className="text-sm">{brief.security_posture}</p>
                    </div>
                </div>

                {/* Sales Script */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4">📝 Your Sales Script</h2>
                    <div className="bg-indigo-50 p-4 rounded-lg whitespace-pre-line">
                        {brief.sales_script.full_script}
                    </div>
                </div>

                {/* Objections */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4">🛡️ Handle Objections</h2>
                    <div className="space-y-3">
                        {brief.objections.map((obj, i) => (
                            <div key={i} className="bg-gray-50 p-3 rounded">
                                <p className="font-medium">They say: "{obj.objection}"</p>
                                <p className="text-green-600 mt-1">You say: "{obj.response}"</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Competitors */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4">🎯 Competitor Analysis</h2>
                    <div className="space-y-3">
                        {brief.competitors.map((comp, i) => (
                            <div key={i} className="border-b pb-2">
                                <p className="font-medium">{comp.name}</p>
                                <p className="text-sm text-gray-600">Our advantage: {comp.our_advantage}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Next Steps */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold mb-4">✅ Next Steps</h2>
                    <ol className="list-decimal list-inside space-y-2">
                        {brief.next_steps.map((step, i) => (
                            <li key={i} className="text-gray-700">{step}</li>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
    );
}