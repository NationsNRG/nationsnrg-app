'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  dealId: string;
};

export default function CommodityDocumentForm({ dealId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [documentType, setDocumentType] = useState('ICPO');
  const [documentUrl, setDocumentUrl] = useState('');
  const [uploadedBy, setUploadedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function createDocument() {
    setError(null);

    const response = await fetch('/api/commodity/documents/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealId,
        documentType,
        documentUrl,
        uploadedBy,
        notes,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? 'Failed to create document.');
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
      <h3 className="text-lg font-semibold text-white">Add Document</h3>

      {error ? (
        <div className="rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <select
        value={documentType}
        onChange={(e) => setDocumentType(e.target.value)}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
      >
        <option value="SCO">SCO</option>
        <option value="FCO">FCO</option>
        <option value="ICPO">ICPO</option>
        <option value="BCL">BCL</option>
        <option value="POP">POP</option>
      </select>

      <input
        value={documentUrl}
        onChange={(e) => setDocumentUrl(e.target.value)}
        placeholder="Document URL"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
      />

      <input
        value={uploadedBy}
        onChange={(e) => setUploadedBy(e.target.value)}
        placeholder="Uploaded By"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
      />

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
      />

      <button
        onClick={createDocument}
        disabled={isPending}
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
      >
        Save Document
      </button>
    </div>
  );
}