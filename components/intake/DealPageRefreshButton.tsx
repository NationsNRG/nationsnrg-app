"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function DealPageRefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isPending}
      className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
    >
      {isPending ? "Refreshing..." : "Refresh Deal"}
    </button>
  );
}