'use client'

import React, { memo, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { StoreItem } from '@/lib/api'

interface StorePanelProps {
  buyerName: string
  onClose: () => void
}

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

const CATEGORIES = [
  { key: 'all', label: 'ALL' },
  { key: 'desk', label: 'DESK' },
  { key: 'room', label: 'ROOM' },
  { key: 'wall', label: 'WALL' },
] as const

type CategoryFilter = 'all' | 'desk' | 'room' | 'wall'
type PurchaseState = 'idle' | 'loading' | 'success' | 'error'

export const StorePanel = memo(function StorePanel({ buyerName, onClose }: StorePanelProps) {
  const queryClient = useQueryClient()
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all')
  const [purchaseState, setPurchaseState] = useState<Record<string, PurchaseState>>({})

  const { data: catalog = [] } = useQuery({
    queryKey: ['store-catalog'],
    queryFn: () => api.getStoreCatalog(),
  })

  const { data: wallets = {} } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => api.getWallets(),
  })

  const buyerWallet = wallets[buyerName]
  const balance = buyerWallet?.balance ?? 0

  const mutation = useMutation({
    mutationFn: ({ itemId }: { itemId: string }) => api.purchaseItem(buyerName, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] })
      queryClient.invalidateQueries({ queryKey: ['office-state'] })
    },
  })

  const handleBuy = useCallback(
    async (item: StoreItem) => {
      setPurchaseState((prev) => ({ ...prev, [item.id]: 'loading' }))
      try {
        await mutation.mutateAsync({ itemId: item.id })
        setPurchaseState((prev) => ({ ...prev, [item.id]: 'success' }))
        setTimeout(() => setPurchaseState((prev) => ({ ...prev, [item.id]: 'idle' })), 2000)
      } catch {
        setPurchaseState((prev) => ({ ...prev, [item.id]: 'error' }))
        setTimeout(() => setPurchaseState((prev) => ({ ...prev, [item.id]: 'idle' })), 2000)
      }
    },
    [mutation],
  )

  const filtered = activeCategory === 'all'
    ? catalog
    : catalog.filter((item) => item.category === activeCategory)

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '320px',
        background: 'var(--bg, #0a0a0a)',
        borderLeft: '2px solid #ffd70030',
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

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid #ffd70020',
          background: '#0d0d12',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: '#ffd700',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '2px',
            }}
          >
            Store
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#ffd700' }}>●</span>
            <span style={{ fontSize: '10px', color: '#ffd700', fontWeight: 700 }}>{balance}</span>
            <span style={{ fontSize: '9px', color: '#666', letterSpacing: '0.04em' }}>
              coins — {buyerName}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid #333',
            cursor: 'pointer',
            color: '#666',
            padding: '4px 6px',
            fontFamily: 'monospace',
            fontSize: '10px',
            lineHeight: 1,
            boxShadow: 'inset -1px -1px 0 0 rgba(0,0,0,0.4), inset 1px 1px 0 0 rgba(255,255,255,0.08)',
          }}
          aria-label="Close store"
        >
          ✕
        </button>
      </div>

      {/* Category tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #1a1a2a',
          background: '#0a0a0e',
        }}
      >
        {CATEGORIES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key as CategoryFilter)}
            style={{
              flex: 1,
              padding: '6px 4px',
              background: activeCategory === key ? '#ffd70015' : 'transparent',
              border: 'none',
              borderBottom: activeCategory === key ? '2px solid #ffd700' : '2px solid transparent',
              color: activeCategory === key ? '#ffd700' : '#555',
              fontFamily: 'monospace',
              fontSize: '9px',
              cursor: 'pointer',
              letterSpacing: '0.06em',
              transition: 'color 0.1s, background 0.1s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Item grid */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          alignContent: 'flex-start',
        }}
      >
        {filtered.length === 0 && (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '20px',
              textAlign: 'center',
              fontSize: '9px',
              color: '#444',
              letterSpacing: '0.04em',
            }}
          >
            no items in this category
          </div>
        )}
        {filtered.map((item) => {
          const state = purchaseState[item.id] ?? 'idle'
          const canAfford = balance >= item.cost
          const isLoading = state === 'loading'

          return (
            <div
              key={item.id}
              style={{
                background: '#14141e',
                border: '1px solid #1e1e2e',
                borderRadius: '2px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                boxShadow: 'inset -1px -1px 0 0 rgba(0,0,0,0.3)',
              }}
            >
              {/* Sprite */}
              <div
                style={{
                  fontSize: '24px',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  filter: canAfford ? 'none' : 'grayscale(80%) opacity(0.5)',
                }}
              >
                {item.sprite}
              </div>

              {/* Name */}
              <div
                style={{
                  fontSize: '9px',
                  color: '#ccc',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textAlign: 'center',
                  lineHeight: 1.3,
                }}
              >
                {item.name}
              </div>

              {/* Cost */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '3px',
                }}
              >
                <span style={{ fontSize: '10px', color: '#ffd700' }}>●</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: canAfford ? '#ffd700' : '#664400',
                  }}
                >
                  {item.cost}
                </span>
              </div>

              {/* Buy button */}
              <button
                onClick={() => handleBuy(item)}
                disabled={!canAfford || isLoading}
                style={{
                  padding: '4px',
                  background:
                    state === 'success'
                      ? 'color-mix(in srgb, #48bb78 25%, transparent)'
                      : state === 'error'
                        ? 'color-mix(in srgb, #f56565 20%, transparent)'
                        : canAfford
                          ? 'color-mix(in srgb, #ffd700 15%, transparent)'
                          : 'rgba(255,255,255,0.03)',
                  border: 'none',
                  color:
                    state === 'success'
                      ? '#48bb78'
                      : state === 'error'
                        ? '#f56565'
                        : canAfford
                          ? '#ffd700'
                          : '#444',
                  fontFamily: 'monospace',
                  fontSize: '8px',
                  letterSpacing: '0.06em',
                  cursor: canAfford && !isLoading ? 'pointer' : 'not-allowed',
                  textTransform: 'uppercase',
                  transition: 'background 0.15s',
                  boxShadow: canAfford && state === 'idle'
                    ? 'inset -1px -1px 0 0 rgba(0,0,0,0.5), inset 1px 1px 0 0 rgba(255,255,255,0.08), 0 0 0 1px #ffd70040'
                    : 'inset -1px -1px 0 0 rgba(0,0,0,0.3)',
                }}
              >
                {isLoading ? '...' : state === 'success' ? 'Bought!' : state === 'error' ? 'Failed' : canAfford ? 'Buy' : 'No coins'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
})
