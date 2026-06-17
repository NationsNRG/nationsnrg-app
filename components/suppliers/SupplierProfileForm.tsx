'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  supplierId?: string;
  initial?: {
    supplier_name: string;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    portal_status: string;
    notes: string | null;
  };
};

export default function SupplierProfileForm({ supplierId, initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [supplierName, setSupplierName] = useState(initial?.supplier_name ?? '');
  const [contactName, setContactName] = useState(initial?.contact_name ?? '');
  const [contactEmail, setContactEmail] = useState(initial?.contact_email ?? '');
  const [contactPhone, setContactPhone] = useState(initial?.contact_phone ?? '');
  const [status, setStatus] = useState(initial?.portal_status ?? 'active');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!supplierName.trim()) {
      setError('Supplier name required');
      return;
    }

    setError(null);

    const res = await fetch('/api/suppliers/profile', {
      method: supplierId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId,
        supplierName,
        contactName,
        contactEmail,
        contactPhone,
        status,
        notes,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'Failed to save supplier');
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
      <h3 className="text-white font-semibold text-lg">Supplier Profile</h3>

      {error && <div className="text-red-400 text-sm">{error}</div>}

      <input
        placeholder="Supplier Name"
        value={supplierName}
        onChange={(e) => setSupplierName(e.target.value)}
        className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm w-full"
      />

      <input
        placeholder="Contact Name"
        value={contactName}
        onChange={(e) => setContactName(e.target.value)}
        className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm w-full"
      />

      <input
        placeholder="Contact Email"
        value={contactEmail}
        onChange={(e) => setContactEmail(e.target.value)}
        className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm w-full"
      />

      <input
        placeholder="Contact Phone"
        value={contactPhone}
        onChange={(e) => setContactPhone(e.target.value)}
        className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm w-full"
      />

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm w-full"
      >
        <option value="active">active</option>
        <option value="inactive">inactive</option>
        <option value="testing">testing</option>
        <option value="pending">pending</option>
      </select>

      <textarea
        placeholder="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="bg-zinc-900 border border-zinc-800 p-2 rounded text-white text-sm w-full"
      />

      <button
        onClick={save}
        disabled={isPending}
        className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
      >
        Save Supplier
      </button>
    </div>
  );
}