'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  scriptSrc: string
  apiKey: string
  widgetType: string
  scriptId?: string
  containerId?: string
  heightPx?: number
  className?: string
}

export default function BoxCommercialPricingWidget({
  scriptSrc,
  apiKey,
  widgetType,
  scriptId = 'app',
  containerId = 'box-widget-root',
  heightPx = 1100,
  className,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const host = hostRef.current

    if (!host) {
      setStatus('error')
      setError('Widget host container is not available.')
      return
    }

    host.innerHTML = ''

    const script = document.createElement('script')
    script.id = scriptId
    script.src = scriptSrc
    script.async = true
    script.setAttribute('data-api-key', apiKey)
    script.setAttribute('data-widget-type', widgetType)

    const handleLoad = () => {
      setStatus('loaded')
      setError(null)
    }

    const handleError = () => {
      setStatus('error')
      setError('The BOX widget script failed to load.')
    }

    script.addEventListener('load', handleLoad)
    script.addEventListener('error', handleError)

    host.appendChild(script)

    return () => {
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
      if (host.contains(script)) {
        host.removeChild(script)
      }
      host.innerHTML = ''
    }
  }, [apiKey, scriptId, scriptSrc, widgetType])

  return (
    <div className={className}>
      {status === 'loading' ? (
        <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Loading BOX commercial pricing widget...
        </div>
      ) : null}

      {status === 'error' && error ? (
        <div className="mb-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <div
        id={containerId}
        ref={hostRef}
        className="rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950"
        style={{ minHeight: `${heightPx}px` }}
      />
    </div>
  )
}