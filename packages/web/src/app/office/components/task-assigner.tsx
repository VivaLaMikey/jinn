'use client'

import React, { memo, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'

interface TaskAssignerProps {
  employeeName: string
  onClose: () => void
  onAssigned?: () => void
}

// Pixel-art modal border
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
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
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
          background: 'var(--bg, #0a0a0a)',
          width: '360px',
          overflow: 'hidden',
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
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--accent, #ff8c00)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            ASSIGN TASK TO: {displayName.toUpperCase()}
          </span>
          <button
            onClick={onClose}
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
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '12px' }}>
          {/* Terminal textarea */}
          <div
            style={{
              background: '#0d1a10',
              border: '1px solid #1a3a22',
              padding: '2px 0',
            }}
          >
            <div
              style={{
                padding: '4px 8px',
                fontSize: '8px',
                color: '#3a7a4a',
                borderBottom: '1px solid #1a3a22',
                letterSpacing: '0.06em',
              }}
            >
              &gt; task input
            </div>
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the task..."
              style={{
                display: 'block',
                width: '100%',
                height: '90px',
                background: 'transparent',
                border: 'none',
                padding: '8px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#5dbf72',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              disabled={loading}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                marginTop: '6px',
                fontSize: '9px',
                color: 'var(--system-red, #fc5c65)',
                letterSpacing: '0.04em',
              }}
            >
              !! {error}
            </div>
          )}

          {/* Buttons */}
          <div
            style={{
              marginTop: '10px',
              display: 'flex',
              gap: '6px',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '8px',
                color: 'var(--text-tertiary, #444)',
                marginRight: 'auto',
              }}
            >
              {loading ? 'PROCESSING...' : '⌘↵ to submit · ESC to cancel'}
            </span>

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
              ESC
            </button>

            <button
              type="submit"
              disabled={!prompt.trim() || loading}
              style={{
                padding: '4px 14px',
                background: prompt.trim() && !loading
                  ? 'color-mix(in srgb, var(--accent, #ff8c00) 22%, transparent)'
                  : 'transparent',
                border: 'none',
                fontSize: '9px',
                color: 'var(--accent, #ff8c00)',
                cursor: prompt.trim() && !loading ? 'pointer' : 'not-allowed',
                opacity: prompt.trim() && !loading ? 1 : 0.35,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontFamily: 'monospace',
                fontWeight: 700,
                boxShadow: prompt.trim() && !loading
                  ? `
                    inset -2px -2px 0 0 rgba(0,0,0,0.5),
                    inset 2px 2px 0 0 rgba(255,255,255,0.1),
                    0 0 0 1px var(--accent, #ff8c00)
                  `
                  : '0 0 0 1px var(--separator, #333)',
              }}
            >
              {loading ? 'SENDING...' : 'CONFIRM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
})
