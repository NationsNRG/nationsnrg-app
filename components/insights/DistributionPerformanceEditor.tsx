'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  type DistributionPerformance,
  DISTRIBUTION_PERFORMANCE_FIELDS,
  formatPerformanceMetricLabel,
} from '@/lib/insights/distributionPerformance'

type Props = {
  distributionId: string
  initialPerformance: DistributionPerformance
}

type FormState = Record<keyof DistributionPerformance, string>

function toFormState(
  performance: DistributionPerformance
): FormState {
  return {
    clicks: String(performance.clicks),
    impressions: String(performance.impressions),
    engagement: String(performance.engagement),
    replies: String(performance.replies),
    conversions: String(performance.conversions),
    booked_consultations: String(performance.booked_consultations),
    bill_uploads: String(performance.bill_uploads),
  }
}

function buildPayload(state: FormState): DistributionPerformance {
  return {
    clicks: Number(state.clicks || 0),
    impressions: Number(state.impressions || 0),
    engagement: Number(state.engagement || 0),
    replies: Number(state.replies || 0),
    conversions: Number(state.conversions || 0),
    booked_consultations: Number(state.booked_consultations || 0),
    bill_uploads: Number(state.bill_uploads || 0),
  }
}

export default function DistributionPerformanceEditor({
  distributionId,
  initialPerformance,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formState, setFormState] = useState<FormState>(
    toFormState(initialPerformance)
  )

  const totalActivity = useMemo(() => {
    return (
      Number(formState.clicks || 0) +
      Number(formState.engagement || 0) +
      Number(formState.replies || 0) +
      Number(formState.conversions || 0) +
      Number(formState.booked_consultations || 0) +
      Number(formState.bill_uploads || 0)
    )
  }, [formState])

  function updateField(
    key: keyof DistributionPerformance,
    value: string
  ) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function resetForm() {
    setFormState(toFormState(initialPerformance))
    setError(null)
    setIsOpen(false)
  }

  function handleSave() {
    setError(null)

    startTransition(async () => {
      try {
        const response = await fetch(
          '/api/insights/pipeline/distribution-performance',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              distributionId,
              performance: buildPayload(formState),
            }),
          }
        )

        const payload = (await response.json().catch(() => null)) as
          | { success?: boolean; error?: string }
          | null

        if (!response.ok || !payload?.success) {
          setError(payload?.error ?? 'Failed to update performance.')
          return
        }

        setIsOpen(false)
        router.refresh()
      } catch {
        setError('Unexpected error updating performance.')
      }
    })
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setError(null)
            setIsOpen((current) => !current)
          }}
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {isOpen ? 'Close Metrics' : 'Edit Metrics'}
        </button>

        <span className="text-xs text-slate-500 dark:text-slate-400">
          Activity Score {totalActivity}
        </span>
      </div>

      {isOpen ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 md:grid-cols-2">
            {DISTRIBUTION_PERFORMANCE_FIELDS.map((field) => (
              <label
                key={field}
                className="flex flex-col gap-1"
              >
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {formatPerformanceMetricLabel(field)}
                </span>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formState[field]}
                  onChange={(event) => updateField(field, event.target.value)}
                  disabled={isPending}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {isPending ? 'Saving...' : 'Save Metrics'}
            </button>

            <button
              type="button"
              onClick={resetForm}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>

          {error ? (
            <div className="mt-2 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}