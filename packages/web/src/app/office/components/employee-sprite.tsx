'use client'

import React, { memo, useRef, useEffect, useCallback } from 'react'
import { STATUS_COLORS } from '../lib/pixel-palette'
import {
  generateCharacterPalette,
  drawSpriteFrame,
  SPRITE_FRAMES,
} from '../lib/sprite-utils'
import type { EmployeeStatus } from '../hooks/use-office-state'

interface EmployeeSpriteProps {
  name: string
  department: string
  status: EmployeeStatus
  scale?: 3 | 4
}

// Native canvas dimensions
const SPRITE_W = 16
const SPRITE_H = 24

// Animation config per status
const ANIM_CONFIG: Record<EmployeeStatus, { key: string; intervalMs: number }> = {
  idle: { key: 'idle', intervalMs: 1500 },
  working: { key: 'work', intervalMs: 400 },
  meeting: { key: 'meeting', intervalMs: 2000 },
  error: { key: 'error', intervalMs: 300 },
}

export const EmployeeSprite = memo(function EmployeeSprite({
  name,
  department,
  status,
  scale = 3,
}: EmployeeSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameIndexRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const statusHex = STATUS_COLORS[status]?.hex || STATUS_COLORS.idle.hex
  const displayW = SPRITE_W * scale
  const displayH = SPRITE_H * scale

  const drawCurrentFrame = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { key } = ANIM_CONFIG[status]
    const frames = SPRITE_FRAMES[key]
    if (!frames || frames.length === 0) return

    const frame = frames[frameIndexRef.current % frames.length]
    const palette = generateCharacterPalette(name, department)

    ctx.clearRect(0, 0, SPRITE_W, SPRITE_H)
    drawSpriteFrame(ctx, frame, palette, 0, 0)
  }, [name, department, status])

  // Start animation loop
  useEffect(() => {
    frameIndexRef.current = 0
    drawCurrentFrame()

    const { key, intervalMs } = ANIM_CONFIG[status]
    const frames = SPRITE_FRAMES[key]
    if (!frames || frames.length <= 1) return

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
  }, [name, department, status, drawCurrentFrame])

  return (
    <div
      style={{
        position: 'relative',
        width: `${displayW}px`,
        height: `${displayH}px`,
        flexShrink: 0,
      }}
      aria-label={`${name} sprite`}
    >
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
          border: '1px solid rgba(0,0,0,0.4)',
        }}
      />
    </div>
  )
})
