// app/system/deal-runner/page.tsx

import AdminNav from "@/components/admin/AdminNav";
import QuickActions from "@/components/admin/QuickActions";
import DealRunnerHistoryPanel from "@/components/system/DealRunnerHistoryPanel";
import DealRunnerControlPanel from "@/components/system/DealRunnerControlPanel";

export default function DealRunnerPage() {
  return (
    <>
      <AdminNav />
      <main className="min-h-screen bg-black px-6 py-8 text-white">
        <div className="mx-auto max-w-7xl space-y-8">
          <QuickActions />

          <header>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Deal Runner
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Monitor autonomous background orchestration and auto-progression runs.
            </p>
          </header>
        
          <DealRunnerControlPanel />
          <DealRunnerHistoryPanel />
        </div>
      </main>
    </>
  );
}