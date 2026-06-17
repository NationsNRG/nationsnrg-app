'use client';

import { useState } from 'react';

type DistributionChannel =
  | 'blog'
  | 'newsletter'
  | 'linkedin'
  | 'twitter'
  | 'youtube'
  | 'short_video'
  | 'email'
  | 'sales_enablement';

interface DistributionResponse {
  success: boolean;
  distribution?: {
    id: string;
    channel: string;
    status: string;
    scheduled_at: string | null;
  };
  error?: string;
}

interface QueueDistributionActionsProps {
  variantId: string;
  currentStatus: string;
}

const CHANNEL_OPTIONS: Array<{ value: DistributionChannel; label: string }> = [
  { value: 'blog', label: 'Blog' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'short_video', label: 'Short Video' },
  { value: 'email', label: 'Email' },
  { value: 'sales_enablement', label: 'Sales Enablement' },
];

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export default function QueueDistributionActions({
  variantId,
  currentStatus,
}: QueueDistributionActionsProps) {
  const [channel, setChannel] = useState<DistributionChannel>('linkedin');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loadingAction, setLoadingAction] = useState<'draft' | 'scheduled' | null>(null);

  const normalizedStatus = normalizeString(currentStatus);
  const canQueue =
    normalizedStatus === 'approved' || normalizedStatus === 'published';

  async function submitDistribution(status: 'draft' | 'scheduled'): Promise<void> {
    try {
      setLoadingAction(status);

      const response = await fetch('/api/insights/pipeline/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId,
          channel,
          status,
          scheduledAt: status === 'scheduled' ? scheduledAt : null,
        }),
      });

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('application/json')) {
        throw new Error(`Distribute route returned non-JSON response (${response.status})`);
      }

      const json = (await response.json()) as DistributionResponse;

      if (!response.ok || !json.success) {
        throw new Error(json.error ?? 'Failed to queue distribution');
      }

      window.alert(
        status === 'scheduled'
          ? 'Distribution scheduled successfully.'
          : 'Distribution queued successfully.'
      );

      window.location.reload();
    } catch (error: unknown) {
      window.alert(
        error instanceof Error ? error.message : 'Failed to queue distribution'
      );
    } finally {
      setLoadingAction(null);
    }
  }

  if (!canQueue) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs text-gray-600">
        Approve or publish this variant before distribution.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Distribution
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr,1fr]">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Channel
          </label>
          <select
            value={channel}
            onChange={(event) => setChannel(event.target.value as DistributionChannel)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
          >
            {CHANNEL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">
            Schedule Time
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void submitDistribution('draft')}
          disabled={loadingAction !== null}
          className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
        >
          {loadingAction === 'draft' ? 'Queueing...' : 'Queue Distribution'}
        </button>

        <button
          type="button"
          onClick={() => void submitDistribution('scheduled')}
          disabled={loadingAction !== null || scheduledAt.trim().length === 0}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {loadingAction === 'scheduled' ? 'Scheduling...' : 'Schedule Distribution'}
        </button>
      </div>
    </div>
  );
}