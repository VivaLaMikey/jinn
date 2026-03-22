'use client'

import React, { memo, useEffect, useState } from 'react'

interface TitleBarProps {
  connected: boolean
}

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
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        borderBottom: '1px solid var(--separator, #1a1a1a)',
        background: 'var(--material-regular, rgba(15,15,15,0.8))',
        flexShrink: 0,
      }}
    >
      {/* Left: title */}
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--accent, #ff8c00)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
        }}
      >
        JINN HQ
      </span>

      {/* Center: decorative dots */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
          <div
            key={i}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: c,
              opacity: 0.7,
            }}
          />
        ))}
      </div>

      {/* Right: connection status + clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: connected
                ? 'var(--system-green, #48bb78)'
                : 'var(--system-red, #fc5c65)',
              boxShadow: connected
                ? '0 0 4px var(--system-green, #48bb78)'
                : 'none',
            }}
          />
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '9px',
              color: connected
                ? 'var(--system-green, #48bb78)'
                : 'var(--system-red, #fc5c65)',
            }}
          >
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '10px',
            color: 'var(--text-secondary, #888)',
            letterSpacing: '0.05em',
          }}
        >
          {time}
        </span>
      </div>
    </div>
  )
})
