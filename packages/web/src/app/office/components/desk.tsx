'use client'

import React, { memo } from 'react'
import { EmployeeSprite } from './employee-sprite'
import { SpeechBubble } from './speech-bubble'
import type { OfficeEmployee } from '../hooks/use-office-state'
import {
  STATUS_COLORS,
  DEPT_COLORS,
  FURNITURE_COLORS,
  MONITOR_COLORS,
} from '../lib/pixel-palette'
import { nameHash } from '../lib/sprite-utils'

interface DeskProps {
  employee: OfficeEmployee
  onClick: (name: string) => void
}

// Desk surface width constant — used in multiple places
const DESK_W = 64

// Small pixel-art chair behind the desk
function Chair({ deptColor }: { deptColor: string }) {
  return (
    <div
      style={{ position: 'relative', width: '28px', height: '20px' }}
      aria-hidden
    >
      {/* Back rest */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '4px',
          width: '20px',
          height: '10px',
          background: `color-mix(in srgb, ${deptColor} 20%, #2a2a3a)`,
          border: `1px solid ${deptColor}40`,
          borderRadius: '2px 2px 0 0',
        }}
      />
      {/* Seat */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '2px',
          width: '24px',
          height: '7px',
          background: `color-mix(in srgb, ${deptColor} 15%, #222230)`,
          border: `1px solid ${deptColor}30`,
          borderRadius: '1px',
        }}
      />
      {/* Legs */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '4px',
          width: '3px',
          height: '3px',
          background: '#333345',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: '4px',
          width: '3px',
          height: '3px',
          background: '#333345',
        }}
      />
    </div>
  )
}

// Monitor + keyboard on the desk surface
function Monitor({
  isWorking,
  statusHex,
}: {
  isWorking: boolean
  statusHex: string
}) {
  const screenColour = isWorking ? MONITOR_COLORS.screen_on : MONITOR_COLORS.screen_off
  const glowColour = isWorking ? statusHex : 'transparent'

  return (
    <div
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}
      aria-hidden
    >
      {/* Monitor frame */}
      <div
        style={{
          width: '20px',
          height: '14px',
          background: MONITOR_COLORS.frame,
          border: '1px solid #3a3a50',
          borderRadius: '1px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isWorking ? `0 0 6px ${glowColour}80` : 'none',
        }}
      >
        {/* Screen */}
        <div
          style={{
            width: '16px',
            height: '10px',
            background: screenColour,
            borderRadius: '1px',
            boxShadow: isWorking ? `inset 0 0 4px ${statusHex}60` : 'none',
          }}
        >
          {isWorking && (
            <div
              style={{
                width: '100%',
                height: '2px',
                marginTop: '2px',
                background: `linear-gradient(90deg, transparent, ${statusHex}80, transparent)`,
                animation: 'monitor-scan 2s linear infinite',
              }}
            />
          )}
        </div>
      </div>
      {/* Stand */}
      <div
        style={{
          width: '6px',
          height: '2px',
          background: '#3a3a50',
        }}
      />
      {/* Keyboard */}
      <div
        style={{
          width: '18px',
          height: '4px',
          background: '#252535',
          border: '1px solid #3a3a50',
          borderRadius: '1px',
        }}
      />
    </div>
  )
}

// Small coffee cup or plant — picked deterministically by nameHash
function DeskItem({ hash }: { hash: number }) {
  if (hash % 2 === 0) {
    // Coffee cup
    return (
      <div style={{ position: 'relative', width: '8px', height: '10px' }} aria-hidden>
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '8px',
            height: '8px',
            background: '#2a1a0a',
            border: '1px solid #5a3a1a',
            borderRadius: '0 0 2px 2px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '1px',
            width: '6px',
            height: '2px',
            background: 'rgba(80,50,20,0.5)',
            borderRadius: '50%',
          }}
        />
      </div>
    )
  }
  // Mini plant
  return (
    <div style={{ position: 'relative', width: '8px', height: '12px' }} aria-hidden>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '1px',
          width: '6px',
          height: '4px',
          background: '#5c2e10',
          borderRadius: '0 0 1px 1px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '4px',
          left: '3px',
          width: '2px',
          height: '3px',
          background: '#1a5c1a',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '5px',
          left: '0px',
          width: '4px',
          height: '4px',
          background: '#2e7d2e',
          borderRadius: '50% 0 50% 0',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '5px',
          right: '0px',
          width: '4px',
          height: '4px',
          background: '#388e3c',
          borderRadius: '0 50% 0 50%',
        }}
      />
    </div>
  )
}

const MONITOR_SCAN_KEYFRAME = `
@keyframes monitor-scan {
  0% { transform: translateY(0); opacity: 0.8; }
  100% { transform: translateY(8px); opacity: 0; }
}
`

export const Desk = memo(function Desk({ employee, onClick }: DeskProps) {
  const isWorking = employee.status === 'working'
  const deptColor = DEPT_COLORS[employee.department] || '#888'
  const statusHex = STATUS_COLORS[employee.status]?.hex || STATUS_COLORS.idle.hex
  const hash = nameHash(employee.name)

  return (
    <>
      <style>{MONITOR_SCAN_KEYFRAME}</style>
      <div
        onClick={() => onClick(employee.name)}
        title={employee.displayName}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          cursor: 'pointer',
          padding: '4px 4px 4px',
          borderRadius: '4px',
          transition: 'background 0.15s, filter 0.15s',
          userSelect: 'none',
          minWidth: '64px',
        }}
        className="desk-item hover:brightness-125"
      >
        {/* Speech bubble for working employees */}
        {isWorking && employee.taskSnippet && (
          <SpeechBubble text={employee.taskSnippet} />
        )}

        {/* Sprite area */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            height: '72px',
            width: '48px',
            position: 'relative',
          }}
        >
          <EmployeeSprite
            name={employee.name}
            department={employee.department}
            status={employee.status}
            scale={3}
            appearance={employee.appearance}
          />
        </div>

        {/* Chair behind sprite */}
        <div style={{ marginTop: '-4px', zIndex: 0 }}>
          <Chair deptColor={deptColor} />
        </div>

        {/* Desk surface */}
        <div
          style={{
            width: `${DESK_W}px`,
            height: '18px',
            background: FURNITURE_COLORS.wood_med,
            borderRadius: '2px',
            border: `1px solid ${FURNITURE_COLORS.wood_dark}`,
            boxShadow: `0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 ${FURNITURE_COLORS.wood_light}40`,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '2px 4px',
            marginTop: '-2px',
          }}
        >
          {/* Desk item on left */}
          <DeskItem hash={hash} />

          {/* Monitor in centre */}
          <Monitor isWorking={isWorking} statusHex={statusHex} />

          {/* Small notepad on right */}
          <div
            style={{
              width: '6px',
              height: '8px',
              background: '#f5f5e8',
              border: '1px solid #ccc8a0',
              borderRadius: '1px',
              opacity: 0.7,
            }}
            aria-hidden
          />
        </div>

        {/* Desk front edge (depth) */}
        <div
          style={{
            width: `${DESK_W}px`,
            height: '4px',
            background: FURNITURE_COLORS.wood_dark,
            borderRadius: '0 0 2px 2px',
            marginTop: '-1px',
          }}
          aria-hidden
        />

        {/* Name label */}
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '8px',
            color: 'var(--text-tertiary, #666)',
            textAlign: 'center',
            lineHeight: 1.1,
            maxWidth: `${DESK_W}px`,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: '2px',
          }}
        >
          {employee.displayName}
        </span>

        {/* Status indicator dot in corner */}
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: statusHex,
            boxShadow: `0 0 4px ${statusHex}`,
          }}
        />
      </div>
    </>
  )
})
