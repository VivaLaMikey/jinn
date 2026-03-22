'use client'

import React, { memo, useMemo, useRef, useCallback } from 'react'
import { EmployeeSprite } from './employee-sprite'
import { Room } from './room'
import { CooOffice } from './coo-office'
import { MeetingRoom } from './meeting-room'
import { BreakRoom } from './break-room'
import { DustParticles } from './dust-particles'
import { DayNightOverlay } from './day-night-overlay'
import { buildRoomsFromEmployees } from '../lib/office-layout'
import type { OfficeEmployee, ActiveMeeting } from '../hooks/use-office-state'
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
  /** Employees currently on break (idle for 30+ min or rate-limited) */
  breakEmployees?: OfficeEmployee[]
  /** COO current pixel position (relative to floor scrollable container) */
  cooPosition?: { x: number; y: number } | null
  /** Pixel coordinate of the tile the COO is walking toward */
  cooDestination?: { x: number; y: number } | null
  /** Walk direction for sprite animation */
  cooDirection?: 'se' | 'sw' | 'ne' | 'nw'
  /** Whether the COO sprite is mid-walk */
  cooWalking?: boolean
  /** Called when any floor tile is clicked — provides floor-relative pixel coords */
  onTileClick?: (pos: { x: number; y: number }) => void
  /** Which room is currently being shown */
  currentRoomId: string
}

// ─── Main OfficeFloor component ───────────────────────────────────────────────

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
  breakEmployees = [],
  cooPosition,
  cooDestination,
  cooDirection,
  cooWalking,
  onTileClick,
  currentRoomId,
}: OfficeFloorProps) {
  const jinnEmployee = employees.find((e) => e.name === 'jinn') || null
  const scrollableRef = useRef<HTMLDivElement>(null)

  const empList = useMemo(
    () => employees.map((e) => ({ name: e.name, department: e.department })),
    [employees],
  )
  const { rooms } = useMemo(() => buildRoomsFromEmployees(empList), [empList])

  // Convert a click event on a child element to floor-container-relative coordinates
  const handleClickToMove = useCallback((e: React.MouseEvent) => {
    if (!onTileClick || decorationMode) return
    const container = scrollableRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const scrollTop  = container.scrollTop
    const scrollLeft = container.scrollLeft
    const x = e.clientX - rect.left + scrollLeft
    const y = e.clientY - rect.top  + scrollTop
    onTileClick({ x, y })
  }, [onTileClick, decorationMode])

  // Determine which room component to render for the current selection
  const currentRoomContent = useMemo(() => {
    if (currentRoomId === 'coo-office') {
      return (
        <CooOffice
          onSelectEmployee={onSelectEmployee}
          targetEmployee={cooTargetEmployee}
          jinnEmployee={jinnEmployee}
          cooPosition={cooPosition}
          cooDirection={cooDirection}
          cooWalking={cooWalking}
        />
      )
    }

    if (currentRoomId === 'meeting-room') {
      return (
        <MeetingRoom
          employees={employees}
          activeMeetings={activeMeetings}
          onSelectEmployee={onSelectEmployee}
        />
      )
    }

    if (currentRoomId === 'break-room') {
      return (
        <BreakRoom
          employees={breakEmployees}
          onSelectEmployee={onSelectEmployee}
        />
      )
    }

    // Department room — find the matching RoomDef
    const roomDef = rooms.find((r) => r.id === currentRoomId || r.department === currentRoomId)
    if (roomDef) {
      return (
        <Room
          room={roomDef}
          employeeNames={departments.get(roomDef.department) ?? []}
          employees={employees}
          onSelectEmployee={onSelectEmployee}
          decorations={decorations?.filter((d) => d.room === roomDef.name)}
          storeItems={storeItems}
          decorationMode={decorationMode}
          onRoomClick={onRoomClick}
        />
      )
    }

    // Fallback — show the first department room if the selected room isn't found
    const firstRoom = rooms[0]
    if (firstRoom) {
      return (
        <Room
          room={firstRoom}
          employeeNames={departments.get(firstRoom.department) ?? []}
          employees={employees}
          onSelectEmployee={onSelectEmployee}
          decorations={decorations?.filter((d) => d.room === firstRoom.name)}
          storeItems={storeItems}
          decorationMode={decorationMode}
          onRoomClick={onRoomClick}
        />
      )
    }

    return null
  }, [
    currentRoomId,
    rooms,
    employees,
    activeMeetings,
    onSelectEmployee,
    cooTargetEmployee,
    jinnEmployee,
    cooPosition,
    cooDirection,
    cooWalking,
    breakEmployees,
    departments,
    decorations,
    storeItems,
    decorationMode,
    onRoomClick,
  ])

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        position: 'relative',
        overflow: 'hidden',
        padding: 0,
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        // Classic Habbo page background — dark teal
        background: '#1B3A4B',
      }}
    >
      {/* Scrollable floor area — single room fills the space */}
      <div
        ref={scrollableRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'stretch',
          position: 'relative',
          cursor: (!decorationMode && onTileClick) ? 'pointer' : 'default',
        }}
        onClick={handleClickToMove}
      >
        {/* Single room — fills available space */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'stretch',
            minHeight: 0,
          }}
        >
          {currentRoomContent}
        </div>

        {/* ─── COO overlay sprite (absolutely positioned over scrollable area) ── */}
        {cooPosition && (
          <>
            {/* Destination highlight diamond */}
            {cooDestination && (
              <div
                style={{
                  position: 'absolute',
                  left: `${cooDestination.x - 16}px`,
                  top:  `${cooDestination.y - 8}px`,
                  width: '32px',
                  height: '16px',
                  background: 'rgba(232, 160, 32, 0.35)',
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                  pointerEvents: 'none',
                  zIndex: 100,
                  boxShadow: '0 0 8px rgba(232,160,32,0.6)',
                }}
              />
            )}
            {/* COO sprite */}
            <div
              style={{
                position: 'absolute',
                left: `${cooPosition.x - 40}px`,
                top:  `${cooPosition.y - 56}px`,
                pointerEvents: 'none',
                zIndex: 101,
                transition: `left ${350 * 0.9}ms linear, top ${350 * 0.9}ms linear`,
                willChange: 'left, top',
              }}
            >
              <EmployeeSprite
                name='jinn'
                department='coo'
                status={cooWalking ? 'idle' : 'idle'}
                scale={4}
                direction={cooWalking ? (cooDirection ?? 'se') : undefined}
              />
            </div>
          </>
        )}
      </div>

      {/* Ambient overlays */}
      <DustParticles />
      <DayNightOverlay />
    </div>
  )
})
