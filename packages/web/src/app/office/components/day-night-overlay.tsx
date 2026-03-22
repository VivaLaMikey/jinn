'use client'

import React, { memo, useState, useEffect } from 'react'

function getTimePhase(): { phase: 'morning' | 'day' | 'evening' | 'night'; hour: number } {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 9) return { phase: 'morning', hour }
  if (hour >= 9 && hour < 17) return { phase: 'day', hour }
  if (hour >= 17 && hour < 21) return { phase: 'evening', hour }
  return { phase: 'night', hour }
}

const PHASE_STYLES: Record<string, { overlay: string; opacity: number; label: string }> = {
  morning: { overlay: 'linear-gradient(180deg, rgba(255,200,100,0.03) 0%, transparent 100%)', opacity: 0.03, label: 'Morning' },
  day: { overlay: 'none', opacity: 0, label: 'Daytime' },
  evening: { overlay: 'linear-gradient(180deg, rgba(255,100,50,0.06) 0%, rgba(50,20,80,0.04) 100%)', opacity: 0.06, label: 'Evening' },
  night: { overlay: 'linear-gradient(180deg, rgba(10,10,40,0.15) 0%, rgba(5,5,20,0.1) 100%)', opacity: 0.15, label: 'Night' },
}

export const DayNightOverlay = memo(function DayNightOverlay() {
  const [timePhase, setTimePhase] = useState(getTimePhase)

  useEffect(() => {
    // Update every minute
    const interval = setInterval(() => {
      setTimePhase(getTimePhase())
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  const style = PHASE_STYLES[timePhase.phase]
  if (style.opacity === 0) return null

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: style.overlay,
        pointerEvents: 'none',
        zIndex: 50,
        transition: 'opacity 60s ease',
      }}
      aria-hidden
    />
  )
})

/** Small time indicator for the title bar */
export function TimeIndicator() {
  const [timePhase, setTimePhase] = useState(getTimePhase)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimePhase(getTimePhase())
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  const icons: Record<string, string> = {
    morning: '🌅',
    day: '☀️',
    evening: '🌆',
    night: '🌙',
  }

  return (
    <span
      style={{
        fontFamily: 'monospace',
        fontSize: '9px',
        color: 'var(--text-tertiary, #666)',
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
      }}
      title={`${timePhase.phase} (${timePhase.hour}:00)`}
    >
      <span style={{ fontSize: '11px' }}>{icons[timePhase.phase]}</span>
      <span style={{ opacity: 0.7 }}>{String(timePhase.hour).padStart(2, '0')}:00</span>
    </span>
  )
}
