import type { Metadata } from 'next'
import BoxCommercialPricingWidget from '@/components/box/BoxCommercialPricingWidget'
import {
  getBoxConfigStatus,
  getBoxWidgetConfig,
} from '@/lib/integrations/box/config'

export const metadata: Metadata = {
  title: 'BOX Widget Test | NationsNRG',
  description: 'Internal BOX widget test page for NationsNRG.',
}

export default async function BoxWidgetTestPage() {
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
        <div>
          <div className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            NationsNRG Integration Lab
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            BOX Commercial Pricing Widget Test
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            This page mounts the exact BOX script embed pattern you were given so
            you can validate rendering before placing it into the live pricing flow.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="text-sm text-slate-500 dark:text-slate-400">Configured</div>
            <div className="mt-2 text-2xl font-semibold">
              {status.configured ? 'Yes' : 'No'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="text-sm text-slate-500 dark:text-slate-400">Widget Ready</div>
            <div className="mt-2 text-2xl font-semibold">
              {status.preview.widgetReady ? 'Yes' : 'No'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="text-sm text-slate-500 dark:text-slate-400">Widget Type</div>
            <div className="mt-2 text-2xl font-semibold">
              {status.preview.widgetType ?? '—'}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="text-sm text-slate-500 dark:text-slate-400">API Ready</div>
            <div className="mt-2 text-2xl font-semibold">
              {status.preview.apiReady ? 'Yes' : 'No'}
            </div>
          </div>
        </div>

        {status.missing.length > 0 ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <div className="font-semibold">Missing configuration</div>
            <ul className="mt-2 list-disc pl-5">
              {status.missing.map((item: string) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Config Preview
          </div>
          <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            {JSON.stringify(status.preview, null, 2)}
          </pre>
        </div>

        {widgetError ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
            {widgetError}
          </div>
        ) : null}

        {widgetConfig ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
              Live Widget Surface
            </div>

            <BoxCommercialPricingWidget
              scriptSrc={widgetConfig.scriptSrc}
              apiKey={widgetConfig.apiKey}
              widgetType={widgetConfig.widgetType}
              scriptId={widgetConfig.scriptId}
              containerId={widgetConfig.containerId}
              heightPx={widgetConfig.heightPx}
            />
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          If this page stays blank after the script loads, the most likely causes are:
          domain/origin whitelisting on the vendor side, missing widget-side configuration,
          or an additional required embed attribute not yet documented.
        </div>
      </div>
    </div>
  )
}