// Department colors — known departments have fixed colours; unknown departments
// get a deterministic colour generated from the department name hash.
export const DEPT_COLORS: Record<string, string> = {
  engineering: '#29adff',
  executive: '#ffd700',
  legal: '#8899aa',
  marketing: '#ff6b9d',
  operations: '#00e436',
  research: '#b06cff',
  coo: '#ff8c00',
  meetings: '#4a5568',
}

/**
 * Return a colour for the given department.
 * Falls back to a deterministic hex derived from hashing the department name.
 */
export function getDeptColor(department: string): string {
  if (DEPT_COLORS[department]) return DEPT_COLORS[department]

  // Simple djb2-style hash → pastel hex
  let hash = 5381
  for (let i = 0; i < department.length; i++) {
    hash = ((hash << 5) + hash) ^ department.charCodeAt(i)
    hash = hash >>> 0 // keep unsigned 32-bit
  }
  const hue = hash % 360
  // Convert HSL(hue, 60%, 65%) to hex
  const h = hue / 360
  const s = 0.6
  const l = 0.65
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h * 12) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

// Status colors (use CSS vars where possible, hex fallbacks for canvas/animations)
export const STATUS_COLORS = {
  idle: { css: 'var(--text-tertiary)', hex: '#4a5568' },
  working: { css: 'var(--system-green)', hex: '#48bb78' },
  meeting: { css: 'var(--system-orange, #ed8936)', hex: '#ed8936' },
  error: { css: 'var(--system-red)', hex: '#fc5c65' },
}

// Skin tones — 6 tones for variety
export const SKIN_COLORS = [
  '#ffdbb4',
  '#e8c39e',
  '#c68642',
  '#8d5524',
  '#f5cba7',
  '#a0522d',
]

// Hair colors — 8 colors
export const HAIR_COLORS = [
  '#2c1810', // near-black
  '#4a3728', // dark brown
  '#8b6914', // medium brown
  '#1a1a1a', // black
  '#c9842b', // auburn
  '#cc3333', // red
  '#aaaaaa', // gray
  '#f5e06e', // blonde light
]

// Trousers / pants
export const PANTS_COLORS = [
  '#1a2340', // navy
  '#2e2e2e', // charcoal
  '#3b2a1a', // dark brown
  '#1e3a2a', // dark green
  '#4a4a60', // slate
]

// Shoes
export const SHOE_COLORS = [
  '#1a1a1a', // black
  '#3b2a1a', // brown
  '#4a3a2a', // tan
]

// Furniture palette
export const FURNITURE_COLORS = {
  wood_light: '#c8943a',
  wood_med: '#8b5e2a',
  wood_dark: '#5c3a1a',
  metal: '#6b7280',
  plastic: '#374151',
}

// Floor tile palette
export const FLOOR_COLORS = {
  tile_light: '#1e1e28',
  tile_dark: '#16161e',
  carpet: '#1a1a2e',
}

// Wall palette
export const WALL_COLORS = {
  base: '#1a1a22',
  trim: '#2a2a36',
  accent: '#252530',
}

// Monitor palette
export const MONITOR_COLORS = {
  screen_off: '#0d1117',
  screen_on: '#0f2d1a',
  frame: '#2a2a3a',
  glow: '#48bb78',
}
