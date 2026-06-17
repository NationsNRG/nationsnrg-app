'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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

export default function PlaceBid() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [bidRequest, setBidRequest] = useState<BidRequest | null>(null);
    const [formData, setFormData] = useState({
        rate: '',
        term_months: '36',
        notes: ''
    });

    useEffect(() => {
        loadBidRequest();
    }, [params.id]);

    const loadBidRequest = async () => {
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
            .eq('id', params.id)
            .single();

        if (data) {
            setBidRequest(data as BidRequest);
            const currentRate = (data as any).calculation?.electricity_rate || 0.11;
            setFormData(prev => ({
                ...prev,
                rate: (currentRate * 0.95).toFixed(4)
            }));
        }
        
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: supplier } = await supabase
            .from('suppliers')
            .select('id')
            .eq('user_id', user?.id)
            .single();

        const { error } = await supabase
            .from('bids')
            .insert([{
                bid_request_id: params.id,
                supplier_id: supplier?.id,
                rate: parseFloat(formData.rate),
                term_months: parseInt(formData.term_months),
                notes: formData.notes,
                status: 'pending'
            }]);

        if (!error) {
            router.push('/supplier/bids');
        } else {
            alert('Failed to submit bid');
        }

        setSubmitting(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!bidRequest) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-12">
                <div className="bg-yellow-50 p-6 text-center rounded-lg">
                    <p className="text-yellow-700">Bid request not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4">
            <h1 className="text-3xl font-bold mb-6">Place Your Bid</h1>

            <div className="bg-blue-50 rounded-lg p-6 mb-8">
                <h2 className="font-semibold mb-4">{bidRequest.calculation?.business_name}</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Type</p>
                        <p className="font-medium">{bidRequest.calculation?.business_types?.name}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Annual Usage</p>
                        <p className="font-medium">{bidRequest.estimated_annual_mwh} MWh</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Current Rate</p>
                        <p className="font-medium">{bidRequest.calculation?.electricity_rate}¢/kWh</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Deadline</p>
                        <p className="font-medium text-red-600">
                            {new Date(bidRequest.bid_deadline).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Your Rate (¢/kWh)
                    </label>
                    <input
                        type="number"
                        step="0.0001"
                        required
                        value={formData.rate}
                        onChange={(e) => setFormData({...formData, rate: e.target.value})}
                        className="w-full px-4 py-3 border rounded-lg"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">
                        Contract Term
                    </label>
                    <select
                        value={formData.term_months}
                        onChange={(e) => setFormData({...formData, term_months: e.target.value})}
                        className="w-full px-4 py-3 border rounded-lg"
                    >
                        <option value="12">12 months</option>
                        <option value="24">24 months</option>
                        <option value="36">36 months</option>
                        <option value="48">48 months</option>
                        <option value="60">60 months</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">
                        Notes (Optional)
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        rows={4}
                        className="w-full px-4 py-3 border rounded-lg"
                    />
                </div>

                <div className="flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        {submitting ? 'Submitting...' : 'Submit Bid'}
                    </button>
                </div>
            </form>
        </div>
    );
}