'use client'

import React, { memo } from 'react'
import { Room } from './room'
import { CooOffice } from './coo-office'
import { MeetingRoom } from './meeting-room'
import { DustParticles } from './dust-particles'
import { ROOMS } from '../lib/office-layout'
import type { OfficeEmployee, ActiveMeeting } from '../hooks/use-office-state'

interface OfficeFloorProps {
  employees: OfficeEmployee[]
  activeMeetings: ActiveMeeting[]
  onSelectEmployee: (name: string) => void
  cooTargetEmployee?: string | null
}

// Water cooler decoration
function WaterCooler() {
  return (
    <div
      style={{
        position: 'absolute',
        right: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '16px',
        height: '28px',
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      {/* Water tank */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '3px',
          width: '10px',
          height: '12px',
          background: 'rgba(100,180,255,0.4)',
          border: '1px solid rgba(100,180,255,0.6)',
          borderRadius: '3px 3px 0 0',
        }}
      />
      {/* Body */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '1px',
          width: '14px',
          height: '12px',
          background: 'var(--fill-tertiary, #2a2a2a)',
          border: '1px solid var(--separator, #333)',
          borderRadius: '1px',
        }}
      />
      {/* Dispenser button */}
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '4px',
          width: '4px',
          height: '4px',
          background: '#29adff',
          borderRadius: '1px',
        }}
      />
      {/* Legs */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '3px',
          width: '3px',
          height: '4px',
          background: 'var(--separator, #333)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: '3px',
          width: '3px',
          height: '4px',
          background: 'var(--separator, #333)',
        }}
      />
    </div>
  )
}

// Non-special rooms (all except coo-office and meeting-room)
const MAIN_ROOMS = ROOMS.filter(
  (r) => r.id !== 'coo-office' && r.id !== 'meeting-room',
)

export const OfficeFloor = memo(function OfficeFloor({
  employees,
  activeMeetings,
  onSelectEmployee,
  cooTargetEmployee,
}: OfficeFloorProps) {
  const jinnEmployee = employees.find((e) => e.name === 'jinn') || null

  return (
    <div
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        padding: '8px',
        fontFamily: 'monospace',
      }}
    >
      {/* Grid layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gridTemplateRows: '1fr auto 1fr',
          gap: '6px',
          height: '100%',
          minHeight: '400px',
        }}
      >
        {/* Main rooms */}
        {MAIN_ROOMS.map((room) => (
          <Room
            key={room.id}
            room={room}
            employees={employees}
            onSelectEmployee={onSelectEmployee}
          />
        ))}

        {/* COO Office (special) */}
        <CooOffice
          onSelectEmployee={onSelectEmployee}
          targetEmployee={cooTargetEmployee}
          jinnEmployee={jinnEmployee}
        />

        {/* Hallway divider (row 2, all columns) */}
        <div
          style={{
            gridColumn: '1 / -1',
            gridRow: '2',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            height: '24px',
          }}
        >
          <div
            style={{
              flex: 1,
              borderTop: '1px dashed var(--separator, #1a1a1a)',
              opacity: 0.5,
            }}
          />
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '8px',
              color: 'var(--text-tertiary, #333)',
              padding: '0 8px',
              letterSpacing: '0.15em',
              opacity: 0.6,
            }}
          >
            FLOOR 1
          </span>
          <div
            style={{
              flex: 1,
              borderTop: '1px dashed var(--separator, #1a1a1a)',
              opacity: 0.5,
            }}
          />
          <WaterCooler />
        </div>

        {/* Meeting room (special) */}
        <MeetingRoom
          employees={employees}
          activeMeetings={activeMeetings}
          onSelectEmployee={onSelectEmployee}
        />
      </div>

      {/* Ambient dust particles overlay */}
      <DustParticles />
    </div>
  )
})
