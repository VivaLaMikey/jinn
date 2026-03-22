'use client'

import React, { memo, useEffect, useState } from 'react'

interface SpeechBubbleProps {
  text: string
  employeeName?: string
  deptColor?: string
}

// Habbo-style chat bubble: white rounded rect, name bold on left, text on right, pixel tail
const BUBBLE_KEYFRAMES = `
@keyframes habbo-bubble-appear {
  0%   { opacity: 0; transform: translateX(-50%) translateY(6px) scale(0.88); }
  10%  { opacity: 1; transform: translateX(-50%) translateY(0px) scale(1); }
  78%  { opacity: 1; transform: translateX(-50%) translateY(0px) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-4px) scale(0.95); }
}
`

export const SpeechBubble = memo(function SpeechBubble({
  text,
  employeeName,
  deptColor = '#ff8c00',
}: SpeechBubbleProps) {
  // Key trick: re-mount when text changes so the animation restarts
  const [key, setKey] = useState(0)
  useEffect(() => {
    setKey((k) => k + 1)
  }, [text])

  // Truncate display text to keep bubbles tidy
  const displayText = text.length > 52 ? text.slice(0, 49) + '...' : text

  return (
    <>
      <style>{BUBBLE_KEYFRAMES}</style>
      <div
        key={key}
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: '50%',
          // width controlled by content up to 160px
          maxWidth: '160px',
          minWidth: '60px',
          background: '#FFFEF5',
          border: '2px solid #C8B898',
          borderRadius: '6px',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'baseline',
          gap: '5px',
          boxShadow: '0 2px 0 0 #C8B898, 2px 0 0 0 #C8B898, -2px 0 0 0 #C8B898, 0 3px 6px rgba(0,0,0,0.25)',
          whiteSpace: 'nowrap',
          fontFamily: 'monospace',
          fontSize: '9px',
          pointerEvents: 'none',
          zIndex: 20,
          animation: 'habbo-bubble-appear 7s ease-in-out forwards',
          willChange: 'transform, opacity',
        }}
        title={text}
      >
        {/* Bold employee name in dept colour */}
        {employeeName && (
          <span
            style={{
              fontWeight: 700,
              color: deptColor,
              flexShrink: 0,
              fontSize: '9px',
              letterSpacing: '0.02em',
            }}
          >
            {employeeName}:
          </span>
        )}
        {/* Message text */}
        <span
          style={{
            color: '#2A2010',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flexShrink: 1,
            minWidth: 0,
          }}
        >
          {displayText}
        </span>

        {/* Pixel tail — three stepped divs pointing down */}
        {/* Outer border step */}
        <div
          style={{
            position: 'absolute',
            bottom: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '8px',
            height: '2px',
            background: '#C8B898',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-6px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '6px',
            height: '2px',
            background: '#C8B898',
          }}
        />
        {/* Inner fill matching bubble bg */}
        <div
          style={{
            position: 'absolute',
            bottom: '-5px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '4px',
            height: '2px',
            background: '#FFFEF5',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-8px',
            left: '50%',
            transform: 'translateX(-2px)',
            width: '4px',
            height: '2px',
            background: '#C8B898',
          }}
        />
      </div>
    </>
  )
})
