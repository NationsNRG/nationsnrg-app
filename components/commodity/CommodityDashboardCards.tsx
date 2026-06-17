type Props = {
  totalDeals: number;
  verifiedDeals: number;
  failedDeals: number;
  inReviewDeals: number;
};

export default function CommodityDashboardCards({
  totalDeals,
  verifiedDeals,
  failedDeals,
  inReviewDeals,
}: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-xs text-zinc-500">Total Deals</div>
        <div className="mt-1 text-2xl font-semibold text-white">{totalDeals}</div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-xs text-zinc-500">Verified</div>
        <div className="mt-1 text-2xl font-semibold text-emerald-300">{verifiedDeals}</div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-xs text-zinc-500">In Review</div>
        <div className="mt-1 text-2xl font-semibold text-blue-300">{inReviewDeals}</div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="text-xs text-zinc-500">Failed</div>
        <div className="mt-1 text-2xl font-semibold text-red-300">{failedDeals}</div>
      </div>
    </div>
  );
}