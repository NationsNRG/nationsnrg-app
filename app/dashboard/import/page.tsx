'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ImportPage() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any>(null);

    const handleManualImport = async () => {
        setLoading(true);
        
        // This is where you'd integrate with Apify or manual CSV upload
        // For now, we'll create a simple template
        
        const teamId = localStorage.getItem('currentTeam');
        
        // Example: Add a test lead manually
        const { data, error } = await supabase
            .from('calculations')
            .insert([{
                team_id: teamId,
                business_name: 'Sample Import',
                user_email: 'sample@example.com',
                business_type_id: 1,
                locations: 1,
                sqft_per_location: 2500,
                electricity_rate: 0.11,
                gas_rate: 0.80,
                source: 'manual_import',
                status: 'lead'
            }]);
            
        setResults({ data, error });
        setLoading(false);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Import Leads</h1>
            
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Manual Import</h2>
                
                <button
                    onClick={handleManualImport}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {loading ? 'Importing...' : 'Add Sample Lead'}
                </button>
                
                {results && (
                    <pre className="mt-4 bg-gray-100 p-4 rounded">
                        {JSON.stringify(results, null, 2)}
                    </pre>
                )}
            </div>
            
            <div className="bg-white rounded-lg shadow p-6 mt-6">
                <h2 className="text-xl font-bold mb-4">CSV Import</h2>
                <p className="text-gray-600 mb-4">Upload a CSV file with your leads</p>
                <input 
                    type="file" 
                    accept=".csv"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
            </div>
        </div>
    );
}