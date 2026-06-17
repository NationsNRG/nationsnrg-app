'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type GeneratedProposal = {
  headline: string;
  executive_summary: string;
  current_situation: string;
  proposed_solution: string;
  savings_summary: string;
  why_switch_now: string;
  next_steps: string;
  short_email_version: string;
};

type Props = {
  pipelineId: string;
  isClosed: boolean;
};

const SECTION_LABELS: Record<keyof GeneratedProposal, string> = {
  headline: 'Headline',
  executive_summary: 'Executive Summary',
  current_situation: 'Current Situation',
  proposed_solution: 'Proposed Solution',
  savings_summary: 'Savings Summary',
  why_switch_now: 'Why Switch Now',
  next_steps: 'Next Steps',
  short_email_version: 'Short Email Version',
};

export default function ProposalGenerator({ pipelineId, isClosed }: Props) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();

  const [proposal, setProposal] = useState<GeneratedProposal | null>(null);
  const [selectedMessage, setSelectedMessage] = useState('');
  const [selectedSection, setSelectedSection] = useState<keyof GeneratedProposal | null>(null);

  const [loading, setLoading] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isBusy = loading || isRefreshing;

  async function generateProposal() {
    setError(null);
    setCopyMessage(null);
    setLoading(true);

    try {
      const response = await fetch('/api/pipeline/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineId }),
      });

      const payload = (await response.json()) as {
        error?: string;
        proposal?: GeneratedProposal;
      };

      if (!response.ok || !payload.proposal) {
        setError(payload.error ?? 'Failed to generate proposal.');
        return;
      }

      setProposal(payload.proposal);
      setSelectedMessage('');
      setSelectedSection(null);

      startRefreshTransition(() => {
        router.refresh();
      });
    } catch (generationError) {
      console.error('Proposal generation failed', generationError);
      setError('Unexpected error while generating proposal.');
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(`${label} copied.`);
    } catch (clipboardError) {
      console.error('Clipboard copy failed', clipboardError);
      setError('Unable to copy to clipboard.');
    }
  }

  async function useSection(sectionKey: keyof GeneratedProposal) {
    if (!proposal) {
      return;
    }

    const message = proposal[sectionKey];
    setSelectedMessage(message);
    setSelectedSection(sectionKey);

    try {
      const response = await fetch('/api/pipeline/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pipelineId,
          selectedMessage: message,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? 'Failed to save selected proposal section.');
        return;
      }

      startRefreshTransition(() => {
        router.refresh();
      });
    } catch (selectionError) {
      console.error('Saving selected proposal section failed', selectionError);
      setError('Unexpected error while saving selected proposal section.');
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Proposal Generator</h2>
        <p className="text-sm text-zinc-400">
          Generate a proposal from the selected quote and turn pricing into a decision-ready offer.
        </p>
      </div>

      {isClosed ? (
        <div className="mb-4 rounded-xl border border-amber-900 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
          This pipeline is closed. Proposal generation is still available for historical review.
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {copyMessage ? (
        <div className="mb-4 rounded-xl border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          {copyMessage}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={generateProposal}
          disabled={isBusy}
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBusy ? 'Generating...' : 'Generate Proposal'}
        </button>
      </div>

      {proposal ? (
        <div className="space-y-4">
          {(Object.keys(proposal) as Array<keyof GeneratedProposal>).map((key) => {
            const label = SECTION_LABELS[key];
            const value = proposal[key];
            const isSelected = selectedSection === key;

            return (
              <div
                key={key}
                className={`rounded-xl border p-4 ${
                  isSelected
                    ? 'border-emerald-800 bg-emerald-950/20'
                    : 'border-zinc-800 bg-zinc-900'
                }`}
              >
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-medium text-white">{label}</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(value, label)}
                      className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => useSection(key)}
                      className="rounded-lg border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
                    >
                      Use
                    </button>
                  </div>
                </div>

                <div className="whitespace-pre-wrap text-sm text-zinc-100">{value}</div>
              </div>
            );
          })}

          {selectedMessage ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="mb-2 text-sm font-medium text-white">Selected Proposal Message</div>
              <div className="whitespace-pre-wrap text-sm text-zinc-100">{selectedMessage}</div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-sm text-zinc-400">
          Generate a proposal once a selected quote exists for this pipeline.
        </div>
      )}
    </section>
  );
}