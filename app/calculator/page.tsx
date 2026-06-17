'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface BusinessType {
    id: number;
    name: string;
}

export default function EnergyCalculator() {
    const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
    const [formData, setFormData] = useState({
        user_email: '',
        business_name: '',
        business_type_id: '',
        locations: 1,
        sqft_per_location: 1000,
        electricity_rate: 0.11,
        gas_rate: 0.80
    });
    
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Load business types on mount
    useEffect(() => {
        async function loadBusinessTypes() {
            const { data } = await supabase
                .from('business_types')
                .select('id, name');
            if (data) setBusinessTypes(data);
        }
        loadBusinessTypes();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const { data, error } = await supabase
                .from('calculations')
                .insert([{
                    ...formData,
                    business_type_id: parseInt(formData.business_type_id as string)
                }])
                .select()
                .single();

            if (error) throw error;
            
            setResult(data);
            
            // Store in localStorage for Dark Pool tracking
            const recent = JSON.parse(localStorage.getItem('recent_calculations') || '[]');
            recent.push({ id: data.id, business_name: data.business_name, savings: data.total_potential_savings });
            localStorage.setItem('recent_calculations', JSON.stringify(recent.slice(-5)));
            
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Energy Opportunity Calculator</h1>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block mb-1">Your Email</label>
                        <input
                            type="email"
                            name="user_email"
                            value={formData.user_email}
                            onChange={handleChange}
                            required
                            className="w-full p-2 border rounded"
                            placeholder="We'll send your savings report"
                        />
                    </div>
                    
                    <div>
                        <label className="block mb-1">Business Name</label>
                        <input
                            type="text"
                            name="business_name"
                            value={formData.business_name}
                            onChange={handleChange}
                            required
                            className="w-full p-2 border rounded"
                        />
                    </div>
                    
                    <div>
                        <label className="block mb-1">Business Type</label>
                        <select
                            name="business_type_id"
                            value={formData.business_type_id}
                            onChange={handleChange}
                            required
                            className="w-full p-2 border rounded"
                        >
                            <option value="">Select type</option>
                            {businessTypes.map(bt => (
                                <option key={bt.id} value={bt.id}>{bt.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block mb-1">Number of Locations</label>
                        <input
                            type="number"
                            name="locations"
                            value={formData.locations}
                            onChange={handleChange}
                            min="1"
                            required
                            className="w-full p-2 border rounded"
                        />
                    </div>
                    
                    <div>
                        <label className="block mb-1">Sq Ft per Location</label>
                        <input
                            type="number"
                            name="sqft_per_location"
                            value={formData.sqft_per_location}
                            onChange={handleChange}
                            min="100"
                            required
                            className="w-full p-2 border rounded"
                        />
                    </div>
                    
                    <div>
                        <label className="block mb-1">Electricity Rate ($/kWh)</label>
                        <input
                            type="number"
                            name="electricity_rate"
                            value={formData.electricity_rate}
                            onChange={handleChange}
                            step="0.01"
                            className="w-full p-2 border rounded"
                        />
                    </div>
                    
                    <div>
                        <label className="block mb-1">Gas Rate ($/therm)</label>
                        <input
                            type="number"
                            name="gas_rate"
                            value={formData.gas_rate}
                            onChange={handleChange}
                            step="0.01"
                            className="w-full p-2 border rounded"
                        />
                    </div>
                </div>
                
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {loading ? 'Calculating...' : 'Calculate Savings'}
                </button>
            </form>
            
            {result && (
                <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
                    <h2 className="text-2xl font-bold mb-4">Your Savings Opportunity</h2>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="text-gray-600">Annual Electricity Cost</h3>
                            <p className="text-2xl font-bold">${Math.round(result.total_electricity_cost * 12).toLocaleString()}</p>
                        </div>
                        
                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="text-gray-600">Annual Gas Cost</h3>
                            <p className="text-2xl font-bold">${Math.round(result.total_gas_cost * 12).toLocaleString()}</p>
                        </div>
                        
                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="text-gray-600">Total Annual Energy</h3>
                            <p className="text-2xl font-bold">${Math.round(result.total_energy_cost * 12).toLocaleString()}</p>
                        </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-blue-50 rounded">
                        <h3 className="text-xl font-bold mb-2">Potential Annual Savings</h3>
                        <p className="text-4xl font-bold text-green-600">
                            ${Math.round(result.total_potential_savings * 12).toLocaleString()}
                        </p>
                        <p className="text-gray-600 mt-2">
                            Based on 15% electricity and 10% gas optimization
                        </p>
                    </div>
                    
                    <div className="mt-6">
                        <button
                            onClick={() => window.location.href = '/schedule'}
                            className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700"
                        >
                            Schedule Free Analysis
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}