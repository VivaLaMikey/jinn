'use client'

import React, { memo } from 'react'
import { Desk } from './desk'
import type { OfficeEmployee } from '../hooks/use-office-state'
import type { RoomDef } from '../lib/office-layout'
import { getDeptColor, FLOOR_COLORS, WALL_COLORS } from '../lib/pixel-palette'

interface RoomProps {
  room: RoomDef
  /** Names of employees that belong in this room — provided by the parent. */
  employeeNames: string[]
  employees: OfficeEmployee[]
  onSelectEmployee: (name: string) => void
  /** CSS grid-column value, e.g. "span 2". Defaults to "span 1". */
  gridColumn?: string
}

// Enhanced corner plant with more detail
function CornerPlant() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '8px',
        right: '8px',
        width: '16px',
        height: '20px',
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      {/* Pot base */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '2px',
          width: '12px',
          height: '6px',
          background: '#6b3a1a',
          borderRadius: '0 0 3px 3px',
          boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.4)',
        }}
      />
      {/* Pot rim */}
      <div
        style={{
          position: 'absolute',
          bottom: '6px',
          left: '1px',
          width: '14px',
          height: '2px',
          background: '#8b4a22',
          borderRadius: '1px',
        }}
      />
      {/* Soil */}
      <div
        style={{
          position: 'absolute',
          bottom: '7px',
          left: '3px',
          width: '10px',
          height: '2px',
          background: '#1a0e06',
          borderRadius: '1px',
        }}
      />
      {/* Main stem */}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '7px',
          width: '2px',
          height: '5px',
          background: '#2d7a1a',
        }}
      />
      {/* Left leaf */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '1px',
          width: '7px',
          height: '5px',
          background: '#2e8b3a',
          borderRadius: '50% 0 50% 0',
          transform: 'rotate(-10deg)',
        }}
      />
      {/* Right leaf */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          right: '1px',
          width: '7px',
          height: '5px',
          background: '#3cb355',
          borderRadius: '0 50% 0 50%',
          transform: 'rotate(10deg)',
        }}
      />
      {/* Top leaf cluster */}
      <div
        style={{
          position: 'absolute',
          bottom: '13px',
          left: '4px',
          width: '8px',
          height: '6px',
          background: '#44cc55',
          borderRadius: '50%',
        }}
      />
      {/* Highlight */}
      <div
        style={{
          position: 'absolute',
          bottom: '15px',
          left: '7px',
          width: '3px',
          height: '3px',
          background: '#66dd77',
          borderRadius: '50%',
          opacity: 0.6,
        }}
      />
    </div>
  )
}

// Department-specific wall decoration
function RoomDecoration({ department }: { department: string }) {
  switch (department) {
    case 'engineering':
      // Small server rack icon
      return (
        <div
          style={{
            position: 'absolute',
            top: '28px',
            right: '6px',
            width: '10px',
            height: '16px',
            pointerEvents: 'none',
          }}
          aria-hidden
        >
          <div style={{ width: '10px', height: '3px', background: '#1a2a3a', border: '1px solid #29adff40', marginBottom: '1px', borderRadius: '1px' }} />
          <div style={{ width: '10px', height: '3px', background: '#1a2a3a', border: '1px solid #29adff40', marginBottom: '1px', borderRadius: '1px' }}>
            <div style={{ width: '3px', height: '2px', background: '#29adff', borderRadius: '0 1px 1px 0', marginLeft: '1px', marginTop: '0px' }} />
          </div>
          <div style={{ width: '10px', height: '3px', background: '#1a2a3a', border: '1px solid #29adff40', marginBottom: '1px', borderRadius: '1px' }}>
            <div style={{ width: '2px', height: '2px', background: '#48bb78', borderRadius: '50%', marginLeft: '6px', marginTop: '0px' }} />
          </div>
          <div style={{ width: '10px', height: '3px', background: '#1a2a3a', border: '1px solid #29adff40', borderRadius: '1px' }} />
        </div>
      )

    case 'executive':
      // Painting on wall
      return (
        <div
          style={{
            position: 'absolute',
            top: '28px',
            right: '8px',
            width: '16px',
            height: '12px',
            pointerEvents: 'none',
          }}
          aria-hidden
        >
          <div style={{ width: '16px', height: '12px', background: '#2a1f0a', border: '2px solid #5a4010', borderRadius: '1px', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '50%', background: 'linear-gradient(180deg, #1a2a4a, #0a1525)' }} />
            <div style={{ width: '100%', height: '50%', background: 'linear-gradient(180deg, #0a0e18, #0d0a08)' }} />
            <div style={{ position: 'absolute', bottom: '3px', left: '2px', width: '4px', height: '4px', background: '#ffd70060', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '3px', right: '2px', width: '2px', height: '2px', background: '#ffd70040', borderRadius: '50%' }} />
          </div>
        </div>
      )

    case 'legal':
      // Bookshelf
      return (
        <div
          style={{
            position: 'absolute',
            top: '28px',
            right: '6px',
            width: '14px',
            height: '16px',
            pointerEvents: 'none',
          }}
          aria-hidden
        >
          <div style={{ width: '14px', height: '16px', background: '#3a2a14', border: '1px solid #5a4020', borderRadius: '1px' }}>
            <div style={{ display: 'flex', gap: '1px', padding: '1px' }}>
              <div style={{ width: '2px', height: '13px', background: '#8899aa' }} />
              <div style={{ width: '2px', height: '13px', background: '#4a6080' }} />
              <div style={{ width: '2px', height: '10px', marginTop: '3px', background: '#6a8099' }} />
              <div style={{ width: '2px', height: '13px', background: '#8899aa' }} />
              <div style={{ width: '2px', height: '11px', marginTop: '2px', background: '#5a7090' }} />
            </div>
          </div>
        </div>
      )

    case 'research':
      // Globe
      return (
        <div
          style={{
            position: 'absolute',
            top: '28px',
            right: '8px',
            width: '14px',
            height: '16px',
            pointerEvents: 'none',
          }}
          aria-hidden
        >
          <div style={{ width: '12px', height: '12px', background: '#1a3a6a', border: '1px solid #b06cff40', borderRadius: '50%', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '2px', left: '0', right: '0', height: '1px', background: '#b06cff40' }} />
            <div style={{ position: 'absolute', top: '5px', left: '0', right: '0', height: '1px', background: '#b06cff40' }} />
            <div style={{ position: 'absolute', top: '8px', left: '0', right: '0', height: '1px', background: '#b06cff40' }} />
            <div style={{ position: 'absolute', top: '0', bottom: '0', left: '4px', width: '1px', background: '#b06cff30' }} />
            <div style={{ position: 'absolute', top: '0', bottom: '0', left: '8px', width: '1px', background: '#b06cff30' }} />
          </div>
          <div style={{ width: '2px', height: '4px', background: '#5a5a6a', margin: '0 auto' }} />
          <div style={{ width: '8px', height: '2px', background: '#4a4a5a', borderRadius: '1px', margin: '0 auto' }} />
        </div>
      )

    case 'marketing':
      // Whiteboard
      return (
        <div
          style={{
            position: 'absolute',
            top: '28px',
            right: '6px',
            width: '16px',
            height: '12px',
            pointerEvents: 'none',
          }}
          aria-hidden
        >
          <div style={{ width: '16px', height: '12px', background: '#f0f0f0', border: '2px solid #999', borderRadius: '1px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '2px', left: '1px', width: '6px', height: '1px', background: '#ff6b9d80' }} />
            <div style={{ position: 'absolute', top: '5px', left: '2px', width: '4px', height: '1px', background: '#29adff80' }} />
            <div style={{ position: 'absolute', top: '7px', left: '1px', width: '7px', height: '1px', background: '#00e43680' }} />
          </div>
        </div>
      )

    case 'operations':
      // Calendar
      return (
        <div
          style={{
            position: 'absolute',
            top: '28px',
            right: '6px',
            width: '14px',
            height: '14px',
            pointerEvents: 'none',
          }}
          aria-hidden
        >
          <div style={{ width: '14px', height: '14px', background: '#f8f8f0', border: '1px solid #ccc', borderRadius: '1px', overflow: 'hidden' }}>
            <div style={{ width: '14px', height: '4px', background: '#00e436' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', padding: '1px' }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ width: '3px', height: '2px', background: i === 2 ? '#00e436' : '#ccc', borderRadius: '0.5px' }} />
              ))}
            </div>
          </div>
        </div>
      )

    default:
      return null
  }
}

export const Room = memo(function Room({
  room,
  employeeNames,
  employees,
  onSelectEmployee,
  gridColumn = 'span 1',
}: RoomProps) {
  const deptColor = getDeptColor(room.department)
  const nameSet = new Set(employeeNames)
  const roomEmployees = employees.filter((e) => nameSet.has(e.name))

  return (
    <div
      style={{
        gridColumn,
        position: 'relative',
        border: `1px solid ${deptColor}25`,
        borderTop: `3px solid ${deptColor}`,
        borderRadius: '4px',
        // Tile-pattern floor using CSS gradient
        background: `
          repeating-linear-gradient(
            90deg,
            transparent,
            transparent 15px,
            ${deptColor}04 15px,
            ${deptColor}04 16px
          ),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 15px,
            ${deptColor}04 15px,
            ${deptColor}04 16px
          ),
          ${FLOOR_COLORS.tile_light}
        `,
        overflow: 'hidden',
        minHeight: '120px',
      }}
    >
      {/* Wall trim at top */}
      <div
        style={{
          position: 'absolute',
          top: '3px', // just below the coloured top border
          left: 0,
          right: 0,
          height: '2px',
          background: WALL_COLORS.trim,
          opacity: 0.5,
        }}
        aria-hidden
      />

      {/* Room header / nameplate */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px 3px',
          background: `color-mix(in srgb, ${deptColor} 8%, ${WALL_COLORS.base})`,
          borderBottom: `1px solid ${deptColor}30`,
        }}
      >
        {/* Nameplate label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <div
            style={{
              width: '3px',
              height: '10px',
              background: deptColor,
              borderRadius: '1px',
              opacity: 0.8,
            }}
          />
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
            {room.name}
          </span>
        </div>
        {/* Occupancy badge */}
        <div
          style={{
            background: `${deptColor}20`,
            border: `1px solid ${deptColor}40`,
            borderRadius: '8px',
            padding: '1px 5px',
          }}
        >
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '8px',
              color: deptColor,
              opacity: 0.9,
            }}
          >
            {roomEmployees.length}/{employeeNames.length}
          </span>
        </div>
      </div>

      {/* Desks */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          padding: '8px 8px 20px',
          alignContent: 'flex-start',
        }}
      >
        {roomEmployees.map((emp) => (
          <Desk
            key={emp.name}
            employee={emp}
            onClick={onSelectEmployee}
          />
        ))}
        {roomEmployees.length === 0 && (
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '8px',
              color: 'var(--text-tertiary, #444)',
              padding: '8px',
              opacity: 0.6,
            }}
          >
            empty
          </span>
        )}
      </div>

      {/* Corner plant */}
      <CornerPlant />

      {/* Department-specific wall decoration */}
      <RoomDecoration department={room.department} />

      {/* Door gap in bottom border */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '20px',
          height: '3px',
          background: FLOOR_COLORS.tile_dark,
          borderRadius: '2px 2px 0 0',
        }}
        aria-hidden
      />
      {/* Door frame pillars */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 'calc(50% - 12px)',
          width: '2px',
          height: '6px',
          background: deptColor,
          opacity: 0.4,
        }}
        aria-hidden
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 'calc(50% + 10px)',
          width: '2px',
          height: '6px',
          background: deptColor,
          opacity: 0.4,
        }}
        aria-hidden
      />
    </div>
  )
})
