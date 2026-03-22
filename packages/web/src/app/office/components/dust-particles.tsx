'use client'

import React, { memo } from 'react'

// Pre-defined particle configurations for deterministic rendering
const PARTICLES = [
  { top: '8%', left: '12%', size: 2, opacity: 0.06, duration: '18s', delay: '0s' },
  { top: '15%', left: '35%', size: 1, opacity: 0.08, duration: '22s', delay: '-4s' },
  { top: '25%', left: '67%', size: 2, opacity: 0.05, duration: '19s', delay: '-8s' },
  { top: '42%', left: '8%', size: 1, opacity: 0.10, duration: '25s', delay: '-2s' },
  { top: '55%', left: '53%', size: 2, opacity: 0.07, duration: '17s', delay: '-11s' },
  { top: '63%', left: '78%', size: 1, opacity: 0.04, duration: '21s', delay: '-6s' },
  { top: '72%', left: '23%', size: 2, opacity: 0.09, duration: '23s', delay: '-15s' },
  { top: '80%', left: '91%', size: 1, opacity: 0.06, duration: '16s', delay: '-3s' },
  { top: '88%', left: '44%', size: 2, opacity: 0.08, duration: '20s', delay: '-9s' },
  { top: '33%', left: '86%', size: 1, opacity: 0.05, duration: '24s', delay: '-7s' },
  { top: '47%', left: '31%', size: 2, opacity: 0.07, duration: '18s', delay: '-13s' },
  { top: '19%', left: '58%', size: 1, opacity: 0.10, duration: '22s', delay: '-1s' },
  { top: '91%', left: '16%', size: 2, opacity: 0.04, duration: '26s', delay: '-5s' },
  { top: '6%', left: '74%', size: 1, opacity: 0.08, duration: '15s', delay: '-10s' },
  { top: '76%', left: '62%', size: 2, opacity: 0.06, duration: '19s', delay: '-14s' },
]

const KEYFRAMES = `
@keyframes dust-float {
  0% { transform: translate(0, 0); opacity: var(--p-opacity); }
  25% { transform: translate(4px, -6px); }
  50% { transform: translate(-3px, -12px); opacity: calc(var(--p-opacity) * 0.5); }
  75% { transform: translate(2px, -8px); }
  100% { transform: translate(0, -16px); opacity: 0; }
}
`

export const DustParticles = memo(function DustParticles() {
  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
        }}
        aria-hidden
      >
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: p.top,
              left: p.left,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: '50%',
              background: 'var(--text-tertiary, #666)',
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore CSS custom property
              '--p-opacity': p.opacity,
              opacity: p.opacity,
              animation: `dust-float ${p.duration} linear ${p.delay} infinite`,
              willChange: 'transform, opacity',
            }}
          />
        ))}
      </div>
    </>
  )
})
