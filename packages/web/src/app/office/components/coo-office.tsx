'use client'

import React, { memo, useEffect, useRef, useState } from 'react'
import { EmployeeSprite } from './employee-sprite'
import { SpeechBubble } from './speech-bubble'
import { DEPT_COLORS, FURNITURE_COLORS, MONITOR_COLORS } from '../lib/pixel-palette'
import type { OfficeEmployee } from '../hooks/use-office-state'

interface CooOfficeProps {
  onSelectEmployee: (name: string) => void
  targetEmployee?: string | null
  jinnEmployee?: OfficeEmployee | null
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

// Pixel-art window with night cityscape
function OfficeWindow() {
  return (
    <div
      style={{
        position: 'absolute',
        top: '28px',
        left: '6px',
        width: '30px',
        height: '24px',
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      {/* Window frame */}
      <div
        style={{
          width: '30px',
          height: '24px',
          border: '2px solid #3a3a5a',
          borderRadius: '2px',
          overflow: 'hidden',
          position: 'relative',
          background: 'linear-gradient(180deg, #0d1535 0%, #1a1060 50%, #0d0820 100%)',
        }}
      >
        {/* City buildings */}
        <div style={{ position: 'absolute', bottom: 0, left: '1px', width: '5px', height: '10px', background: '#0d1020' }} />
        <div style={{ position: 'absolute', bottom: 0, left: '7px', width: '4px', height: '14px', background: '#0a0d18' }} />
        <div style={{ position: 'absolute', bottom: 0, left: '12px', width: '6px', height: '8px', background: '#0d1020' }} />
        <div style={{ position: 'absolute', bottom: 0, left: '19px', width: '4px', height: '12px', background: '#0a0d18' }} />
        <div style={{ position: 'absolute', bottom: 0, right: '1px', width: '5px', height: '9px', background: '#0d1020' }} />
        {/* Building windows (tiny yellow/white dots) */}
        <div style={{ position: 'absolute', bottom: '3px', left: '2px', width: '1px', height: '1px', background: '#ffd70080' }} />
        <div style={{ position: 'absolute', bottom: '6px', left: '2px', width: '1px', height: '1px', background: '#ffd70060' }} />
        <div style={{ position: 'absolute', bottom: '5px', left: '8px', width: '1px', height: '1px', background: '#ffffa080' }} />
        <div style={{ position: 'absolute', bottom: '8px', left: '8px', width: '1px', height: '1px', background: '#ffd70060' }} />
        <div style={{ position: 'absolute', bottom: '11px', left: '8px', width: '1px', height: '1px', background: '#ffd70040' }} />
        <div style={{ position: 'absolute', bottom: '3px', left: '20px', width: '1px', height: '1px', background: '#ffffa080' }} />
        <div style={{ position: 'absolute', bottom: '7px', left: '20px', width: '1px', height: '1px', background: '#ffd70060' }} />
        <div style={{ position: 'absolute', bottom: '10px', left: '21px', width: '1px', height: '1px', background: '#ffd70040' }} />
        {/* Moon */}
        <div style={{ position: 'absolute', top: '3px', right: '5px', width: '4px', height: '4px', background: '#ffffdd', borderRadius: '50%', boxShadow: '0 0 3px #ffffaa' }} />
      </div>
      {/* Window sill */}
      <div style={{ width: '32px', height: '2px', background: '#3a3a5a', marginLeft: '-1px', marginTop: '0px' }} />
    </div>
  )
}

// Bookshelf on the right wall
function Bookshelf() {
  const books = [
    { w: 4, h: 14, c: '#29adff' },
    { w: 3, h: 12, c: '#ffd700' },
    { w: 4, h: 15, c: '#8899aa' },
    { w: 3, h: 11, c: '#ff8c00' },
    { w: 4, h: 13, c: '#b06cff' },
    { w: 3, h: 14, c: '#ff6b9d' },
    { w: 4, h: 10, c: '#00e436' },
  ]

  return (
    <div
      style={{
        position: 'absolute',
        top: '26px',
        right: '6px',
        width: '28px',
        height: '20px',
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      {/* Shelf board */}
      <div
        style={{
          width: '28px',
          height: '20px',
          background: FURNITURE_COLORS.wood_dark,
          border: `1px solid ${FURNITURE_COLORS.wood_med}`,
          borderRadius: '1px',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '1px 1px 2px',
          gap: '0px',
          overflow: 'hidden',
        }}
      >
        {/* Bottom shelf line */}
        <div style={{ position: 'absolute', bottom: '2px', left: 0, right: 0, height: '1px', background: FURNITURE_COLORS.wood_med }} />
        {books.map((b, i) => (
          <div
            key={i}
            style={{
              width: `${b.w}px`,
              height: `${b.h}px`,
              background: b.c,
              opacity: 0.85,
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Triple-monitor desk for Jinn
function CooDesk({ deptColor, isWorking }: { deptColor: string; isWorking: boolean }) {
  const screenColour = isWorking ? MONITOR_COLORS.screen_on : MONITOR_COLORS.screen_off

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Monitor row */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', marginBottom: '2px' }}>
        {/* Left monitor (smaller) */}
        <div style={{ width: '16px', height: '12px', background: MONITOR_COLORS.frame, border: '1px solid #3a3a50', borderRadius: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '12px', height: '8px', background: screenColour, borderRadius: '1px', boxShadow: isWorking ? `inset 0 0 3px ${deptColor}40` : 'none' }} />
        </div>
        {/* Centre monitor (larger, main) */}
        <div
          style={{
            width: '22px',
            height: '16px',
            background: MONITOR_COLORS.frame,
            border: `1px solid ${deptColor}60`,
            borderRadius: '1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isWorking ? `0 0 8px ${deptColor}60` : 'none',
          }}
        >
          <div
            style={{
              width: '18px',
              height: '12px',
              background: isWorking ? `color-mix(in srgb, ${deptColor} 20%, ${MONITOR_COLORS.screen_on})` : MONITOR_COLORS.screen_off,
              borderRadius: '1px',
            }}
          >
            {isWorking && (
              <div style={{ width: '100%', height: '1px', marginTop: '4px', background: `${deptColor}80` }} />
            )}
          </div>
        </div>
        {/* Right monitor (smaller) */}
        <div style={{ width: '16px', height: '12px', background: MONITOR_COLORS.frame, border: '1px solid #3a3a50', borderRadius: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '12px', height: '8px', background: screenColour, borderRadius: '1px', boxShadow: isWorking ? `inset 0 0 3px ${deptColor}40` : 'none' }} />
        </div>
      </div>

      {/* Desk surface */}
      <div
        style={{
          width: '80px',
          height: '14px',
          background: FURNITURE_COLORS.wood_med,
          borderRadius: '2px',
          border: `1px solid ${FURNITURE_COLORS.wood_dark}`,
          boxShadow: `0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 ${FURNITURE_COLORS.wood_light}40`,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
        }}
      >
        {/* Keyboard */}
        <div
          style={{
            width: '24px',
            height: '5px',
            background: '#252535',
            border: '1px solid #3a3a50',
            borderRadius: '1px',
          }}
        />
        {/* Mouse */}
        <div
          style={{
            width: '5px',
            height: '7px',
            background: '#252535',
            border: '1px solid #3a3a50',
            borderRadius: '2px',
          }}
        />
      </div>
      {/* Desk front edge */}
      <div
        style={{
          width: '80px',
          height: '4px',
          background: FURNITURE_COLORS.wood_dark,
          borderRadius: '0 0 2px 2px',
          marginTop: '-1px',
        }}
      />
    </div>
  )
}

// COO nameplate on door
function Nameplate({ deptColor }: { deptColor: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '6px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: `color-mix(in srgb, ${deptColor} 15%, #1a1a22)`,
        border: `1px solid ${deptColor}60`,
        borderRadius: '2px',
        padding: '2px 6px',
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: '7px',
          fontWeight: 700,
          color: deptColor,
          letterSpacing: '0.15em',
        }}
      >
        COO
      </span>
    </div>
  )
}

export const CooOffice = memo(function CooOffice({
  onSelectEmployee,
  targetEmployee,
  jinnEmployee,
}: CooOfficeProps) {
  const deptColor = DEPT_COLORS[COO_DEPT]
  const [walkOffset, setWalkOffset] = useState({ x: 0, y: 0 })
  const walkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const employee = jinnEmployee || COO_EMPLOYEE
  const isWorking = employee.status === 'working'

  // Walk animation: move toward target (right, toward floor), pause, return
  useEffect(() => {
    if (!targetEmployee) return

    setWalkOffset({ x: 60, y: 10 })

    const returnTimer = setTimeout(() => {
      setWalkOffset({ x: 0, y: 0 })
    }, 2500)

    walkTimeoutRef.current = returnTimer
    return () => clearTimeout(returnTimer)
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
        border: `1px solid ${deptColor}30`,
        borderTop: `3px solid ${deptColor}`,
        borderRadius: '4px',
        background: `color-mix(in srgb, ${deptColor} 5%, #14141e)`,
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
          background: `color-mix(in srgb, ${deptColor} 10%, #0e0e18)`,
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
            COO Office
          </span>
        </div>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '10px',
            color: deptColor,
            opacity: 0.8,
            textShadow: `0 0 6px ${deptColor}`,
          }}
        >
          ★
        </span>
      </div>

      {/* Window decoration */}
      <OfficeWindow />

      {/* Bookshelf */}
      <Bookshelf />

      {/* Main content */}
      <div
        style={{
          padding: '8px 8px 8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          marginTop: '20px',
        }}
      >
        {/* Triple-monitor desk */}
        <CooDesk deptColor={deptColor} isWorking={isWorking} />

        {/* Jinn sprite with walk animation */}
        <div
          onClick={() => onSelectEmployee(employee.name)}
          style={{
            cursor: 'pointer',
            transform: `translate(${walkOffset.x}px, ${walkOffset.y}px)`,
            transition: walkOffset.x !== 0 ? 'transform 1.0s ease-in-out' : 'transform 1.2s ease-in-out',
            willChange: 'transform',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            zIndex: 1,
          }}
        >
          {/* Speech bubble */}
          {isWorking && employee.taskSnippet && (
            <SpeechBubble text={employee.taskSnippet} />
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
            {/* Jinn at 4x scale */}
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
              letterSpacing: '0.05em',
              textShadow: `0 0 4px ${deptColor}60`,
            }}
          >
            Jinn
          </span>
        </div>
      </div>

      {/* COO nameplate on door */}
      <Nameplate deptColor={deptColor} />
    </div>
  )
})
