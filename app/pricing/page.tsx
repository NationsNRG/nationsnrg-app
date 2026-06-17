import type { Metadata } from 'next'
import PricingLeadIntakeForm from '@/components/pricing/PricingLeadIntakeForm'
import {
  getBoxConfigStatus,
  getBoxWidgetConfig,
} from '@/lib/integrations/box/config'

export const metadata: Metadata = {
  title: 'Commercial Pricing | NationsNRG',
  description:
    'Capture the lead first, then open the embedded BOX commercial pricing experience.',
}

export default async function PricingPage() {
  const status = getBoxConfigStatus()

  let widgetConfig: ReturnType<typeof getBoxWidgetConfig> | null = null
  let widgetError: string | null = null

  try {
    if (status.preview.widgetReady) {
      widgetConfig = getBoxWidgetConfig()
    }
  } catch (error) {
    widgetError =
      error instanceof Error ? error.message : 'Unable to load widget config.'
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="max-w-3xl">
          <div className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            NationsNRG
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Commercial Energy Pricing
          </h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            This flow captures the lead first, then opens the live BOX widget so
            you can start creating a real pricing pipeline immediately.
          </p>
        </div>

        {widgetError ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
            {widgetError}
          </div>
        ) : null}

        {!widgetConfig ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            The BOX widget is not configured yet. Finish the BOX widget env setup
            and reload this page.
          </div>
        ) : (
          <PricingLeadIntakeForm widgetConfig={widgetConfig} />
        )}
      </div>
    </div>
  )
}