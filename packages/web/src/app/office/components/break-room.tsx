'use client'

import React, { memo } from 'react'
import { EmployeeSprite } from './employee-sprite'
import { SpeechBubble } from './speech-bubble'
import { DEPT_COLORS, FURNITURE_COLORS, FLOOR_COLORS, WALL_COLORS } from '../lib/pixel-palette'
import type { OfficeEmployee } from '../hooks/use-office-state'

export interface BreakRoomProps {
  employees: OfficeEmployee[]
  onSelectEmployee: (name: string) => void
}

// Sofa colours — warm, inviting
const SOFA_COLOR   = '#C8943A'
const SOFA_DARK    = '#8C5A18'
const SOFA_CUSHION = '#E8A020'

// ─── Pixel-art sofa (2-seater, 48px wide) ─────────────────────────────────────
function Sofa() {
  return (
    <div
      style={{ position: 'relative', width: '52px', height: '22px' }}
      aria-hidden
    >
      {/* Arm rests */}
      <div style={{ position: 'absolute', left: 0, top: '4px', width: '7px', height: '15px', background: SOFA_DARK, borderRadius: '2px 0 0 2px' }} />
      <div style={{ position: 'absolute', right: 0, top: '4px', width: '7px', height: '15px', background: SOFA_DARK, borderRadius: '0 2px 2px 0' }} />
      {/* Back rest */}
      <div style={{ position: 'absolute', left: '6px', top: 0, right: '6px', height: '10px', background: SOFA_COLOR, border: `2px solid ${SOFA_DARK}`, borderRadius: '2px' }} />
      {/* Seat */}
      <div style={{ position: 'absolute', left: '6px', top: '8px', right: '6px', height: '10px', background: SOFA_COLOR, border: `1px solid ${SOFA_DARK}`, borderRadius: '0 0 2px 2px' }} />
      {/* Two seat cushions */}
      <div style={{ position: 'absolute', left: '9px', top: '10px', width: '14px', height: '7px', background: SOFA_CUSHION, borderRadius: '1px', opacity: 0.9 }} />
      <div style={{ position: 'absolute', right: '9px', top: '10px', width: '14px', height: '7px', background: SOFA_CUSHION, borderRadius: '1px', opacity: 0.9 }} />
      {/* Legs */}
      <div style={{ position: 'absolute', bottom: 0, left: '8px',  width: '4px', height: '4px', background: SOFA_DARK }} />
      <div style={{ position: 'absolute', bottom: 0, right: '8px', width: '4px', height: '4px', background: SOFA_DARK }} />
    </div>
  )
}

// ─── Coffee machine on back wall ───────────────────────────────────────────────
function CoffeeMachine() {
  return (
    <div
      style={{ position: 'absolute', top: '24px', left: '10px', width: '22px', height: '34px', pointerEvents: 'none' }}
      aria-hidden
    >
      {/* Body */}
      <div
        style={{
          position: 'absolute',
          bottom: '4px',
          left: 0,
          width: '22px',
          height: '28px',
          background: '#3A2418',
          border: `2px solid ${FURNITURE_COLORS.wood_dark}`,
          borderRadius: '3px 3px 1px 1px',
          boxShadow: 'inset 1px 1px 0 rgba(255,255,255,0.08)',
        }}
      />
      {/* Water tank (blue) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '5px',
          width: '12px',
          height: '10px',
          background: 'rgba(80,160,255,0.4)',
          border: '1px solid rgba(80,160,255,0.6)',
          borderRadius: '2px',
        }}
      />
      {/* Display panel */}
      <div style={{ position: 'absolute', bottom: '16px', left: '3px', width: '16px', height: '7px', background: '#1A2A1A', borderRadius: '1px', border: '1px solid #5BBF6A80' }} />
      {/* Brew button */}
      <div style={{ position: 'absolute', bottom: '10px', left: '8px', width: '6px', height: '4px', background: '#E07828', borderRadius: '1px', boxShadow: '0 0 4px #E0782880' }} />
      {/* Cup tray */}
      <div style={{ position: 'absolute', bottom: '4px', left: '2px', width: '18px', height: '2px', background: FURNITURE_COLORS.wood_dark }} />
      {/* Legs */}
      <div style={{ position: 'absolute', bottom: 0, left: '3px',  width: '4px', height: '4px', background: '#2A1810' }} />
      <div style={{ position: 'absolute', bottom: 0, right: '3px', width: '4px', height: '4px', background: '#2A1810' }} />
    </div>
  )
}

// ─── Snack table ───────────────────────────────────────────────────────────────
function SnackTable() {
  return (
    <div
      style={{ position: 'relative', width: '36px', height: '20px' }}
      aria-hidden
    >
      {/* Table top */}
      <div
        style={{
          width: '36px',
          height: '10px',
          background: FURNITURE_COLORS.wood_light,
          border: `1px solid ${FURNITURE_COLORS.wood_dark}`,
          borderRadius: '2px',
          boxShadow: `0 2px 0 ${FURNITURE_COLORS.wood_dark}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-evenly',
          padding: '0 3px',
        }}
      >
        {/* Bowl of snacks */}
        <div style={{ width: '8px', height: '5px', background: '#E05C8A', borderRadius: '50%', opacity: 0.85 }} />
        {/* Mug */}
        <div style={{ width: '5px', height: '6px', background: '#4A90D9', borderRadius: '1px', opacity: 0.85 }} />
        {/* Plate */}
        <div style={{ width: '9px', height: '4px', background: '#F5F0E0', borderRadius: '50%', opacity: 0.8 }} />
      </div>
      {/* Legs */}
      <div style={{ position: 'absolute', bottom: 0, left: '5px',  width: '3px', height: '10px', background: FURNITURE_COLORS.wood_dark }} />
      <div style={{ position: 'absolute', bottom: 0, right: '5px', width: '3px', height: '10px', background: FURNITURE_COLORS.wood_dark }} />
    </div>
  )
}

// ─── TV / arcade cabinet on wall ──────────────────────────────────────────────
function ArcadeCabinet() {
  return (
    <div
      style={{ position: 'absolute', top: '22px', right: '10px', width: '28px', height: '36px', pointerEvents: 'none' }}
      aria-hidden
    >
      {/* Cabinet body */}
      <div
        style={{
          position: 'absolute',
          bottom: '4px',
          left: 0,
          width: '28px',
          height: '30px',
          background: '#2A1810',
          border: `2px solid #C8943A`,
          borderRadius: '3px 3px 1px 1px',
        }}
      />
      {/* Screen */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '4px',
          width: '20px',
          height: '12px',
          background: '#0D1A0D',
          border: '1px solid #5BBF6A',
          borderRadius: '1px',
          overflow: 'hidden',
        }}
      >
        {/* Pixel art game scanlines */}
        <div style={{ position: 'absolute', top: '1px', left: '1px', width: '6px', height: '4px', background: '#E07828', opacity: 0.7 }} />
        <div style={{ position: 'absolute', top: '1px', right: '1px', width: '4px', height: '3px', background: '#4A90D9', opacity: 0.7 }} />
        <div style={{ position: 'absolute', bottom: '1px', left: '3px', width: '5px', height: '3px', background: '#5BBF6A', opacity: 0.7 }} />
      </div>
      {/* Control panel */}
      <div style={{ position: 'absolute', bottom: '8px', left: '2px', right: '2px', height: '7px', background: '#3A2418', borderRadius: '1px' }}>
        {/* Joystick */}
        <div style={{ position: 'absolute', top: '1px', left: '3px', width: '4px', height: '4px', background: '#E8A020', borderRadius: '50%' }} />
        {/* Buttons */}
        <div style={{ position: 'absolute', top: '2px', right: '8px', width: '3px', height: '3px', background: '#D94A3A', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '2px', right: '3px', width: '3px', height: '3px', background: '#9B6CD4', borderRadius: '50%' }} />
      </div>
      {/* Legs */}
      <div style={{ position: 'absolute', bottom: 0, left: '5px',  width: '4px', height: '4px', background: '#2A1810' }} />
      <div style={{ position: 'absolute', bottom: 0, right: '5px', width: '4px', height: '4px', background: '#2A1810' }} />
    </div>
  )
}

// ─── Potted plant ──────────────────────────────────────────────────────────────
function PottedPlant() {
  return (
    <div style={{ position: 'relative', width: '16px', height: '28px' }} aria-hidden>
      {/* Pot */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '1px',
          width: '14px',
          height: '10px',
          background: '#C8943A',
          border: `1px solid ${FURNITURE_COLORS.wood_dark}`,
          borderRadius: '0 0 3px 3px',
          clipPath: 'polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)',
        }}
      />
      {/* Soil */}
      <div style={{ position: 'absolute', bottom: '9px', left: '2px', width: '12px', height: '3px', background: '#3A2010', borderRadius: '1px' }} />
      {/* Stem */}
      <div style={{ position: 'absolute', bottom: '11px', left: '50%', transform: 'translateX(-50%)', width: '2px', height: '8px', background: '#5BBF6A' }} />
      {/* Leaves */}
      <div style={{ position: 'absolute', bottom: '16px', left: '2px',  width: '8px', height: '6px', background: '#5BBF6A', borderRadius: '50% 0 50% 0', transform: 'rotate(-20deg)', opacity: 0.9 }} />
      <div style={{ position: 'absolute', bottom: '18px', right: '1px', width: '8px', height: '6px', background: '#5BBF6A', borderRadius: '0 50% 0 50%', transform: 'rotate(20deg)', opacity: 0.9 }} />
      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '10px', height: '8px', background: '#4A9A50', borderRadius: '50% 50% 0 50%', opacity: 0.95 }} />
    </div>
  )
}

// ─── Sprite standing positions along the sofa / room ─────────────────────────
// Up to 5 employees can be visible; positions are in the lower half of the room
const BREAK_POSITIONS: Array<{ left: string; bottom: string }> = [
  { left: '12%', bottom: '18px' }, // on sofa left
  { left: '28%', bottom: '18px' }, // on sofa right
  { left: '48%', bottom: '14px' }, // standing centre
  { left: '63%', bottom: '14px' }, // standing right
  { left: '78%', bottom: '14px' }, // near arcade
]

// ─── Main component ────────────────────────────────────────────────────────────

export const BreakRoom = memo(function BreakRoom({
  employees,
  onSelectEmployee,
}: BreakRoomProps) {
  const deptColor = '#E8A020' // warm amber — neutral for all depts

  const visible = employees.slice(0, 5)

  return (
    <div
      style={{
        position: 'relative',
        background: `linear-gradient(160deg, color-mix(in srgb, ${deptColor} 5%, ${WALL_COLORS.base}) 0%, ${WALL_COLORS.trim} 100%)`,
        border: `2px solid ${FURNITURE_COLORS.wood_med}`,
        borderTop: `4px solid ${deptColor}`,
        borderRadius: '4px',
        overflow: 'hidden',
        minHeight: '220px',
        boxShadow: `inset 0 0 28px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.28)`,
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
            Break Room
          </span>
        </div>
        {/* Count badge */}
        <div
          style={{
            background: `${deptColor}25`,
            border: `1px solid ${deptColor}60`,
            borderRadius: '2px',
            padding: '0 5px',
          }}
        >
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '7px',
              color: deptColor,
              fontWeight: 700,
              letterSpacing: '0.1em',
            }}
          >
            {visible.length} RELAXING
          </span>
        </div>
      </div>

      {/* Furniture layer — wall items */}
      <CoffeeMachine />
      <ArcadeCabinet />

      {/* Main floor area */}
      <div
        style={{
          position: 'relative',
          margin: '8px 8px 0',
          height: '100px',
        }}
      >
        {/* Snack table */}
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <SnackTable />
        </div>

        {/* Sofa in the lower half */}
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '18%',
          }}
        >
          <Sofa />
        </div>

        {/* Potted plant */}
        <div style={{ position: 'absolute', bottom: '14px', right: '4px' }}>
          <PottedPlant />
        </div>

        {/* Employee sprites */}
        {visible.map((emp, i) => {
          const pos = BREAK_POSITIONS[i]
          const empColor = DEPT_COLORS[emp.department] || deptColor
          return (
            <div
              key={emp.name}
              onClick={() => onSelectEmployee(emp.name)}
              style={{
                position: 'absolute',
                left: pos.left,
                bottom: pos.bottom,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                zIndex: 3 + i,
                transform: 'translateX(-50%)',
              }}
              title={emp.displayName}
            >
              {/* Speech bubble for working employees with task */}
              {emp.taskSnippet && (
                <SpeechBubble
                  text={emp.taskSnippet}
                  employeeName={emp.displayName}
                  deptColor={empColor}
                />
              )}

              <div style={{ height: '84px', width: '60px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                <EmployeeSprite
                  name={emp.name}
                  department={emp.department}
                  status={emp.status}
                  scale={3}
                  relaxed
                />
              </div>

              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '7px',
                  color: empColor,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  background: `${FURNITURE_COLORS.wood_dark}cc`,
                  padding: '0 3px',
                  borderRadius: '1px',
                  whiteSpace: 'nowrap',
                  maxWidth: '48px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {emp.displayName}
              </span>
            </div>
          )
        })}

        {/* Empty break room message */}
        {visible.length === 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontFamily: 'monospace',
              fontSize: '7px',
              color: '#8C7B6B',
              letterSpacing: '0.1em',
              opacity: 0.65,
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            everyone&apos;s working!
          </div>
        )}
      </div>

      {/* Warm floor strip */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '14px',
          background: `repeating-linear-gradient(90deg, ${FLOOR_COLORS.carpet} 0px, ${FLOOR_COLORS.carpet} 15px, ${FLOOR_COLORS.tile_dark} 15px, ${FLOOR_COLORS.tile_dark} 16px)`,
          opacity: 0.5,
        }}
      />
    </div>
  )
})
