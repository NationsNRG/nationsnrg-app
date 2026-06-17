'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Option = {
  id: string;
  label: string;
};

type ExecutionOption = {
  id: string;
  label: string;
};

type Props = {
  pipelineId: string;
  enrollmentOptions: Option[];
  enrollmentExecutionOptions: ExecutionOption[];
  isClosed: boolean;
};

export default function EnrollmentResultIngestionPanel({
  pipelineId,
  enrollmentOptions,
  enrollmentExecutionOptions,
  isClosed,
}: Props) {
  const router = useRouter();

  const [enrollmentAttemptId, setEnrollmentAttemptId] = useState('');
  const [enrollmentExecutionId, setEnrollmentExecutionId] = useState('');
  const [payload, setPayload] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ingestResult() {
    if (!enrollmentAttemptId) {
      setError('Select an enrollment attempt');
      return;
    }

    if (!payload) {
      setError('Paste an enrollment result payload');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(payload);
    } catch {
      setError('Invalid JSON payload');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/integrations/enrollment/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipelineId,
          enrollmentAttemptId,
          enrollmentExecutionId: enrollmentExecutionId || null,
          response: parsed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to ingest enrollment result');
        return;
      }

      alert('Enrollment result ingested');
      router.refresh();
      setPayload('');
    } catch (err) {
      console.error(err);
      setError('Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
      <h3 className="text-white font-semibold text-lg">
        Enrollment Result Ingestion
      </h3>

      {error && (
        <div className="text-red-400 text-sm">
          {error}
        </div>
      )}

      {enrollmentOptions.length === 0 ? (
        <div className="text-zinc-400 text-sm">
          Submit an enrollment first.
        </div>
      ) : (
        <>
          <select
            value={enrollmentAttemptId}
            onChange={(e) => setEnrollmentAttemptId(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm"
            disabled={isClosed}
          >
            <option value="">Select Enrollment Attempt</option>
            {enrollmentOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={enrollmentExecutionId}
            onChange={(e) => setEnrollmentExecutionId(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm"
            disabled={isClosed}
          >
            <option value="">Optional: Link Enrollment Execution</option>
            {enrollmentExecutionOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>

          <textarea
            placeholder="Paste NormalizedEnrollmentResponse JSON here..."
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            rows={8}
            className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm font-mono"
            disabled={isClosed}
          />

          <button
            onClick={ingestResult}
            disabled={isClosed || loading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm"
          >
            {loading ? 'Ingesting...' : 'Ingest Enrollment Result'}
          </button>
        </>
      )}
    </div>
  );
}