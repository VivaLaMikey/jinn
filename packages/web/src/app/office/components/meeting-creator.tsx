'use client'

import React, { memo, useMemo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { api } from '@/lib/api'
import type { OfficeEmployee } from '../hooks/use-office-state'
import { DEPT_COLORS, STATUS_COLORS } from '../lib/pixel-palette'

interface MeetingCreatorProps {
  employees: OfficeEmployee[]
  onClose: () => void
  onCreated?: () => void
}

// Pixel-art modal frame
const MODAL_PIXEL_BORDER = `
  -2px 0 0 0 var(--separator, #3a3a3a),
   2px 0 0 0 var(--separator, #3a3a3a),
   0 -2px 0 0 var(--separator, #3a3a3a),
   0  2px 0 0 var(--separator, #3a3a3a),
  -2px -2px 0 0 var(--separator, #3a3a3a),
   2px -2px 0 0 var(--separator, #3a3a3a),
  -2px  2px 0 0 var(--separator, #3a3a3a),
   2px  2px 0 0 var(--separator, #3a3a3a),
  0 24px 80px rgba(0,0,0,0.9)
`

export const MeetingCreator = memo(function MeetingCreator({
  employees,
  onClose,
  onCreated,
}: MeetingCreatorProps) {
  const [title, setTitle] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Group employees by department
  const byDept = useMemo(() => {
    const map = new Map<string, OfficeEmployee[]>()
    for (const emp of employees) {
      const dept = emp.department || 'other'
      if (!map.has(dept)) map.set(dept, [])
      map.get(dept)!.push(emp)
    }
    return map
  }, [employees])

  const toggleEmployee = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || selected.size === 0) return
    setLoading(true)
    setError(null)
    try {
      await api.createMeeting({
        title: title.trim(),
        participants: Array.from(selected),
      })
      onCreated?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create meeting')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 50,
          }}
        />
        <Dialog.Content
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--bg, #0a0a0a)',
            width: '400px',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 51,
            fontFamily: 'monospace',
            boxShadow: MODAL_PIXEL_BORDER,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderBottom: '1px solid var(--separator, #222)',
              background: 'var(--bg-secondary, rgba(18,18,18,0.98))',
              flexShrink: 0,
            }}
          >
            <Dialog.Title
              style={{
                fontFamily: 'monospace',
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--accent, #ff8c00)',
                margin: 0,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              NEW MEETING
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                style={{
                  background: 'var(--fill-tertiary, rgba(255,255,255,0.04))',
                  border: '1px solid var(--separator, #333)',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary, #666)',
                  padding: '2px 6px',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  lineHeight: 1,
                  boxShadow: 'inset -1px -1px 0 0 rgba(0,0,0,0.4)',
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </Dialog.Close>
          </div>

          {/* Form body */}
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}
          >
            {/* Topic input */}
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--separator, #222)', flexShrink: 0 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '8px',
                  color: 'var(--text-tertiary, #555)',
                  marginBottom: '5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Meeting Topic
              </label>
              {/* Terminal-styled input */}
              <div style={{ background: '#0d1117', border: '1px solid #1e2a2e', display: 'flex', alignItems: 'center' }}>
                <span style={{ padding: '0 6px', fontSize: '10px', color: '#3a7a9a', flexShrink: 0 }}>&gt;</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's this meeting about?"
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '6px 6px 6px 0',
                    background: 'transparent',
                    border: 'none',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: '#7ab8d4',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Participants — grouped by department */}
            <div style={{ padding: '8px 12px', flex: 1, overflowY: 'auto' }}>
              {/* Selected count */}
              <div
                style={{
                  fontSize: '9px',
                  color: selected.size > 0 ? 'var(--accent, #ff8c00)' : 'var(--text-tertiary, #555)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: selected.size > 0 ? 700 : 400,
                }}
              >
                {selected.size} PARTICIPANTS SELECTED
              </div>

              {Array.from(byDept.entries()).map(([dept, emps]) => {
                const deptColor = DEPT_COLORS[dept] || '#888'
                return (
                  <div key={dept} style={{ marginBottom: '8px' }}>
                    {/* Department header */}
                    <div
                      style={{
                        fontSize: '8px',
                        color: deptColor,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: '4px',
                        borderBottom: `1px solid ${deptColor}25`,
                        paddingBottom: '2px',
                      }}
                    >
                      {dept}
                    </div>
                    {/* Employees in 2-column grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '2px',
                      }}
                    >
                      {emps.map((emp) => {
                        const isChecked = selected.has(emp.name)
                        const statusColor = STATUS_COLORS[emp.status]?.hex || STATUS_COLORS.idle.hex
                        return (
                          <label
                            key={emp.name}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 5px',
                              cursor: 'pointer',
                              background: isChecked
                                ? `${deptColor}18`
                                : 'transparent',
                              border: `1px solid ${isChecked ? deptColor + '40' : 'transparent'}`,
                              transition: 'background 0.1s',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleEmployee(emp.name)}
                              style={{ accentColor: deptColor, cursor: 'pointer', width: '10px', height: '10px' }}
                            />
                            {/* Status dot */}
                            <div
                              style={{
                                width: '4px',
                                height: '4px',
                                background: statusColor,
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                fontSize: '9px',
                                color: isChecked ? 'var(--text-primary, #e0e0e0)' : 'var(--text-secondary, #888)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {emp.displayName}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '10px 12px',
                borderTop: '1px solid var(--separator, #222)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                flexShrink: 0,
                background: 'var(--bg-secondary, rgba(18,18,18,0.6))',
              }}
            >
              {error && (
                <div style={{ fontSize: '9px', color: 'var(--system-red, #fc5c65)', letterSpacing: '0.04em' }}>
                  !! {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '4px 10px',
                    background: 'transparent',
                    border: 'none',
                    fontSize: '9px',
                    color: 'var(--text-tertiary, #666)',
                    cursor: 'pointer',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    fontFamily: 'monospace',
                    boxShadow: `
                      inset -1px -1px 0 0 rgba(0,0,0,0.5),
                      inset 1px 1px 0 0 rgba(255,255,255,0.06),
                      0 0 0 1px var(--separator, #333)
                    `,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || selected.size === 0 || loading}
                  style={{
                    padding: '4px 14px',
                    background:
                      title.trim() && selected.size > 0 && !loading
                        ? 'color-mix(in srgb, var(--accent, #ff8c00) 22%, transparent)'
                        : 'transparent',
                    border: 'none',
                    fontSize: '9px',
                    color: 'var(--accent, #ff8c00)',
                    cursor:
                      title.trim() && selected.size > 0 && !loading
                        ? 'pointer'
                        : 'not-allowed',
                    opacity: title.trim() && selected.size > 0 && !loading ? 1 : 0.35,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    boxShadow:
                      title.trim() && selected.size > 0 && !loading
                        ? `
                          inset -2px -2px 0 0 rgba(0,0,0,0.5),
                          inset 2px 2px 0 0 rgba(255,255,255,0.1),
                          0 0 0 1px var(--accent, #ff8c00)
                        `
                        : '0 0 0 1px var(--separator, #333)',
                  }}
                >
                  {loading ? 'STARTING...' : 'START MEETING'}
                </button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
})
