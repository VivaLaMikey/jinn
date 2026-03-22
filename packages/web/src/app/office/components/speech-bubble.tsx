'use client'

import React, { memo } from 'react'

interface SpeechBubbleProps {
  text: string
}

// Animation: appear, hold, fade out. Total duration 7s.
const BUBBLE_KEYFRAMES = `
@keyframes bubble-appear {
  0%   { opacity: 0; transform: translateX(-50%) translateY(4px) scale(0.9); }
  12%  { opacity: 1; transform: translateX(-50%) translateY(0px) scale(1); }
  75%  { opacity: 1; transform: translateX(-50%) translateY(0px) scale(1); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-3px) scale(0.95); }
}
`

// Pixel-art border via multi-layer box-shadow (2px stepped border)
const PIXEL_BORDER = `
  -2px 0 0 0 #3a3a2e,
   2px 0 0 0 #3a3a2e,
   0 -2px 0 0 #3a3a2e,
   0  2px 0 0 #3a3a2e,
  -2px -2px 0 0 #3a3a2e,
   2px -2px 0 0 #3a3a2e,
  -2px  2px 0 0 #3a3a2e,
   2px  2px 0 0 #3a3a2e,
   0 4px 8px rgba(0,0,0,0.6)
`

export const SpeechBubble = memo(function SpeechBubble({ text }: SpeechBubbleProps) {
  return (
    <>
      <style>{BUBBLE_KEYFRAMES}</style>
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 10px)',
          left: '50%',
          // transform handled by animation
          background: '#f5f0e4',
          boxShadow: PIXEL_BORDER,
          padding: '4px 7px',
          whiteSpace: 'nowrap',
          maxWidth: '140px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontFamily: 'monospace',
          fontSize: '9px',
          color: '#1a1a1a',
          pointerEvents: 'none',
          zIndex: 10,
          // 7s total: 0.84s in, ~4.5s hold, 1.75s out
          animation: 'bubble-appear 7s ease-in-out forwards',
          willChange: 'transform, opacity',
        }}
        title={text}
      >
        {text}

        {/* Pixelated tail — stepped divs instead of smooth triangle */}
        {/* Step 1: widest (bottom) */}
        <div
          style={{
            position: 'absolute',
            bottom: '-7px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '6px',
            height: '2px',
            background: '#3a3a2e',
          }}
        />
        {/* Step 2: middle */}
        <div
          style={{
            position: 'absolute',
            bottom: '-5px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '4px',
            height: '2px',
            background: '#3a3a2e',
          }}
        />
        {/* Step 3: inner fill (bubble colour) */}
        <div
          style={{
            position: 'absolute',
            bottom: '-5px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '4px',
            height: '1px',
            background: '#f5f0e4',
          }}
        />
        {/* Step 4: tip */}
        <div
          style={{
            position: 'absolute',
            bottom: '-7px',
            left: '50%',
            transform: 'translateX(-4px)',
            width: '2px',
            height: '2px',
            background: '#3a3a2e',
          }}
        />
      </div>
    </>
  )
})
