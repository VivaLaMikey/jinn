'use client'

import React, { memo, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { StoreItem } from '@/lib/api'

interface DecorationModeProps {
  ownerName: string
  onExit: () => void
  /** Called when an inventory item is selected (or deselected — null) */
  onSelectItem?: (itemId: string | null) => void
  selectedItemId?: string | null
}

export const DecorationMode = memo(function DecorationMode({
  ownerName,
  onExit,
  onSelectItem,
  selectedItemId: controlledSelectedItemId,
}: DecorationModeProps) {
  const queryClient = useQueryClient()
  const [internalSelectedItemId, setInternalSelectedItemId] = useState<string | null>(null)

  // Support both controlled (via props) and uncontrolled (internal state) selection
  const selectedItemId = controlledSelectedItemId !== undefined ? controlledSelectedItemId : internalSelectedItemId

  const handleSelectItem = useCallback(
    (id: string | null) => {
      setInternalSelectedItemId(id)
      onSelectItem?.(id)
    },
    [onSelectItem],
  )

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory', ownerName],
    queryFn: () => api.getInventory(ownerName),
  })

  const { data: catalog = [] } = useQuery({
    queryKey: ['store-catalog'],
    queryFn: () => api.getStoreCatalog(),
  })

  const { data: officeState } = useQuery({
    queryKey: ['office-state'],
    queryFn: () => api.getOfficeState(),
    staleTime: 10_000,
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.removeDecoration(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['office-state'] }),
  })

  const selectedItem = selectedItemId
    ? catalog.find((i) => i.id === selectedItemId)
    : null

  const inventoryWithDetails = inventory
    .filter((inv) => inv.quantity > 0)
    .map((inv) => ({
      inv,
      item: catalog.find((i) => i.id === inv.itemId),
    }))
    .filter((x): x is { inv: typeof x.inv; item: StoreItem } => !!x.item)

  const myDecorations = officeState?.decorations?.filter((d) => d.owner === ownerName) ?? []

  const handleRemove = useCallback(
    (id: string) => {
      removeMutation.mutate(id)
    },
    [removeMutation],
  )

  return (
    <>
      {/* Overlay banner at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          background: '#0a0a12',
          borderBottom: '2px solid #ffd70040',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          fontFamily: 'monospace',
        }}
      >
        {/* Mode label */}
        <span
          style={{
            fontSize: '9px',
            color: '#ffd700',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          Decor Mode
        </span>

        <span style={{ fontSize: '9px', color: '#444', flexShrink: 0 }}>|</span>

        {/* Inventory toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            flex: 1,
            overflowX: 'auto',
          }}
        >
          {inventoryWithDetails.length === 0 && (
            <span style={{ fontSize: '9px', color: '#444', letterSpacing: '0.04em' }}>
              no items — buy from store
            </span>
          )}
          {inventoryWithDetails.map(({ inv, item }) => (
            <button
              key={inv.itemId}
              onClick={() => handleSelectItem(selectedItemId === item.id ? null : item.id)}
              title={`${item.name} (x${inv.quantity})`}
              style={{
                background: selectedItemId === item.id ? '#ffd70020' : 'rgba(255,255,255,0.04)',
                border: selectedItemId === item.id ? '1px solid #ffd70060' : '1px solid #333',
                cursor: 'pointer',
                padding: '3px 6px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0,
                transition: 'border-color 0.1s, background 0.1s',
              }}
            >
              <span style={{ fontSize: '14px', lineHeight: 1 }}>{item.sprite}</span>
              <span style={{ fontSize: '8px', color: '#888', fontFamily: 'monospace' }}>
                x{inv.quantity}
              </span>
            </button>
          ))}
        </div>

        {/* Selected item info */}
        {selectedItem && (
          <span style={{ fontSize: '9px', color: '#ffd700', flexShrink: 0 }}>
            {selectedItem.sprite} {selectedItem.name} — click a room to place
          </span>
        )}

        {/* Exit button */}
        <button
          onClick={onExit}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid #333',
            cursor: 'pointer',
            color: '#888',
            padding: '3px 8px',
            fontFamily: 'monospace',
            fontSize: '9px',
            letterSpacing: '0.04em',
            flexShrink: 0,
            boxShadow: 'inset -1px -1px 0 0 rgba(0,0,0,0.4)',
          }}
        >
          EXIT
        </button>
      </div>

      {/* Placed decorations list — bottom drawer */}
      {myDecorations.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 30, // above status bar
            left: 0,
            right: 0,
            zIndex: 30,
            background: '#0a0a12',
            borderTop: '1px solid #1a1a2a',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'monospace',
            overflowX: 'auto',
          }}
        >
          <span style={{ fontSize: '9px', color: '#555', letterSpacing: '0.04em', flexShrink: 0 }}>
            placed:
          </span>
          {myDecorations.map((dec) => {
            const item = catalog.find((i) => i.id === dec.itemId)
            return (
              <div
                key={dec.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: '#14141e',
                  border: '1px solid #1e1e2e',
                  padding: '2px 6px',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: '12px' }}>{item?.sprite ?? '?'}</span>
                <span style={{ fontSize: '8px', color: '#777' }}>{dec.room}</span>
                <button
                  onClick={() => handleRemove(dec.id)}
                  title="Remove decoration"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#555',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: '9px',
                    padding: '0 2px',
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
})
