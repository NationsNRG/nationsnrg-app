'use client';

type Props = {
  providerLabel: string | null;
  lastMessage: string | null;
  launchUrl: string | null;
  hasExecutions: boolean;
  hasAcceptedResult: boolean;
};

export default function EnrollmentExecutionWorkflowCard({
  providerLabel,
  lastMessage,
  launchUrl,
  hasExecutions,
  hasAcceptedResult,
}: Props) {
  const nextStep = hasAcceptedResult
    ? 'Enrollment result accepted. Confirm contract outcome and review final status.'
    : launchUrl
      ? 'Launch completed. Next step: ingest enrollment result.'
      : hasExecutions
        ? 'Execution exists. Start supplier flow or ingest result.'
        : 'Create or link an enrollment execution, then start provider flow.';

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3">
      <div>
        <h3 className="text-white font-semibold text-lg">Enrollment Workflow Status</h3>
        <p className="text-zinc-400 text-sm">
          Operator guidance for the next enrollment step.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-200">
        <div><span className="text-zinc-500">Provider:</span> {providerLabel ?? '—'}</div>
        <div><span className="text-zinc-500">Launch URL:</span> {launchUrl ? 'Ready' : '—'}</div>
      </div>

      {lastMessage ? (
        <div className="rounded-xl border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-200">
          {lastMessage}
        </div>
      ) : null}

      <div className="rounded-xl border border-blue-900 bg-blue-950/30 p-3 text-sm text-blue-200">
        {nextStep}
      </div>
    </div>
  );
}