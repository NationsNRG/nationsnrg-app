"use client";

import { useEffect, useState } from "react";

interface HistoryRow {
  id: string;
  claim_type: string;
  previous_status: string | null;
  new_status: string;
  action: string;
  invoice_reference: string | null;
  payout_due_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string | null;
}

interface Props {
  dealId: string;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

export default function CompensationClaimHistoryPanel({ dealId }: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<HistoryRow[]>([]);

  async function load() {
    setLoading(true);

    const res = await fetch(
      `/api/intake/deal/${dealId}/compensation-claims/history`,
    );
    const data = await res.json();

    if (data.ok) {
      setRows(data.history ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [dealId]);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h2 className="mb-4 text-xl font-semibold text-white">
        Compensation Claim Audit History
      </h2>

      {loading ? (
        <p className="text-sm text-gray-400">Loading history...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400">No history yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-lg border border-gray-800 bg-black p-4"
            >
              <div className="flex justify-between">
                <p className="text-sm font-semibold text-white">
                  {row.claim_type} → {row.new_status}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(row.created_at)}
                </p>
              </div>

              <p className="mt-1 text-xs text-gray-400">
                Action: {row.action}
              </p>

              <p className="text-xs text-gray-500">
                Prev: {row.previous_status ?? "—"}
              </p>

              {row.invoice_reference && (
                <p className="text-xs text-gray-500">
                  Invoice: {row.invoice_reference}
                </p>
              )}

              {row.payout_due_at && (
                <p className="text-xs text-gray-500">
                  Due: {formatDate(row.payout_due_at)}
                </p>
              )}

              {row.paid_at && (
                <p className="text-xs text-green-400">
                  Paid: {formatDate(row.paid_at)}
                </p>
              )}

              {row.notes && (
                <p className="mt-2 text-sm text-gray-300">{row.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}