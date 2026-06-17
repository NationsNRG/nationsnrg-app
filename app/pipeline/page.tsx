import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import type { Database } from '@/types/supabase';
import PipelineCreateForm from '../../components/pipeline/PipelineCreateForm';

export const dynamic = 'force-dynamic';

type PipelineRow = Database['public']['Tables']['deal_pipeline']['Row'];

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
}

function formatUsage(pipeline: PipelineRow): string {
  if (pipeline.annual_usage_kwh != null) {
    return `${pipeline.annual_usage_kwh.toLocaleString()} kWh`;
  }

  if (pipeline.annual_usage_therms != null) {
    return `${pipeline.annual_usage_therms.toLocaleString()} therms`;
  }

  return '—';
}

function isClosedStage(stage: PipelineRow['stage']): boolean {
  return stage === 'won' || stage === 'lost';
}

function getStageTone(stage: PipelineRow['stage']): string {
  switch (stage) {
    case 'won':
      return 'border-emerald-800 bg-emerald-950/50 text-emerald-200';
    case 'lost':
      return 'border-red-800 bg-red-950/50 text-red-200';
    case 'enrollment_submitted':
      return 'border-sky-800 bg-sky-950/50 text-sky-200';
    case 'quoted':
      return 'border-violet-800 bg-violet-950/50 text-violet-200';
    case 'pricing_requested':
      return 'border-amber-800 bg-amber-950/50 text-amber-200';
    case 'qualified':
      return 'border-blue-800 bg-blue-950/50 text-blue-200';
    default:
      return 'border-zinc-700 bg-zinc-900 text-zinc-200';
  }
}

export default async function PipelinePage() {
  const supabase = getSupabase();

  const pipelineResult = await supabase
    .from('deal_pipeline')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (pipelineResult.error) {
    throw new Error(`Failed to load pipelines: ${pipelineResult.error.message}`);
  }

  const pipelines = pipelineResult.data ?? [];

  const openPipelines = pipelines.filter((pipeline) => !isClosedStage(pipeline.stage));
  const closedPipelines = pipelines.filter((pipeline) => isClosedStage(pipeline.stage));
  const wonPipelines = pipelines.filter((pipeline) => pipeline.stage === 'won');
  const lostPipelines = pipelines.filter((pipeline) => pipeline.stage === 'lost');

  return (
    <div className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Pipeline</h1>
          <p className="text-sm text-zinc-400">
            Manage deal execution from qualification through quote, enrollment, and close.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="text-sm text-zinc-400">Total Pipelines</div>
            <div className="mt-2 text-3xl font-semibold text-white">{pipelines.length}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="text-sm text-zinc-400">Open Pipelines</div>
            <div className="mt-2 text-3xl font-semibold text-white">{openPipelines.length}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="text-sm text-zinc-400">Won Pipelines</div>
            <div className="mt-2 text-3xl font-semibold text-white">{wonPipelines.length}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="text-sm text-zinc-400">Lost Pipelines</div>
            <div className="mt-2 text-3xl font-semibold text-white">{lostPipelines.length}</div>
          </div>
        </div>

        <PipelineCreateForm />

        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          <div className="flex flex-col gap-2 border-b border-zinc-800 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Deal Desk</h2>
              <p className="text-sm text-zinc-400">
                Open and closed opportunities, ordered by most recent activity.
              </p>
            </div>
            <div className="text-xs text-zinc-500">
              Open: {openPipelines.length} • Closed: {closedPipelines.length}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-zinc-900/80">
                <tr className="text-left text-sm text-zinc-300">
                  <th className="px-4 py-3 font-medium">Deal</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Commodity</th>
                  <th className="px-4 py-3 font-medium">Supplier / Utility</th>
                  <th className="px-4 py-3 font-medium">Usage</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Closed</th>
                </tr>
              </thead>
              <tbody>
                {pipelines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-zinc-400">
                      No pipelines found yet.
                    </td>
                  </tr>
                ) : (
                  pipelines.map((pipeline) => {
                    const closed = isClosedStage(pipeline.stage);

                    return (
                      <tr
                        key={pipeline.id}
                        className={`border-t border-zinc-800 text-sm ${
                          closed ? 'bg-zinc-950/70' : 'bg-transparent'
                        }`}
                      >
                        <td className="px-4 py-3 align-top">
                          <Link
                            href={`/pipeline/${pipeline.id}`}
                            className="font-medium text-white hover:underline"
                          >
                            {pipeline.deal_name}
                          </Link>
                          <div className="mt-1 text-xs text-zinc-500">{pipeline.id}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-zinc-100">{pipeline.customer_name ?? '—'}</div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {pipeline.customer_email ?? pipeline.customer_phone ?? '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`rounded-full border px-2 py-1 text-xs uppercase tracking-wide ${getStageTone(
                              pipeline.stage,
                            )}`}
                          >
                            {pipeline.stage}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-zinc-200">
                          {pipeline.commodity ?? '—'}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-zinc-100">{pipeline.supplier_name ?? '—'}</div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {pipeline.utility_name ?? '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-zinc-200">{formatUsage(pipeline)}</td>
                        <td className="px-4 py-3 align-top text-zinc-200">
                          {formatDate(pipeline.created_at)}
                        </td>
                        <td className="px-4 py-3 align-top text-zinc-200">
                          {formatDate(pipeline.closed_at)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}