'use client'

import React, { memo } from 'react'

interface Particle {
  top: string
  left: string
  size: number
  opacity: number
  duration: string
  delay: string
  color: string
}

// Regular fine dust particles (1–3 px)
const FINE_PARTICLES: Particle[] = [
  { top: '8%',  left: '12%', size: 2, opacity: 0.06, duration: '18s', delay: '0s',    color: 'var(--text-tertiary, #666)' },
  { top: '15%', left: '35%', size: 1, opacity: 0.08, duration: '22s', delay: '-4s',   color: 'var(--text-tertiary, #666)' },
  { top: '25%', left: '67%', size: 2, opacity: 0.05, duration: '19s', delay: '-8s',   color: 'var(--text-tertiary, #666)' },
  { top: '42%', left: '8%',  size: 1, opacity: 0.10, duration: '25s', delay: '-2s',   color: 'var(--text-tertiary, #666)' },
  { top: '55%', left: '53%', size: 2, opacity: 0.07, duration: '17s', delay: '-11s',  color: '#d4a04060' },
  { top: '63%', left: '78%', size: 1, opacity: 0.05, duration: '21s', delay: '-6s',   color: 'var(--text-tertiary, #666)' },
  { top: '72%', left: '23%', size: 2, opacity: 0.09, duration: '23s', delay: '-15s',  color: '#d4a04060' },
  { top: '80%', left: '91%', size: 1, opacity: 0.06, duration: '16s', delay: '-3s',   color: 'var(--text-tertiary, #666)' },
  { top: '88%', left: '44%', size: 2, opacity: 0.08, duration: '20s', delay: '-9s',   color: 'var(--text-tertiary, #666)' },
  { top: '33%', left: '86%', size: 1, opacity: 0.05, duration: '24s', delay: '-7s',   color: '#d4a04050' },
  { top: '47%', left: '31%', size: 3, opacity: 0.07, duration: '18s', delay: '-13s',  color: '#d4a04070' },
  { top: '19%', left: '58%', size: 1, opacity: 0.10, duration: '22s', delay: '-1s',   color: 'var(--text-tertiary, #666)' },
]

// Larger, very faint depth particles (4–5 px)
const DEPTH_PARTICLES: Particle[] = [
  { top: '30%', left: '20%', size: 5, opacity: 0.025, duration: '35s', delay: '-12s', color: '#c89030' },
  { top: '60%', left: '70%', size: 4, opacity: 0.020, duration: '40s', delay: '-20s', color: '#c89030' },
  { top: '15%', left: '80%', size: 5, opacity: 0.018, duration: '45s', delay: '-30s', color: '#aaaacc' },
]

const ALL_PARTICLES = [...FINE_PARTICLES, ...DEPTH_PARTICLES]

const KEYFRAMES = `
@keyframes dust-float {
  0%   { transform: translate(0, 0);          opacity: var(--p-opacity); }
  20%  { transform: translate(3px, -5px);                                }
  40%  { transform: translate(-2px, -10px);                              }
  60%  { transform: translate(4px, -14px);    opacity: calc(var(--p-opacity) * 0.6); }
  80%  { transform: translate(-1px, -18px);                              }
  100% { transform: translate(0, -22px);      opacity: 0;                }
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
        {ALL_PARTICLES.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: p.top,
              left: p.left,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: '50%',
              background: p.color,
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore CSS custom property
              '--p-opacity': p.opacity,
              opacity: p.opacity,
              animation: `dust-float ${p.duration} linear ${p.delay} infinite`,
            }}
          />
        ))}
      </div>
    </>
  )
})
