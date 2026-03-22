'use client'

import React, { memo, useEffect, useRef, useState } from 'react'
import { EmployeeSprite } from './employee-sprite'
import { DEPT_COLORS } from '../lib/pixel-palette'
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
}

// Plant decoration
function OfficeDecoration({ side }: { side: 'left' | 'right' }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '8px',
        [side]: '6px',
        width: '10px',
        height: '18px',
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '1px',
          width: '8px',
          height: '6px',
          background: '#5d3a1a',
          borderRadius: '0 0 2px 2px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '6px',
          left: '4px',
          width: '2px',
          height: '6px',
          background: '#2d5a1b',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '0px',
          width: '5px',
          height: '5px',
          background: '#3a7d1e',
          borderRadius: '50%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '4px',
          width: '5px',
          height: '5px',
          background: '#4caf50',
          borderRadius: '50%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '1px',
          width: '5px',
          height: '5px',
          background: '#66bb6a',
          borderRadius: '50%',
        }}
      />
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

  // Walk animation: move toward target, pause, return
  useEffect(() => {
    if (!targetEmployee) return

    // Move toward the right (toward the floor)
    setWalkOffset({ x: 30, y: 10 })

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
        gridColumn: '5',
        gridRow: '1',
        position: 'relative',
        border: '1px solid var(--separator, #2a2a2a)',
        borderTop: `3px solid ${deptColor}`,
        borderRadius: '4px',
        background: `color-mix(in srgb, ${deptColor} 3%, var(--fill-tertiary, rgba(255,255,255,0.02)))`,
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
          COO Office
        </span>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '8px',
            color: deptColor,
            opacity: 0.7,
          }}
        >
          ★
        </span>
      </div>

      {/* Main area */}
      <div
        style={{
          padding: '12px 8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {/* Large desk */}
        <div
          style={{
            width: '60px',
            height: '10px',
            background: 'var(--fill-tertiary, #2a2a2a)',
            borderRadius: '2px',
            border: `1px solid ${deptColor}60`,
            position: 'relative',
          }}
        >
          {/* Monitor */}
          <div
            style={{
              position: 'absolute',
              top: '2px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '14px',
              height: '6px',
              background: deptColor,
              borderRadius: '1px',
              opacity: 0.9,
              boxShadow: `0 0 6px ${deptColor}`,
            }}
          />
        </div>

        {/* Jinn sprite with walk animation */}
        <div
          onClick={() => onSelectEmployee(employee.name)}
          style={{
            cursor: 'pointer',
            transform: `translate(${walkOffset.x}px, ${walkOffset.y}px)`,
            transition: 'transform 1.5s ease-in-out',
            willChange: 'transform',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '40px',
              width: '40px',
            }}
          >
            <EmployeeSprite
              name={employee.name}
              department={COO_DEPT}
              status={employee.status}
            />
          </div>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '8px',
              color: deptColor,
              fontWeight: 600,
            }}
          >
            Jinn
          </span>
        </div>
      </div>

      {/* Decorative plants */}
      <OfficeDecoration side="left" />
      <OfficeDecoration side="right" />
    </div>
  )
})
