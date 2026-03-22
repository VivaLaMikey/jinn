'use client'

import React, { memo } from 'react'
import { EmployeeSprite } from './employee-sprite'
import { DEPT_COLORS, FURNITURE_COLORS } from '../lib/pixel-palette'
import type { OfficeEmployee, ActiveMeeting } from '../hooks/use-office-state'

interface MeetingRoomProps {
  employees: OfficeEmployee[]
  activeMeetings: ActiveMeeting[]
  onSelectEmployee: (name: string) => void
}

const LIVE_PULSE_KEYFRAME = `
@keyframes live-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 4px #fc5c65; }
  50% { opacity: 0.4; box-shadow: 0 0 8px #fc5c65; }
}
`

// 8 chair positions around the conference table
// top/left are percentages within the table container
const CHAIR_POSITIONS = [
  // Top row (above table)
  { top: '8%',  left: '20%', rotate: 0 },
  { top: '8%',  left: '40%', rotate: 0 },
  { top: '8%',  left: '60%', rotate: 0 },
  // Bottom row (below table)
  { top: '68%', left: '20%', rotate: 180 },
  { top: '68%', left: '40%', rotate: 180 },
  { top: '68%', left: '60%', rotate: 180 },
  // Left side
  { top: '38%', left: '4%',  rotate: 90 },
  // Right side
  { top: '38%', left: '82%', rotate: 270 },
]

// Single chair rendered as a small pixel rectangle
function Chair({ rotate, occupied }: { rotate: number; occupied: boolean }) {
  return (
    <div
      style={{
        width: '10px',
        height: '8px',
        transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
        position: 'relative',
      }}
      aria-hidden
    >
      {/* Back rest */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '1px',
          width: '8px',
          height: '3px',
          background: occupied ? '#4a5580' : '#2a2a3a',
          border: '1px solid #3a3a5a',
          borderRadius: '1px 1px 0 0',
        }}
      />
      {/* Seat */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '10px',
          height: '4px',
          background: occupied ? '#3a4070' : '#222232',
          border: '1px solid #3a3a5a',
          borderRadius: '0 0 1px 1px',
        }}
      />
    </div>
  )
}

// Pixel-art whiteboard on the back wall
function Whiteboard({ title }: { title?: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '4px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '60%',
        height: '16px',
        background: '#e8f0e8',
        border: '2px solid #8aaa8a',
        borderRadius: '1px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      {title ? (
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '6px',
            color: '#2a4a2a',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            padding: '0 2px',
            maxWidth: '100%',
          }}
        >
          {title}
        </span>
      ) : (
        // Decorative lines on empty whiteboard
        <div style={{ width: '100%', padding: '2px 4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ width: '60%', height: '1px', background: '#aac4aa' }} />
          <div style={{ width: '40%', height: '1px', background: '#aac4aa' }} />
        </div>
      )}
    </div>
  )
}

// Conference table with wood texture
function ConferenceTable({ deptColor }: { deptColor: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '55%',
        height: '35%',
        background: FURNITURE_COLORS.wood_med,
        border: `1px solid ${FURNITURE_COLORS.wood_dark}`,
        borderRadius: '3px',
        boxShadow: `0 3px 8px rgba(0,0,0,0.5), inset 0 1px 0 ${FURNITURE_COLORS.wood_light}30`,
        overflow: 'hidden',
      }}
    >
      {/* Wood grain lines */}
      <div style={{ position: 'absolute', top: '3px', left: 0, right: 0, height: '1px', background: `${FURNITURE_COLORS.wood_dark}40` }} />
      <div style={{ position: 'absolute', top: '8px', left: 0, right: 0, height: '1px', background: `${FURNITURE_COLORS.wood_dark}30` }} />
      {/* Meeting status glow overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center, ${deptColor}08 0%, transparent 70%)`,
        }}
      />
    </div>
  )
}

export const MeetingRoom = memo(function MeetingRoom({
  employees,
  activeMeetings,
  onSelectEmployee,
}: MeetingRoomProps) {
  const deptColor = DEPT_COLORS['meetings'] || '#4a5568'
  const activeMeeting = activeMeetings[0] || null

  // Find employee objects for meeting participants
  const meetingEmployees: OfficeEmployee[] = activeMeeting
    ? activeMeeting.participants
        .map((name) => employees.find((e) => e.name === name))
        .filter(Boolean)
        .slice(0, 8) as OfficeEmployee[]
    : []

  return (
    <>
      <style>{LIVE_PULSE_KEYFRAME}</style>
      <div
        style={{
          gridColumn: '5',
          gridRow: '3',
          position: 'relative',
          border: `1px solid ${deptColor}25`,
          borderTop: `3px solid ${deptColor}`,
          borderRadius: '4px',
          background: activeMeeting
            ? `color-mix(in srgb, ${deptColor} 4%, #14141e)`
            : '#13131c',
          overflow: 'hidden',
          minHeight: '140px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px 3px',
            background: `color-mix(in srgb, ${deptColor} 8%, #0e0e18)`,
            borderBottom: `1px solid ${deptColor}30`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '3px', height: '10px', background: deptColor, borderRadius: '1px', opacity: 0.8 }} />
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '9px',
                fontWeight: 700,
                color: deptColor,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Meeting Room
            </span>
          </div>
          {activeMeeting ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#fc5c65',
                  animation: 'live-pulse 1.2s ease-in-out infinite',
                }}
              />
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '7px',
                  color: '#fc5c65',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                }}
              >
                LIVE
              </span>
            </div>
          ) : (
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '7px',
                color: deptColor,
                opacity: 0.5,
                letterSpacing: '0.1em',
              }}
            >
              AVAILABLE
            </span>
          )}
        </div>

        {/* Table area with chairs */}
        <div
          style={{
            position: 'relative',
            margin: '8px',
            height: '90px',
          }}
        >
          {/* Whiteboard at top */}
          <Whiteboard title={activeMeeting?.title} />

          {/* Conference table */}
          <ConferenceTable deptColor={deptColor} />

          {/* Chairs around the table */}
          {CHAIR_POSITIONS.map((pos, i) => {
            const emp = meetingEmployees[i]
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: pos.top,
                  left: pos.left,
                  width: '10px',
                  height: '8px',
                  zIndex: emp ? 2 : 1,
                  cursor: emp ? 'pointer' : 'default',
                }}
                onClick={emp ? () => onSelectEmployee(emp.name) : undefined}
                title={emp?.displayName}
              >
                {emp ? (
                  // Occupied chair — show sprite, scaled small
                  <div
                    style={{
                      position: 'absolute',
                      top: '-16px',
                      left: '-3px',
                      transform: 'scale(0.6)',
                      transformOrigin: 'bottom center',
                    }}
                  >
                    <EmployeeSprite
                      name={emp.name}
                      department={emp.department}
                      status="meeting"
                      scale={3}
                    />
                  </div>
                ) : (
                  <Chair rotate={pos.rotate} occupied={false} />
                )}
              </div>
            )
          })}

          {/* Empty state overlay */}
          {meetingEmployees.length === 0 && (
            <div
              style={{
                position: 'absolute',
                top: '55%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontFamily: 'monospace',
                fontSize: '7px',
                color: 'var(--text-tertiary, #444)',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                letterSpacing: '0.1em',
                opacity: 0.6,
              }}
            >
              no meeting
            </div>
          )}
        </div>

        {/* Active meeting title below table area */}
        {activeMeeting?.title && (
          <div
            style={{
              padding: '2px 8px 4px',
              fontFamily: 'monospace',
              fontSize: '7px',
              color: deptColor,
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              opacity: 0.8,
            }}
          >
            {activeMeeting.title}
          </div>
        )}
      </div>
    </>
  )
})
