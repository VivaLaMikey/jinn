'use client'

import React, { memo } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import type { OfficeEmployee } from '../hooks/use-office-state'
import { DEPT_COLORS, STATUS_COLORS } from '../lib/pixel-palette'

interface EmployeePanelProps {
  employee: OfficeEmployee | null
  onClose: () => void
  onAssignTask: (name: string) => void
}

export const EmployeePanel = memo(function EmployeePanel({
  employee,
  onClose,
  onAssignTask,
}: EmployeePanelProps) {
  if (!employee) return null

  const deptColor = DEPT_COLORS[employee.department] || '#888'
  const statusColor = STATUS_COLORS[employee.status]?.hex || STATUS_COLORS.idle.hex

  const handleGoodJob = () => {
    // TODO: hook up to feedback API once endpoint is available
    console.log('[Office] Good job feedback for', employee.name)
  }

  const handleNeedsImprovement = () => {
    // TODO: hook up to feedback API once endpoint is available
    console.log('[Office] Needs improvement feedback for', employee.name)
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '260px',
        background: 'var(--material-regular, rgba(15,15,15,0.97))',
        borderLeft: `1px solid ${deptColor}40`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        fontFamily: 'monospace',
        animation: 'panel-slide-in 0.2s ease-out',
        willChange: 'transform',
      }}
    >
      <style>{`
        @keyframes panel-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* Panel header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: `1px solid ${deptColor}30`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: statusColor,
              boxShadow: employee.status === 'working' ? `0 0 6px ${statusColor}` : 'none',
            }}
          />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-primary, #e0e0e0)',
            }}
          >
            {employee.displayName}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-tertiary, #666)',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
          }}
          className="hover:opacity-70 transition-opacity"
          aria-label="Close panel"
        >
          <X size={14} />
        </button>
      </div>

      {/* Info section */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--separator, #1a1a1a)' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
          <span
            style={{
              fontSize: '9px',
              padding: '2px 6px',
              borderRadius: '2px',
              background: `${deptColor}20`,
              color: deptColor,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {employee.department || 'unassigned'}
          </span>
          <span
            style={{
              fontSize: '9px',
              padding: '2px 6px',
              borderRadius: '2px',
              background: `${statusColor}20`,
              color: statusColor,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {employee.status}
          </span>
        </div>

        {/* Current task */}
        {employee.taskSnippet && (
          <div
            style={{
              marginTop: '8px',
              padding: '6px 8px',
              background: 'var(--fill-tertiary, rgba(255,255,255,0.03))',
              border: '1px solid var(--separator, #1a1a1a)',
              borderRadius: '3px',
            }}
          >
            <div style={{ fontSize: '8px', color: 'var(--text-tertiary, #555)', marginBottom: '3px', textTransform: 'uppercase' }}>
              Current task
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary, #aaa)', lineHeight: 1.4 }}>
              {employee.taskSnippet}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Link
          href={`/chat?employee=${employee.name}`}
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '6px',
            background: `${deptColor}20`,
            border: `1px solid ${deptColor}50`,
            borderRadius: '3px',
            fontSize: '10px',
            color: deptColor,
            textDecoration: 'none',
            letterSpacing: '0.05em',
          }}
          className="hover:opacity-80 transition-opacity"
        >
          Open Chat
        </Link>

        <button
          onClick={() => onAssignTask(employee.name)}
          style={{
            padding: '6px',
            background: 'var(--fill-tertiary, rgba(255,255,255,0.03))',
            border: '1px solid var(--separator, #333)',
            borderRadius: '3px',
            fontSize: '10px',
            color: 'var(--text-secondary, #aaa)',
            cursor: 'pointer',
            letterSpacing: '0.05em',
          }}
          className="hover:opacity-80 transition-opacity"
        >
          Assign Task
        </button>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={handleGoodJob}
            style={{
              flex: 1,
              padding: '5px',
              background: 'color-mix(in srgb, var(--system-green, #48bb78) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--system-green, #48bb78) 30%, transparent)',
              borderRadius: '3px',
              fontSize: '9px',
              color: 'var(--system-green, #48bb78)',
              cursor: 'pointer',
            }}
            className="hover:opacity-80 transition-opacity"
          >
            Good Job
          </button>
          <button
            onClick={handleNeedsImprovement}
            style={{
              flex: 1,
              padding: '5px',
              background: 'color-mix(in srgb, var(--system-orange, #ed8936) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--system-orange, #ed8936) 30%, transparent)',
              borderRadius: '3px',
              fontSize: '9px',
              color: 'var(--system-orange, #ed8936)',
              cursor: 'pointer',
            }}
            className="hover:opacity-80 transition-opacity"
          >
            Needs Work
          </button>
        </div>
      </div>

      {/* Employee name/id at bottom */}
      <div style={{ marginTop: 'auto', padding: '8px 12px', borderTop: '1px solid var(--separator, #1a1a1a)' }}>
        <span style={{ fontSize: '8px', color: 'var(--text-tertiary, #444)' }}>
          {employee.name}
          {employee.sessionId && (
            <span style={{ color: 'var(--text-tertiary, #444)' }}>
              {' '}· session: {employee.sessionId.slice(0, 8)}
            </span>
          )}
        </span>
      </div>
    </div>
  )
})
