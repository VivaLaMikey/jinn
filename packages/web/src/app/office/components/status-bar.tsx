'use client'

import React, { memo } from 'react'
import { STATUS_COLORS } from '../lib/pixel-palette'
import type { OfficeEmployee } from '../hooks/use-office-state'

interface StatusBarProps {
  employees: OfficeEmployee[]
  onCallMeeting: () => void
}

const STATUSES = [
  { key: 'idle', label: 'Idle' },
  { key: 'working', label: 'Working' },
  { key: 'meeting', label: 'Meeting' },
  { key: 'error', label: 'Error' },
] as const

export const StatusBar = memo(function StatusBar({
  employees,
  onCallMeeting,
}: StatusBarProps) {
  const counts = {
    idle: employees.filter((e) => e.status === 'idle').length,
    working: employees.filter((e) => e.status === 'working').length,
    meeting: employees.filter((e) => e.status === 'meeting').length,
    error: employees.filter((e) => e.status === 'error').length,
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 12px',
        borderTop: '1px solid var(--separator, #1a1a1a)',
        background: 'var(--material-regular, rgba(15,15,15,0.8))',
        flexShrink: 0,
        flexWrap: 'wrap',
        gap: '8px',
      }}
    >
      {/* Status legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {STATUSES.map(({ key, label }) => (
          <div
            key={key}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: STATUS_COLORS[key].hex,
              }}
            />
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '9px',
                color: 'var(--text-tertiary, #555)',
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '9px',
                color: 'var(--text-secondary, #888)',
                fontWeight: 600,
              }}
            >
              {counts[key]}
            </span>
          </div>
        ))}
      </div>

      {/* Summary + action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '9px',
            color: 'var(--text-tertiary, #555)',
          }}
        >
          {employees.length} employees
        </span>
        <button
          onClick={onCallMeeting}
          style={{
            fontFamily: 'monospace',
            fontSize: '9px',
            padding: '3px 8px',
            background: 'color-mix(in srgb, var(--accent, #ff8c00) 15%, transparent)',
            border: '1px solid var(--accent, #ff8c00)',
            borderRadius: '3px',
            color: 'var(--accent, #ff8c00)',
            cursor: 'pointer',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
          className="hover:opacity-80 transition-opacity"
        >
          Call Meeting
        </button>
      </div>
    </div>
  )
})
