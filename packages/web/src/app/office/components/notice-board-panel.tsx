'use client'

import React, { memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface NoticeBoardPanelProps {
  onClose: () => void
}

export const NoticeBoardPanel = memo(function NoticeBoardPanel({ onClose }: NoticeBoardPanelProps) {
  const { data: goals } = useQuery({
    queryKey: ['goals'],
    queryFn: () => api.getGoals(),
    staleTime: 30_000,
  })

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '280px',
        background: '#14141e',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'panel-slide-in 0.2s ease-out',
      }}
    >
      <style>{`
        @keyframes panel-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <span style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: 700, color: '#ff8c00', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Notice Board
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary, #666)',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: '12px',
            padding: '2px 6px',
          }}
        >
          ×
        </button>
      </div>

      {/* Goals list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {!goals || (Array.isArray(goals) && goals.length === 0) ? (
          <span style={{ fontFamily: 'monospace', fontSize: '9px', color: 'var(--text-tertiary)', opacity: 0.6 }}>
            No items posted
          </span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(Array.isArray(goals) ? goals : []).map((goal: any, i: number) => (
              <div
                key={goal.id || i}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '4px',
                  padding: '6px 8px',
                }}
              >
                <div style={{ fontFamily: 'monospace', fontSize: '9px', color: 'var(--text-primary, #ddd)', marginBottom: '2px' }}>
                  {goal.title || goal.name || 'Untitled'}
                </div>
                {goal.description && (
                  <div style={{ fontFamily: 'monospace', fontSize: '8px', color: 'var(--text-tertiary, #888)', lineHeight: 1.3 }}>
                    {goal.description.length > 100 ? goal.description.slice(0, 97) + '...' : goal.description}
                  </div>
                )}
                {goal.status && (
                  <div style={{ fontFamily: 'monospace', fontSize: '7px', color: goal.status === 'done' ? '#48bb78' : goal.status === 'in_progress' ? '#ed8936' : '#4a5568', marginTop: '3px', textTransform: 'uppercase' }}>
                    {goal.status.replace(/_/g, ' ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})
