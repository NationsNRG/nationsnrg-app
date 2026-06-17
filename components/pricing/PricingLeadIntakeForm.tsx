'use client'

import { useMemo, useRef, useState } from 'react'
import BoxCommercialPricingWidget from '@/components/box/BoxCommercialPricingWidget'

type WidgetConfig = {
  scriptSrc: string
  apiKey: string
  widgetType: string
  scriptId: string
  containerId: string
  heightPx: number
}

type Props = {
  widgetConfig: WidgetConfig | null
}

type IntakeResponse = {
  success: boolean
  intake?: {
    id: string
    email: string
    zip_code: string | null
    utility: string | null
  }
  error?: string
}

export default function PricingLeadIntakeForm({ widgetConfig }: Props) {
  const widgetSectionRef = useRef<HTMLDivElement | null>(null)

  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [utility, setUtility] = useState('')
  const [averageMonthlyBill, setAverageMonthlyBill] = useState('')
  const [averageMonthlyUsage, setAverageMonthlyUsage] = useState('')
  const [commodity, setCommodity] = useState<'electricity' | 'natural_gas' | 'other'>(
    'electricity'
  )
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [intakeId, setIntakeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canShowWidget = useMemo(() => {
    return submitted && widgetConfig !== null
  }, [submitted, widgetConfig])

  async function handleSubmit(): Promise<void> {
    try {
      setSubmitting(true)
      setError(null)

      const response = await fetch('/api/public/pricing-intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: companyName.trim() || null,
          contactName: contactName.trim() || null,
          email: email.trim(),
          phone: phone.trim() || null,
          state: state.trim() || null,
          zipCode: zipCode.trim(),
          utility: utility.trim() || null,
          averageMonthlyBill: averageMonthlyBill.trim() || null,
          averageMonthlyUsage: averageMonthlyUsage.trim() || null,
          commodity,
          notes: notes.trim() || null,
        }),
      })

      const payload = (await response.json()) as IntakeResponse

      if (!response.ok || !payload.success || !payload.intake) {
        throw new Error(payload.error ?? 'Failed to create pricing intake.')
      }

      setSubmitted(true)
      setIntakeId(payload.intake.id)

      setTimeout(() => {
        widgetSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 100)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unexpected error.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Start with your business details
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Capture the lead first, then open the BOX pricing experience.
        </p>

        <div className="mt-5 grid gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Company Name
            </span>
            <input
              type="text"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Contact Name
            </span>
            <input
              type="text"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Phone
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                State
              </span>
              <input
                type="text"
                value={state}
                onChange={(event) => setState(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Zip Code
              </span>
              <input
                type="text"
                value={zipCode}
                onChange={(event) => setZipCode(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Utility
            </span>
            <input
              type="text"
              value={utility}
              onChange={(event) => setUtility(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Avg Monthly Bill
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={averageMonthlyBill}
                onChange={(event) => setAverageMonthlyBill(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Avg Monthly Usage
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={averageMonthlyUsage}
                onChange={(event) => setAverageMonthlyUsage(event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Commodity
            </span>
            <select
              value={commodity}
              onChange={(event) =>
                setCommodity(
                  event.target.value as 'electricity' | 'natural_gas' | 'other'
                )
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="electricity">Electricity</option>
              <option value="natural_gas">Natural Gas</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Notes
            </span>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </label>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving...' : 'Continue to Pricing'}
          </button>

          {error ? (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
              {error}
            </div>
          ) : null}

          {submitted && intakeId ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              Pricing intake saved. Intake ID: <span className="font-mono">{intakeId}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div ref={widgetSectionRef} id="pricing-widget-section">
        {!canShowWidget ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
            Complete the intake form to unlock the live BOX pricing widget.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Live Pricing Widget
            </div>

            {widgetConfig ? (
              <BoxCommercialPricingWidget
                scriptSrc={widgetConfig.scriptSrc}
                apiKey={widgetConfig.apiKey}
                widgetType={widgetConfig.widgetType}
                scriptId={widgetConfig.scriptId}
                containerId={widgetConfig.containerId}
                heightPx={widgetConfig.heightPx}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}