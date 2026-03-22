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
import { FLOOR_COLORS, FURNITURE_COLORS, WALL_COLORS } from '../lib/pixel-palette'
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
}

// ─── Isometric water cooler ───────────────────────────────────────────────────
function WaterCooler() {
  return (
    <div
      style={{
        position: 'absolute',
        right: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '20px',
        height: '34px',
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      {/* Water bottle */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '4px',
          width: '12px',
          height: '14px',
          background: 'rgba(80,160,255,0.38)',
          border: '1px solid rgba(100,180,255,0.65)',
          borderRadius: '4px 4px 2px 2px',
          boxShadow: 'inset 2px 2px 0 rgba(200,230,255,0.18)',
        }}
      />
      {/* Neck */}
      <div
        style={{
          position: 'absolute',
          top: '13px',
          left: '7px',
          width: '6px',
          height: '3px',
          background: 'rgba(60,130,220,0.55)',
          border: '1px solid rgba(100,180,255,0.4)',
        }}
      />
      {/* Machine body */}
      <div
        style={{
          position: 'absolute',
          top: '15px',
          left: '1px',
          width: '18px',
          height: '13px',
          background: FURNITURE_COLORS.wood_dark,
          border: `1px solid ${FURNITURE_COLORS.wood_med}`,
          borderRadius: '2px',
        }}
      />
      {/* Hot/cold buttons */}
      <div style={{ position: 'absolute', top: '19px', left: '3px',  width: '5px', height: '4px', background: '#4A90D9', borderRadius: '1px', boxShadow: '0 0 3px #4A90D980' }} />
      <div style={{ position: 'absolute', top: '19px', left: '11px', width: '5px', height: '4px', background: '#D94A3A', borderRadius: '1px', boxShadow: '0 0 3px #D94A3A80' }} />
      {/* Drip tray */}
      <div style={{ position: 'absolute', top: '27px', left: '2px', width: '16px', height: '2px', background: '#2A1810', border: '1px solid #4A3020', borderRadius: '1px' }} />
      {/* Legs */}
      <div style={{ position: 'absolute', bottom: 0, left: '4px',  width: '4px', height: '3px', background: '#2A1810' }} />
      <div style={{ position: 'absolute', bottom: 0, right: '4px', width: '4px', height: '3px', background: '#2A1810' }} />
    </div>
  )
}

// ─── Habbo-style notice board ─────────────────────────────────────────────────
function NoticeBoard({ onClick }: { onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        left: '14px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '32px',
        height: '24px',
        pointerEvents: 'auto',
        cursor: 'pointer',
      }}
      title='Notice Board'
    >
      <div
        style={{
          width: '32px',
          height: '24px',
          background: FURNITURE_COLORS.wood_dark,
          border: `3px solid ${FURNITURE_COLORS.wood_med}`,
          borderRadius: '2px',
          overflow: 'hidden',
          position: 'relative',
          transition: 'filter 0.15s ease',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.5)' }}
        onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)' }}
      >
        {/* Cork surface */}
        <div style={{ position: 'absolute', inset: '1px', background: '#8C5A18' }} />
        {/* Pinned notes — warm paper colours */}
        <div style={{ position: 'absolute', top: '2px', left: '2px',  width: '9px', height: '7px', background: '#F5F0D0', borderRadius: '1px', transform: 'rotate(-2deg)' }} />
        <div style={{ position: 'absolute', top: '2px', right: '2px', width: '7px', height: '6px', background: '#D0E8FF', borderRadius: '1px', transform: 'rotate(3deg)' }} />
        <div style={{ position: 'absolute', bottom: '2px', left: '4px', width: '8px', height: '5px', background: '#FFD0D0', borderRadius: '1px', transform: 'rotate(-1deg)' }} />
        {/* Push pins */}
        <div style={{ position: 'absolute', top: '2px', left: '6px',  width: '2px', height: '2px', background: '#D94A3A', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '2px', right: '5px', width: '2px', height: '2px', background: '#4A90D9', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: '3px', left: '8px', width: '2px', height: '2px', background: '#E8A020', borderRadius: '50%' }} />
      </div>
    </div>
  )
}

// ─── Isometric corridor strip ─────────────────────────────────────────────────
// Uses repeating diamond tile pattern to suggest isometric flooring
function CorridorStrip({ onNoticeBoard }: { onNoticeBoard?: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        height: '44px',
        flexShrink: 0,
        // Alternating warm tile stripes evoking isometric corridor flooring
        background: `repeating-linear-gradient(
          90deg,
          ${FLOOR_COLORS.tile_light} 0px,
          ${FLOOR_COLORS.tile_light} 23px,
          ${FLOOR_COLORS.tile_dark}  23px,
          ${FLOOR_COLORS.tile_dark}  24px
        )`,
        borderTop: `2px solid ${FURNITURE_COLORS.wood_med}`,
        borderBottom: `2px solid ${FURNITURE_COLORS.wood_med}`,
        boxShadow: `inset 0 2px 4px rgba(0,0,0,0.12), inset 0 -2px 4px rgba(0,0,0,0.08)`,
      }}
    >
      {/* Dashed centre line */}
      <div
        style={{
          position: 'absolute',
          left: '48px',
          right: '48px',
          top: '50%',
          borderTop: '1px dashed rgba(100,80,40,0.25)',
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
          color: '#8C6B3A',
          letterSpacing: '0.2em',
          opacity: 0.7,
          background: FLOOR_COLORS.tile_light,
          padding: '0 6px',
          whiteSpace: 'nowrap',
          fontWeight: 700,
        }}
      >
        CORRIDOR · FLOOR 1
      </span>
      <NoticeBoard onClick={onNoticeBoard} />
      <WaterCooler />
    </div>
  )
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeader({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '2px 0',
        flexShrink: 0,
      }}
    >
      <div style={{ height: '1px', flex: 1, background: FURNITURE_COLORS.wood_med, opacity: 0.4 }} />
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: '7px',
          fontWeight: 700,
          color: '#8C6B3A',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          opacity: 0.8,
        }}
      >
        {label}
      </span>
      <div style={{ height: '1px', flex: 1, background: FURNITURE_COLORS.wood_med, opacity: 0.4 }} />
    </div>
  )
}

// ─── Building sign strip ──────────────────────────────────────────────────────
function BuildingSign() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 12px',
        borderBottom: `3px solid ${FURNITURE_COLORS.wood_med}`,
        background: `linear-gradient(180deg, #5A3018 0%, ${FURNITURE_COLORS.wood_dark} 100%)`,
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Decorative isometric diamond pillars */}
        <div
          style={{
            width: '10px',
            height: '10px',
            background: '#E8A020',
            transform: 'rotate(45deg)',
            opacity: 0.7,
            boxShadow: '0 0 6px #E8A02040',
          }}
        />
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            fontWeight: 700,
            color: '#E8A020',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            textShadow: '0 0 12px #E8A02060, 0 1px 0 rgba(0,0,0,0.5)',
          }}
        >
          JINN HQ
        </span>
        <div
          style={{
            width: '10px',
            height: '10px',
            background: '#E8A020',
            transform: 'rotate(45deg)',
            opacity: 0.7,
            boxShadow: '0 0 6px #E8A02040',
          }}
        />
      </div>
    </div>
  )
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
}: OfficeFloorProps) {
  const jinnEmployee = employees.find((e) => e.name === 'jinn') || null
  const scrollableRef = useRef<HTMLDivElement>(null)

  const empList = useMemo(
    () => employees.map((e) => ({ name: e.name, department: e.department })),
    [employees],
  )
  const { rooms } = useMemo(() => buildRoomsFromEmployees(empList), [empList])

  // Rooms with 5+ employees span 2 columns
  const roomSpans = useMemo(
    () => rooms.map((room) => ((departments.get(room.department)?.length ?? 0) >= 5 ? 'span 2' : 'span 1')),
    [rooms, departments],
  )

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
        background: WALL_COLORS.trim,
      }}
    >
      {/* Building sign */}
      <BuildingSign />

      {/* Scrollable floor area */}
      <div
        ref={scrollableRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          position: 'relative',
          cursor: (!decorationMode && onTileClick) ? 'pointer' : 'default',
        }}
        onClick={handleClickToMove}
      >
        {/* Department rooms grid */}
        {rooms.length > 0 && (
          <>
            <SectionHeader label='Department Floor' />
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gridAutoRows: '1fr',
                gap: '12px',
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
          </>
        )}

        {/* Corridor */}
        <CorridorStrip onNoticeBoard={onNoticeBoard} />

        {/* Special rooms — executive wing */}
        <SectionHeader label='Executive Wing' />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: breakEmployees.length > 0 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
            gap: '12px',
          }}
        >
          <CooOffice
            onSelectEmployee={onSelectEmployee}
            targetEmployee={cooTargetEmployee}
            jinnEmployee={jinnEmployee}
            cooPosition={cooPosition}
            cooDirection={cooDirection}
            cooWalking={cooWalking}
          />
          <MeetingRoom
            employees={employees}
            activeMeetings={activeMeetings}
            onSelectEmployee={onSelectEmployee}
          />
          {breakEmployees.length > 0 && (
            <BreakRoom
              employees={breakEmployees}
              onSelectEmployee={onSelectEmployee}
            />
          )}
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
