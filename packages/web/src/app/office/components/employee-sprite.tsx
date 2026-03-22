'use client'

import React, { memo } from 'react'
import {
  DEPT_COLORS,
  SKIN_COLORS,
  HAIR_COLORS,
  STATUS_COLORS,
} from '../lib/pixel-palette'
import { nameHash } from '../lib/sprite-utils'
import type { EmployeeStatus } from '../hooks/use-office-state'

interface EmployeeSpriteProps {
  name: string
  department: string
  status: EmployeeStatus
}

const KEYFRAMES = `
@keyframes sprite-bob {
  0%, 100% { transform: scale(3) translateY(0px); }
  50% { transform: scale(3) translateY(-1px); }
}
@keyframes sprite-work {
  0%, 100% { transform: scale(3) translateY(0px) rotate(0deg); }
  25% { transform: scale(3) translateY(-1px) rotate(-2deg); }
  75% { transform: scale(3) translateY(-1px) rotate(2deg); }
}
@keyframes sprite-float {
  0%, 100% { transform: scale(3) translateY(0px); }
  50% { transform: scale(3) translateY(-2px); }
}
@keyframes sprite-shake {
  0%, 100% { transform: scale(3) translateX(0px); }
  25% { transform: scale(3) translateX(-1px); }
  75% { transform: scale(3) translateX(1px); }
}
`

function getAnimation(status: EmployeeStatus): string {
  switch (status) {
    case 'idle':
      return 'sprite-bob 3s ease-in-out infinite'
    case 'working':
      return 'sprite-work 0.8s ease-in-out infinite'
    case 'meeting':
      return 'sprite-float 2s ease-in-out infinite'
    case 'error':
      return 'sprite-shake 0.5s ease-in-out infinite'
    default:
      return 'none'
  }
}

export const EmployeeSprite = memo(function EmployeeSprite({
  name,
  department,
  status,
}: EmployeeSpriteProps) {
  const hash = nameHash(name)
  const skinColor = SKIN_COLORS[hash % SKIN_COLORS.length]
  const hairColor = HAIR_COLORS[hash % HAIR_COLORS.length]
  const bodyColor = DEPT_COLORS[department] || '#888'
  const statusColor = STATUS_COLORS[status]?.hex || STATUS_COLORS.idle.hex
  const animation = getAnimation(status)

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        style={{
          position: 'relative',
          width: '10px',
          height: '12px',
          transformOrigin: 'bottom center',
          animation,
          willChange: 'transform',
          imageRendering: 'pixelated',
        }}
        aria-label={`${name} sprite`}
      >
        {/* Hair */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '1px',
            width: '8px',
            height: '2px',
            background: hairColor,
          }}
        />
        {/* Head */}
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: '2px',
            width: '6px',
            height: '4px',
            background: skinColor,
          }}
        />
        {/* Body */}
        <div
          style={{
            position: 'absolute',
            top: '6px',
            left: '1px',
            width: '8px',
            height: '5px',
            background: bodyColor,
          }}
        />
        {/* Legs */}
        <div
          style={{
            position: 'absolute',
            top: '11px',
            left: '2px',
            width: '2px',
            height: '1px',
            background: skinColor,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '11px',
            left: '6px',
            width: '2px',
            height: '1px',
            background: skinColor,
          }}
        />
        {/* Status dot */}
        <div
          style={{
            position: 'absolute',
            top: '1px',
            right: '-3px',
            width: '2px',
            height: '2px',
            borderRadius: '50%',
            background: statusColor,
          }}
        />
      </div>
    </>
  )
})
