'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface BidRequest {
    id: string;
    calculation_id: string;
    status: string;
    estimated_annual_mwh: number;
    bid_deadline: string;
    supplier_count: number;
    calculation: {
        business_name: string;
        business_types: { name: string };
        total_electricity_kwh: number;
        total_potential_savings: number;
    };
}

interface Bid {
    id: string;
    bid_request_id: string;
    rate: number;
    term_months: number;
    status: string;
    created_at: string;
}

export default function SupplierBidsPage() {
    const [bidRequests, setBidRequests] = useState<BidRequest[]>([]);
    const [myBids, setMyBids] = useState<Record<string, Bid[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // Get open bid requests
        const { data: requests } = await supabase
            .from('bid_requests')
            .select(`
                *,
                calculation:calculations (
                    business_name,
                    business_types (name),
                    total_electricity_kwh,
                    total_potential_savings
                )
            `)
            .eq('status', 'open')
            .order('created_at', { ascending: false });

        if (requests) {
            setBidRequests(requests as BidRequest[]);
        }

        // Get supplier's bids
        const { data: bids } = await supabase
            .from('bids')
            .select('*')
            .order('created_at', { ascending: false });

        if (bids) {
            const grouped = bids.reduce((acc, bid) => {
                if (!acc[bid.bid_request_id]) acc[bid.bid_request_id] = [];
                acc[bid.bid_request_id].push(bid);
                return acc;
            }, {} as Record<string, Bid[]>);
            setMyBids(grouped);
        }

        setLoading(false);
    };

    const submitBid = async (bidRequestId: string, rate: number) => {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { error } = await supabase
            .from('bids')
            .insert([{
                bid_request_id: bidRequestId,
                supplier_id: user?.id,
                rate: rate,
                term_months: 36,
                status: 'pending'
            }]);

        if (!error) {
            alert('Bid submitted!');
            loadData();
        }
    };

    const formatCurrency = (n: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(n);
    };

    if (loading) {
        return <div className="p-8">Loading...</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">🔋 Supplier Bidding Portal</h1>
            
            <div className="grid gap-6">
                {bidRequests.map(request => (
                    <div key={request.id} className="bg-white rounded-lg shadow p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold">
                                    {request.calculation?.business_name}
                                </h2>
                                <p className="text-gray-600">
                                    {request.calculation?.business_types?.name}
                                </p>
                            </div>
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm">
                                {request.estimated_annual_mwh} MWh/year
                            </span>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mt-4">
                            <div>
                                <p className="text-sm text-gray-500">Est. Savings</p>
                                <p className="font-bold text-green-600">
                                    {formatCurrency(request.calculation?.total_potential_savings || 0)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Deadline</p>
                                <p className="font-medium">
                                    {new Date(request.bid_deadline).toLocaleDateString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Current Bids</p>
                                <p className="font-medium">{myBids[request.id]?.length || 0}</p>
                            </div>
                            <div className="text-right">
                                {!myBids[request.id] ? (
                                    <button
                                        onClick={() => {
                                            const rate = prompt('Enter your rate (¢/kWh):');
                                            if (rate) submitBid(request.id, parseFloat(rate));
                                        }}
                                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                    >
                                        Submit Bid
                                    </button>
                                ) : (
                                    <span className="bg-gray-100 text-gray-700 px-4 py-2 rounded">
                                        Bid Submitted
                                    </span>
                                )}
                            </div>
                        </div>

                        {myBids[request.id] && (
                            <div className="mt-4 p-3 bg-blue-50 rounded">
                                <p className="font-medium">Your Bid:</p>
                                <p>Rate: {myBids[request.id][0].rate}¢/kWh</p>
                                <p>Term: {myBids[request.id][0].term_months} months</p>
                                <p>Status: {myBids[request.id][0].status}</p>
                            </div>
                        )}
                    </div>
                ))}

                {bidRequests.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No open bid requests
                    </div>
                )}
            </div>
        </div>
    );
}