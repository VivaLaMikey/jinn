'use client'

import React, { useState } from 'react'
import { getDeptColor, FURNITURE_COLORS } from '../lib/pixel-palette'

interface RoomNavigatorProps {
  rooms: Array<{
    id: string
    name: string
    department: string
    type: 'department' | 'special'
    occupancy: number
    capacity: number
  }>
  currentRoomId: string
  onSelectRoom: (roomId: string) => void
  onClose: () => void
  isOpen: boolean
}

export function RoomNavigator({
  rooms,
  currentRoomId,
  onSelectRoom,
  onClose,
  isOpen,
}: RoomNavigatorProps) {
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null)

  if (!isOpen) return null

  return (
    <div
      style={{
        width: '204px',
        flexShrink: 0,
        background: '#1B3A4B',
        borderRight: `3px solid ${FURNITURE_COLORS.wood_med}`,
        boxShadow: '4px 0 0 #0D2030, inset -2px 0 0 rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
        zIndex: 200,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          background: '#142C3A',
          borderBottom: `2px solid ${FURNITURE_COLORS.wood_med}`,
          flexShrink: 0,
          boxShadow: '0 2px 0 rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Door icon — pixel-art style */}
          <span style={{ fontSize: '14px', lineHeight: 1 }}>🚪</span>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              color: '#C8943A',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              textShadow: '0 0 8px rgba(200,148,58,0.5)',
            }}
          >
            Navigator
          </span>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          title='Close Navigator'
          style={{
            width: '18px',
            height: '18px',
            background: '#2A1810',
            border: 'none',
            borderRadius: '2px',
            color: '#8C7B6B',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset -1px -1px 0 rgba(0,0,0,0.5), inset 1px 1px 0 rgba(255,255,255,0.08)',
            lineHeight: 1,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#E8A020'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#8C7B6B'
          }}
        >
          x
        </button>
      </div>

      {/* Section label */}
      <div
        style={{
          padding: '5px 10px 3px',
          fontSize: '7px',
          fontWeight: 700,
          color: '#4A7A8C',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          borderBottom: '1px solid #0D2030',
          flexShrink: 0,
        }}
      >
        Rooms
      </div>

      {/* Room list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 0',
        }}
      >
        {rooms.map((room) => {
          const isSelected = room.id === currentRoomId
          const isHovered = room.id === hoveredRoomId
          const deptColor = getDeptColor(room.department)
          const isFull = room.occupancy >= room.capacity
          const hasOccupants = room.occupancy > 0

          return (
            <div
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              onMouseEnter={() => setHoveredRoomId(room.id)}
              onMouseLeave={() => setHoveredRoomId(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '6px 10px',
                cursor: 'pointer',
                background: isSelected
                  ? 'rgba(200,148,58,0.18)'
                  : isHovered
                  ? 'rgba(255,255,255,0.05)'
                  : 'transparent',
                borderLeft: isSelected
                  ? `3px solid ${deptColor}`
                  : '3px solid transparent',
                // Habbo-style inset highlight on selection
                boxShadow: isSelected
                  ? 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.2)'
                  : 'none',
                transition: 'background 0.08s, border-color 0.08s',
                position: 'relative',
              }}
            >
              {/* Department colour indicator */}
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  background: deptColor,
                  flexShrink: 0,
                  boxShadow: `0 0 4px ${deptColor}80`,
                  // Pixel-art square — no border radius
                }}
              />

              {/* Room name */}
              <span
                style={{
                  flex: 1,
                  fontSize: '10px',
                  fontWeight: isSelected ? 700 : 400,
                  color: isSelected ? '#E8D4A0' : '#A09080',
                  letterSpacing: '0.04em',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {room.name}
              </span>

              {/* Right side: occupancy + active dot */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0,
                }}
              >
                {/* Occupancy count */}
                <span
                  style={{
                    fontSize: '8px',
                    color: isFull ? '#E8A020' : '#4A7A8C',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    minWidth: '22px',
                    textAlign: 'right',
                  }}
                >
                  {room.occupancy}/{room.capacity}
                </span>

                {/* Active/occupied indicator dot */}
                <div
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: hasOccupants ? '#5BBF6A' : '#3A4A4A',
                    boxShadow: hasOccupants ? '0 0 4px #5BBF6A80' : 'none',
                    flexShrink: 0,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer divider — pixel-art bottom chrome */}
      <div
        style={{
          height: '3px',
          background: `linear-gradient(90deg, ${FURNITURE_COLORS.wood_dark}, ${FURNITURE_COLORS.wood_med}, ${FURNITURE_COLORS.wood_dark})`,
          flexShrink: 0,
        }}
      />
    </div>
  )
}
