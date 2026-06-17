'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type CommunicationRow = {
  id: string;
  communication_type: string;
  subject: string;
  body: string;
  status: string;
  recipient_email: string | null;
  created_at: string;
};

type Props = {
  pipelineId: string;
  isClosed: boolean;
  communications: CommunicationRow[];
};

const TYPES = [
  'pricing_request_email',
  'proposal_email',
  'rebuttal_follow_up_email',
  'enrollment_submission_email',
  'general_follow_up_email',
];

export default function CommunicationBridge({
  pipelineId,
  isClosed,
  communications,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [type, setType] = useState<string>('proposal_email');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/pipeline/communication/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipelineId,
          communicationType: type,
          recipientName,
          recipientEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to generate.');
        return;
      }

      setSelectedId(data.communication.id);
      setSubject(data.communication.subject);
      setBody(data.communication.body);

      startTransition(() => router.refresh());
    } catch {
      setError('Unexpected error.');
    } finally {
      setLoading(false);
    }
  }

  async function markReady(markAsSent = false) {
    if (!selectedId) return;

    const res = await fetch('/api/pipeline/communication/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        communicationId: selectedId,
        subject,
        body,
        markAsSent,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Failed.');
      return;
    }

    startTransition(() => router.refresh());
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
      <div>
        <h3 className="text-white font-semibold text-lg">Communication Bridge</h3>
        <p className="text-zinc-400 text-sm">
          Generate, edit, and send messages directly from the pipeline.
        </p>
      </div>

      {isClosed && (
        <div className="text-amber-400 text-sm">
          Pipeline is closed (generation optional, history available).
        </div>
      )}

      {error && <div className="text-red-400 text-sm">{error}</div>}

      <div className="grid gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <input
          placeholder="Recipient Name"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm"
        />

        <input
          placeholder="Recipient Email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm"
        />

        <button
          onClick={generate}
          disabled={loading}
          className="bg-white text-black px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate'}
        </button>
      </div>

      {selectedId && (
        <div className="space-y-2">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm"
          />

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm"
          />

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => copy(subject)}
              className="px-3 py-1 bg-zinc-800 text-white text-xs rounded"
            >
              Copy Subject
            </button>

            <button
              onClick={() => copy(body)}
              className="px-3 py-1 bg-zinc-800 text-white text-xs rounded"
            >
              Copy Body
            </button>

            <button
              onClick={() => markReady(false)}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded"
            >
              Save as Ready
            </button>

            <button
              onClick={() => markReady(true)}
              className="px-3 py-1 bg-green-600 text-white text-xs rounded"
            >
              Mark Sent
            </button>
          </div>
        </div>
      )}

      {communications.length > 0 && (
        <div className="space-y-2 mt-4">
          {communications.map((c) => (
            <div
              key={c.id}
              className="border border-zinc-800 rounded p-3 text-sm text-white"
            >
              <div className="font-medium">{c.communication_type}</div>
              <div className="text-zinc-400 text-xs">{c.recipient_email}</div>
              <div className="text-zinc-500 text-xs">{c.status}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}