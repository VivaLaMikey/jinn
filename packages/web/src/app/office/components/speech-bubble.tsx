'use client'

import React, { memo } from 'react'

interface SpeechBubbleProps {
  text: string
}

const BUBBLE_KEYFRAMES = `
@keyframes bubble-appear {
  0% { opacity: 0; transform: translateY(4px) scale(0.95); }
  15% { opacity: 1; transform: translateY(0px) scale(1); }
  80% { opacity: 1; transform: translateY(0px) scale(1); }
  100% { opacity: 0; transform: translateY(-4px) scale(0.95); }
}
`

export const SpeechBubble = memo(function SpeechBubble({
  text,
}: SpeechBubbleProps) {
  return (
    <>
      <style>{BUBBLE_KEYFRAMES}</style>
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--material-regular, rgba(30,30,30,0.95))',
          border: '1px solid var(--separator, #333)',
          borderRadius: '4px',
          padding: '4px 6px',
          whiteSpace: 'nowrap',
          maxWidth: '160px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontFamily: 'monospace',
          fontSize: '9px',
          color: 'var(--text-primary, #e0e0e0)',
          pointerEvents: 'none',
          zIndex: 10,
          animation: 'bubble-appear 8s ease-in-out infinite',
          willChange: 'transform, opacity',
        }}
        title={text}
      >
        {text}
        {/* Pixel art tail */}
        <div
          style={{
            position: 'absolute',
            bottom: '-5px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '5px solid var(--separator, #333)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '3px solid transparent',
            borderRight: '3px solid transparent',
            borderTop: '4px solid var(--material-regular, rgba(30,30,30,0.95))',
          }}
        />
      </div>
    </>
  )
})
