'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type DocumentOption = {
  id: string;
  label: string;
};

type Props = {
  documentOptions: DocumentOption[];
};

export default function CommodityDocumentArtifactForm({ documentOptions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [documentId, setDocumentId] = useState('');
  const [fileName, setFileName] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [fileSizeBytes, setFileSizeBytes] = useState('');
  const [checksumSha256, setChecksumSha256] = useState('');
  const [sourceType, setSourceType] = useState('url');
  const [documentUrl, setDocumentUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function updateArtifact() {
    setError(null);

    const response = await fetch('/api/commodity/documents/update-artifact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId,
        fileName,
        mimeType,
        fileSizeBytes: fileSizeBytes ? Number(fileSizeBytes) : null,
        checksumSha256,
        sourceType,
        documentUrl,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setError(result.error ?? 'Failed to update document artifact.');
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
      <h3 className="text-lg font-semibold text-white">Document Artifact Details</h3>

      {error ? (
        <div className="rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <select
        value={documentId}
        onChange={(e) => setDocumentId(e.target.value)}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
      >
        <option value="">Select Document</option>
        {documentOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>

      <input
        value={fileName}
        onChange={(e) => setFileName(e.target.value)}
        placeholder="File Name"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
      />

      <input
        value={mimeType}
        onChange={(e) => setMimeType(e.target.value)}
        placeholder="MIME Type"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
      />

      <input
        value={fileSizeBytes}
        onChange={(e) => setFileSizeBytes(e.target.value)}
        placeholder="File Size Bytes"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
      />

      <input
        value={checksumSha256}
        onChange={(e) => setChecksumSha256(e.target.value)}
        placeholder="SHA256 Checksum"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
      />

      <select
        value={sourceType}
        onChange={(e) => setSourceType(e.target.value)}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
      >
        <option value="url">url</option>
        <option value="upload">upload</option>
        <option value="email">email</option>
      </select>

      <input
        value={documentUrl}
        onChange={(e) => setDocumentUrl(e.target.value)}
        placeholder="Document URL"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
      />

      <button
        onClick={updateArtifact}
        disabled={isPending}
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black"
      >
        Save Artifact Metadata
      </button>
    </div>
  );
}