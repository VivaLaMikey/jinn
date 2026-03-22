'use client'

import React, { memo, useEffect, useRef, useState } from 'react'
import { EmployeeSprite } from './employee-sprite'
import { SpeechBubble } from './speech-bubble'
import { DEPT_COLORS, FURNITURE_COLORS, MONITOR_COLORS, WALL_COLORS, FLOOR_COLORS } from '../lib/pixel-palette'
import type { OfficeEmployee } from '../hooks/use-office-state'

interface CooOfficeProps {
  onSelectEmployee: (name: string) => void
  targetEmployee?: string | null
  jinnEmployee?: OfficeEmployee | null
  /** When set, the COO has moved away from their desk via click-to-move */
  cooPosition?: { x: number; y: number } | null
  cooDirection?: 'se' | 'sw' | 'ne' | 'nw'
  cooWalking?: boolean
}

const COO_DEPT = 'coo'
const JINN_NAME = 'jinn'

const COO_EMPLOYEE: OfficeEmployee = {
  name: JINN_NAME,
  displayName: 'Jinn',
  department: COO_DEPT,
  status: 'idle',
  taskSnippet: null,
  sessionId: null,
  isManager: true,
}

// ─── Isometric room floor: diamond-grid tiles ─────────────────────────────────
function IsoFloor({ cols, rows }: { cols: number; rows: number }) {
  const TILE_W = 32
  const TILE_H = 16
  const tiles: React.ReactNode[] = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = (col - row) * (TILE_W / 2)
      const y = (col + row) * (TILE_H / 2)
      const isLight = (col + row) % 2 === 0
      tiles.push(
        <div
          key={`${col}-${row}`}
          style={{
            position: 'absolute',
            left: `calc(50% + ${x}px)`,
            top: `${y}px`,
            width: TILE_W,
            height: TILE_H,
            background: isLight ? FLOOR_COLORS.tile_light : FLOOR_COLORS.tile_dark,
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            transform: 'translateX(-50%)',
          }}
        />,
      )
    }
  }

  const totalW = (cols + rows) * (TILE_W / 2)
  const totalH = (cols + rows) * (TILE_H / 2)
  return (
    <div style={{ position: 'relative', width: totalW, height: totalH, margin: '0 auto', flexShrink: 0 }}>
      {tiles}
    </div>
  )
}

// ─── Isometric left wall panel ────────────────────────────────────────────────
function IsoLeftWall({ width, height, color }: { width: number; height: number; color: string }) {
  return (
    <div
      style={{
        width,
        height,
        background: color,
        clipPath: `polygon(0% 50%, 50% 0%, 50% ${height}px, 0% ${height + height / 2}px)`,
        position: 'absolute',
      }}
    />
  )
}

// ─── Pixel-art cityscape window ───────────────────────────────────────────────
function OfficeWindow() {
  return (
    <div
      style={{
        position: 'absolute',
        top: '24px',
        left: '8px',
        width: '36px',
        height: '28px',
        pointerEvents: 'none',
        zIndex: 2,
      }}
      aria-hidden
    >
      {/* Frame */}
      <div
        style={{
          width: '36px',
          height: '28px',
          border: `3px solid ${FURNITURE_COLORS.wood_dark}`,
          borderRadius: '2px',
          overflow: 'hidden',
          position: 'relative',
          background: 'linear-gradient(180deg, #0d1535 0%, #1a1060 50%, #0d0820 100%)',
        }}
      >
        {/* City silhouettes */}
        <div style={{ position: 'absolute', bottom: 0, left: '1px',  width: '6px',  height: '12px', background: '#0d1020' }} />
        <div style={{ position: 'absolute', bottom: 0, left: '8px',  width: '5px',  height: '16px', background: '#0a0d18' }} />
        <div style={{ position: 'absolute', bottom: 0, left: '14px', width: '7px',  height: '10px', background: '#0d1020' }} />
        <div style={{ position: 'absolute', bottom: 0, left: '22px', width: '5px',  height: '14px', background: '#0a0d18' }} />
        <div style={{ position: 'absolute', bottom: 0, right: '1px', width: '6px',  height: '11px', background: '#0d1020' }} />
        {/* Lit windows */}
        <div style={{ position: 'absolute', bottom: '4px',  left: '2px',  width: '2px', height: '2px', background: '#ffd70090' }} />
        <div style={{ position: 'absolute', bottom: '8px',  left: '9px',  width: '2px', height: '2px', background: '#ffffa080' }} />
        <div style={{ position: 'absolute', bottom: '12px', left: '9px',  width: '2px', height: '2px', background: '#ffd70060' }} />
        <div style={{ position: 'absolute', bottom: '4px',  left: '23px', width: '2px', height: '2px', background: '#ffd70090' }} />
        <div style={{ position: 'absolute', bottom: '9px',  left: '23px', width: '2px', height: '2px', background: '#ffd70060' }} />
        {/* Moon */}
        <div style={{ position: 'absolute', top: '3px', right: '4px', width: '5px', height: '5px', background: '#ffffdd', borderRadius: '50%', boxShadow: '0 0 4px #ffffaa' }} />
        {/* Centre divider */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '2px', background: `${FURNITURE_COLORS.wood_dark}80`, transform: 'translateX(-50%)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '2px', background: `${FURNITURE_COLORS.wood_dark}80`, transform: 'translateY(-50%)' }} />
      </div>
      {/* Sill */}
      <div style={{ width: '38px', height: '3px', background: FURNITURE_COLORS.wood_med, marginLeft: '-1px' }} />
    </div>
  )
}

// ─── Colourful bookshelf ──────────────────────────────────────────────────────
function Bookshelf() {
  const books = [
    { w: 4, h: 16, c: '#4A90D9' },
    { w: 3, h: 14, c: '#E8A020' },
    { w: 5, h: 17, c: '#8C7B6B' },
    { w: 3, h: 13, c: '#E07828' },
    { w: 4, h: 15, c: '#9B6CD4' },
    { w: 3, h: 16, c: '#E05C8A' },
    { w: 4, h: 12, c: '#5BBF6A' },
  ]

  return (
    <div
      style={{
        position: 'absolute',
        top: '22px',
        right: '8px',
        width: '32px',
        height: '24px',
        pointerEvents: 'none',
        zIndex: 2,
      }}
      aria-hidden
    >
      {/* Shelf casing */}
      <div
        style={{
          width: '32px',
          height: '24px',
          background: FURNITURE_COLORS.wood_dark,
          border: `1px solid ${FURNITURE_COLORS.wood_med}`,
          borderRadius: '1px',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '1px 2px 3px',
          gap: '0px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: `inset 0 2px 4px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Shelf floor line */}
        <div style={{ position: 'absolute', bottom: '3px', left: 0, right: 0, height: '1px', background: FURNITURE_COLORS.wood_med }} />
        {books.map((b, i) => (
          <div
            key={i}
            style={{
              width: `${b.w}px`,
              height: `${b.h}px`,
              background: b.c,
              opacity: 0.88,
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Triple-monitor desk (isometric-flavoured) ────────────────────────────────
function CooDesk({ deptColor, isWorking }: { deptColor: string; isWorking: boolean }) {
  const screenColour = isWorking ? MONITOR_COLORS.screen_on : MONITOR_COLORS.screen_off

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Monitor row */}
      <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', marginBottom: '2px' }}>
        {/* Left monitor */}
        <div
          style={{
            width: '18px',
            height: '13px',
            background: MONITOR_COLORS.frame,
            border: `2px solid ${FURNITURE_COLORS.wood_dark}`,
            borderRadius: '1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '8px',
              background: screenColour,
              borderRadius: '1px',
              boxShadow: isWorking ? `inset 0 0 3px ${deptColor}40` : 'none',
            }}
          />
        </div>
        {/* Centre monitor (primary — larger + glowing) */}
        <div
          style={{
            width: '26px',
            height: '18px',
            background: MONITOR_COLORS.frame,
            border: `2px solid ${deptColor}80`,
            borderRadius: '1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isWorking ? `0 0 10px ${deptColor}60, inset 0 0 4px ${deptColor}20` : 'none',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '13px',
              background: isWorking
                ? `color-mix(in srgb, ${deptColor} 18%, ${MONITOR_COLORS.screen_on})`
                : MONITOR_COLORS.screen_off,
              borderRadius: '1px',
            }}
          >
            {isWorking && (
              <>
                <div style={{ width: '100%', height: '1px', marginTop: '3px', background: `${deptColor}90` }} />
                <div style={{ width: '60%', height: '1px', marginTop: '2px', background: `${deptColor}60` }} />
              </>
            )}
          </div>
        </div>
        {/* Right monitor */}
        <div
          style={{
            width: '18px',
            height: '13px',
            background: MONITOR_COLORS.frame,
            border: `2px solid ${FURNITURE_COLORS.wood_dark}`,
            borderRadius: '1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '8px',
              background: screenColour,
              borderRadius: '1px',
              boxShadow: isWorking ? `inset 0 0 3px ${deptColor}40` : 'none',
            }}
          />
        </div>
      </div>

      {/* Desk surface */}
      <div
        style={{
          width: '92px',
          height: '14px',
          background: FURNITURE_COLORS.wood_med,
          borderRadius: '2px',
          border: `1px solid ${FURNITURE_COLORS.wood_dark}`,
          boxShadow: `0 3px 5px rgba(0,0,0,0.5), inset 0 1px 0 ${FURNITURE_COLORS.wood_light}50`,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}
      >
        {/* Keyboard */}
        <div
          style={{
            width: '28px',
            height: '6px',
            background: '#3A2C1A',
            border: `1px solid ${FURNITURE_COLORS.wood_dark}`,
            borderRadius: '1px',
          }}
        />
        {/* Mouse */}
        <div
          style={{
            width: '6px',
            height: '8px',
            background: '#3A2C1A',
            border: `1px solid ${FURNITURE_COLORS.wood_dark}`,
            borderRadius: '2px',
          }}
        />
        {/* Coffee mug */}
        <div
          style={{
            width: '6px',
            height: '7px',
            background: deptColor,
            borderRadius: '1px',
            opacity: 0.7,
          }}
        />
      </div>
      {/* Desk front edge / fascia */}
      <div
        style={{
          width: '92px',
          height: '5px',
          background: FURNITURE_COLORS.wood_dark,
          borderRadius: '0 0 2px 2px',
          marginTop: '-1px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  )
}

// ─── Nameplate on the door ────────────────────────────────────────────────────
function Nameplate({ deptColor }: { deptColor: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '8px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: FURNITURE_COLORS.wood_dark,
        border: `2px solid ${deptColor}`,
        borderRadius: '3px',
        padding: '2px 8px',
        pointerEvents: 'none',
        boxShadow: `0 0 8px ${deptColor}40`,
      }}
      aria-hidden
    >
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: '7px',
          fontWeight: 700,
          color: deptColor,
          letterSpacing: '0.2em',
          textShadow: `0 0 5px ${deptColor}80`,
        }}
      >
        COO
      </span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export const CooOffice = memo(function CooOffice({
  onSelectEmployee,
  targetEmployee,
  jinnEmployee,
  cooPosition,
}: CooOfficeProps) {
  const deptColor = DEPT_COLORS[COO_DEPT]
  const [walkOffset, setWalkOffset] = useState({ x: 0, y: 0 })
  const walkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const employee = jinnEmployee || COO_EMPLOYEE
  const isWorking = employee.status === 'working'

  // Walk animation: move toward the floor (delegate), pause, return
  useEffect(() => {
    if (!targetEmployee) return
    setWalkOffset({ x: 68, y: 12 })
    const t = setTimeout(() => setWalkOffset({ x: 0, y: 0 }), 2600)
    walkTimeoutRef.current = t
    return () => clearTimeout(t)
  }, [targetEmployee])

  useEffect(() => {
    return () => {
      if (walkTimeoutRef.current) clearTimeout(walkTimeoutRef.current)
    }
  }, [])

  return (
    <div
      style={{
        position: 'relative',
        // Warm Habbo-style room — cream walls, wood accents
        background: `linear-gradient(160deg, color-mix(in srgb, ${deptColor} 8%, ${WALL_COLORS.base}) 0%, ${WALL_COLORS.trim} 100%)`,
        border: `2px solid ${FURNITURE_COLORS.wood_med}`,
        borderTop: `4px solid ${deptColor}`,
        borderRadius: '4px',
        overflow: 'hidden',
        minHeight: '160px',
        boxShadow: `inset 0 0 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.3)`,
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
          {/* Habbo-style coloured bar */}
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
            COO Office
          </span>
        </div>
        {/* Star badge */}
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '12px',
            color: deptColor,
            textShadow: `0 0 8px ${deptColor}`,
          }}
        >
          ★
        </span>
      </div>

      {/* Wall decorations */}
      <OfficeWindow />
      <Bookshelf />

      {/* Main room content */}
      <div
        style={{
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          marginTop: '18px',
        }}
      >
        {/* Triple-monitor desk */}
        <CooDesk deptColor={deptColor} isWorking={isWorking} />

        {/* Jinn sprite with walk animation — hidden when COO has walked away via click-to-move */}
        <div
          onClick={() => onSelectEmployee(employee.name)}
          style={{
            cursor: 'pointer',
            transform: `translate(${walkOffset.x}px, ${walkOffset.y}px)`,
            transition:
              walkOffset.x !== 0
                ? 'transform 1.1s cubic-bezier(0.4,0,0.2,1)'
                : 'transform 1.3s cubic-bezier(0.4,0,0.2,1)',
            willChange: 'transform',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            position: 'relative',
            zIndex: 2,
            opacity: cooPosition ? 0 : 1,
            pointerEvents: cooPosition ? 'none' : 'auto',
          }}
        >
          {/* Habbo-style speech bubble above head */}
          {isWorking && employee.taskSnippet && (
            <SpeechBubble
              text={employee.taskSnippet}
              employeeName='Jinn'
              deptColor={deptColor}
            />
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '96px',
              width: '64px',
            }}
          >
            <EmployeeSprite
              name={employee.name}
              department={COO_DEPT}
              status={employee.status}
              scale={4}
            />
          </div>

          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '8px',
              color: deptColor,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textShadow: `0 0 5px ${deptColor}70`,
              background: `${FURNITURE_COLORS.wood_dark}cc`,
              padding: '1px 5px',
              borderRadius: '2px',
              border: `1px solid ${deptColor}40`,
            }}
          >
            Jinn
          </span>
        </div>
      </div>

      {/* Nameplate */}
      <Nameplate deptColor={deptColor} />

      {/* Warm floor strip at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '12px',
          background: `repeating-linear-gradient(90deg, ${FLOOR_COLORS.tile_light} 0px, ${FLOOR_COLORS.tile_light} 15px, ${FLOOR_COLORS.tile_dark} 15px, ${FLOOR_COLORS.tile_dark} 16px)`,
          opacity: 0.5,
        }}
      />
    </div>
  )
})
