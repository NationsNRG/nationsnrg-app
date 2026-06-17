import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function InsightPage({ params }: { params: { slug: string } }) {
    const { data: insight } = await supabase
        .from('insights')
        .select('*')
        .eq('slug', params.slug)
        .single();

    if (!insight) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <article className="max-w-3xl mx-auto px-4 py-12">
                <Link href="/insights" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
                    ← Back to Insights
                </Link>
                <h1 className="text-4xl font-bold mb-4">{insight.title}</h1>
                <div className="prose prose-lg max-w-none" 
                     dangerouslySetInnerHTML={{ __html: insight.content }} />
            </article>
        </div>
    );
}