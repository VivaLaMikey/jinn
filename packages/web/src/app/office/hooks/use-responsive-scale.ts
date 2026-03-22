'use client'

import { useState, useEffect } from 'react'

export interface ResponsiveScale {
  /** Pixel scale multiplier for sprites (2x, 3x, or 4x) */
  scale: 2 | 3 | 4
  /** Minimum column width (px) for the room grid */
  gridMinWidth: number
}

function getScaleForWidth(width: number): ResponsiveScale {
  if (width >= 2560) {
    return { scale: 4, gridMinWidth: 350 }
  }
  if (width >= 1440) {
    return { scale: 4, gridMinWidth: 280 }
  }
  if (width <= 640) {
    return { scale: 2, gridMinWidth: 150 }
  }
  return { scale: 3, gridMinWidth: 200 }
}

/**
 * Returns a responsive scale and grid min-width based on the viewport width.
 * Reacts to window resize events.
 */
export function useResponsiveScale(): ResponsiveScale {
  const [scale, setScale] = useState<ResponsiveScale>(() => {
    if (typeof window === 'undefined') {
      return { scale: 3, gridMinWidth: 200 }
    }
    return getScaleForWidth(window.innerWidth)
  })

  useEffect(() => {
    function handleResize() {
      setScale(getScaleForWidth(window.innerWidth))
    }

    window.addEventListener('resize', handleResize)
    // Set immediately in case SSR value differed
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return scale
}
