'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { BoxWidgetMode } from '../../lib/integrations/shared/types'

type Props = {
  mode: Exclude<BoxWidgetMode, 'unconfigured'>
  widgetUrl?: string | null
  widgetScriptUrl?: string | null
  containerId?: string
  heightPx?: number
  brandColor?: string | null
  initFunctionName?: string | null
  widgetConfig?: Record<string, unknown> | null
  className?: string
}

function mergeWidgetConfig(
  config: Record<string, unknown> | null | undefined,
  containerId: string
): Record<string, unknown> {
  return {
    ...(config ?? {}),
    containerId,
  }
}

export default function BoxWidgetEmbed({
  mode,
  widgetUrl,
  widgetScriptUrl,
  containerId = 'box-widget-root',
  heightPx = 900,
  brandColor,
  initFunctionName,
  widgetConfig,
  className,
}: Props) {
  const [scriptReady, setScriptReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasInitializedRef = useRef(false)

  const containerStyle = useMemo(
    () => ({
      minHeight: `${heightPx}px`,
      borderColor: brandColor || undefined,
    }),
    [brandColor, heightPx]
  )

  useEffect(() => {
    if (mode !== 'script') {
      return
    }

    if (!widgetScriptUrl) {
      setError('Missing Broker Online Exchange widget script URL.')
      return
    }

    let isMounted = true
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[data-box-widget-script="${widgetScriptUrl}"]`
    )

    const handleReady = () => {
      if (!isMounted) {
        return
      }

      setScriptReady(true)
    }

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        handleReady()
      } else {
        existingScript.addEventListener('load', handleReady)
        existingScript.addEventListener('error', () => {
          if (isMounted) {
            setError('Broker Online Exchange widget script failed to load.')
          }
        })
      }

      return () => {
        isMounted = false
        existingScript.removeEventListener('load', handleReady)
      }
    }

    const script = document.createElement('script')
    script.src = widgetScriptUrl
    script.async = true
    script.dataset.boxWidgetScript = widgetScriptUrl

    script.addEventListener('load', () => {
      script.dataset.loaded = 'true'
      handleReady()
    })

    script.addEventListener('error', () => {
      if (isMounted) {
        setError('Broker Online Exchange widget script failed to load.')
      }
    })

    document.body.appendChild(script)

    return () => {
      isMounted = false
    }
  }, [mode, widgetScriptUrl])

  useEffect(() => {
    if (mode !== 'script' || !scriptReady || hasInitializedRef.current) {
      return
    }

    if (!initFunctionName) {
      return
    }

    const windowRecord = window as unknown as Record<string, unknown>
    const candidate = windowRecord[initFunctionName]

    if (typeof candidate !== 'function') {
      setError(
        `Widget init function "${initFunctionName}" was not found on window.`
      )
      return
    }

    try {
      const initFn = candidate as (
        containerId: string,
        config?: Record<string, unknown>
      ) => void

      initFn(containerId, mergeWidgetConfig(widgetConfig, containerId))
      hasInitializedRef.current = true
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Broker Online Exchange widget initialization failed.'
      )
    }
  }, [containerId, initFunctionName, mode, scriptReady, widgetConfig])

  if (mode === 'iframe') {
    if (!widgetUrl) {
      return (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          Missing Broker Online Exchange widget URL.
        </div>
      )
    }

    return (
      <div className={className}>
        <iframe
          src={widgetUrl}
          title="Broker Online Exchange Widget"
          className="w-full rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
          style={{ minHeight: `${heightPx}px` }}
        />
      </div>
    )
  }

  return (
    <div className={className}>
      {error ? (
        <div className="mb-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {!error && !scriptReady ? (
        <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Loading Broker Online Exchange widget script...
        </div>
      ) : null}

      <div
        id={containerId}
        className="rounded-2xl border border-dashed bg-white dark:bg-slate-950"
        style={containerStyle}
      />
    </div>
  )
}