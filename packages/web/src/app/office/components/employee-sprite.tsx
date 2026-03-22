'use client'

import React, { memo, useRef, useEffect, useCallback } from 'react'
import { STATUS_COLORS } from '../lib/pixel-palette'

const STATUS_KEYFRAMES = `
@keyframes status-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.3); }
}
@keyframes status-flash {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}
@keyframes typing-dot {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
`
import {
  generateCharacterPalette,
  paletteFromAppearance,
  resolveAccessoryColor,
  drawSpriteFrame,
  drawSpriteWithAppearance,
  SPRITE_FRAMES,
} from '../lib/sprite-utils'
import type { EmployeeStatus } from '../hooks/use-office-state'
import type { EmployeeAppearance } from '@/lib/api'

interface EmployeeSpriteProps {
  name: string
  department: string
  status: EmployeeStatus
  scale?: 2 | 3 | 4
  /** When provided, overrides the deterministic palette with appearance data */
  appearance?: EmployeeAppearance
  /** Walk direction — only relevant when status would normally show idle/work */
  direction?: 'se' | 'sw' | 'ne' | 'nw'
  /** Show relaxed pose (break room / off-duty) */
  relaxed?: boolean
}

// Native canvas dimensions — isometric sprite is 20x28
const SPRITE_W = 20
const SPRITE_H = 28

// Animation config per status
const ANIM_CONFIG: Record<EmployeeStatus, { key: string; intervalMs: number }> = {
  idle:    { key: 'idle',    intervalMs: 1500 },
  working: { key: 'work',    intervalMs: 400  },
  meeting: { key: 'meeting', intervalMs: 2000 },
  error:   { key: 'error',   intervalMs: 300  },
}

export const EmployeeSprite = memo(function EmployeeSprite({
  name,
  department,
  status,
  scale = 3,
  appearance,
  direction,
  relaxed,
}: EmployeeSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameIndexRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const statusHex = STATUS_COLORS[status]?.hex || STATUS_COLORS.idle.hex
  const displayW = SPRITE_W * scale
  const displayH = SPRITE_H * scale

  // Resolve which animation key to use
  const resolveAnimKey = useCallback((): string => {
    if (relaxed) return 'relaxed'
    if (direction) return `walk_${direction}`
    return ANIM_CONFIG[status].key
  }, [status, direction, relaxed])

  const resolveIntervalMs = useCallback((): number => {
    if (relaxed) return 2000
    if (direction) return 350
    return ANIM_CONFIG[status].intervalMs
  }, [status, direction, relaxed])

  const drawCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const key = resolveAnimKey()
    const frames = SPRITE_FRAMES[key]
    if (!frames || frames.length === 0) return

    const frame = frames[frameIndexRef.current % frames.length]

    ctx.clearRect(0, 0, SPRITE_W, SPRITE_H)

    if (appearance) {
      const accColor = resolveAccessoryColor(appearance.accessory, appearance.shirtColor)
      const palette = paletteFromAppearance(appearance, accColor)
      drawSpriteWithAppearance(ctx, frame, palette, appearance.hairStyle, appearance.accessory, 0, 0)
    } else {
      const palette = generateCharacterPalette(name, department)
      drawSpriteFrame(ctx, frame, palette, 0, 0)
    }
  }, [name, department, status, appearance, resolveAnimKey])

  // Start animation loop
  useEffect(() => {
    frameIndexRef.current = 0
    drawCurrentFrame()

    const key = resolveAnimKey()
    const frames = SPRITE_FRAMES[key]
    if (!frames || frames.length <= 1) return

    const intervalMs = resolveIntervalMs()
    intervalRef.current = setInterval(() => {
      frameIndexRef.current = (frameIndexRef.current + 1) % frames.length
      drawCurrentFrame()
    }, intervalMs)

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [name, department, status, appearance, direction, relaxed, drawCurrentFrame, resolveAnimKey, resolveIntervalMs])

  const dotAnimation = status === 'working'
    ? 'status-pulse 2s ease-in-out infinite'
    : status === 'error'
    ? 'status-flash 0.5s ease-in-out infinite'
    : status === 'meeting'
    ? 'status-pulse 3s ease-in-out infinite'
    : 'none'

  return (
    <>
      <style>{STATUS_KEYFRAMES}</style>
      <div
        style={{
          position: 'relative',
          width: `${displayW}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
        }}
        aria-label={`${name} sprite`}
      >
        <div style={{ position: 'relative', width: `${displayW}px`, height: `${displayH}px` }}>
          <canvas
            ref={canvasRef}
            width={SPRITE_W}
            height={SPRITE_H}
            style={{
              width: `${displayW}px`,
              height: `${displayH}px`,
              imageRendering: 'pixelated',
              display: 'block',
            }}
          />
          {/* Status dot overlay */}
          <div
            style={{
              position: 'absolute',
              top: '2px',
              right: '-2px',
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: statusHex,
              boxShadow: `0 0 4px ${statusHex}`,
              border: '1px solid rgba(0,0,0,0.3)',
              animation: dotAnimation,
            }}
          />
          {/* Speech lines for meeting status */}
          {status === 'meeting' && (
            <div
              style={{
                position: 'absolute',
                top: '1px',
                left: '-6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                opacity: 0.7,
              }}
            >
              <div style={{ width: '4px', height: '1px', background: statusHex }} />
              <div style={{ width: '3px', height: '1px', background: statusHex }} />
              <div style={{ width: '2px', height: '1px', background: statusHex }} />
            </div>
          )}
        </div>
        {/* Typing indicator for working status */}
        {status === 'working' && (
          <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', marginTop: '2px' }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: '3px',
                  height: '3px',
                  borderRadius: '50%',
                  background: STATUS_COLORS.working.hex,
                  animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
})
