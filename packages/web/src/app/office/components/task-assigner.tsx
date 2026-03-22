'use client'

import React, { memo, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { api } from '@/lib/api'

interface TaskAssignerProps {
  employeeName: string
  onClose: () => void
  onAssigned?: () => void
}

export const TaskAssigner = memo(function TaskAssigner({
  employeeName,
  onClose,
  onAssigned,
}: TaskAssignerProps) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const displayName = employeeName
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    try {
      await api.createSession({ employee: employeeName, prompt: prompt.trim() })
      onAssigned?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign task')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e as any)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        fontFamily: 'monospace',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: 'var(--material-regular, #111)',
          border: '1px solid var(--separator, #333)',
          borderRadius: '6px',
          width: '340px',
          overflow: 'hidden',
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
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary, #e0e0e0)' }}>
            Assign Task — {displayName}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-tertiary, #666)',
              padding: '2px',
              display: 'flex',
            }}
            className="hover:opacity-70 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '12px' }}>
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the task..."
            style={{
              width: '100%',
              height: '100px',
              background: 'var(--fill-tertiary, rgba(255,255,255,0.03))',
              border: '1px solid var(--separator, #333)',
              borderRadius: '4px',
              padding: '8px',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: 'var(--text-primary, #e0e0e0)',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            disabled={loading}
          />

          {error && (
            <div
              style={{
                marginTop: '6px',
                fontSize: '9px',
                color: 'var(--system-red, #fc5c65)',
              }}
            >
              {error}
            </div>
          )}

          <div
            style={{
              marginTop: '8px',
              display: 'flex',
              gap: '6px',
              justifyContent: 'flex-end',
            }}
          >
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
              disabled={!prompt.trim() || loading}
              style={{
                padding: '5px 12px',
                background: 'color-mix(in srgb, var(--accent, #ff8c00) 20%, transparent)',
                border: '1px solid var(--accent, #ff8c00)',
                borderRadius: '3px',
                fontSize: '9px',
                color: 'var(--accent, #ff8c00)',
                cursor: prompt.trim() && !loading ? 'pointer' : 'not-allowed',
                opacity: prompt.trim() && !loading ? 1 : 0.4,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
              className="transition-opacity"
            >
              {loading ? 'Assigning...' : 'Assign'}
            </button>
          </div>

          <div style={{ marginTop: '6px', fontSize: '8px', color: 'var(--text-tertiary, #444)', textAlign: 'right' }}>
            Cmd+Enter to submit
          </div>
        </form>
      </div>
    </div>
  )
})
