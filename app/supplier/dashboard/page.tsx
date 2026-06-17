'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface BidRequest {
    id: string;
    estimated_annual_mwh: number;
    bid_deadline: string;
    calculation: {
        business_name: string;
        business_types: { name: string };
        total_electricity_kwh: number;
        total_potential_savings: number;
        electricity_rate: number;
    };
}

export default function SupplierDashboard() {
    const [opportunities, setOpportunities] = useState<BidRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadOpportunities();
    }, []);

    const loadOpportunities = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: supplier } = await supabase
            .from('suppliers')
            .select('id, territories, min_volume_mwh')
            .eq('user_id', user?.id)
            .single();

        if (!supplier) return;

        const { data } = await supabase
            .from('bid_requests')
            .select(`
                *,
                calculation:calculations (
                    business_name,
                    business_types (name),
                    total_electricity_kwh,
                    total_potential_savings,
                    electricity_rate
                )
            `)
            .eq('status', 'open')
            .gte('estimated_annual_mwh', supplier.min_volume_mwh)
            .order('created_at', { ascending: false });

        if (data) {
            setOpportunities(data as BidRequest[]);
        }
        
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Open Opportunities</h1>
                <p className="text-gray-500 mt-1">Browse and bid on commercial energy contracts</p>
            </div>

            {opportunities.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <p className="text-4xl mb-3">🎯</p>
                    <p className="text-gray-500">No open opportunities match your criteria</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {opportunities.map((opp) => (
                        <div key={opp.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold">{opp.calculation?.business_name}</h2>
                                    <p className="text-gray-600">{opp.calculation?.business_types?.name}</p>
                                </div>
                                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                                    {opp.estimated_annual_mwh} MWh/year
                                </span>
                            </div>

                            <div className="grid grid-cols-4 gap-4 mt-4">
                                <div>
                                    <p className="text-sm text-gray-500">Deadline</p>
                                    <p className="font-medium">
                                        {new Date(opp.bid_deadline).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Current Rate</p>
                                    <p className="font-medium">
                                        {opp.calculation?.electricity_rate.toFixed(3)}¢/kWh
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Est. Savings</p>
                                    <p className="font-medium text-green-600">
                                        ${Math.round(opp.calculation?.total_potential_savings || 0).toLocaleString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <Link
                                        href={`/supplier/bid/${opp.id}`}
                                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                                    >
                                        Place Bid
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}