'use client'

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'

interface SyncedHorizontalScrollProps {
  children: ReactNode
}

export default function SyncedHorizontalScroll({
  children,
}: SyncedHorizontalScrollProps) {
  const topScrollRef = useRef<HTMLDivElement | null>(null)
  const bottomScrollRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  const [contentWidth, setContentWidth] = useState(0)

  useEffect(() => {
    const contentElement = contentRef.current
    const bottomElement = bottomScrollRef.current

    if (!contentElement || !bottomElement) {
      return
    }

    let isSyncingFromTop = false
    let isSyncingFromBottom = false

    const updateWidths = () => {
      setContentWidth(contentElement.scrollWidth)
    }

    const handleTopScroll = () => {
      if (!topScrollRef.current || !bottomScrollRef.current) {
        return
      }

      if (isSyncingFromBottom) {
        isSyncingFromBottom = false
        return
      }

      isSyncingFromTop = true
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft
    }

    const handleBottomScroll = () => {
      if (!topScrollRef.current || !bottomScrollRef.current) {
        return
      }

      if (isSyncingFromTop) {
        isSyncingFromTop = false
        return
      }

      isSyncingFromBottom = true
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft
    }

    updateWidths()

    const resizeObserver = new ResizeObserver(() => {
      updateWidths()
    })

    resizeObserver.observe(contentElement)
    resizeObserver.observe(bottomElement)

    topScrollRef.current?.addEventListener('scroll', handleTopScroll, {
      passive: true,
    })

    bottomElement.addEventListener('scroll', handleBottomScroll, {
      passive: true,
    })

    return () => {
      resizeObserver.disconnect()
      topScrollRef.current?.removeEventListener('scroll', handleTopScroll)
      bottomElement.removeEventListener('scroll', handleBottomScroll)
    }
  }, [])

  return (
    <div className="space-y-3">
      <div
        ref={topScrollRef}
        className="overflow-x-auto overflow-y-hidden"
      >
        <div
          className="h-1"
          style={{ width: `${contentWidth}px` }}
        />
      </div>

      <div
        ref={bottomScrollRef}
        className="overflow-x-auto"
      >
        <div ref={contentRef}>
          {children}
        </div>
      </div>
    </div>
  )
}