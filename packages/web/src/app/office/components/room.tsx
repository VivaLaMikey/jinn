'use client'

import React, { memo } from 'react'
import { Desk } from './desk'
import type { OfficeEmployee } from '../hooks/use-office-state'
import type { RoomDef } from '../lib/office-layout'
import { DEPT_COLORS } from '../lib/pixel-palette'

interface RoomProps {
  room: RoomDef
  employees: OfficeEmployee[]
  onSelectEmployee: (name: string) => void
}

// Corner plant decoration — pure CSS pixel art
function CornerPlant() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '6px',
        right: '6px',
        width: '12px',
        height: '14px',
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      {/* Pot */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '2px',
          width: '8px',
          height: '5px',
          background: '#8b4513',
          borderRadius: '0 0 2px 2px',
        }}
      />
      {/* Stem */}
      <div
        style={{
          position: 'absolute',
          bottom: '5px',
          left: '5px',
          width: '2px',
          height: '4px',
          background: '#228b22',
        }}
      />
      {/* Leaves */}
      <div
        style={{
          position: 'absolute',
          bottom: '7px',
          left: '2px',
          width: '4px',
          height: '3px',
          background: '#2e8b57',
          borderRadius: '50% 0 50% 0',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '7px',
          right: '1px',
          width: '4px',
          height: '3px',
          background: '#3cb371',
          borderRadius: '0 50% 0 50%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '9px',
          left: '4px',
          width: '4px',
          height: '4px',
          background: '#32cd32',
          borderRadius: '50%',
        }}
      />
    </div>
  )
}

export const Room = memo(function Room({
  room,
  employees,
  onSelectEmployee,
}: RoomProps) {
  const deptColor = DEPT_COLORS[room.department] || '#888'
  const roomEmployees = employees.filter((e) =>
    room.employees.includes(e.name),
  )

  return (
    <div
      style={{
        gridColumn: room.gridColumn,
        gridRow: room.gridRow,
        position: 'relative',
        border: '1px solid var(--separator, #2a2a2a)',
        borderTop: `3px solid ${deptColor}`,
        borderRadius: '4px',
        background: 'var(--fill-tertiary, rgba(255,255,255,0.02))',
        overflow: 'hidden',
        minHeight: '120px',
        // Door gap in bottom border
        borderBottom: '1px solid var(--separator, #2a2a2a)',
      }}
    >
      {/* Room header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px 2px',
          borderBottom: '1px solid var(--separator, #1a1a1a)',
        }}
      >
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '9px',
            fontWeight: 600,
            color: deptColor,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {room.name}
        </span>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '8px',
            color: 'var(--text-tertiary, #555)',
          }}
        >
          {roomEmployees.length}/{room.employees.length}
        </span>
      </div>

      {/* Desks */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          padding: '6px 8px 16px',
          alignContent: 'flex-start',
        }}
      >
        {roomEmployees.map((emp) => (
          <Desk
            key={emp.name}
            employee={emp}
            onClick={onSelectEmployee}
          />
        ))}
        {roomEmployees.length === 0 && (
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '8px',
              color: 'var(--text-tertiary, #444)',
              padding: '8px',
            }}
          >
            empty
          </span>
        )}
      </div>

      {/* Corner plant */}
      <CornerPlant />

      {/* Door gap indicator in bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '16px',
          height: '2px',
          background: 'var(--bg, #0a0a0a)',
        }}
        aria-hidden
      />
    </div>
  )
})
