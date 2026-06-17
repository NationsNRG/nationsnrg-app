'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type DistributionStatus =
  | 'queued'
  | 'scheduled'
  | 'published'
  | 'failed'
  | 'archived'

type Props = {
  distributionId: string
  status: string | null
}

type ActionMode = 'schedule' | 'publish' | null

function isDistributionStatus(value: string | null): value is DistributionStatus {
  return (
    value === 'queued' ||
    value === 'scheduled' ||
    value === 'published' ||
    value === 'failed' ||
    value === 'archived'
  )
}

function toLocalDateTimeInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function ActionButton({
  label,
  onClick,
  disabled,
  variant = 'default',
}: {
  label: string
  onClick: () => void
  disabled: boolean
  variant?: 'default' | 'danger'
}) {
  const baseClassName =
    'inline-flex items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50'

  const variantClassName =
    variant === 'danger'
      ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900'
      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClassName} ${variantClassName}`}
    >
      {label}
    </button>
  )
}

export default function DistributionStatusActions({
  distributionId,
  status,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<ActionMode>(null)
  const [scheduledAt, setScheduledAt] = useState<string>(
    toLocalDateTimeInputValue(new Date())
  )
  const [externalUrl, setExternalUrl] = useState<string>('')
  const [externalId, setExternalId] = useState<string>('')

  const currentStatus = isDistributionStatus(status) ? status : null

  const permissions = useMemo(() => {
    if (!currentStatus) {
      return {
        canSchedule: false,
        canPublish: false,
        canFail: false,
        canArchive: false,
      }
    }

    return {
      canSchedule: currentStatus === 'queued' || currentStatus === 'failed',
      canPublish:
        currentStatus === 'queued' ||
        currentStatus === 'scheduled' ||
        currentStatus === 'failed',
      canFail: currentStatus === 'queued' || currentStatus === 'scheduled',
      canArchive: currentStatus !== 'archived',
    }
  }, [currentStatus])

  function resetTransientState() {
    setMode(null)
    setError(null)
  }

  function updateStatus(
    nextStatus: DistributionStatus,
    extra?: {
      scheduledAt?: string | null
      externalUrl?: string | null
      externalId?: string | null
    }
  ) {
    setError(null)

    startTransition(async () => {
      try {
        const response = await fetch('/api/insights/pipeline/distribution-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            distributionId,
            status: nextStatus,
            scheduledAt: extra?.scheduledAt ?? null,
            externalUrl: extra?.externalUrl ?? null,
            externalId: extra?.externalId ?? null,
          }),
        })

        const payload = (await response.json().catch(() => null)) as
          | { success?: boolean; error?: string }
          | null

        if (!response.ok || !payload?.success) {
          setError(payload?.error ?? 'Unable to update distribution status.')
          return
        }

        resetTransientState()
        router.refresh()
      } catch {
        setError('Unexpected error updating distribution status.')
      }
    })
  }

  function handleScheduleSubmit() {
    if (!scheduledAt.trim()) {
      setError('Please choose a date and time before scheduling.')
      return
    }

    updateStatus('scheduled', {
      scheduledAt,
    })
  }

  function handlePublishSubmit() {
    updateStatus('published', {
      externalUrl: externalUrl.trim() || null,
      externalId: externalId.trim() || null,
    })
  }

  return (
    <div className="flex min-w-[260px] flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <ActionButton
          label={isPending && mode === 'schedule' ? 'Working...' : 'Schedule'}
          onClick={() => {
            setError(null)
            setMode(mode === 'schedule' ? null : 'schedule')
          }}
          disabled={isPending || !permissions.canSchedule}
        />

        <ActionButton
          label={isPending && mode === 'publish' ? 'Working...' : 'Publish'}
          onClick={() => {
            setError(null)
            setMode(mode === 'publish' ? null : 'publish')
          }}
          disabled={isPending || !permissions.canPublish}
        />

        <ActionButton
          label={isPending ? 'Working...' : 'Fail'}
          onClick={() => updateStatus('failed')}
          disabled={isPending || !permissions.canFail}
          variant="danger"
        />

        <ActionButton
          label={isPending ? 'Working...' : 'Archive'}
          onClick={() => updateStatus('archived')}
          disabled={isPending || !permissions.canArchive}
        />
      </div>

      {mode === 'schedule' ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
            Scheduled date and time
          </label>

          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            disabled={isPending}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton
              label={isPending ? 'Working...' : 'Confirm Schedule'}
              onClick={handleScheduleSubmit}
              disabled={isPending}
            />

            <ActionButton
              label="Cancel"
              onClick={resetTransientState}
              disabled={isPending}
            />
          </div>
        </div>
      ) : null}

      {mode === 'publish' ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <label className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
            External URL
          </label>

          <input
            type="url"
            value={externalUrl}
            onChange={(event) => setExternalUrl(event.target.value)}
            disabled={isPending}
            placeholder="https://example.com/post"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />

          <label className="mb-2 mt-3 block text-xs font-medium text-slate-600 dark:text-slate-300">
            External ID
          </label>

          <input
            type="text"
            value={externalId}
            onChange={(event) => setExternalId(event.target.value)}
            disabled={isPending}
            placeholder="platform record id"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton
              label={isPending ? 'Working...' : 'Confirm Publish'}
              onClick={handlePublishSubmit}
              disabled={isPending}
            />

            <ActionButton
              label="Cancel"
              onClick={resetTransientState}
              disabled={isPending}
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="text-xs text-rose-600 dark:text-rose-400">{error}</div>
      ) : null}
    </div>
  )
}