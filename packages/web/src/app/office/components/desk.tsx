'use client'

import React, { memo } from 'react'
import { EmployeeSprite } from './employee-sprite'
import { SpeechBubble } from './speech-bubble'
import type { OfficeEmployee } from '../hooks/use-office-state'
import {
  STATUS_COLORS,
  DEPT_COLORS,
  FURNITURE_COLORS,
  MONITOR_COLORS,
} from '../lib/pixel-palette'
import { nameHash } from '../lib/sprite-utils'

interface DeskProps {
  employee: OfficeEmployee
  onClick: (name: string) => void
}

// ---------------------------------------------------------------------------
// Isometric desk dimensions (visual footprint = 2x1 tiles)
// The desk surface is drawn as an isometric rectangle using CSS transforms:
//   - top face: skewed parallelogram (bright face, viewed from above-right)
//   - front face: rectangle below (slightly darker — the "south" face)
//   - left face: rectangle on left (darkest — the "west" face)
// ---------------------------------------------------------------------------

const ISO_DESK_W  = 96   // overall container width
const ISO_DESK_H  = 64   // overall container height

// Monitor component — isometric (shows front + left edge)
function IsometricMonitor({
  isWorking,
  statusHex,
}: {
  isWorking: boolean
  statusHex: string
}) {
  const screenColour = isWorking ? MONITOR_COLORS.screen_on : MONITOR_COLORS.screen_off

  return (
    <div
      style={{
        position: 'relative',
        width: '22px',
        height: '20px',
        flexShrink: 0,
      }}
      aria-hidden
    >
      {/* Monitor top face — isometric skew */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '2px',
          width: '16px',
          height: '6px',
          background: MONITOR_COLORS.frame,
          transform: 'skewX(-30deg)',
          boxShadow: isWorking ? `0 0 8px ${statusHex}60` : 'none',
        }}
      />
      {/* Monitor front face — screen bezel */}
      <div
        style={{
          position: 'absolute',
          top: '5px',
          left: '0px',
          width: '20px',
          height: '14px',
          background: MONITOR_COLORS.frame,
          border: `1px solid #3A3030`,
          borderRadius: '1px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Screen glass */}
        <div
          style={{
            width: '16px',
            height: '10px',
            background: screenColour,
            borderRadius: '1px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: isWorking ? `inset 0 0 4px ${statusHex}60` : 'none',
          }}
        >
          {isWorking && (
            <div
              style={{
                width: '100%',
                height: '2px',
                marginTop: '2px',
                background: `linear-gradient(90deg, transparent, ${statusHex}80, transparent)`,
                animation: 'monitor-scan 2s linear infinite',
              }}
            />
          )}
        </div>
      </div>
      {/* Monitor stand */}
      <div
        style={{
          position: 'absolute',
          bottom: '0px',
          left: '8px',
          width: '4px',
          height: '3px',
          background: '#6A5A50',
        }}
      />
    </div>
  )
}

// Isometric chair — visible back-rest + seat from above-right angle
function IsometricChair({ deptColor }: { deptColor: string }) {
  return (
    <div
      style={{ position: 'relative', width: '26px', height: '20px' }}
      aria-hidden
    >
      {/* Chair top face — isometric skew */}
      <div
        style={{
          position: 'absolute',
          top: '2px',
          left: '3px',
          width: '20px',
          height: '8px',
          background: `color-mix(in srgb, ${deptColor} 25%, #C8A870)`,
          transform: 'skewX(-20deg)',
          border: `1px solid ${deptColor}50`,
          borderRadius: '1px',
        }}
      />
      {/* Chair seat front face */}
      <div
        style={{
          position: 'absolute',
          top: '9px',
          left: '0px',
          width: '22px',
          height: '5px',
          background: `color-mix(in srgb, ${deptColor} 20%, #A08860)`,
          border: `1px solid ${deptColor}30`,
          borderRadius: '0 0 2px 2px',
        }}
      />
      {/* Back rest — tall vertical back */}
      <div
        style={{
          position: 'absolute',
          top: '0px',
          right: '0px',
          width: '6px',
          height: '14px',
          background: `color-mix(in srgb, ${deptColor} 30%, #B09070)`,
          border: `1px solid ${deptColor}40`,
          borderRadius: '1px 2px 1px 0',
        }}
      />
    </div>
  )
}

// Desk item — coffee cup or mini plant, chosen by nameHash
function DeskItem({ hash }: { hash: number }) {
  if (hash % 2 === 0) {
    // Coffee cup (isometric cylinder)
    return (
      <div style={{ position: 'relative', width: '8px', height: '10px' }} aria-hidden>
        {/* Cup top ellipse */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '8px',
            height: '4px',
            background: '#5A3820',
            border: '1px solid #7A5838',
            borderRadius: '50%',
          }}
        />
        {/* Cup body */}
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: '0px',
            width: '8px',
            height: '7px',
            background: '#7A5030',
            border: '1px solid #9A7050',
            borderRadius: '0 0 2px 2px',
          }}
        />
        {/* Handle */}
        <div
          style={{
            position: 'absolute',
            top: '3px',
            right: '-3px',
            width: '3px',
            height: '4px',
            border: '1px solid #9A7050',
            borderLeft: 'none',
            borderRadius: '0 2px 2px 0',
          }}
        />
      </div>
    )
  }
  // Mini plant — isometric pot
  return (
    <div style={{ position: 'relative', width: '8px', height: '12px' }} aria-hidden>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '1px',
          width: '6px',
          height: '4px',
          background: '#8B5028',
          borderRadius: '0 0 1px 1px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '4px',
          left: '3px',
          width: '2px',
          height: '3px',
          background: '#3A7A28',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '5px',
          left: '0px',
          width: '4px',
          height: '4px',
          background: '#4A9A38',
          borderRadius: '50% 0 50% 0',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '5px',
          right: '0px',
          width: '4px',
          height: '4px',
          background: '#58B048',
          borderRadius: '0 50% 0 50%',
        }}
      />
    </div>
  )
}

const MONITOR_SCAN_KEYFRAME = `
@keyframes monitor-scan {
  0% { transform: translateY(0); opacity: 0.8; }
  100% { transform: translateY(8px); opacity: 0; }
}
`

export const Desk = memo(function Desk({ employee, onClick }: DeskProps) {
  const isWorking = employee.status === 'working'
  const deptColor = DEPT_COLORS[employee.department] || '#A07850'
  const statusHex = STATUS_COLORS[employee.status]?.hex || STATUS_COLORS.idle.hex
  const hash = nameHash(employee.name)

  return (
    <>
      <style>{MONITOR_SCAN_KEYFRAME}</style>
      <div
        onClick={() => onClick(employee.name)}
        title={employee.displayName}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '4px',
          transition: 'filter 0.15s',
          userSelect: 'none',
          width: `${ISO_DESK_W}px`,
          minWidth: `${ISO_DESK_W}px`,
          filter: `drop-shadow(0 4px 6px rgba(0,0,0,0.25))`,
        }}
        className="desk-item hover:brightness-110"
      >
        {/* Speech bubble for working employees */}
        {isWorking && employee.taskSnippet && (
          <SpeechBubble text={employee.taskSnippet} />
        )}

        {/* Employee sprite */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            height: '112px',
            width: `${ISO_DESK_W}px`,
            position: 'relative',
          }}
        >
          <EmployeeSprite
            name={employee.name}
            department={employee.department}
            status={employee.status}
            scale={4}
            appearance={employee.appearance}
          />
        </div>

        {/* ---- Isometric desk furniture ---- */}
        {/* The desk unit is 3 CSS faces: top (skewed), front, left side */}
        <div
          style={{
            position: 'relative',
            width: `${ISO_DESK_W}px`,
            height: `${ISO_DESK_H}px`,
            marginTop: '-6px',
          }}
          aria-hidden
        >
          {/* Chair behind/above desk in isometric space */}
          <div
            style={{
              position: 'absolute',
              top: '2px',
              left: '4px',
              zIndex: 0,
            }}
          >
            <IsometricChair deptColor={deptColor} />
          </div>

          {/* Desk TOP face — the surface we see from above-right */}
          {/* Drawn as a skewed parallelogram */}
          <div
            style={{
              position: 'absolute',
              top: '14px',
              left: '8px',
              width: '52px',
              height: '20px',
              background: FURNITURE_COLORS.wood_light,
              transform: 'skewX(-20deg)',
              borderTop: `1px solid ${FURNITURE_COLORS.wood_light}`,
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              padding: '0 6px',
              overflow: 'visible',
            }}
          >
            {/* Items on the desk surface — un-skewed with counter-transform */}
            <div style={{ transform: 'skewX(20deg)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <DeskItem hash={hash} />
              <IsometricMonitor isWorking={isWorking} statusHex={statusHex} />
              {/* Notepad */}
              <div
                style={{
                  width: '6px',
                  height: '8px',
                  background: '#F8F0D8',
                  border: '1px solid #D4C8A0',
                  borderRadius: '1px',
                  opacity: 0.85,
                }}
              />
            </div>
          </div>

          {/* Desk FRONT face — south-facing rectangle */}
          <div
            style={{
              position: 'absolute',
              top: '32px',
              left: '4px',
              width: '54px',
              height: '12px',
              background: FURNITURE_COLORS.wood_med,
              border: `1px solid ${FURNITURE_COLORS.wood_dark}`,
              borderTop: 'none',
              borderRadius: '0 0 2px 2px',
              zIndex: 2,
              boxShadow: `inset 0 -2px 4px rgba(0,0,0,0.2)`,
            }}
          />

          {/* Desk LEFT face — west-facing, slightly darker */}
          <div
            style={{
              position: 'absolute',
              top: '18px',
              left: '4px',
              width: '8px',
              height: '24px',
              background: FURNITURE_COLORS.wood_dark,
              transform: 'skewY(-30deg)',
              zIndex: 1,
            }}
          />
        </div>

        {/* Habbo-style name plate */}
        <div
          style={{
            background: '#FFFEF8',
            border: `1px solid ${deptColor}80`,
            borderRadius: '3px',
            padding: '1px 6px',
            marginTop: '2px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}
        >
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '8px',
              fontWeight: 700,
              color: deptColor,
              textAlign: 'center',
              lineHeight: 1.2,
              maxWidth: `${ISO_DESK_W}px`,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
            }}
          >
            {employee.displayName}
          </span>
        </div>

        {/* Status indicator dot */}
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: statusHex,
            boxShadow: `0 0 4px ${statusHex}`,
            border: '1px solid rgba(255,255,255,0.3)',
          }}
        />
      </div>
    </>
  )
})
