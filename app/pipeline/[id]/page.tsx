import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/supabase';
import PipelineStageActions from '../../../components/pipeline/PipelineStageActions';
import PricingRequestForm from '../../../components/pipeline/PricingRequestForm';
import QuoteReceivedForm from '../../../components/pipeline/QuoteReceivedForm';
import EnrollmentSubmitForm from '../../../components/pipeline/EnrollmentSubmitForm';
import PipelineCloseForm from '../../../components/pipeline/PipelineCloseForm';
import RebuttalGenerator from '../../../components/pipeline/RebuttalGenerator';
import ProposalGenerator from '../../../components/pipeline/ProposalGenerator';
import PricingExecutionPanel from '../../../components/pipeline/PricingExecutionPanel';
import PricingResultIngestionPanel from '../../../components/pipeline/PricingResultIngestionPanel';
import EnrollmentResultIngestionPanel from '../../../components/pipeline/EnrollmentResultIngestionPanel';
import EnrollmentExecutionPanel from '../../../components/pipeline/EnrollmentExecutionPanel';
import CommunicationBridge from '../../../components/pipeline/CommunicationBridge';
import PricingExecutionWorkflowCard from '../../../components/pipeline/PricingExecutionWorkflowCard';
import EnrollmentExecutionWorkflowCard from '../../../components/pipeline/EnrollmentExecutionWorkflowCard';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ActivityEntry = {
  id?: string;
  kind?: string;
  message?: string;
  payload?: Json;
  createdAt?: string;
};

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

function formatMoney(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRate(value: number | null | undefined, unit: string | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '—';
  }

  return `${value}${unit ? ` ${unit}` : ''}`;
}

function isJsonObject(value: Json | null | undefined): value is Record<string, Json | undefined> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getActivityEntries(metadata: Json | null | undefined): ActivityEntry[] {
  if (!isJsonObject(metadata)) {
    return [];
  }

  const activity = metadata.activity;
  if (!Array.isArray(activity)) {
    return [];
  }

  return activity
    .filter((entry): entry is Record<string, Json | undefined> => {
      return typeof entry === 'object' && entry !== null && !Array.isArray(entry);
    })
    .map((entry) => ({
      id: typeof entry.id === 'string' ? entry.id : undefined,
      kind: typeof entry.kind === 'string' ? entry.kind : undefined,
      message: typeof entry.message === 'string' ? entry.message : undefined,
      payload: entry.payload,
      createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : undefined,
    }))
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
}

export default async function PipelineDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = getSupabase();

  const [
    pipelineResult,
    pricingRequestsResult,
    pricingQuotesResult,
    enrollmentsResult,
    contractOutcomeResult,
    pricingExecutionsResult,
    enrollmentExecutionsResult,
    communicationsResult,
  ] = await Promise.all([
    supabase.from('deal_pipeline').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('pricing_requests')
      .select('*')
      .eq('pipeline_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('pricing_quotes')
      .select('*')
      .eq('pipeline_id', id)
      .order('received_at', { ascending: false }),
    supabase
      .from('enrollment_attempts')
      .select('*')
      .eq('pipeline_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('contract_outcomes')
      .select('*')
      .eq('pipeline_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('pricing_request_executions')
      .select('*')
      .eq('pipeline_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('enrollment_executions')
      .select('*')
      .eq('pipeline_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('pipeline_communications')
      .select('*')
  .eq('pipeline_id', id)
  .order('created_at', { ascending: false }),

  ]);

  if (pipelineResult.error) {
    throw new Error(`Failed to load pipeline: ${pipelineResult.error.message}`);
  }

  if (!pipelineResult.data) {
    notFound();
  }

  if (pricingRequestsResult.error) {
    throw new Error(`Failed to load pricing requests: ${pricingRequestsResult.error.message}`);
  }

  if (pricingQuotesResult.error) {
    throw new Error(`Failed to load pricing quotes: ${pricingQuotesResult.error.message}`);
  }

  if (enrollmentsResult.error) {
    throw new Error(`Failed to load enrollments: ${enrollmentsResult.error.message}`);
  }

  if (contractOutcomeResult.error) {
    throw new Error(`Failed to load contract outcome: ${contractOutcomeResult.error.message}`);
  }

    if (pricingExecutionsResult.error) {
    throw new Error(`Failed to load pricing executions: ${pricingExecutionsResult.error.message}`);
  }

  if (enrollmentExecutionsResult.error) {
    throw new Error(`Failed to load enrollment executions: ${enrollmentExecutionsResult.error.message}`);
  }

  if (communicationsResult.error) {
    throw new Error(`Failed to load communications: ${communicationsResult.error.message}`);
  }

  const pipeline = pipelineResult.data;
  const pricingRequests = pricingRequestsResult.data ?? [];
  const pricingQuotes = pricingQuotesResult.data ?? [];
  const enrollmentAttempts = enrollmentsResult.data ?? [];
  const contractOutcome = contractOutcomeResult.data;
  const pricingExecutions = pricingExecutionsResult.data ?? [];
  const enrollmentExecutions = enrollmentExecutionsResult.data ?? [];
  const communications = communicationsResult.data ?? [];

  const hasQuotes = pricingQuotes.length > 0;
  const hasAcceptedEnrollment = enrollmentAttempts.some(
    (attempt) => attempt.status === 'accepted',
  );
  const hasPendingEnrollment = enrollmentAttempts.some(
    (attempt) =>
      attempt.status === 'submitted' ||
      attempt.status === 'pending' ||
      attempt.status === 'in_review',
  );

  const isClosed = pipeline.stage === 'won' || pipeline.stage === 'lost';
  const activityEntries = getActivityEntries(pipeline.metadata);

  const pricingRequestOptions = pricingRequests.map((request) => ({
    id: request.id,
    label: [
      request.supplier_name ?? 'Unknown Supplier',
      request.status,
      request.requested_term_months != null ? `${request.requested_term_months} mo` : null,
      pipeline.account_number ?? null,
    ]
      .filter(Boolean)
      .join(' • '),
  }));

  const pricingExecutionOptions = pricingExecutions.map((execution) => ({
  id: execution.id,
  label: [
    execution.execution_status,
    execution.send_method ?? null,
    execution.external_reference ?? null,
    formatDate(execution.created_at),
  ]
    .filter(Boolean)
    .join(' • '),
  }));

  const enrollmentExecutionOptions = enrollmentExecutions.map((execution) => ({
  id: execution.id,
  label: [
    execution.execution_status,
    execution.send_method ?? null,
    execution.external_reference ?? null,
    formatDate(execution.created_at),
  ]
    .filter(Boolean)
    .join(' • '),
  }));

  const quoteOptions = pricingQuotes.map((quote) => ({
    id: quote.id,
    label: [
      quote.supplier_name,
      formatRate(quote.rate, quote.rate_unit),
      quote.term_months != null ? `${quote.term_months} mo` : null,
      pipeline.account_number ?? null,
    ]
      .filter(Boolean)
      .join(' • '),
  }));

  const enrollmentOptions = enrollmentAttempts.map((attempt) => ({
    id: attempt.id,
    label: [
      attempt.supplier_name,
      attempt.status,
      attempt.external_enrollment_id ?? null,
      formatDate(attempt.created_at),
    ]
      .filter(Boolean)
      .join(' • '),
  }));

  return (
    <div className="min-h-screen bg-black px-6 py-8 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="text-sm text-zinc-500">{pipeline.id}</div>
              <h1 className="text-3xl font-semibold text-white">{pipeline.deal_name}</h1>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs uppercase tracking-wide text-zinc-200">
                  {pipeline.stage}
                </span>
                {pipeline.commodity ? (
                  <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs uppercase tracking-wide text-zinc-200">
                    {pipeline.commodity}
                  </span>
                ) : null}
              </div>
              <p className="max-w-3xl text-sm text-zinc-400">
                {pipeline.notes ?? 'No notes recorded yet.'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                <div className="text-xs text-zinc-500">Customer</div>
                <div className="mt-1 text-sm text-white">{pipeline.customer_name ?? '—'}</div>
                <div className="mt-1 text-xs text-zinc-400">{pipeline.customer_email ?? '—'}</div>
                <div className="mt-1 text-xs text-zinc-400">{pipeline.customer_phone ?? '—'}</div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                <div className="text-xs text-zinc-500">Service / Account</div>
                <div className="mt-1 text-sm text-white">{pipeline.utility_name ?? '—'}</div>
                <div className="mt-1 text-xs text-zinc-400">{pipeline.account_number ?? '—'}</div>
                <div className="mt-1 text-xs text-zinc-400">{pipeline.service_address ?? '—'}</div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                <div className="text-xs text-zinc-500">Usage</div>
                <div className="mt-1 text-sm text-white">
                  {pipeline.annual_usage_kwh != null
                    ? `${pipeline.annual_usage_kwh.toLocaleString()} kWh`
                    : pipeline.annual_usage_therms != null
                      ? `${pipeline.annual_usage_therms.toLocaleString()} therms`
                      : '—'}
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  Supplier: {pipeline.supplier_name ?? '—'}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                <div className="text-xs text-zinc-500">Lifecycle</div>
                <div className="mt-1 text-sm text-white">
                  Created: {formatDate(pipeline.created_at)}
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  Updated: {formatDate(pipeline.updated_at)}
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  Closed: {formatDate(pipeline.closed_at)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {isClosed ? (
          <div className="rounded-2xl border border-amber-900 bg-amber-950/40 px-5 py-4 text-sm text-amber-200">
            This pipeline is closed and read-only. Historical information remains visible for
            audit and review.
          </div>
        ) : null}

        <PipelineStageActions
          pipelineId={pipeline.id}
          currentStage={pipeline.stage}
          isClosed={isClosed}
        />

        <div className="grid gap-6 xl:grid-cols-2">
          <PricingRequestForm
            pipelineId={pipeline.id}
            defaultSupplierName={pipeline.supplier_name}
            defaultUtilityName={pipeline.utility_name}
            defaultCommodity={pipeline.commodity}
            isClosed={isClosed}
          />

          <QuoteReceivedForm
            pipelineId={pipeline.id}
            pricingRequests={pricingRequestOptions}
            defaultSupplierName={pipeline.supplier_name}
            defaultUtilityName={pipeline.utility_name}
            defaultCommodity={pipeline.commodity}
            isClosed={isClosed}
          />

          <EnrollmentSubmitForm
            pipelineId={pipeline.id}
            quoteOptions={quoteOptions}
            defaultSupplierName={pipeline.supplier_name}
            isClosed={isClosed}
          />

          <PipelineCloseForm
            pipelineId={pipeline.id}
            quoteOptions={quoteOptions}
            enrollmentOptions={enrollmentOptions}
            defaultSupplierName={pipeline.supplier_name}
            defaultUtilityName={pipeline.utility_name}
            defaultCommodity={pipeline.commodity}
            isClosed={isClosed}
          />
        </div>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Quote Comparison</h2>
            <p className="text-sm text-zinc-400">
              Compare returned pricing and confirm which quote is selected for the pipeline.
            </p>
          </div>

          {pricingQuotes.length === 0 ? (
            <div className="text-sm text-zinc-400">No pricing quotes recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-zinc-900/80">
                  <tr className="text-left text-sm text-zinc-300">
                    <th className="px-4 py-3 font-medium">Supplier</th>
                    <th className="px-4 py-3 font-medium">Rate</th>
                    <th className="px-4 py-3 font-medium">Term</th>
                    <th className="px-4 py-3 font-medium">Annual Savings</th>
                    <th className="px-4 py-3 font-medium">Commission</th>
                    <th className="px-4 py-3 font-medium">Valid Until</th>
                    <th className="px-4 py-3 font-medium">Selection</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingQuotes.map((quote) => {
                    const isSelected = quote.status === 'selected';

                    return (
                      <tr
                        key={quote.id}
                        className={`border-t border-zinc-800 text-sm ${
                          isSelected ? 'bg-emerald-950/20' : 'bg-transparent'
                        }`}
                      >
                        <td className="px-4 py-3 text-zinc-100">{quote.supplier_name}</td>
                        <td className="px-4 py-3 text-zinc-200">
                          {formatRate(quote.rate, quote.rate_unit)}
                        </td>
                        <td className="px-4 py-3 text-zinc-200">
                          {quote.term_months != null ? `${quote.term_months} mo` : '—'}
                        </td>
                        <td className="px-4 py-3 text-zinc-200">
                          {formatMoney(quote.estimated_annual_savings)}
                        </td>
                        <td className="px-4 py-3 text-zinc-200">
                          {formatMoney(quote.commission_estimate)}
                        </td>
                        <td className="px-4 py-3 text-zinc-200">
                          {formatDate(quote.valid_until)}
                        </td>
                        <td className="px-4 py-3">
                          {isSelected ? (
                            <span className="rounded-full border border-emerald-800 bg-emerald-950/60 px-2 py-1 text-xs font-medium uppercase tracking-wide text-emerald-200">
                              Selected
                            </span>
                          ) : (
                            <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs uppercase tracking-wide text-zinc-400">
                              Not Selected
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <ProposalGenerator pipelineId={pipeline.id} isClosed={isClosed} />

        <RebuttalGenerator pipelineId={pipeline.id} isClosed={isClosed} />

        <CommunicationBridge
          pipelineId={pipeline.id}
          isClosed={isClosed}
          communications={communications}
        />

        <PricingExecutionPanel
          pipelineId={pipeline.id}
          isClosed={isClosed}
          pricingRequestOptions={pricingRequestOptions}
          executions={pricingExecutions}
        />

        <PricingExecutionWorkflowCard
          providerLabel={pricingExecutions[0]?.send_method ?? null}
          lastMessage={communications[0]?.subject ?? null}
          launchUrl={null}
          hasExecutions={pricingExecutions.length > 0}
          hasQuotes={hasQuotes}
        />

        <PricingResultIngestionPanel
          pipelineId={pipeline.id}
          pricingRequestOptions={pricingRequestOptions}
          pricingExecutionOptions={pricingExecutionOptions}
          isClosed={isClosed}
        />

        <EnrollmentExecutionPanel
          pipelineId={pipeline.id}
          isClosed={isClosed}
          enrollmentOptions={enrollmentOptions}
          executions={enrollmentExecutions}
        />

        <EnrollmentExecutionWorkflowCard
          providerLabel={enrollmentExecutions[0]?.send_method ?? null}
          lastMessage={communications[0]?.subject ?? null}
          launchUrl={null}
          hasExecutions={enrollmentExecutions.length > 0}
          hasAcceptedResult={hasAcceptedEnrollment}
        />

        <EnrollmentResultIngestionPanel
          pipelineId={pipeline.id}
          enrollmentOptions={enrollmentOptions}
          enrollmentExecutionOptions={enrollmentExecutionOptions}
          isClosed={isClosed}
        />

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 xl:col-span-1">
            <div className="border-b border-zinc-800 px-5 py-4">
              <h2 className="text-lg font-semibold text-white">Pricing Requests</h2>
            </div>
            <div className="divide-y divide-zinc-800">
              {pricingRequests.length === 0 ? (
                <div className="px-5 py-6 text-sm text-zinc-400">No pricing requests yet.</div>
              ) : (
                pricingRequests.map((request) => (
                  <div key={request.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-white">
                        {request.supplier_name ?? 'Unknown Supplier'}
                      </div>
                      <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs uppercase tracking-wide text-zinc-300">
                        {request.status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-zinc-400">
                      Utility: {request.utility_name ?? '—'} • Commodity:{' '}
                      {request.commodity ?? '—'}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      Term: {request.requested_term_months ?? '—'} • Usage:{' '}
                      {request.requested_usage ?? '—'}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Created: {formatDate(request.created_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 xl:col-span-1">
            <div className="border-b border-zinc-800 px-5 py-4">
              <h2 className="text-lg font-semibold text-white">Pricing Quotes</h2>
            </div>
            <div className="divide-y divide-zinc-800">
              {pricingQuotes.length === 0 ? (
                <div className="px-5 py-6 text-sm text-zinc-400">No pricing quotes yet.</div>
              ) : (
                pricingQuotes.map((quote) => (
                  <div key={quote.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-white">{quote.supplier_name}</div>
                        {quote.status === 'selected' ? (
                          <span className="rounded-full border border-emerald-800 bg-emerald-950/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-200">
                            Selected
                          </span>
                        ) : null}
                      </div>
                      <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs uppercase tracking-wide text-zinc-300">
                        {quote.status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-zinc-400">
                      Rate: {formatRate(quote.rate, quote.rate_unit)} • Term:{' '}
                      {quote.term_months ?? '—'}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      Annual Savings: {formatMoney(quote.estimated_annual_savings)} • Commission:{' '}
                      {formatMoney(quote.commission_estimate)}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Valid Until: {formatDate(quote.valid_until)} • Received:{' '}
                      {formatDate(quote.received_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 xl:col-span-1">
            <div className="border-b border-zinc-800 px-5 py-4">
              <h2 className="text-lg font-semibold text-white">Enrollment Attempts</h2>
            </div>
            <div className="divide-y divide-zinc-800">
              {enrollmentAttempts.length === 0 ? (
                <div className="px-5 py-6 text-sm text-zinc-400">No enrollment attempts yet.</div>
              ) : (
                enrollmentAttempts.map((attempt) => (
                  <div key={attempt.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-white">{attempt.supplier_name}</div>
                      <span className="rounded-full border border-zinc-700 px-2 py-1 text-xs uppercase tracking-wide text-zinc-300">
                        {attempt.status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-zinc-400">
                      External ID: {attempt.external_enrollment_id ?? '—'}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      Failure: {attempt.failure_reason ?? '—'}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Submitted: {formatDate(attempt.submitted_at)} • Created:{' '}
                      {formatDate(attempt.created_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Contract Outcome</h2>
            <p className="text-sm text-zinc-400">Final outcome record for this pipeline.</p>
          </div>

          {contractOutcome ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                <div className="text-xs text-zinc-500">Status</div>
                <div className="mt-1 text-sm text-white">{contractOutcome.status}</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                <div className="text-xs text-zinc-500">Contract Rate</div>
                <div className="mt-1 text-sm text-white">
                  {formatRate(contractOutcome.contract_rate, contractOutcome.contract_rate_unit)}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                <div className="text-xs text-zinc-500">Annual Savings</div>
                <div className="mt-1 text-sm text-white">
                  {formatMoney(contractOutcome.estimated_annual_savings)}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                <div className="text-xs text-zinc-500">Realized Commission</div>
                <div className="mt-1 text-sm text-white">
                  {formatMoney(contractOutcome.realized_commission)}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 md:col-span-2 xl:col-span-4">
                <div className="text-xs text-zinc-500">Closed Reason</div>
                <div className="mt-1 text-sm text-white">
                  {contractOutcome.closed_reason ?? '—'}
                </div>
                <div className="mt-2 text-xs text-zinc-400">{contractOutcome.notes ?? '—'}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-400">No contract outcome recorded yet.</div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Activity Timeline</h2>
            <p className="text-sm text-zinc-400">Recent pipeline activity and workflow events.</p>
          </div>

          {activityEntries.length === 0 ? (
            <div className="text-sm text-zinc-400">No activity has been logged yet.</div>
          ) : (
            <div className="space-y-3">
              {activityEntries.map((entry, index) => (
                <div
                  key={entry.id ?? `${entry.kind ?? 'activity'}-${index}`}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-medium text-white">
                      {entry.message ?? entry.kind ?? 'Activity event'}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {formatDate(entry.createdAt ?? null)}
                    </div>
                  </div>
                  {entry.kind ? (
                    <div className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                      {entry.kind.replaceAll('_', ' ')}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}