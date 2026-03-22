'use client'

import React, { memo } from 'react'
import { STATUS_COLORS, DEPT_COLORS } from '../lib/pixel-palette'
import type { OfficeEmployee } from '../hooks/use-office-state'
import { WalletDisplay } from './wallet-display'

interface StatusBarProps {
  employees: OfficeEmployee[]
  onCallMeeting: () => void
  onDepartmentFilter?: (dept: string | null) => void
  onOpenStore?: () => void
  onToggleDecorationMode?: () => void
  decorationMode?: boolean
}

const STATUSES = [
  { key: 'idle', label: 'IDLE' },
  { key: 'working', label: 'WORK' },
  { key: 'meeting', label: 'MTG' },
  { key: 'error', label: 'ERR' },
] as const

// Departments to show as quick-filter badges (excludes meetings room)
const DEPT_BADGES = [
  { key: 'engineering', label: 'ENG' },
  { key: 'executive', label: 'EXEC' },
  { key: 'legal', label: 'LEGAL' },
  { key: 'research', label: 'RES' },
  { key: 'marketing', label: 'MKT' },
  { key: 'operations', label: 'OPS' },
] as const

// Pixel-art game button style
const PIXEL_BORDER_SHADOW = `
  -1px 0 0 0 var(--separator, #333),
  1px 0 0 0 var(--separator, #333),
  0 -1px 0 0 var(--separator, #333),
  0 1px 0 0 var(--separator, #333),
  -2px 0 0 0 rgba(0,0,0,0.4),
  2px 0 0 0 rgba(0,0,0,0.4),
  0 -2px 0 0 rgba(0,0,0,0.4),
  0 2px 0 0 rgba(0,0,0,0.4)
`

export const StatusBar = memo(function StatusBar({
  employees,
  onCallMeeting,
  onDepartmentFilter,
  onOpenStore,
  onToggleDecorationMode,
  decorationMode,
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
        padding: '0 12px',
        height: '30px',
        borderTop: '1px solid var(--separator, #1a1a1a)',
        background: 'var(--bg-secondary, rgba(18,18,18,0.98))',
        flexShrink: 0,
        gap: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Left: status counts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {STATUSES.map(({ key, label }) => (
          <div
            key={key}
            style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
          >
            {/* Pixel square icon */}
            <div
              style={{
                width: '6px',
                height: '6px',
                background: STATUS_COLORS[key].hex,
              }}
            />
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '9px',
                color: 'var(--text-tertiary, #555)',
                letterSpacing: '0.03em',
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '9px',
                color: counts[key] > 0 ? STATUS_COLORS[key].hex : 'var(--text-tertiary, #444)',
                fontWeight: 700,
                minWidth: '12px',
              }}
            >
              {counts[key]}
            </span>
          </div>
        ))}
      </div>

      {/* Center: department quick-filter badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center', overflow: 'hidden' }}>
        {DEPT_BADGES.map(({ key, label }) => {
          const color = DEPT_COLORS[key] || '#888'
          return (
            <button
              key={key}
              onClick={() => onDepartmentFilter?.(key)}
              style={{
                fontFamily: 'monospace',
                fontSize: '8px',
                padding: '1px 5px',
                background: `${color}18`,
                border: `1px solid ${color}40`,
                color: `${color}cc`,
                cursor: onDepartmentFilter ? 'pointer' : 'default',
                letterSpacing: '0.04em',
                transition: 'background 0.1s, color 0.1s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = `${color}30`
                ;(e.currentTarget as HTMLButtonElement).style.color = color
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = `${color}18`
                ;(e.currentTarget as HTMLButtonElement).style.color = `${color}cc`
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Right: total count + action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '9px',
            color: 'var(--text-tertiary, #444)',
          }}
        >
          {employees.length} EMP
        </span>

        {/* Coin wallet display — clicking opens the store */}
        <WalletDisplay onClick={onOpenStore} />

        {/* Store button */}
        {onOpenStore && (
          <button
            onClick={onOpenStore}
            style={{
              fontFamily: 'monospace',
              fontSize: '9px',
              padding: '2px 8px',
              background: 'color-mix(in srgb, #ffd700 12%, transparent)',
              border: 'none',
              color: '#ffd700',
              cursor: 'pointer',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              boxShadow: `
                inset -2px -2px 0 0 rgba(0,0,0,0.5),
                inset 2px 2px 0 0 rgba(255,255,255,0.10),
                0 0 0 1px #ffd70060
              `,
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background =
                'color-mix(in srgb, #ffd700 22%, transparent)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background =
                'color-mix(in srgb, #ffd700 12%, transparent)'
            }}
          >
            SHOP
          </button>
        )}

        {/* Decoration mode toggle */}
        {onToggleDecorationMode && (
          <button
            onClick={onToggleDecorationMode}
            style={{
              fontFamily: 'monospace',
              fontSize: '9px',
              padding: '2px 8px',
              background: decorationMode
                ? 'color-mix(in srgb, #b06cff 25%, transparent)'
                : 'color-mix(in srgb, #b06cff 10%, transparent)',
              border: 'none',
              color: '#b06cff',
              cursor: 'pointer',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              boxShadow: `
                inset -2px -2px 0 0 rgba(0,0,0,0.5),
                inset 2px 2px 0 0 rgba(255,255,255,0.10),
                0 0 0 1px #b06cff60
              `,
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background =
                'color-mix(in srgb, #b06cff 22%, transparent)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = decorationMode
                ? 'color-mix(in srgb, #b06cff 25%, transparent)'
                : 'color-mix(in srgb, #b06cff 10%, transparent)'
            }}
          >
            {decorationMode ? 'EXIT DECOR' : 'DECOR'}
          </button>
        )}

        {/* Meeting button */}
        <button
          onClick={onCallMeeting}
          style={{
            fontFamily: 'monospace',
            fontSize: '9px',
            padding: '2px 8px',
            background: 'color-mix(in srgb, var(--accent, #ff8c00) 15%, transparent)',
            border: 'none',
            color: 'var(--accent, #ff8c00)',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            // 3D pixel-art border effect
            boxShadow: `
              inset -2px -2px 0 0 rgba(0,0,0,0.5),
              inset 2px 2px 0 0 rgba(255,255,255,0.12),
              0 0 0 1px var(--accent, #ff8c00)
            `,
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background =
              'color-mix(in srgb, var(--accent, #ff8c00) 25%, transparent)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.background =
              'color-mix(in srgb, var(--accent, #ff8c00) 15%, transparent)'
          }}
          onMouseDown={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `
              inset 2px 2px 0 0 rgba(0,0,0,0.5),
              inset -2px -2px 0 0 rgba(255,255,255,0.12),
              0 0 0 1px var(--accent, #ff8c00)
            `
          }}
          onMouseUp={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `
              inset -2px -2px 0 0 rgba(0,0,0,0.5),
              inset 2px 2px 0 0 rgba(255,255,255,0.12),
              0 0 0 1px var(--accent, #ff8c00)
            `
          }}
        >
          CALL MTG
        </button>
      </div>
    </div>
  )
})
