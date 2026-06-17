'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Option = {
  id: string;
  label: string;
};

type Execution = {
  id: string;
  execution_status: string;
  send_method: string | null;
  external_reference: string | null;
  created_at: string;
};

type Props = {
  pipelineId: string;
  isClosed: boolean;
  pricingRequestOptions: Option[];
  executions: Execution[];
};

const PROVIDERS = [
  { key: 'manual_generic', label: 'Manual Execution' },
  { key: 'box_widget', label: 'BOX Widget' },
  { key: 'box_api', label: 'BOX API (Reserved)' },
] as const;

type IntegrationUi = {
  action?: string;
  url?: string | null;
  message?: string | null;
};

export default function PricingExecutionPanel({
  pipelineId,
  isClosed,
  pricingRequestOptions,
  executions,
}: Props) {
  const router = useRouter();

  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [selectedExecutionId, setSelectedExecutionId] = useState('');
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]['key']>('manual_generic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [launchUrl, setLaunchUrl] = useState<string | null>(null);

  const hasRequests = pricingRequestOptions.length > 0;

  const executionOptions = useMemo(
    () =>
      executions.map((execution) => ({
        id: execution.id,
        label: [
          execution.execution_status,
          execution.send_method ?? null,
          execution.external_reference ?? null,
        ]
          .filter(Boolean)
          .join(' • '),
      })),
    [executions],
  );

  async function startIntegration() {
    if (!selectedRequestId) {
      setError('Select a pricing request first.');
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);
    setLaunchUrl(null);

    try {
      const res = await fetch('/api/integrations/pricing/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pipelineId,
          pricingRequestId: selectedRequestId,
          pricingExecutionId: selectedExecutionId || null,
          providerKey: provider,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        ui?: IntegrationUi;
      };

      if (!res.ok) {
        setError(data.error ?? 'Failed to start pricing integration.');
        return;
      }

      const ui = data.ui;
      const message = ui?.message ?? 'Pricing integration started.';
      setInfo(message);

      if (ui?.action === 'open_url' && ui.url) {
        setLaunchUrl(ui.url);
        window.open(ui.url, '_blank', 'noopener,noreferrer');
      } else if (ui?.action === 'manual_instruction') {
        setLaunchUrl(null);
      }

      router.refresh();
    } catch (integrationError) {
      console.error(integrationError);
      setError('Unexpected error starting pricing integration.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
      <div>
        <h3 className="text-white font-semibold text-lg">Pricing Execution</h3>
        <p className="text-zinc-400 text-sm">
          Start supplier pricing workflows and track execution context.
        </p>
      </div>

      {isClosed ? (
        <div className="rounded-xl border border-amber-900 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          Pipeline is closed. Execution is read-only.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="rounded-xl border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {info}
        </div>
      ) : null}

      {!hasRequests ? (
        <div className="text-zinc-400 text-sm">
          Create a pricing request first.
        </div>
      ) : (
        <>
          <select
            value={selectedRequestId}
            onChange={(e) => setSelectedRequestId(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm"
            disabled={isClosed}
          >
            <option value="">Select Pricing Request</option>
            {pricingRequestOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={selectedExecutionId}
            onChange={(e) => setSelectedExecutionId(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm"
            disabled={isClosed}
          >
            <option value="">Optional: Link Pricing Execution</option>
            {executionOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={provider}
            onChange={(e) =>
              setProvider(e.target.value as (typeof PROVIDERS)[number]['key'])
            }
            className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm"
            disabled={isClosed}
          >
            {PROVIDERS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>

          <button
            onClick={startIntegration}
            disabled={isClosed || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded text-sm disabled:opacity-50"
          >
            {loading ? 'Starting...' : 'Start Pricing Execution'}
          </button>

          {launchUrl ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm">
              <div className="text-zinc-300 mb-1">Launch URL ready</div>
              <div className="break-all text-zinc-400 text-xs">{launchUrl}</div>
            </div>
          ) : null}
        </>
      )}

      <div className="space-y-2">
        {executions.map((execution) => (
          <div
            key={execution.id}
            className="border border-zinc-800 rounded p-3 text-sm text-white"
          >
            <div>
              Status: {execution.execution_status}
            </div>
            <div>
              Method: {execution.send_method ?? '—'}
            </div>
            <div>
              Ref: {execution.external_reference ?? '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}