'use client'

import React, { memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface WalletDisplayProps {
  /** If provided, show balance for this employee. If null, show total across all. */
  employeeName?: string | null
  onClick?: () => void
}

export const WalletDisplay = memo(function WalletDisplay({ employeeName, onClick }: WalletDisplayProps) {
  const { data: wallets = {} } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => api.getWallets(),
    staleTime: 30_000,
  })

  const balance = employeeName
    ? (wallets[employeeName]?.balance ?? 0)
    : Object.values(wallets).reduce((sum, w) => sum + w.balance, 0)

  return (
    <span
      onClick={onClick}
      title={employeeName ? `${employeeName}'s coins` : 'Total coins — click to open store'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        fontFamily: 'monospace',
        fontSize: '9px',
        cursor: onClick ? 'pointer' : 'default',
        padding: '2px 6px',
        background: 'color-mix(in srgb, #ffd700 10%, transparent)',
        border: '1px solid #ffd70030',
        color: '#ffd700',
        letterSpacing: '0.04em',
        transition: 'background 0.1s',
        boxShadow: 'inset -1px -1px 0 0 rgba(0,0,0,0.4), inset 1px 1px 0 0 rgba(255,255,255,0.06)',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          ;(e.currentTarget as HTMLSpanElement).style.background =
            'color-mix(in srgb, #ffd700 20%, transparent)'
        }
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLSpanElement).style.background =
          'color-mix(in srgb, #ffd700 10%, transparent)'
      }}
    >
      <span style={{ fontSize: '10px', lineHeight: 1 }}>●</span>
      <span style={{ fontWeight: 700 }}>{balance}</span>
    </span>
  )
})
