'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { leadScraper } from '@/lib/leadScraper';

export default function ScraperDashboard() {
    const [sources, setSources] = useState<any[]>([]);
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [teamId, setTeamId] = useState<string | null>(null);

    useEffect(() => {
        loadSources();
        const team = localStorage.getItem('currentTeam');
        setTeamId(team);
    }, []);

    const loadSources = async () => {
        const { data } = await supabase
            .from('lead_sources')
            .select('*')
            .order('created_at');
        setSources(data || []);
    };

    const runScraper = async (sourceId?: string) => {
        setRunning(true);
        setResults(null);
        
        try {
            const response = await fetch('/api/scraper/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceId, teamId })
            });
            
            const data = await response.json();
            setResults(data);
            
            // Refresh sources to show updated last_run
            await loadSources();
            
        } catch (error) {
            console.error('Error running scraper:', error);
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">🤖 Lead Scraper</h1>
            
            <div className="grid md:grid-cols-2 gap-6">
                {/* Sources Panel */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold mb-4">Lead Sources</h2>
                    
                    <div className="space-y-4">
                        {sources.map(source => (
                            <div key={source.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold">{source.name}</h3>
                                        <p className="text-sm text-gray-600">
                                            Type: {source.type} • Industries: {source.config?.industries?.join(', ')}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Last run: {source.last_run ? new Date(source.last_run).toLocaleString() : 'Never'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => runScraper(source.id)}
                                        disabled={running || !source.is_active}
                                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:bg-gray-400"
                                    >
                                        Run
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <button
                        onClick={() => runScraper()}
                        disabled={running}
                        className="mt-4 w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
                    >
                        {running ? 'Running...' : 'Run All Sources'}
                    </button>
                </div>
                
                {/* Results Panel */}
                {results && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-bold mb-4">Results</h2>
                        
                        {results.results ? (
                            // Multiple sources
                            <div className="space-y-4">
                                {results.results.map((r: any, i: number) => (
                                    <div key={i} className="border rounded-lg p-4">
                                        <h3 className="font-bold">{r.source}</h3>
                                        <div className="grid grid-cols-4 gap-2 mt-2 text-center">
                                            <div className="bg-blue-50 p-2 rounded">
                                                <p className="text-xs text-blue-700">Total</p>
                                                <p className="text-xl font-bold">{r.total}</p>
                                            </div>
                                            <div className="bg-green-50 p-2 rounded">
                                                <p className="text-xs text-green-700">New</p>
                                                <p className="text-xl font-bold">{r.new}</p>
                                            </div>
                                            <div className="bg-yellow-50 p-2 rounded">
                                                <p className="text-xs text-yellow-700">Duplicates</p>
                                                <p className="text-xl font-bold">{r.duplicates}</p>
                                            </div>
                                            <div className="bg-red-50 p-2 rounded">
                                                <p className="text-xs text-red-700">Errors</p>
                                                <p className="text-xl font-bold">{r.errors}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Single source
                            <div>
                                <div className="grid grid-cols-4 gap-2 mb-4">
                                    <div className="bg-blue-50 p-3 rounded text-center">
                                        <p className="text-xs text-blue-700">Total</p>
                                        <p className="text-2xl font-bold">{results.results?.total || 0}</p>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded text-center">
                                        <p className="text-xs text-green-700">New</p>
                                        <p className="text-2xl font-bold">{results.results?.new || 0}</p>
                                    </div>
                                    <div className="bg-yellow-50 p-3 rounded text-center">
                                        <p className="text-xs text-yellow-700">Duplicates</p>
                                        <p className="text-2xl font-bold">{results.results?.duplicates || 0}</p>
                                    </div>
                                    <div className="bg-red-50 p-3 rounded text-center">
                                        <p className="text-xs text-red-700">Errors</p>
                                        <p className="text-2xl font-bold">{results.results?.errors || 0}</p>
                                    </div>
                                </div>
                                
                                {results.results?.leads?.length > 0 && (
                                    <div>
                                        <h3 className="font-bold mb-2">New Leads</h3>
                                        <div className="max-h-60 overflow-y-auto">
                                            {results.results.leads.slice(0, 5).map((lead: any) => (
                                                <div key={lead.id} className="text-sm border-b py-2">
                                                    <p className="font-medium">{lead.business_name}</p>
                                                    <p className="text-xs text-gray-600">
                                                        Score: {lead.lead_score} • Savings: ${lead.estimated_savings?.toLocaleString()}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}