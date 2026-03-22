'use client'

import React, { memo, useState, useCallback } from 'react'
import Link from 'next/link'
import type { OfficeEmployee } from '../hooks/use-office-state'
import { DEPT_COLORS, STATUS_COLORS } from '../lib/pixel-palette'

interface EmployeePanelProps {
  employee: OfficeEmployee | null
  onClose: () => void
  onAssignTask: (name: string) => void
}

// Pixel-art frame border
const PANEL_PIXEL_BORDER = `
  -2px 0 0 0 var(--separator, #2a2a2a),
   2px 0 0 0 var(--separator, #2a2a2a),
   0 -2px 0 0 var(--separator, #2a2a2a),
   0  2px 0 0 var(--separator, #2a2a2a),
  -2px -2px 0 0 var(--separator, #2a2a2a),
   2px -2px 0 0 var(--separator, #2a2a2a),
  -2px  2px 0 0 var(--separator, #2a2a2a),
   2px  2px 0 0 var(--separator, #2a2a2a),
  -8px 0 20px rgba(0,0,0,0.6)
`

// Employees on a PIP — hardcoded for now, can be made dynamic
const PIP_EMPLOYEES = new Set(['head-of-development'])

type FeedbackState = 'idle' | 'loading' | 'success' | 'flagged'

export const EmployeePanel = memo(function EmployeePanel({
  employee,
  onClose,
  onAssignTask,
}: EmployeePanelProps) {
  const [goodJobState, setGoodJobState] = useState<FeedbackState>('idle')
  const [needsWorkState, setNeedsWorkState] = useState<FeedbackState>('idle')

  const sendFeedback = useCallback(
    async (type: 'positive' | 'negative', setState: (s: FeedbackState) => void) => {
      if (!employee) return
      setState('loading')
      try {
        const res = await fetch(
          `http://127.0.0.1:7777/api/org/employees/${employee.name}/feedback`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type,
              message: type === 'positive' ? 'Good job!' : 'Needs improvement',
            }),
          },
        )
        if (!res.ok && res.status !== 404) {
          console.warn('[EmployeePanel] Feedback endpoint returned', res.status)
        }
      } catch (err) {
        console.warn('[EmployeePanel] Feedback request failed (endpoint may not exist yet)', err)
      }
      setState(type === 'positive' ? 'success' : 'flagged')
      // Revert label after 2s
      setTimeout(() => setState('idle'), 2000)
    },
    [employee],
  )

  if (!employee) return null

  const deptColor = DEPT_COLORS[employee.department] || '#888'
  const statusColor = STATUS_COLORS[employee.status]?.hex || STATUS_COLORS.idle.hex
  const isOnPip = PIP_EMPLOYEES.has(employee.name)

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '300px',
        background: 'var(--bg, #0a0a0a)',
        borderLeft: `2px solid ${deptColor}50`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        fontFamily: 'monospace',
        animation: 'panel-slide-in 0.2s ease-out',
        willChange: 'transform',
        boxShadow: PANEL_PIXEL_BORDER,
      }}
    >
      <style>{`
        @keyframes panel-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>

      {/* PIP warning banner */}
      {isOnPip && (
        <div
          style={{
            background: 'color-mix(in srgb, var(--system-orange, #ed8936) 18%, transparent)',
            borderBottom: '1px solid var(--system-orange, #ed8936)',
            padding: '4px 12px',
            fontSize: '8px',
            color: 'var(--system-orange, #ed8936)',
            letterSpacing: '0.05em',
            textAlign: 'center',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          On Performance Improvement Plan
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: `1px solid ${deptColor}25`,
        }}
      >
        <div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--text-primary, #e0e0e0)',
              letterSpacing: '0.04em',
              marginBottom: '2px',
            }}
          >
            {employee.displayName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                fontSize: '8px',
                padding: '1px 5px',
                background: `${deptColor}20`,
                color: deptColor,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                border: `1px solid ${deptColor}40`,
              }}
            >
              {employee.department || 'unassigned'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  background: statusColor,
                  boxShadow: employee.status === 'working' ? `0 0 5px ${statusColor}` : 'none',
                }}
              />
              <span
                style={{
                  fontSize: '8px',
                  color: statusColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {employee.status}
              </span>
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            background: 'var(--fill-tertiary, rgba(255,255,255,0.04))',
            border: '1px solid var(--separator, #333)',
            cursor: 'pointer',
            color: 'var(--text-tertiary, #666)',
            padding: '4px 6px',
            fontFamily: 'monospace',
            fontSize: '10px',
            lineHeight: 1,
            boxShadow: 'inset -1px -1px 0 0 rgba(0,0,0,0.4), inset 1px 1px 0 0 rgba(255,255,255,0.08)',
          }}
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      {/* Task section */}
      {employee.taskSnippet && (
        <div
          style={{
            margin: '10px 12px 0',
            padding: '6px 8px',
            background: '#0d1a10',
            border: '1px solid #1a3a22',
          }}
        >
          <div
            style={{
              fontSize: '8px',
              color: '#3a7a4a',
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            &gt; current task
          </div>
          <div
            style={{
              fontSize: '10px',
              color: '#5dbf72',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {employee.taskSnippet}
          </div>
        </div>
      )}

      {/* Session ID */}
      {employee.sessionId && (
        <div style={{ padding: '6px 12px 0' }}>
          <span style={{ fontSize: '8px', color: 'var(--text-tertiary, #444)' }}>
            session: {employee.sessionId.slice(0, 8)}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {/* Open Chat — primary action */}
        <Link
          href={`/chat?employee=${employee.name}`}
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '7px',
            background: `${deptColor}20`,
            border: 'none',
            color: deptColor,
            textDecoration: 'none',
            fontSize: '10px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
            fontWeight: 700,
            boxShadow: `
              inset -2px -2px 0 0 rgba(0,0,0,0.5),
              inset 2px 2px 0 0 rgba(255,255,255,0.08),
              0 0 0 1px ${deptColor}60
            `,
          }}
        >
          Open Chat
        </Link>

        {/* Assign Task — secondary */}
        <button
          onClick={() => onAssignTask(employee.name)}
          style={{
            padding: '7px',
            background: 'var(--fill-tertiary, rgba(255,255,255,0.03))',
            border: 'none',
            fontSize: '10px',
            color: 'var(--text-secondary, #aaa)',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
            boxShadow: `
              inset -2px -2px 0 0 rgba(0,0,0,0.5),
              inset 2px 2px 0 0 rgba(255,255,255,0.06),
              0 0 0 1px var(--separator, #333)
            `,
          }}
        >
          Assign Task
        </button>

        {/* Feedback buttons */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => sendFeedback('positive', setGoodJobState)}
            disabled={goodJobState === 'loading'}
            style={{
              flex: 1,
              padding: '5px',
              background:
                goodJobState === 'success'
                  ? 'color-mix(in srgb, var(--system-green, #48bb78) 25%, transparent)'
                  : 'color-mix(in srgb, var(--system-green, #48bb78) 10%, transparent)',
              border: 'none',
              fontSize: '9px',
              color: 'var(--system-green, #48bb78)',
              cursor: goodJobState === 'loading' ? 'wait' : 'pointer',
              fontFamily: 'monospace',
              letterSpacing: '0.04em',
              opacity: goodJobState === 'loading' ? 0.6 : 1,
              boxShadow: `
                inset -1px -1px 0 0 rgba(0,0,0,0.5),
                inset 1px 1px 0 0 rgba(255,255,255,0.08),
                0 0 0 1px color-mix(in srgb, var(--system-green, #48bb78) 35%, transparent)
              `,
              transition: 'background 0.15s',
            }}
          >
            {goodJobState === 'loading' ? '...' : goodJobState === 'success' ? 'Noted!' : 'Good Job'}
          </button>

          <button
            onClick={() => sendFeedback('negative', setNeedsWorkState)}
            disabled={needsWorkState === 'loading'}
            style={{
              flex: 1,
              padding: '5px',
              background:
                needsWorkState === 'flagged'
                  ? 'color-mix(in srgb, var(--system-orange, #ed8936) 25%, transparent)'
                  : 'color-mix(in srgb, var(--system-orange, #ed8936) 10%, transparent)',
              border: 'none',
              fontSize: '9px',
              color: 'var(--system-orange, #ed8936)',
              cursor: needsWorkState === 'loading' ? 'wait' : 'pointer',
              fontFamily: 'monospace',
              letterSpacing: '0.04em',
              opacity: needsWorkState === 'loading' ? 0.6 : 1,
              boxShadow: `
                inset -1px -1px 0 0 rgba(0,0,0,0.5),
                inset 1px 1px 0 0 rgba(255,255,255,0.08),
                0 0 0 1px color-mix(in srgb, var(--system-orange, #ed8936) 35%, transparent)
              `,
              transition: 'background 0.15s',
            }}
          >
            {needsWorkState === 'loading' ? '...' : needsWorkState === 'flagged' ? 'Flagged' : 'Needs Work'}
          </button>
        </div>
      </div>

      {/* Footer: internal ID */}
      <div
        style={{
          marginTop: 'auto',
          padding: '7px 12px',
          borderTop: '1px solid var(--separator, #1a1a1a)',
        }}
      >
        <span style={{ fontSize: '8px', color: 'var(--text-tertiary, #333)', letterSpacing: '0.04em' }}>
          {employee.name}
        </span>
      </div>
    </div>
  )
})
