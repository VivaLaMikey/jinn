'use client'

import React, { memo, useEffect, useState } from 'react'

interface TitleBarProps {
  connected: boolean
}

// Pixel-art genie lamp icon: ~20x16px using nested divs
function LampIcon() {
  return (
    <div style={{ position: 'relative', width: '20px', height: '16px', flexShrink: 0 }}>
      {/* Base of lamp */}
      <div style={{ position: 'absolute', bottom: 0, left: '3px', width: '14px', height: '5px', background: '#ff8c00' }} />
      {/* Body */}
      <div style={{ position: 'absolute', bottom: '4px', left: '5px', width: '10px', height: '6px', background: '#ffaa33' }} />
      {/* Spout */}
      <div style={{ position: 'absolute', bottom: '5px', right: '1px', width: '5px', height: '3px', background: '#ff8c00' }} />
      {/* Handle */}
      <div style={{ position: 'absolute', bottom: '4px', left: '1px', width: '3px', height: '5px', background: '#cc6600' }} />
      {/* Flame dot */}
      <div style={{ position: 'absolute', top: '1px', left: '8px', width: '4px', height: '4px', background: '#ffd700' }} />
      <div style={{ position: 'absolute', top: 0, left: '9px', width: '2px', height: '2px', background: '#fff4aa' }} />
    </div>
  )
}

const PULSE_KEYFRAMES = `
@keyframes live-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
`

export const TitleBar = memo(function TitleBar({ connected }: TitleBarProps) {
  const [time, setTime] = useState<string>('')

  useEffect(() => {
    function tick() {
      const now = new Date()
      const h = now.getHours().toString().padStart(2, '0')
      const m = now.getMinutes().toString().padStart(2, '0')
      setTime(`${h}:${m}`)
    }
    tick()
    // Update every minute — seconds not needed
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <style>{PULSE_KEYFRAMES}</style>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          height: '34px',
          borderBottom: '1px solid var(--separator, #1a1a1a)',
          background: 'var(--bg-secondary, rgba(18,18,18,0.98))',
          flexShrink: 0,
        }}
      >
        {/* Left: logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LampIcon />
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--accent, #ff8c00)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              textShadow: '0 0 8px var(--accent, #ff8c00)',
            }}
          >
            JINN HQ
          </span>
        </div>

        {/* Center: decorative pixel dots */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
            <div
              key={i}
              style={{
                width: '6px',
                height: '6px',
                background: c,
                opacity: 0.6,
              }}
            />
          ))}
        </div>

        {/* Right: connection status + clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Connection indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div
              style={{
                width: '6px',
                height: '6px',
                background: connected
                  ? 'var(--system-green, #48bb78)'
                  : 'var(--system-red, #fc5c65)',
                boxShadow: connected
                  ? '0 0 4px var(--system-green, #48bb78)'
                  : 'none',
                animation: connected ? 'live-pulse 2s ease-in-out infinite' : 'none',
              }}
            />
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '9px',
                letterSpacing: '0.05em',
                color: connected
                  ? 'var(--system-green, #48bb78)'
                  : 'var(--system-red, #fc5c65)',
              }}
            >
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          {/* Clock */}
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '10px',
              color: 'var(--text-secondary, #888)',
              letterSpacing: '0.1em',
            }}
          >
            {time}
          </span>
        </div>
      </div>
    </>
  )
})
