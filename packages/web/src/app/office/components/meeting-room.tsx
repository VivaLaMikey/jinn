'use client'

import React, { memo } from 'react'
import { EmployeeSprite } from './employee-sprite'
import { DEPT_COLORS } from '../lib/pixel-palette'
import type { OfficeEmployee, ActiveMeeting } from '../hooks/use-office-state'

interface MeetingRoomProps {
  employees: OfficeEmployee[]
  activeMeetings: ActiveMeeting[]
  onSelectEmployee: (name: string) => void
}

// Positions around a table (up to 8 participants)
const TABLE_POSITIONS = [
  { top: '20%', left: '15%' },
  { top: '20%', left: '40%' },
  { top: '20%', left: '65%' },
  { top: '55%', left: '15%' },
  { top: '55%', left: '40%' },
  { top: '55%', left: '65%' },
  { top: '38%', left: '5%' },
  { top: '38%', left: '75%' },
]

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
    <div
      style={{
        gridColumn: '5',
        gridRow: '3',
        position: 'relative',
        border: '1px solid var(--separator, #2a2a2a)',
        borderTop: `3px solid ${deptColor}`,
        borderRadius: '4px',
        background: 'var(--fill-tertiary, rgba(255,255,255,0.02))',
        overflow: 'hidden',
        minHeight: '120px',
      }}
    >
      {/* Header */}
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
          Meeting Room
        </span>
        {activeMeeting && (
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '7px',
              color: 'var(--system-orange, #ed8936)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          >
            LIVE
          </span>
        )}
      </div>

      {/* Conference table */}
      <div
        style={{
          position: 'relative',
          margin: '8px',
          height: '80px',
        }}
      >
        {/* Table */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '55%',
            height: '40%',
            background: 'var(--fill-tertiary, #1e1e1e)',
            border: `1px solid ${deptColor}40`,
            borderRadius: '4px',
          }}
        />

        {/* Participants around table */}
        {meetingEmployees.map((emp, i) => {
          const pos = TABLE_POSITIONS[i]
          return (
            <div
              key={emp.name}
              onClick={() => onSelectEmployee(emp.name)}
              style={{
                position: 'absolute',
                top: pos.top,
                left: pos.left,
                transform: 'translate(-50%, -50%)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
              }}
              title={emp.displayName}
            >
              <EmployeeSprite
                name={emp.name}
                department={emp.department}
                status="meeting"
              />
            </div>
          )
        })}

        {/* Empty state */}
        {meetingEmployees.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontFamily: 'monospace',
              fontSize: '8px',
              color: 'var(--text-tertiary, #444)',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            no meeting
          </div>
        )}
      </div>

      {/* Meeting title */}
      {activeMeeting?.title && (
        <div
          style={{
            padding: '2px 8px 4px',
            fontFamily: 'monospace',
            fontSize: '8px',
            color: 'var(--system-orange, #ed8936)',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {activeMeeting.title}
        </div>
      )}
    </div>
  )
})
