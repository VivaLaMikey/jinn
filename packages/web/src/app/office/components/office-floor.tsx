'use client'

import React, { memo, useMemo } from 'react'
import { Room } from './room'
import { CooOffice } from './coo-office'
import { MeetingRoom } from './meeting-room'
import { DustParticles } from './dust-particles'
import { DayNightOverlay } from './day-night-overlay'
import { buildRoomsFromEmployees } from '../lib/office-layout'
import type { OfficeEmployee, ActiveMeeting } from '../hooks/use-office-state'
import { FLOOR_COLORS } from '../lib/pixel-palette'
import type { Decoration, StoreItem } from '@/lib/api'

interface OfficeFloorProps {
  employees: OfficeEmployee[]
  activeMeetings: ActiveMeeting[]
  onSelectEmployee: (name: string) => void
  cooTargetEmployee?: string | null
  departments: Map<string, string[]>
  decorations?: Decoration[]
  storeItems?: StoreItem[]
  decorationMode?: boolean
  onRoomClick?: (room: string, x: number, y: number) => void
  onNoticeBoard?: () => void
}

// Polished water cooler
function WaterCooler() {
  return (
    <div
      style={{
        position: 'absolute',
        right: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '18px',
        height: '32px',
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      {/* Water bottle — blue-tinted */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '3px',
          width: '12px',
          height: '14px',
          background: 'rgba(80,160,255,0.35)',
          border: '1px solid rgba(100,180,255,0.6)',
          borderRadius: '4px 4px 2px 2px',
          boxShadow: 'inset 2px 2px 0 rgba(200,230,255,0.15)',
        }}
      />
      {/* Bottle neck */}
      <div
        style={{
          position: 'absolute',
          top: '13px',
          left: '6px',
          width: '6px',
          height: '3px',
          background: 'rgba(60,130,220,0.5)',
          border: '1px solid rgba(100,180,255,0.4)',
        }}
      />
      {/* Machine body */}
      <div
        style={{
          position: 'absolute',
          top: '15px',
          left: '0px',
          width: '18px',
          height: '13px',
          background: 'var(--fill-tertiary, #2a2a3a)',
          border: '1px solid var(--separator, #3a3a4a)',
          borderRadius: '2px',
        }}
      />
      {/* Dispense buttons */}
      <div
        style={{
          position: 'absolute',
          top: '19px',
          left: '3px',
          width: '5px',
          height: '4px',
          background: '#29adff',
          borderRadius: '1px',
          boxShadow: '0 0 3px #29adff80',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '19px',
          left: '10px',
          width: '5px',
          height: '4px',
          background: '#fc5c65',
          borderRadius: '1px',
          boxShadow: '0 0 3px #fc5c6580',
        }}
      />
      {/* Drip tray */}
      <div
        style={{
          position: 'absolute',
          top: '27px',
          left: '1px',
          width: '16px',
          height: '2px',
          background: '#1a1a2a',
          border: '1px solid #333',
          borderRadius: '1px',
        }}
      />
      {/* Legs */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '3px',
          width: '4px',
          height: '3px',
          background: '#2a2a3a',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: '3px',
          width: '4px',
          height: '3px',
          background: '#2a2a3a',
        }}
      />
    </div>
  )
}

// Notice board on the hallway wall
function NoticeBoard({ onClick }: { onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        left: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '28px',
        height: '20px',
        pointerEvents: 'auto',
        cursor: 'pointer',
      }}
      title='Notice Board'
    >
      {/* Frame */}
      <div
        style={{
          width: '28px',
          height: '20px',
          background: '#2a1f0a',
          border: '2px solid #5c3e1a',
          borderRadius: '2px',
          overflow: 'hidden',
          position: 'relative',
          transition: 'filter 0.15s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.4)')}
        onMouseLeave={e => (e.currentTarget.style.filter = 'brightness(1)')}
      >
        {/* Cork surface */}
        <div
          style={{
            position: 'absolute',
            inset: '1px',
            background: '#3d2e16',
          }}
        />
        {/* Pinned notes */}
        <div style={{ position: 'absolute', top: '2px', left: '2px', width: '8px', height: '6px', background: '#f5f0d0', borderRadius: '1px', transform: 'rotate(-2deg)' }} />
        <div style={{ position: 'absolute', top: '2px', right: '2px', width: '6px', height: '5px', background: '#d0f0ff', borderRadius: '1px', transform: 'rotate(3deg)' }} />
        <div style={{ position: 'absolute', bottom: '2px', left: '4px', width: '7px', height: '4px', background: '#ffd0d0', borderRadius: '1px', transform: 'rotate(-1deg)' }} />
        {/* Pins */}
        <div style={{ position: 'absolute', top: '2px', left: '5px', width: '2px', height: '2px', background: '#ff5555', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '2px', right: '4px', width: '2px', height: '2px', background: '#5599ff', borderRadius: '50%' }} />
      </div>
    </div>
  )
}

export const OfficeFloor = memo(function OfficeFloor({
  employees,
  activeMeetings,
  onSelectEmployee,
  cooTargetEmployee,
  departments,
  decorations,
  storeItems,
  decorationMode,
  onRoomClick,
  onNoticeBoard,
}: OfficeFloorProps) {
  const jinnEmployee = employees.find((e) => e.name === 'jinn') || null

  // Build room definitions from the departments map
  const empList = useMemo(
    () => employees.map((e) => ({ name: e.name, department: e.department })),
    [employees],
  )
  const { rooms } = useMemo(() => buildRoomsFromEmployees(empList), [empList])

  // Rooms with 5+ employees span 2 columns; smaller ones stay at 1
  const roomSpans = useMemo(() => {
    return rooms.map((room) => {
      const count = departments.get(room.department)?.length ?? 0
      return count >= 5 ? 'span 2' : 'span 1'
    })
  }, [rooms, departments])

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        position: 'relative',
        overflow: 'hidden',
        padding: '0',
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Building sign at very top */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4px 8px',
          borderBottom: '1px solid var(--separator, #1a1a2a)',
          background: 'var(--fill-tertiary, rgba(255,255,255,0.02))',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {/* Decorative pillars */}
          <div style={{ width: '2px', height: '12px', background: '#ff8c0040', borderRadius: '1px' }} />
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '10px',
              fontWeight: 700,
              color: '#ff8c00',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              textShadow: '0 0 8px #ff8c0060',
            }}
          >
            JINN HQ
          </span>
          <div style={{ width: '2px', height: '12px', background: '#ff8c0040', borderRadius: '1px' }} />
        </div>
      </div>

      {/* Scrollable floor area */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '8px', display: 'grid', gridTemplateRows: '1fr auto 1fr', gap: '6px' }}>

        {/* Department rooms — flow grid that adapts to any number of departments */}
        {rooms.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: 'repeat(auto-fill, 1fr)',
              gap: '6px',
              height: '100%',
              minHeight: 0,
            }}
          >
            {rooms.map((room, i) => (
              <Room
                key={room.id}
                room={room}
                employeeNames={departments.get(room.department) ?? []}
                employees={employees}
                onSelectEmployee={onSelectEmployee}
                gridColumn={roomSpans[i]}
                decorations={decorations?.filter((d) => d.room === room.name)}
                storeItems={storeItems}
                decorationMode={decorationMode}
                onRoomClick={onRoomClick}
              />
            ))}
          </div>
        )}

        {/* Hallway / corridor divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            height: '32px',
            flexShrink: 0,
            background: `repeating-linear-gradient(
              90deg,
              ${FLOOR_COLORS.tile_light},
              ${FLOOR_COLORS.tile_light} 19px,
              ${FLOOR_COLORS.tile_dark} 19px,
              ${FLOOR_COLORS.tile_dark} 20px
            )`,
            borderTop: '1px solid rgba(255,255,255,0.04)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            borderRadius: '2px',
          }}
        >
          {/* Left separator line */}
          <div
            style={{
              position: 'absolute',
              left: '40px',
              right: '40px',
              top: '50%',
              borderTop: '1px dashed rgba(255,255,255,0.06)',
            }}
          />
          {/* Floor label */}
          <span
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              fontFamily: 'monospace',
              fontSize: '8px',
              color: 'var(--text-tertiary, #333)',
              letterSpacing: '0.2em',
              opacity: 0.5,
              background: FLOOR_COLORS.tile_light,
              padding: '0 6px',
              whiteSpace: 'nowrap',
            }}
          >
            CORRIDOR · FLOOR 1
          </span>
          <NoticeBoard onClick={onNoticeBoard} />
          <WaterCooler />
        </div>

        {/* Special rooms — COO Office and Meeting Room always last */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '6px',
            height: '100%',
            minHeight: 0,
          }}
        >
          <CooOffice
            onSelectEmployee={onSelectEmployee}
            targetEmployee={cooTargetEmployee}
            jinnEmployee={jinnEmployee}
          />
          <MeetingRoom
            employees={employees}
            activeMeetings={activeMeetings}
            onSelectEmployee={onSelectEmployee}
          />
        </div>
      </div>

      {/* Ambient dust particles overlay */}
      <DustParticles />
      {/* Day/night atmosphere overlay */}
      <DayNightOverlay />
    </div>
  )
})
