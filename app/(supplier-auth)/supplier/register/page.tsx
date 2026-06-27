'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { authenticatedFetch } from "@/lib/auth/authenticated-fetch";

export default function SupplierRegister() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        territories: [] as string[],
        min_volume_mwh: 100,
        credit_rating: 'investment'
    });

    const territories = [
        'Florida', 'Texas', 'New York', 'California', 'Illinois',
        'Ohio', 'Pennsylvania', 'Michigan', 'Georgia', 'North Carolina'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            console.log("SUPPLIER_REGISTER_SUBMIT_STARTED");
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();
            console.log("SUPPLIER_REGISTER_USER", user, userError);

            if (userError) {
                throw userError;
            }

            if (!user) {
                throw new Error("You must be logged in to register a supplier profile.");
            }

    const response = await authenticatedFetch("/api/supplier/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
    });

    const result = await response.json();

    console.log("SUPPLIER_REGISTER_INSERT_RESULT", result);

    if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Supplier profile was not created.");
    }

            router.push('/supplier/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const toggleTerritory = (territory: string) => {
        setFormData(prev => ({
            ...prev,
            territories: prev.territories.includes(territory)
                ? prev.territories.filter(t => t !== territory)
                : [...prev.territories, territory]
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <h1 className="text-3xl font-bold mb-2">Become a Supplier</h1>
                    <p className="text-gray-600 mb-8">
                        Get access to qualified commercial energy buyers.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Company Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.company_name}
                                    onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                                    className="w-full p-3 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Contact Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.contact_name}
                                    onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                                    className="w-full p-3 border rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    className="w-full p-3 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    className="w-full p-3 border rounded-lg"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-3">
                                Service Territories
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {territories.map(territory => (
                                    <button
                                        key={territory}
                                        type="button"
                                        onClick={() => toggleTerritory(territory)}
                                        className={`
                                            p-2 rounded-lg border text-sm transition
                                            ${formData.territories.includes(territory)
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                                            }
                                        `}
                                    >
                                        {territory}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Minimum Annual Volume (MWh)
                                </label>
                                <input
                                    type="number"
                                    value={formData.min_volume_mwh}
                                    onChange={(e) => setFormData({...formData, min_volume_mwh: parseInt(e.target.value)})}
                                    className="w-full p-3 border rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Credit Rating
                                </label>
                                <select
                                    value={formData.credit_rating}
                                    onChange={(e) => setFormData({...formData, credit_rating: e.target.value as any})}
                                    className="w-full p-3 border rounded-lg"
                                >
                                    <option value="investment">Investment Grade</option>
                                    <option value="speculative">Speculative</option>
                                    <option value="distressed">Distressed</option>
                                </select>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-black text-white p-4 rounded-lg font-medium hover:bg-gray-800 disabled:bg-gray-400"
                        >
                            {loading ? 'Registering...' : 'Register as Supplier'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}