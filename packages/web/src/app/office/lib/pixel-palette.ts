// Department colors — warm, saturated Habbo-style palette.
// Known departments have fixed colours; unknown departments get a deterministic
// colour generated from the department name hash.
export const DEPT_COLORS: Record<string, string> = {
  engineering: '#4A90D9',  // bright steel blue
  executive:   '#E8A020',  // warm amber gold
  legal:       '#7A9BAE',  // muted slate blue
  marketing:   '#E05C8A',  // warm rose pink
  operations:  '#5BBF6A',  // warm leaf green
  research:    '#9B6CD4',  // warm violet
  coo:         '#E07828',  // warm burnt orange
  meetings:    '#A07850',  // warm tan brown
}

/**
 * Return a colour for the given department.
 * Falls back to a deterministic hex derived from hashing the department name.
 */
export function getDeptColor(department: string): string {
  if (DEPT_COLORS[department]) return DEPT_COLORS[department]

  // Simple djb2-style hash → warm saturated hex
  let hash = 5381
  for (let i = 0; i < department.length; i++) {
    hash = ((hash << 5) + hash) ^ department.charCodeAt(i)
    hash = hash >>> 0 // keep unsigned 32-bit
  }
  const hue = hash % 360
  // Convert HSL(hue, 65%, 55%) to hex — warm & saturated
  const h = hue / 360
  const s = 0.65
  const l = 0.55
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

// Status colors — warm tones for Habbo-style readability
export const STATUS_COLORS = {
  idle:    { css: 'var(--text-tertiary)', hex: '#8C7B6B' },
  working: { css: 'var(--system-green)',  hex: '#5BBF6A' },
  meeting: { css: 'var(--system-orange)', hex: '#E07828' },
  error:   { css: 'var(--system-red)',    hex: '#D94A3A' },
}

// Skin tones — warm natural range
export const SKIN_COLORS = [
  '#FFD4A8',  // light peach
  '#F0C090',  // medium peach
  '#D4944A',  // tan
  '#A06830',  // medium brown
  '#F5C498',  // light warm
  '#8B5028',  // deep brown
]

// Hair colors — 8 natural and fun colors
export const HAIR_COLORS = [
  '#2C1810',  // near-black
  '#4A3728',  // dark brown
  '#8B6914',  // medium brown
  '#1A1A1A',  // black
  '#C9842B',  // auburn
  '#CC3333',  // red
  '#B0B0B0',  // gray
  '#F5D060',  // blonde
]

// Trousers / pants — warm darks
export const PANTS_COLORS = [
  '#2A3460',  // warm navy
  '#3A3228',  // warm charcoal
  '#4A3020',  // warm dark brown
  '#283C30',  // dark forest green
  '#504860',  // warm slate
]

// Shoes — warm neutrals
export const SHOE_COLORS = [
  '#201810',  // dark brown-black
  '#5A3820',  // medium brown
  '#7A5838',  // tan
]

// Furniture palette — warm Habbo-style woods and metals
export const FURNITURE_COLORS = {
  wood_light: '#C8943A',  // warm honey oak
  wood_med:   '#A0521A',  // warm walnut
  wood_dark:  '#6B3010',  // warm mahogany
  metal:      '#909090',  // warm mid-grey
  plastic:    '#C8B898',  // warm cream plastic
}

// Floor tile palette — Habbo-style high-contrast checkerboard
export const FLOOR_COLORS = {
  tile_light: '#5C8A4F',  // warm carpet green (light)
  tile_dark:  '#4A7040',  // warm carpet green (dark)
  carpet:     '#3D5E35',  // deeper carpet border
}

// Wall palette — warm Habbo-style creams and beiges
export const WALL_COLORS = {
  base:   '#D4C4A0',  // warm cream wall
  trim:   '#B8A880',  // darker beige trim (shadow variant)
  accent: '#E8DCC8',  // lightest warm white highlight
}

// Page chrome palette — classic Habbo dark teal
export const PAGE_COLORS = {
  background:   '#1B3A4B',  // classic Habbo dark teal page bg
  panel_bg:     '#1E2D3A',  // slightly lighter panel bg
  panel_border: '#2A4A5A',  // panel border colour
}

// Monitor palette — dark screen with warm accent glows
export const MONITOR_COLORS = {
  screen_off: '#1A1A2E',  // dark navy-black
  screen_on:  '#0F2D1A',  // dark green-on (Habbo-style terminal)
  frame:      '#4A4040',  // warm dark frame
  glow:       '#5BBF6A',  // warm green glow
}
