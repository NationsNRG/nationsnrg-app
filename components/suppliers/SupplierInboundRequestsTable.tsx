'use client';

type Request = {
  id: string;
  request_type: string;
  request_status: string;
  pipeline_id: string | null;
  created_at: string;
};

type Props = {
  requests: Request[];
};

export default function SupplierInboundRequestsTable({ requests }: Props) {
  if (requests.length === 0) {
    return (
      <div className="text-zinc-400 text-sm">
        No inbound requests yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((r) => (
        <div
          key={r.id}
          className="border border-zinc-800 rounded p-3 text-sm text-white"
        >
          <div>
            {r.request_type} • {r.request_status}
          </div>
          <div className="text-zinc-400 text-xs">
            Pipeline: {r.pipeline_id ?? '—'}
          </div>
        </div>
      ))}
    </div>
  );
}