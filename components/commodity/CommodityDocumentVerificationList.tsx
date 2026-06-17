'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type CommodityDocument = {
  id: string;
  document_type: string;
  document_url: string | null;
  uploaded_by: string | null;
  verified: boolean | null;
  notes: string | null;
  created_at: string | null;
};

type Props = {
  documents: CommodityDocument[];
};

export default function CommodityDocumentVerificationList({ documents }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function updateVerification(documentId: string, verified: boolean) {
    setError(null);

    const response = await fetch('/api/commodity/documents/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId, verified }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? 'Failed to update document verification.');
      return;
    }

    startTransition(() => router.refresh());
  }

  if (documents.length === 0) {
    return <div className="text-sm text-zinc-400">No documents yet.</div>;
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {documents.map((document) => (
        <div
          key={document.id}
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm text-white">
                {document.document_type} • {document.verified ? 'verified' : 'unverified'}
              </div>
              <div className="mt-1 text-xs text-zinc-400">
                URL: {document.document_url ?? '—'}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                Uploaded by: {document.uploaded_by ?? '—'}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => updateVerification(document.id, true)}
                disabled={isPending}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
              >
                Mark Verified
              </button>
              <button
                onClick={() => updateVerification(document.id, false)}
                disabled={isPending}
                className="rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white"
              >
                Mark Unverified
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}