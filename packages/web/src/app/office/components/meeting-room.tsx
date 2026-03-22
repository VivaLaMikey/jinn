'use client'

import React, { memo } from 'react'
import { EmployeeSprite } from './employee-sprite'
import { DEPT_COLORS, FURNITURE_COLORS, FLOOR_COLORS, WALL_COLORS } from '../lib/pixel-palette'
import type { OfficeEmployee, ActiveMeeting } from '../hooks/use-office-state'

interface MeetingRoomProps {
  employees: OfficeEmployee[]
  activeMeetings: ActiveMeeting[]
  onSelectEmployee: (name: string) => void
}

const LIVE_PULSE_KEYFRAME = `
@keyframes meeting-live-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 4px #D94A3A; }
  50% { opacity: 0.4; box-shadow: 0 0 9px #D94A3A; }
}
`

// 8 seat positions around the isometric-style conference table
// Expressed as percentages within the table container div
const CHAIR_POSITIONS = [
  // Top row (above table)
  { top: '6%',  left: '18%', rotate: 0 },
  { top: '6%',  left: '38%', rotate: 0 },
  { top: '6%',  left: '58%', rotate: 0 },
  // Bottom row (below table)
  { top: '66%', left: '18%', rotate: 180 },
  { top: '66%', left: '38%', rotate: 180 },
  { top: '66%', left: '58%', rotate: 180 },
  // Left side
  { top: '36%', left: '3%',  rotate: 90 },
  // Right side
  { top: '36%', left: '80%', rotate: 270 },
]

// Habbo-style chair — warm wood tones
function Chair({ rotate, occupied }: { rotate: number; occupied: boolean }) {
  const seatBg = occupied ? '#6B5B4B' : FURNITURE_COLORS.wood_med
  const backBg = occupied ? '#8C7B6B' : FURNITURE_COLORS.wood_light

  return (
    <div
      style={{
        width: '12px',
        height: '10px',
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
          width: '10px',
          height: '4px',
          background: backBg,
          border: `1px solid ${FURNITURE_COLORS.wood_dark}`,
          borderRadius: '1px 1px 0 0',
        }}
      />
      {/* Seat */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '12px',
          height: '5px',
          background: seatBg,
          border: `1px solid ${FURNITURE_COLORS.wood_dark}`,
          borderRadius: '0 0 2px 2px',
        }}
      />
    </div>
  )
}

// Pixel-art whiteboard — warm off-white
function Whiteboard({ title }: { title?: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '4px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '65%',
        height: '18px',
        background: '#F5F0E0',
        border: `3px solid ${FURNITURE_COLORS.wood_med}`,
        borderRadius: '2px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        boxShadow: `0 1px 3px rgba(0,0,0,0.2)`,
      }}
      aria-hidden
    >
      {/* Whiteboard tray */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: FURNITURE_COLORS.wood_med,
        }}
      />
      {title ? (
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '6px',
            color: '#3A2010',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            padding: '0 3px',
            maxWidth: '100%',
            fontWeight: 700,
          }}
        >
          {title}
        </span>
      ) : (
        <div style={{ width: '100%', padding: '2px 5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ width: '65%', height: '1px', background: '#C8B898' }} />
          <div style={{ width: '40%', height: '1px', background: '#C8B898' }} />
        </div>
      )}
    </div>
  )
}

// Conference table — warm wood with isometric shadow
function ConferenceTable({ deptColor }: { deptColor: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '56%',
        height: '36%',
        background: FURNITURE_COLORS.wood_med,
        border: `2px solid ${FURNITURE_COLORS.wood_dark}`,
        borderRadius: '4px',
        boxShadow: `3px 4px 0 ${FURNITURE_COLORS.wood_dark}, 0 4px 10px rgba(0,0,0,0.4), inset 0 1px 0 ${FURNITURE_COLORS.wood_light}40`,
        overflow: 'hidden',
      }}
    >
      {/* Wood grain */}
      <div style={{ position: 'absolute', top: '4px', left: 0, right: 0, height: '1px', background: `${FURNITURE_COLORS.wood_dark}50` }} />
      <div style={{ position: 'absolute', top: '9px', left: 0, right: 0, height: '1px', background: `${FURNITURE_COLORS.wood_dark}35` }} />
      {/* Active meeting glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center, ${deptColor}12 0%, transparent 70%)`,
        }}
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export const MeetingRoom = memo(function MeetingRoom({
  employees,
  activeMeetings,
  onSelectEmployee,
}: MeetingRoomProps) {
  const deptColor = DEPT_COLORS['meetings'] || '#A07850'
  const activeMeeting = activeMeetings[0] || null

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
          position: 'relative',
          background: activeMeeting
            ? `color-mix(in srgb, ${deptColor} 6%, ${WALL_COLORS.base})`
            : WALL_COLORS.trim,
          border: `2px solid ${FURNITURE_COLORS.wood_med}`,
          borderTop: `4px solid ${deptColor}`,
          borderRadius: '4px',
          overflow: 'hidden',
          minHeight: '160px',
          boxShadow: `inset 0 0 30px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.3)`,
          transition: 'background 0.5s ease',
        }}
      >
        {/* Room header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 10px 3px',
            background: FURNITURE_COLORS.wood_dark,
            borderBottom: `2px solid ${deptColor}60`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '4px', height: '12px', background: deptColor, borderRadius: '2px' }} />
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '9px',
                fontWeight: 700,
                color: deptColor,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                textShadow: `0 0 6px ${deptColor}60`,
              }}
            >
              Meeting Room
            </span>
          </div>

          {/* LIVE / AVAILABLE indicator */}
          {activeMeeting ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#D94A3A',
                  animation: 'meeting-live-pulse 1.2s ease-in-out infinite',
                }}
              />
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '7px',
                  color: '#D94A3A',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textShadow: '0 0 6px #D94A3A80',
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
                opacity: 0.55,
                letterSpacing: '0.1em',
              }}
            >
              AVAILABLE
            </span>
          )}
        </div>

        {/* Table area */}
        <div
          style={{
            position: 'relative',
            margin: '8px',
            height: '96px',
          }}
        >
          {/* Whiteboard on back wall */}
          <Whiteboard title={activeMeeting?.title} />

          {/* Conference table */}
          <ConferenceTable deptColor={deptColor} />

          {/* Chairs — occupied ones show sprite */}
          {CHAIR_POSITIONS.map((pos, i) => {
            const emp = meetingEmployees[i]
            return (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  top: pos.top,
                  left: pos.left,
                  width: '12px',
                  height: '10px',
                  zIndex: emp ? 3 : 1,
                  cursor: emp ? 'pointer' : 'default',
                }}
                onClick={emp ? () => onSelectEmployee(emp.name) : undefined}
                title={emp?.displayName}
              >
                {emp ? (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-18px',
                      left: '-4px',
                      transform: 'scale(0.55)',
                      transformOrigin: 'bottom center',
                    }}
                  >
                    <EmployeeSprite
                      name={emp.name}
                      department={emp.department}
                      status='meeting'
                      scale={3}
                    />
                  </div>
                ) : (
                  <Chair rotate={pos.rotate} occupied={false} />
                )}
              </div>
            )
          })}

          {/* Empty-room placeholder */}
          {meetingEmployees.length === 0 && (
            <div
              style={{
                position: 'absolute',
                top: '58%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontFamily: 'monospace',
                fontSize: '7px',
                color: '#8C7B6B',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                letterSpacing: '0.1em',
                opacity: 0.65,
              }}
            >
              no meeting
            </div>
          )}
        </div>

        {/* Active meeting title banner */}
        {activeMeeting?.title && (
          <div
            style={{
              padding: '2px 10px 4px',
              fontFamily: 'monospace',
              fontSize: '7px',
              color: deptColor,
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontWeight: 700,
              background: `${deptColor}18`,
              borderTop: `1px solid ${deptColor}30`,
            }}
          >
            {activeMeeting.title}
          </div>
        )}

        {/* Warm floor strip at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '12px',
            background: `repeating-linear-gradient(90deg, ${FLOOR_COLORS.tile_light} 0px, ${FLOOR_COLORS.tile_light} 15px, ${FLOOR_COLORS.tile_dark} 15px, ${FLOOR_COLORS.tile_dark} 16px)`,
            opacity: 0.45,
          }}
        />
      </div>
    </>
  )
})
