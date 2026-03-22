'use client'

import React, { memo, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { api } from '@/lib/api'
import type { OfficeEmployee } from '../hooks/use-office-state'

interface MeetingCreatorProps {
  employees: OfficeEmployee[]
  onClose: () => void
  onCreated?: () => void
}

export const MeetingCreator = memo(function MeetingCreator({
  employees,
  onClose,
  onCreated,
}: MeetingCreatorProps) {
  const [title, setTitle] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
            background: 'rgba(0,0,0,0.6)',
            zIndex: 50,
          }}
        />
        <Dialog.Content
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--material-regular, #111)',
            border: '1px solid var(--separator, #333)',
            borderRadius: '6px',
            width: '380px',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 51,
            fontFamily: 'monospace',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
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
              flexShrink: 0,
            }}
          >
            <Dialog.Title
              style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--text-primary, #e0e0e0)',
                margin: 0,
              }}
            >
              Call a Meeting
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary, #666)',
                  padding: '2px',
                  display: 'flex',
                }}
                className="hover:opacity-70 transition-opacity"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </Dialog.Close>
          </div>

          {/* Form body */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '12px', borderBottom: '1px solid var(--separator, #222)', flexShrink: 0 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '9px',
                  color: 'var(--text-tertiary, #555)',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Meeting Topic
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's this meeting about?"
                autoFocus
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  background: 'var(--fill-tertiary, rgba(255,255,255,0.03))',
                  border: '1px solid var(--separator, #333)',
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: 'var(--text-primary, #e0e0e0)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Participants */}
            <div style={{ padding: '8px 12px', flex: 1, overflowY: 'auto' }}>
              <div
                style={{
                  fontSize: '9px',
                  color: 'var(--text-tertiary, #555)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Participants ({selected.size} selected)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {employees.map((emp) => (
                  <label
                    key={emp.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 6px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      background: selected.has(emp.name)
                        ? 'color-mix(in srgb, var(--accent, #ff8c00) 10%, transparent)'
                        : 'transparent',
                    }}
                    className="hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(emp.name)}
                      onChange={() => toggleEmployee(emp.name)}
                      style={{ accentColor: 'var(--accent, #ff8c00)', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary, #aaa)' }}>
                      {emp.displayName}
                    </span>
                    {emp.status !== 'idle' && (
                      <span style={{ fontSize: '8px', color: 'var(--text-tertiary, #555)', marginLeft: 'auto' }}>
                        {emp.status}
                      </span>
                    )}
                  </label>
                ))}
              </div>
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
              }}
            >
              {error && (
                <div style={{ fontSize: '9px', color: 'var(--system-red, #fc5c65)' }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '5px 10px',
                    background: 'transparent',
                    border: '1px solid var(--separator, #333)',
                    borderRadius: '3px',
                    fontSize: '9px',
                    color: 'var(--text-tertiary, #666)',
                    cursor: 'pointer',
                    letterSpacing: '0.05em',
                  }}
                  className="hover:opacity-80 transition-opacity"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || selected.size === 0 || loading}
                  style={{
                    padding: '5px 12px',
                    background: 'color-mix(in srgb, var(--system-orange, #ed8936) 20%, transparent)',
                    border: '1px solid var(--system-orange, #ed8936)',
                    borderRadius: '3px',
                    fontSize: '9px',
                    color: 'var(--system-orange, #ed8936)',
                    cursor:
                      title.trim() && selected.size > 0 && !loading
                        ? 'pointer'
                        : 'not-allowed',
                    opacity: title.trim() && selected.size > 0 && !loading ? 1 : 0.4,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                  className="transition-opacity"
                >
                  {loading ? 'Starting...' : 'Start Meeting'}
                </button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
})
