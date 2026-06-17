'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

type InsightStatus = 'draft' | 'approved' | 'published' | 'archived'
type NextInsightStatus = 'approved' | 'published' | 'archived'

interface InsightStatusActionsProps {
  insightId: string
  currentStatus: string
}

function isInsightStatus(value: string): value is InsightStatus {
  return (
    value === 'draft' ||
    value === 'approved' ||
    value === 'published' ||
    value === 'archived'
  )
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
      ? 'border-zinc-300 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900'
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

export default function InsightStatusActions({
  insightId,
  currentStatus,
}: InsightStatusActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const normalizedStatus = isInsightStatus(currentStatus) ? currentStatus : null

  const permissions = useMemo(() => {
    if (!normalizedStatus) {
      return {
        canApprove: false,
        canPublish: false,
        canArchive: false,
      }
    }

    return {
      canApprove: normalizedStatus === 'draft',
      canPublish: normalizedStatus === 'approved',
      canArchive: normalizedStatus === 'published',
    }
  }, [normalizedStatus])

  function updateStatus(status: NextInsightStatus) {
    setError(null)

    startTransition(async () => {
      try {
        const response = await fetch('/api/insights/pipeline/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            insightId,
            status,
          }),
        })

        const payload = (await response.json().catch(() => null)) as
          | { success?: boolean; error?: string }
          | null

        if (!response.ok || !payload?.success) {
          setError(payload?.error ?? 'Failed to update insight status.')
          return
        }

        router.refresh()
      } catch {
        setError('Unexpected error updating insight status.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <ActionButton
          label={isPending ? 'Working...' : 'Approve'}
          onClick={() => updateStatus('approved')}
          disabled={isPending || !permissions.canApprove}
        />

        <ActionButton
          label={isPending ? 'Working...' : 'Publish'}
          onClick={() => updateStatus('published')}
          disabled={isPending || !permissions.canPublish}
        />

        <ActionButton
          label={isPending ? 'Working...' : 'Archive'}
          onClick={() => updateStatus('archived')}
          disabled={isPending || !permissions.canArchive}
          variant="danger"
        />
      </div>

      {error ? (
        <div className="text-xs text-rose-600 dark:text-rose-400">{error}</div>
      ) : null}
    </div>
  )
}