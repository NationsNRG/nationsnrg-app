import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Energy Market Insights | NationsNRG',
    description: 'Expert analysis on energy markets, savings strategies, and industry trends.'
};

export default async function InsightsPage() {
    const { data: insights } = await supabase
        .from('insights')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
                <div className="max-w-7xl mx-auto px-4 py-16">
                    <h1 className="text-5xl font-bold mb-4">Energy Market Insights</h1>
                    <p className="text-xl text-blue-100 max-w-3xl">
                        Expert analysis, market intelligence, and savings strategies from the NationsNRG team.
                    </p>
                </div>
            </div>

            {/* Topics */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex gap-2 flex-wrap">
                    <Link href="/insights" className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm">
                        All
                    </Link>
                    <Link href="/insights?topic=restaurant" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm hover:bg-gray-300">
                        Restaurants
                    </Link>
                    <Link href="/insights?topic=retail" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm hover:bg-gray-300">
                        Retail
                    </Link>
                    <Link href="/insights?topic=manufacturing" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm hover:bg-gray-300">
                        Manufacturing
                    </Link>
                    <Link href="/insights?topic=office" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm hover:bg-gray-300">
                        Office
                    </Link>
                    <Link href="/insights?topic=big-savings" className="bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm hover:bg-gray-300">
                        Big Savings
                    </Link>
                    <Link href="/insights?topic=urgent" className="bg-red-100 text-red-700 px-4 py-2 rounded-full text-sm hover:bg-red-200">
                        Urgent
                    </Link>
                </div>
            </div>

            {/* Insights Grid */}
            <div className="max-w-7xl mx-auto px-4 pb-16">
                <div className="grid md:grid-cols-3 gap-6">
                    {insights?.map(insight => (
                        <article key={insight.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                        {insight.topics?.[1] || 'Energy'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {insight.reading_time} min read
                                    </span>
                                </div>
                                <h2 className="text-xl font-bold mb-2 line-clamp-2">
                                    <Link href={`/insights/${insight.slug}`} className="hover:text-blue-600">
                                        {insight.title}
                                    </Link>
                                </h2>
                                <p className="text-gray-600 mb-4 line-clamp-3">
                                    {insight.excerpt}
                                </p>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center text-sm text-gray-500">
                                        <span>{new Date(insight.published_at).toLocaleDateString()}</span>
                                    </div>
                                    <Link 
                                        href={`/insights/${insight.slug}`}
                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                    >
                                        Read More →
                                    </Link>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </div>
    );
}
