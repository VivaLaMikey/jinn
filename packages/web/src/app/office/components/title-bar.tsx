'use client'

import React, { memo, useEffect, useState } from 'react'
import { TimeIndicator } from './day-night-overlay'

interface TitleBarProps {
  connected: boolean
}

// Isometric mini-building icon for the title bar
function IsoBuildingIcon() {
  return (
    <div style={{ position: 'relative', width: '20px', height: '18px', flexShrink: 0 }}>
      {/* Left wall of isometric building */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '10px',
          height: '12px',
          background: '#C8943A',
          clipPath: 'polygon(0% 25%, 50% 0%, 50% 75%, 0% 100%)',
        }}
      />
      {/* Right wall */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '9px',
          width: '11px',
          height: '12px',
          background: '#A0521A',
          clipPath: 'polygon(0% 0%, 100% 25%, 100% 100%, 0% 75%)',
        }}
      />
      {/* Roof top */}
      <div
        style={{
          position: 'absolute',
          top: '2px',
          left: 0,
          width: '20px',
          height: '8px',
          background: '#E07828',
          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        }}
      />
      {/* Tiny window on left wall */}
      <div
        style={{
          position: 'absolute',
          bottom: '4px',
          left: '2px',
          width: '3px',
          height: '3px',
          background: '#FFD700',
          opacity: 0.8,
        }}
      />
    </div>
  )
}

const PULSE_KEYFRAMES = `
@keyframes title-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
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
          borderBottom: '2px solid #C8943A',
          background: 'linear-gradient(180deg, #4A3020 0%, #3A2418 100%)',
          flexShrink: 0,
        }}
      >
        {/* Left: isometric building icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IsoBuildingIcon />
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              fontWeight: 700,
              color: '#E8A020',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              textShadow: '0 1px 0 rgba(0,0,0,0.6), 0 0 10px #E8A02060',
            }}
          >
            JINN HQ
          </span>
        </div>

        {/* Centre: warm decorative tiles */}
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          {['#E07828', '#E8A020', '#5BBF6A'].map((c, i) => (
            <div
              key={i}
              style={{
                width: '6px',
                height: '6px',
                background: c,
                opacity: 0.7,
                transform: 'rotate(45deg)',
              }}
            />
          ))}
        </div>

        {/* Right: time indicator + connection status + clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <TimeIndicator />

          {/* Connection indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div
              style={{
                width: '7px',
                height: '7px',
                background: connected ? '#5BBF6A' : '#D94A3A',
                boxShadow: connected ? '0 0 5px #5BBF6A' : 'none',
                animation: connected ? 'title-pulse 2s ease-in-out infinite' : 'none',
                transform: 'rotate(45deg)',
              }}
            />
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '9px',
                letterSpacing: '0.06em',
                color: connected ? '#5BBF6A' : '#D94A3A',
                fontWeight: 700,
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
              color: '#C8B898',
              letterSpacing: '0.12em',
            }}
          >
            {time}
          </span>
        </div>
      </div>
    </>
  )
})
