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
  { key: 'idle',    label: 'IDLE' },
  { key: 'working', label: 'WORK' },
  { key: 'meeting', label: 'MTG' },
  { key: 'error',   label: 'ERR' },
] as const

const DEPT_BADGES = [
  { key: 'engineering', label: 'ENG' },
  { key: 'executive',   label: 'EXEC' },
  { key: 'legal',       label: 'LEGAL' },
  { key: 'research',    label: 'RES' },
  { key: 'marketing',   label: 'MKT' },
  { key: 'operations',  label: 'OPS' },
] as const

// Habbo-style pixel button with warm pressed effect
function HabboButton({
  onClick,
  color,
  children,
  active,
}: {
  onClick?: () => void
  color: string
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'monospace',
        fontSize: '9px',
        padding: '3px 9px',
        background: active
          ? `color-mix(in srgb, ${color} 30%, #3A2418)`
          : `color-mix(in srgb, ${color} 15%, #3A2418)`,
        border: 'none',
        color: color,
        cursor: onClick ? 'pointer' : 'default',
        letterSpacing: '0.06em',
        textTransform: 'uppercase' as const,
        fontWeight: 700,
        // Habbo 3-D inset border effect — warm highlight top-left, shadow bottom-right
        boxShadow: active
          ? `inset 2px 2px 0 rgba(0,0,0,0.5), inset -1px -1px 0 rgba(255,255,255,0.08), 0 0 0 1px ${color}80`
          : `inset -2px -2px 0 rgba(0,0,0,0.45), inset 2px 2px 0 rgba(255,255,255,0.12), 0 0 0 1px ${color}60`,
        transition: 'background 0.1s, box-shadow 0.08s',
        borderRadius: '2px',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.background = `color-mix(in srgb, ${color} 28%, #3A2418)`
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.background = active
          ? `color-mix(in srgb, ${color} 30%, #3A2418)`
          : `color-mix(in srgb, ${color} 15%, #3A2418)`
      }}
      onMouseDown={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.boxShadow = `inset 2px 2px 0 rgba(0,0,0,0.5), inset -1px -1px 0 rgba(255,255,255,0.08), 0 0 0 1px ${color}80`
      }}
      onMouseUp={(e) => {
        const el = e.currentTarget as HTMLButtonElement
        el.style.boxShadow = `inset -2px -2px 0 rgba(0,0,0,0.45), inset 2px 2px 0 rgba(255,255,255,0.12), 0 0 0 1px ${color}60`
      }}
    >
      {children}
    </button>
  )
}

export const StatusBar = memo(function StatusBar({
  employees,
  onCallMeeting,
  onDepartmentFilter,
  onOpenStore,
  onToggleDecorationMode,
  decorationMode,
}: StatusBarProps) {
  const counts = {
    idle:    employees.filter((e) => e.status === 'idle').length,
    working: employees.filter((e) => e.status === 'working').length,
    meeting: employees.filter((e) => e.status === 'meeting').length,
    error:   employees.filter((e) => e.status === 'error').length,
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        height: '32px',
        borderTop: '2px solid #C8943A',
        background: 'linear-gradient(180deg, #3A2418 0%, #2A1810 100%)',
        flexShrink: 0,
        gap: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Left: status counts — warm colour squares */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {STATUSES.map(({ key, label }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            {/* Rotated diamond pixel icon — Habbo style */}
            <div
              style={{
                width: '6px',
                height: '6px',
                background: STATUS_COLORS[key].hex,
                transform: 'rotate(45deg)',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '9px',
                color: '#8C7B6B',
                letterSpacing: '0.03em',
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '9px',
                color: counts[key] > 0 ? STATUS_COLORS[key].hex : '#6B5B4B',
                fontWeight: 700,
                minWidth: '12px',
              }}
            >
              {counts[key]}
            </span>
          </div>
        ))}
      </div>

      {/* Centre: department quick-filter badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'center', overflow: 'hidden' }}>
        {DEPT_BADGES.map(({ key, label }) => {
          const color = DEPT_COLORS[key] || '#C8943A'
          return (
            <button
              key={key}
              onClick={() => onDepartmentFilter?.(key)}
              style={{
                fontFamily: 'monospace',
                fontSize: '8px',
                padding: '1px 5px',
                background: `${color}20`,
                border: `1px solid ${color}50`,
                color: `${color}cc`,
                cursor: onDepartmentFilter ? 'pointer' : 'default',
                letterSpacing: '0.04em',
                borderRadius: '2px',
                transition: 'background 0.1s, color 0.1s',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = `${color}38`
                el.style.color = color
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement
                el.style.background = `${color}20`
                el.style.color = `${color}cc`
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Right: total count + action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '9px',
            color: '#8C7B6B',
          }}
        >
          {employees.length} EMP
        </span>

        <WalletDisplay onClick={onOpenStore} />

        {onOpenStore && (
          <HabboButton onClick={onOpenStore} color='#E8A020'>
            SHOP
          </HabboButton>
        )}

        {onToggleDecorationMode && (
          <HabboButton onClick={onToggleDecorationMode} color='#9B6CD4' active={decorationMode}>
            {decorationMode ? 'EXIT DECOR' : 'DECOR'}
          </HabboButton>
        )}

        <HabboButton onClick={onCallMeeting} color='#E07828'>
          CALL MTG
        </HabboButton>
      </div>
    </div>
  )
})
