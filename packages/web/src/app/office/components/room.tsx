'use client'

import React, { memo, useMemo } from 'react'
import { Desk } from './desk'
import type { OfficeEmployee } from '../hooks/use-office-state'
import type { RoomDef } from '../lib/office-layout'
import {
  getDeptColor,
  FLOOR_COLORS,
  WALL_COLORS,
  FURNITURE_COLORS,
} from '../lib/pixel-palette'
import {
  TILE_WIDTH,
  TILE_HEIGHT,
  gridToScreen,
  getTileClipPath,
} from '../lib/office-layout'
import type { Decoration, StoreItem } from '@/lib/api'

interface RoomProps {
  room: RoomDef
  /** Names of employees that belong in this room — provided by the parent. */
  employeeNames: string[]
  employees: OfficeEmployee[]
  onSelectEmployee: (name: string) => void
  /** CSS grid-column value, e.g. "span 2". Defaults to "span 1". */
  gridColumn?: string
  /** Decorations placed in this room. */
  decorations?: Decoration[]
  /** Full store catalog, used to resolve sprite from itemId. */
  storeItems?: StoreItem[]
  /** Whether decoration placement mode is active. */
  decorationMode?: boolean
  /** Called when the room background is clicked in decoration mode. */
  onRoomClick?: (room: string, x: number, y: number) => void
}

// ---------------------------------------------------------------------------
// Room grid configuration
// ---------------------------------------------------------------------------
const ROOM_COLS = 8   // tiles across (Habbo rooms are spacious)
const ROOM_ROWS = 6   // tiles deep

// Compute the total pixel width and height needed to contain the isometric grid
// Width  = (cols + rows) * TILE_WIDTH / 2
// Height = (cols + rows) * TILE_HEIGHT / 2  + wall height overhead
const ISO_GRID_W  = (ROOM_COLS + ROOM_ROWS) * (TILE_WIDTH / 2)
const ISO_GRID_H  = (ROOM_COLS + ROOM_ROWS) * (TILE_HEIGHT / 2)
const WALL_HEIGHT = 110  // pixel height of the back/left walls (Habbo walls are tall)
const ROOM_PAD_TOP = 28  // extra top padding above the walls for the room header

// Total room container height
const ROOM_CONTAINER_H = ISO_GRID_H + WALL_HEIGHT + ROOM_PAD_TOP + 48  // +48 for name labels below desks

// ---------------------------------------------------------------------------
// Floor tile component — diamond shaped
// ---------------------------------------------------------------------------
interface TileProps {
  gridX: number
  gridY: number
  tileColor: string
  highlightColor: string
}

function FloorTile({ gridX, gridY, tileColor, highlightColor }: TileProps) {
  const { x, y } = gridToScreen(gridX, gridY)

  // Alternate tile shading (checkerboard effect, Habbo-style)
  const isEven = (gridX + gridY) % 2 === 0
  const bg = isEven ? tileColor : highlightColor

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${TILE_WIDTH}px`,
        height: `${TILE_HEIGHT}px`,
        clipPath: getTileClipPath(),
      }}
      aria-hidden
    >
      {/* Tile fill */}
      <div style={{ position: 'absolute', inset: 0, background: bg }} />
      {/* Habbo-style highlight edge — top-left edges are lighter */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%, rgba(0,0,0,0.08) 100%)',
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Isometric corner plant (visible from 3/4 angle)
// ---------------------------------------------------------------------------
function IsometricCornerPlant() {
  return (
    <div
      style={{
        position: 'relative',
        width: '20px',
        height: '28px',
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      {/* Pot — isometric box */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '2px',
          width: '14px',
          height: '8px',
          background: '#8B5028',
          border: '1px solid #6B3810',
          borderRadius: '0 0 2px 2px',
        }}
      />
      {/* Pot top face (isometric) */}
      <div
        style={{
          position: 'absolute',
          bottom: '7px',
          left: '0px',
          width: '16px',
          height: '5px',
          background: '#7A4520',
          transform: 'skewX(-20deg)',
        }}
      />
      {/* Soil */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          left: '4px',
          width: '10px',
          height: '3px',
          background: '#2A1808',
          borderRadius: '1px',
        }}
      />
      {/* Main stem */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '9px',
          width: '2px',
          height: '6px',
          background: '#3A8020',
        }}
      />
      {/* Left leaf */}
      <div
        style={{
          position: 'absolute',
          bottom: '14px',
          left: '2px',
          width: '9px',
          height: '6px',
          background: '#4AAA30',
          borderRadius: '50% 0 50% 0',
          transform: 'rotate(-15deg)',
        }}
      />
      {/* Right leaf */}
      <div
        style={{
          position: 'absolute',
          bottom: '14px',
          right: '0px',
          width: '9px',
          height: '6px',
          background: '#58C040',
          borderRadius: '0 50% 0 50%',
          transform: 'rotate(15deg)',
        }}
      />
      {/* Top cluster */}
      <div
        style={{
          position: 'absolute',
          bottom: '18px',
          left: '5px',
          width: '10px',
          height: '8px',
          background: '#66D050',
          borderRadius: '50%',
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Department wall art — placed flat on the back wall
// ---------------------------------------------------------------------------
function WallDecoration({ department, deptColor }: { department: string; deptColor: string }) {
  switch (department) {
    case 'engineering':
      // Server rack
      return (
        <div
          style={{
            width: '28px',
            height: '40px',
            background: '#2A3040',
            border: `1px solid ${deptColor}50`,
            borderRadius: '2px',
            padding: '2px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              style={{
                width: '100%',
                height: '5px',
                background: '#1A2030',
                border: `1px solid ${deptColor}30`,
                borderRadius: '1px',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '2px',
                gap: '1px',
              }}
            >
              <div style={{ width: '4px', height: '2px', background: i % 2 === 0 ? deptColor : '#48B878', borderRadius: '1px' }} />
            </div>
          ))}
        </div>
      )

    case 'executive':
      // Framed painting
      return (
        <div
          style={{
            width: '32px',
            height: '24px',
            background: '#5A4010',
            border: '3px solid #8A6820',
            borderRadius: '1px',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div style={{ width: '100%', height: '55%', background: 'linear-gradient(180deg, #2A4A8A, #102040)' }} />
          <div style={{ width: '100%', height: '45%', background: 'linear-gradient(180deg, #102010, #0A1808)' }} />
          <div style={{ position: 'absolute', bottom: '4px', left: '4px', width: '6px', height: '6px', background: '#E8A02060', borderRadius: '50%' }} />
        </div>
      )

    case 'legal':
      // Bookshelf
      return (
        <div
          style={{
            width: '30px',
            height: '36px',
            background: '#5A4020',
            border: '1px solid #7A6030',
            borderRadius: '1px',
            padding: '2px',
          }}
        >
          <div style={{ display: 'flex', gap: '1px', height: '100%', alignItems: 'flex-end' }}>
            {['#7A9BAE', '#4A6080', '#6A8099', '#7A9BAE', '#5A7090', '#8899AA'].map((c, i) => (
              <div
                key={i}
                style={{
                  width: '3px',
                  height: `${10 + (i % 3) * 4}px`,
                  background: c,
                  borderRadius: '1px 1px 0 0',
                }}
              />
            ))}
          </div>
        </div>
      )

    case 'research':
      // Whiteboard with diagrams
      return (
        <div
          style={{
            width: '36px',
            height: '24px',
            background: '#F8F4EC',
            border: '2px solid #8A7858',
            borderRadius: '1px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: '3px', left: '2px', width: '12px', height: '1px', background: `${deptColor}90` }} />
          <div style={{ position: 'absolute', top: '7px', left: '4px', width: '8px', height: '1px', background: `${deptColor}70` }} />
          <div style={{ position: 'absolute', top: '11px', left: '2px', width: '14px', height: '1px', background: `${deptColor}80` }} />
          <div style={{ position: 'absolute', top: '3px', right: '3px', width: '10px', height: '10px', border: `1px solid ${deptColor}60`, borderRadius: '50%' }} />
        </div>
      )

    case 'marketing':
      // Colourful mood board
      return (
        <div
          style={{
            width: '32px',
            height: '28px',
            background: '#F0EBE0',
            border: '2px solid #C0A878',
            borderRadius: '1px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '2px',
            padding: '2px',
          }}
        >
          {['#E05C8A', '#4A90D9', '#5BBF6A', '#E8A020', '#9B6CD4', '#E05C8A'].map((c, i) => (
            <div key={i} style={{ background: c, opacity: 0.7, borderRadius: '1px' }} />
          ))}
        </div>
      )

    case 'operations':
      // Calendar / gantt
      return (
        <div
          style={{
            width: '30px',
            height: '28px',
            background: '#F8F8F0',
            border: '1px solid #C0B090',
            borderRadius: '1px',
            overflow: 'hidden',
          }}
        >
          <div style={{ width: '100%', height: '7px', background: deptColor }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', padding: '2px' }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ height: '3px', background: i === 3 ? deptColor : '#D0C8B0', borderRadius: '0.5px' }} />
            ))}
          </div>
        </div>
      )

    default:
      // Generic pinboard
      return (
        <div
          style={{
            width: '24px',
            height: '20px',
            background: '#C8A870',
            border: '1px solid #A08850',
            borderRadius: '1px',
            position: 'relative',
          }}
        >
          <div style={{ position: 'absolute', top: '3px', left: '3px', width: '5px', height: '5px', background: deptColor, borderRadius: '50%', opacity: 0.8 }} />
          <div style={{ position: 'absolute', top: '8px', right: '3px', width: '4px', height: '4px', background: `${deptColor}80`, borderRadius: '50%' }} />
        </div>
      )
  }
}

// ---------------------------------------------------------------------------
// Main Room component
// ---------------------------------------------------------------------------
export const Room = memo(function Room({
  room,
  employeeNames,
  employees,
  onSelectEmployee,
  gridColumn = 'span 1',
  decorations,
  storeItems,
  decorationMode,
  onRoomClick,
}: RoomProps) {
  const deptColor = getDeptColor(room.department)
  const nameSet = new Set(employeeNames)
  const roomEmployees = employees.filter((e) => nameSet.has(e.name))

  // Pre-compute all floor tile positions for a ROOM_COLS x ROOM_ROWS grid
  const tiles = useMemo(() => {
    const result: { gridX: number; gridY: number }[] = []
    for (let row = 0; row < ROOM_ROWS; row++) {
      for (let col = 0; col < ROOM_COLS; col++) {
        result.push({ gridX: col, gridY: row })
      }
    }
    return result
  }, [])

  // Isometric grid origin offset so the left-most corner starts at a safe X
  // The grid left corner is at gridToScreen(0, ROOM_ROWS-1) — shift everything right
  const gridOriginX = (ROOM_ROWS - 1) * (TILE_WIDTH / 2) + 8
  const gridOriginY = WALL_HEIGHT + ROOM_PAD_TOP

  const handleRoomClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!decorationMode || !onRoomClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
    onRoomClick(room.name, x, y)
  }

  // Position for each employee desk on the grid
  // Desks are placed in a left-to-right, front-to-back sweep
  const deskPositions = useMemo(() => {
    const positions: { gridX: number; gridY: number }[] = []
    // Spread desks starting from col 1 row 1, with spacing to fill larger rooms
    let col = 1
    let row = 1
    for (let i = 0; i < roomEmployees.length; i++) {
      positions.push({ gridX: col, gridY: row })
      col += 3  // more spacing between desks (was 2)
      if (col >= ROOM_COLS - 1) {
        col = 1
        row += 2  // more vertical spacing between rows (was 1)
      }
    }
    return positions
  }, [roomEmployees.length])

  return (
    <div
      onClick={handleRoomClick}
      style={{
        gridColumn,
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: `${ROOM_CONTAINER_H}px`,
        flexShrink: 0,
        cursor: decorationMode ? 'crosshair' : 'default',
        outline: decorationMode ? `2px dashed ${deptColor}60` : 'none',
        outlineOffset: '-4px',
        // Warm drop shadow — Habbo-style room card feel
        filter: `drop-shadow(0 6px 16px rgba(60,30,10,0.35))`,
        background: WALL_COLORS.trim,
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      {/* Room label — Habbo-style room name plate */}
      <div
        style={{
          position: 'absolute',
          top: '4px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          background: FURNITURE_COLORS.wood_dark,
          border: `2px solid ${deptColor}`,
          borderRadius: '3px',
          padding: '3px 14px',
          whiteSpace: 'nowrap',
          boxShadow: `0 2px 6px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)`,
        }}
      >
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '10px',
            fontWeight: 700,
            color: deptColor,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            textShadow: `0 0 8px ${deptColor}60`,
          }}
        >
          {room.name}
        </span>
      </div>

      {/* ---- BACK WALL (top face, runs along the top of the floor grid) ---- */}
      <div
        style={{
          position: 'absolute',
          top: `${ROOM_PAD_TOP}px`,
          left: `${gridOriginX}px`,
          width: `${ROOM_COLS * (TILE_WIDTH / 2) + ROOM_ROWS * (TILE_HEIGHT / 2)}px`,
          height: `${WALL_HEIGHT}px`,
          background: `linear-gradient(160deg, ${WALL_COLORS.accent} 0%, ${WALL_COLORS.base} 100%)`,
          borderTop: `3px solid ${deptColor}`,
          borderRadius: '2px 2px 0 0',
          zIndex: 0,
          overflow: 'hidden',
        }}
        aria-hidden
      >
        {/* Horizontal wallpaper lines — Habbo-style panelling */}
        {[18, 36, 54, 72, 90].map(h => (
          <div
            key={h}
            style={{
              position: 'absolute',
              top: `${h}px`,
              left: 0,
              right: 0,
              height: '1px',
              background: `${WALL_COLORS.trim}70`,
            }}
          />
        ))}
        {/* Baseboard — dark strip where wall meets floor */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: FURNITURE_COLORS.wood_dark,
            opacity: 0.5,
          }}
        />
        {/* Wall art */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '24px',
          }}
        >
          <WallDecoration department={room.department} deptColor={deptColor} />
        </div>
      </div>

      {/* ---- LEFT WALL (angled, dark side) ---- */}
      <div
        style={{
          position: 'absolute',
          top: `${ROOM_PAD_TOP}px`,
          left: `${gridOriginX - (ROOM_ROWS) * (TILE_WIDTH / 2)}px`,
          width: `${(ROOM_ROWS) * (TILE_WIDTH / 2)}px`,
          height: `${WALL_HEIGHT}px`,
          background: `linear-gradient(200deg, ${WALL_COLORS.base} 0%, ${WALL_COLORS.trim} 100%)`,
          transform: 'skewY(30deg)',
          transformOrigin: 'top right',
          filter: 'brightness(0.88)',
          zIndex: 0,
        }}
        aria-hidden
      >
        {/* Vertical divider lines for panelled wall effect */}
        {[25, 55, 85].map(x => (
          <div
            key={x}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: 0,
              bottom: 0,
              width: '1px',
              background: `${WALL_COLORS.trim}60`,
            }}
          />
        ))}
      </div>

      {/* ---- FLOOR TILES ---- */}
      <div
        style={{
          position: 'absolute',
          top: `${gridOriginY}px`,
          left: `${gridOriginX}px`,
          width: `${ISO_GRID_W}px`,
          height: `${ISO_GRID_H}px`,
          zIndex: 1,
        }}
        aria-hidden
      >
        {tiles.map(({ gridX, gridY }) => {
          const { x, y } = gridToScreen(gridX, gridY)
          return (
            <FloorTile
              key={`${gridX}-${gridY}`}
              gridX={gridX}
              gridY={gridY}
              tileColor={FLOOR_COLORS.tile_light}
              highlightColor={FLOOR_COLORS.tile_dark}
            />
          )
        })}

        {/* Floor tile grid lines — subtle border on each tile using an overlay */}
        {tiles.map(({ gridX, gridY }) => {
          const { x, y } = gridToScreen(gridX, gridY)
          return (
            <div
              key={`line-${gridX}-${gridY}`}
              style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                width: `${TILE_WIDTH}px`,
                height: `${TILE_HEIGHT}px`,
                clipPath: getTileClipPath(),
                border: `1px solid ${FLOOR_COLORS.carpet}60`,
                boxSizing: 'border-box',
                pointerEvents: 'none',
              }}
            />
          )
        })}
      </div>

      {/* ---- DESKS (placed on floor tiles) ---- */}
      {roomEmployees.map((emp, idx) => {
        const pos = deskPositions[idx]
        if (!pos) return null

        // Convert desk grid position to screen, then offset by room origin
        const { x: tileX, y: tileY } = gridToScreen(pos.gridX, pos.gridY)

        // Center the desk over its tile
        // The desk container is ISO_DESK_W x ISO_DESK_H pixels
        const deskLeft = gridOriginX + tileX + (TILE_WIDTH - 72) / 2
        const deskTop  = gridOriginY + tileY - 80  // move desk "up" — sprite sits above tile

        return (
          <div
            key={emp.name}
            style={{
              position: 'absolute',
              left: `${deskLeft}px`,
              top: `${deskTop}px`,
              zIndex: 2 + pos.gridY,  // further-back desks have lower z-index (depth sorting)
            }}
          >
            <Desk employee={emp} onClick={onSelectEmployee} />
          </div>
        )
      })}

      {/* Empty room notice */}
      {roomEmployees.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 5,
          }}
        >
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '9px',
              color: WALL_COLORS.trim,
              opacity: 0.6,
            }}
          >
            empty
          </span>
        </div>
      )}

      {/* Corner plant — placed at the near-right corner of the room */}
      <div
        style={{
          position: 'absolute',
          left: `${gridOriginX + (ROOM_COLS - 1) * (TILE_WIDTH / 2) - 10}px`,
          top:  `${gridOriginY + (ROOM_COLS + ROOM_ROWS - 2) * (TILE_HEIGHT / 2) - 12}px`,
          zIndex: 10,
          pointerEvents: 'none',
        }}
        aria-hidden
      >
        <IsometricCornerPlant />
      </div>

      {/* Occupancy badge — top-right overlay */}
      <div
        style={{
          position: 'absolute',
          top: '4px',
          right: '8px',
          background: `${deptColor}20`,
          border: `1px solid ${deptColor}50`,
          borderRadius: '8px',
          padding: '2px 6px',
          zIndex: 20,
        }}
      >
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '8px',
            color: deptColor,
            fontWeight: 600,
          }}
        >
          {roomEmployees.length}/{employeeNames.length}
        </span>
      </div>

      {/* Placed decorations */}
      {decorations?.map((dec) => (
        <div
          key={dec.id}
          style={{
            position: 'absolute',
            left: `${dec.x}%`,
            top: `${dec.y}%`,
            fontSize: '16px',
            pointerEvents: decorationMode ? 'auto' : 'none',
            cursor: decorationMode ? 'pointer' : 'default',
            zIndex: 15,
            transform: 'translate(-50%, -50%)',
            userSelect: 'none',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}
          title={storeItems?.find((i) => i.id === dec.itemId)?.name}
        >
          {storeItems?.find((i) => i.id === dec.itemId)?.sprite ?? '?'}
        </div>
      ))}
    </div>
  )
})
