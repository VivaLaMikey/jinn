'use client'

import React, { memo } from 'react'
import { EmployeeSprite } from './employee-sprite'
import { SpeechBubble } from './speech-bubble'
import type { OfficeEmployee } from '../hooks/use-office-state'
import { STATUS_COLORS, DEPT_COLORS } from '../lib/pixel-palette'

interface DeskProps {
  employee: OfficeEmployee
  onClick: (name: string) => void
}

export const Desk = memo(function Desk({ employee, onClick }: DeskProps) {
  const isWorking = employee.status === 'working'
  const deptColor = DEPT_COLORS[employee.department] || '#888'
  const statusHex = STATUS_COLORS[employee.status]?.hex || STATUS_COLORS.idle.hex

  return (
    <div
      onClick={() => onClick(employee.name)}
      title={employee.displayName}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        padding: '6px 4px 4px',
        borderRadius: '3px',
        transition: 'background 0.15s',
        userSelect: 'none',
      }}
      className="desk-item hover:bg-white/5"
    >
      {/* Speech bubble for working employees */}
      {isWorking && employee.taskSnippet && (
        <SpeechBubble text={employee.taskSnippet} />
      )}

      {/* Sprite */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '40px',
          width: '40px',
        }}
      >
        <EmployeeSprite
          name={employee.name}
          department={employee.department}
          status={employee.status}
        />
      </div>

      {/* Desk surface */}
      <div
        style={{
          width: '36px',
          height: '6px',
          background: 'var(--fill-tertiary, #2a2a2a)',
          borderRadius: '2px',
          border: `1px solid ${deptColor}40`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Monitor glow when working */}
        {isWorking && (
          <div
            style={{
              position: 'absolute',
              top: '1px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '10px',
              height: '4px',
              background: statusHex,
              borderRadius: '1px',
              opacity: 0.8,
              boxShadow: `0 0 4px ${statusHex}`,
            }}
          />
        )}
      </div>

      {/* Name label */}
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: '8px',
          color: 'var(--text-tertiary, #666)',
          textAlign: 'center',
          lineHeight: 1.1,
          maxWidth: '44px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {employee.displayName}
      </span>

      {/* Status indicator dot */}
      <div
        style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: statusHex,
        }}
      />
    </div>
  )
})
