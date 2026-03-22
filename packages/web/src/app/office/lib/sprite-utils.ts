import {
  SKIN_COLORS,
  HAIR_COLORS,
  PANTS_COLORS,
  SHOE_COLORS,
  DEPT_COLORS,
} from './pixel-palette'
import type { EmployeeAppearance } from '@/lib/api'

export { type EmployeeAppearance }

export function nameHash(name: string): number {
  return name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
}

export function getInitials(name: string): string {
  return name
    .split('-')
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export function getDisplayName(name: string): string {
  return name
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

// ---------------------------------------------------------------------------
// Canvas sprite engine
// ---------------------------------------------------------------------------

// A 2D array of palette key strings — null means transparent
export type SpriteFrame = (string | null)[][]

// Maps palette keys -> hex colour strings
export type CharacterPalette = Record<string, string>

/** Draw a single sprite frame onto a canvas 2D context at an optional offset */
export function drawSpriteFrame(
  ctx: CanvasRenderingContext2D,
  frame: SpriteFrame,
  palette: CharacterPalette,
  offsetX = 0,
  offsetY = 0,
): void {
  for (let row = 0; row < frame.length; row++) {
    const rowData = frame[row]
    for (let col = 0; col < rowData.length; col++) {
      const key = rowData[col]
      if (key === null) continue
      const colour = palette[key]
      if (!colour) continue
      ctx.fillStyle = colour
      ctx.fillRect(offsetX + col, offsetY + row, 1, 1)
    }
  }
}

/** Build a deterministic character colour palette from name + department */
export function generateCharacterPalette(
  name: string,
  department: string,
): CharacterPalette {
  const h = nameHash(name)
  return {
    skin: SKIN_COLORS[h % SKIN_COLORS.length],
    hair: HAIR_COLORS[h % HAIR_COLORS.length],
    shirt: DEPT_COLORS[department] || '#C89848',
    pants: PANTS_COLORS[h % PANTS_COLORS.length],
    shoes: SHOE_COLORS[h % SHOE_COLORS.length],
    eye: '#1A1010',
    outline: '#1A0A00',
    shadow: '#00000040',
  }
}

/** Build palette from explicit appearance data */
export function paletteFromAppearance(
  appearance: EmployeeAppearance,
  accessoryColor?: string,
): CharacterPalette {
  return {
    skin: appearance.skinTone || SKIN_COLORS[0],
    hair: appearance.hairColor,
    shirt: appearance.shirtColor || '#C89848',
    pants: appearance.pantsColor,
    shoes: appearance.shoeColor || SHOE_COLORS[0],
    eye: '#1A1010',
    outline: '#1A0A00',
    shadow: '#00000040',
    acc: accessoryColor || '#E8A020',
  }
}

// ---------------------------------------------------------------------------
// Isometric 20x28 sprite frames — Habbo-style 3/4 view
//
// The character is viewed from an isometric (above-right) angle.
// Body is slightly turned — left side is narrower, right side slightly wider.
//
// Layout (rows):
//   Row  0-2  : hair / head top
//   Row  3-7  : head / face (eye on row 5)
//   Row  8-14 : torso (shirt), left arm visible on left edge, right arm wider
//   Row 15-19 : lower torso / waist
//   Row 20-23 : legs (pants), left leg slightly behind
//   Row 24-27 : feet (shoes)
//
// Columns 0-19 (20 wide). Left 4 cols = left-side of body (slightly in shadow),
// cols 4-15 = front-facing, cols 16-19 = right side.
// ---------------------------------------------------------------------------

const _ = null    // transparent
const O = 'outline'
const S = 'skin'
const H = 'hair'
const T = 'shirt'   // torso / shirt (dept colour)
const P = 'pants'
const F = 'shoes'   // feet
const E = 'eye'
const D = 'shadow'  // shadow / dark side

// ---------------------------------------------------------------------------
// IDLE frame 0 — standing, arms slightly forward (isometric 3/4 view)
// ---------------------------------------------------------------------------
const IDLE_0: SpriteFrame = [
  // 0    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16   17   18   19
  [_,   _,   _,   _,   _,   O,   O,   O,   O,   O,   O,   O,   _,   _,   _,   _,   _,   _,   _,   _],  // 0
  [_,   _,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _,   _],  // 1
  [_,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _],  // 2
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],  // 3
  [_,   _,   _,   O,   D,   S,   E,   S,   S,   S,   E,   S,   S,   O,   _,   _,   _,   _,   _,   _],  // 4 eyes
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],  // 5
  [_,   _,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _,   _],  // 6
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],  // 7 collar
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],  // 8 shoulders
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],  // 9
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],  // 10
  [_,   O,   D,   D,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   O,   _,   _,   _,   _],  // 11 arms
  [_,   O,   D,   S,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   O,   _,   _,   _,   _],  // 12
  [_,   O,   D,   S,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   O,   _,   _,   _,   _],  // 13
  [_,   _,   O,   D,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   O,   _,   _,   _,   _,   _],  // 14
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],  // 15
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],  // 16 legs split
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],  // 17
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],  // 18
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],  // 19
  [_,   _,   _,   O,   D,   F,   F,   O,   _,   _,   O,   F,   F,   O,   _,   _,   _,   _,   _,   _],  // 20 feet
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _],  // 21
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _],  // 22
  [_,   _,   _,   O,   O,   O,   O,   _,   _,   _,   _,   O,   O,   O,   _,   _,   _,   _,   _,   _],  // 23
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],  // 24
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],  // 25
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],  // 26
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],  // 27
]

// IDLE frame 1 — slight breathing lift (torso rows shift up 1px, arms slightly wider)
const IDLE_1: SpriteFrame = [
  [_,   _,   _,   _,   _,   O,   O,   O,   O,   O,   O,   O,   _,   _,   _,   _,   _,   _,   _,   _],  // 0
  [_,   _,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _,   _],  // 1
  [_,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _],  // 2
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],  // 3
  [_,   _,   _,   O,   D,   S,   E,   S,   S,   S,   E,   S,   S,   O,   _,   _,   _,   _,   _,   _],  // 4
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],  // 5
  [_,   _,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _,   _],  // 6
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],  // 7
  [_,   O,   D,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],  // 8 shoulders wider
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],  // 9
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],  // 10
  [O,   D,   D,   O,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   S,   O,   _,   _,   _],  // 11 arms raised
  [_,   O,   D,   S,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   O,   _,   _,   _,   _],  // 12
  [_,   O,   D,   S,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   O,   _,   _,   _,   _],  // 13
  [_,   _,   O,   D,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   O,   _,   _,   _,   _,   _],  // 14
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],  // 15
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],  // 16
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],  // 17
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],  // 18
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],  // 19
  [_,   _,   _,   O,   D,   F,   F,   O,   _,   _,   O,   F,   F,   O,   _,   _,   _,   _,   _,   _],  // 20
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _],  // 21
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _],  // 22
  [_,   _,   _,   O,   O,   O,   O,   _,   _,   _,   _,   O,   O,   O,   _,   _,   _,   _,   _,   _],  // 23
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],  // 24-27
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
]

// ---------------------------------------------------------------------------
// WORK frames — arms extended forward (typing), alternating left/right hand
// ---------------------------------------------------------------------------
const WORK_0: SpriteFrame = [
  [_,   _,   _,   _,   _,   O,   O,   O,   O,   O,   O,   O,   _,   _,   _,   _,   _,   _,   _,   _],  // 0
  [_,   _,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _,   _],  // 1
  [_,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _],  // 2
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],  // 3
  [_,   _,   _,   O,   D,   S,   E,   S,   S,   S,   E,   S,   S,   O,   _,   _,   _,   _,   _,   _],  // 4
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],  // 5
  [_,   _,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _,   _],  // 6
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],  // 7
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],  // 8
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],  // 9
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],  // 10
  [_,   O,   D,   D,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   O,   _,   _,   _,   _],  // 11
  [O,   D,   S,   _,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   S,   O,   _,   _,   _],  // 12 arms extended forward
  [O,   D,   S,   O,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   S,   O,   _,   _,   _],  // 13
  [_,   _,   O,   D,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   O,   _,   _,   _,   _,   _],  // 14
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],  // 15
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],  // 16
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],  // 17
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],  // 18
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],  // 19
  [_,   _,   _,   O,   D,   F,   F,   O,   _,   _,   O,   F,   F,   O,   _,   _,   _,   _,   _,   _],  // 20
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _],  // 21
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _],  // 22
  [_,   _,   _,   O,   O,   O,   O,   _,   _,   _,   _,   O,   O,   O,   _,   _,   _,   _,   _,   _],  // 23
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
]

// WORK_1 — right arm slightly higher (key tap)
const WORK_1: SpriteFrame = [
  [_,   _,   _,   _,   _,   O,   O,   O,   O,   O,   O,   O,   _,   _,   _,   _,   _,   _,   _,   _],  // 0
  [_,   _,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _,   _],  // 1
  [_,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _],  // 2
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],  // 3
  [_,   _,   _,   O,   D,   S,   E,   S,   S,   S,   E,   S,   S,   O,   _,   _,   _,   _,   _,   _],  // 4
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],  // 5
  [_,   _,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _,   _],  // 6
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],  // 7
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],  // 8
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],  // 9
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],  // 10
  [O,   D,   D,   O,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   O,   _,   _,   _,   _],  // 11 left arm up
  [_,   O,   D,   S,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   S,   O,   _,   _,   _],  // 12 right arm forward
  [_,   O,   D,   S,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   S,   O,   _,   _,   _],  // 13
  [_,   _,   O,   D,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   O,   _,   _,   _,   _,   _],  // 14
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],  // 15
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],  // 16-19
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   F,   F,   O,   _,   _,   O,   F,   F,   O,   _,   _,   _,   _,   _,   _],  // 20
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   O,   O,   O,   _,   _,   _,   _,   O,   O,   O,   _,   _,   _,   _,   _,   _],  // 23
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
]

// WORK_2 — left arm higher (alternating key tap)
const WORK_2: SpriteFrame = [
  [_,   _,   _,   _,   _,   O,   O,   O,   O,   O,   O,   O,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   S,   E,   S,   S,   S,   E,   S,   S,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],
  [_,   O,   D,   D,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   O,   _,   _,   _,   _],
  [O,   D,   S,   _,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   O,   _,   _,   _,   _],  // left arm extended, right down
  [O,   D,   S,   O,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   O,   _,   _,   _,   _],
  [_,   _,   O,   D,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   O,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   F,   F,   O,   _,   _,   O,   F,   F,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   O,   O,   O,   _,   _,   _,   _,   O,   O,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
]

// ---------------------------------------------------------------------------
// MEETING frames — body angled, head turned slightly toward camera
// ---------------------------------------------------------------------------
const MEETING_0: SpriteFrame = [
  [_,   _,   _,   _,   _,   O,   O,   O,   O,   O,   O,   O,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   S,   S,   E,   S,   E,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],  // eyes shifted — looking right
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],
  [_,   O,   D,   D,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   S,   O,   _,   _,   _],
  [_,   O,   D,   S,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   S,   O,   _,   _,   _],
  [_,   O,   D,   S,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   S,   O,   _,   _,   _],
  [_,   _,   O,   D,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   O,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   F,   F,   O,   _,   _,   O,   F,   F,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   O,   O,   O,   _,   _,   _,   _,   O,   O,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
]

// MEETING_1 — slight body lean (head shifted 1px right)
const MEETING_1: SpriteFrame = [
  [_,   _,   _,   _,   _,   _,   O,   O,   O,   O,   O,   O,   O,   _,   _,   _,   _,   _,   _,   _],  // shifted right
  [_,   _,   _,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   O,   D,   S,   S,   E,   S,   E,   S,   S,   S,   O,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _],
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _],
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _],
  [_,   O,   D,   D,   O,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   S,   O,   _,   _],
  [_,   O,   D,   S,   O,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   S,   O,   _,   _],
  [_,   O,   D,   S,   O,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   S,   O,   _,   _],
  [_,   _,   O,   D,   O,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   O,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   F,   F,   O,   _,   _,   O,   F,   F,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   O,   O,   O,   _,   _,   _,   _,   O,   O,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
]

// ---------------------------------------------------------------------------
// ERROR frames — arms raised in alarm
// ---------------------------------------------------------------------------
const ERROR_0: SpriteFrame = [
  [_,   _,   _,   _,   _,   O,   O,   O,   O,   O,   O,   O,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   S,   E,   S,   S,   S,   E,   S,   S,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],
  [_,   O,   D,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],
  [O,   D,   D,   O,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   O,   _,   _,   _],  // both arms up
  [O,   D,   S,   O,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   S,   O,   _,   _],
  [O,   D,   S,   O,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   S,   O,   _,   _,   _],
  [_,   O,   D,   O,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   O,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   O,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   F,   F,   O,   _,   _,   O,   F,   F,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   O,   O,   O,   _,   _,   _,   _,   O,   O,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
]

// ERROR_1 — arms down (flash alternation with idle)
const ERROR_1 = IDLE_0

// ---------------------------------------------------------------------------
// RELAXED frame — casual slouch, one arm resting (for break room)
// ---------------------------------------------------------------------------
const RELAXED_0: SpriteFrame = [
  [_,   _,   _,   _,   _,   O,   O,   O,   O,   O,   O,   O,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   S,   E,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],  // relaxed gaze, eyes more open
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],
  [_,   O,   D,   D,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   O,   _,   _,   _,   _],
  [_,   _,   O,   D,   S,   O,   T,   T,   T,   T,   T,   T,   T,   O,   S,   O,   _,   _,   _,   _],  // right arm resting on hip
  [_,   _,   _,   O,   D,   S,   O,   T,   T,   T,   T,   T,   O,   S,   O,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   O,   D,   O,   T,   T,   T,   T,   T,   O,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   F,   F,   O,   _,   _,   O,   F,   F,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   O,   O,   O,   _,   _,   _,   _,   O,   O,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
]

const RELAXED_1 = IDLE_1

// ---------------------------------------------------------------------------
// WALK frames — SE direction (moving down-right on isometric grid)
// The body is the same isometric stance but with one leg forward.
// ---------------------------------------------------------------------------
const WALK_SE_0: SpriteFrame = [
  [_,   _,   _,   _,   _,   O,   O,   O,   O,   O,   O,   O,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   S,   E,   S,   S,   S,   E,   S,   S,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],
  [O,   D,   D,   O,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   O,   _,   _,   _,   _],  // arm swing
  [_,   O,   D,   S,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   O,   _,   _,   _,   _],
  [_,   O,   D,   S,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   O,   _,   _,   _,   _],
  [_,   _,   O,   D,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   O,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   O,   D,   P,   O,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _,   _],  // legs walking (right leg forward)
  [_,   _,   _,   _,   O,   D,   P,   O,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   F,   F,   O,   _,   O,   F,   F,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   F,   F,   F,   O,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   O,   O,   O,   _,   O,   O,   O,   O,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
]

// WALK_SE_1 — opposite leg forward
const WALK_SE_1: SpriteFrame = [
  [_,   _,   _,   _,   _,   O,   O,   O,   O,   O,   O,   O,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   H,   H,   H,   H,   H,   H,   H,   H,   H,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   S,   E,   S,   S,   S,   E,   S,   S,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   O,   D,   S,   S,   S,   S,   S,   S,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _],
  [_,   O,   D,   D,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   S,   O,   _,   _,   _],
  [_,   O,   D,   S,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   S,   O,   _,   _,   _],
  [_,   O,   D,   S,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   S,   O,   _,   _,   _,   _],
  [_,   _,   O,   D,   O,   T,   T,   T,   T,   T,   T,   T,   T,   O,   O,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   T,   T,   T,   T,   T,   T,   T,   T,   O,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   O,   _,   _,   _,   _,   _,   _,   _],  // left leg forward
  [_,   _,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   O,   P,   P,   O,   _,   _,   O,   P,   P,   O,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   O,   D,   F,   F,   O,   _,   _,   O,   F,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   O,   D,   F,   F,   F,   O,   _,   _,   O,   F,   F,   O,   _,   _,   _,   _,   _,   _],
  [_,   O,   F,   F,   F,   O,   _,   _,   O,   F,   F,   F,   O,   _,   _,   _,   _,   _,   _,   _],
  [_,   O,   O,   O,   O,   _,   _,   _,   _,   O,   O,   O,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
  [_,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _,   _],
]

// WALK_SW — mirror of SE (moving down-left): reuse SE frames, renderer mirrors them
const WALK_SW_0 = WALK_SE_0
const WALK_SW_1 = WALK_SE_1

// WALK_NE — moving up-right: same isometric body, lighter shadow (moving toward camera)
const WALK_NE_0 = WALK_SE_1
const WALK_NE_1 = WALK_SE_0

// WALK_NW — moving up-left
const WALK_NW_0 = WALK_SE_0
const WALK_NW_1 = WALK_SE_1

export const SPRITE_FRAMES: Record<string, SpriteFrame[]> = {
  idle:     [IDLE_0, IDLE_1],
  work:     [WORK_0, WORK_1, WORK_2],
  meeting:  [MEETING_0, MEETING_1],
  error:    [ERROR_0, ERROR_1],
  relaxed:  [RELAXED_0, RELAXED_1],
  walk_se:  [WALK_SE_0, WALK_SE_1],
  walk_sw:  [WALK_SW_0, WALK_SW_1],
  walk_ne:  [WALK_NE_0, WALK_NE_1],
  walk_nw:  [WALK_NW_0, WALK_NW_1],
}

// ---------------------------------------------------------------------------
// Hair style modifiers — applied to the isometric base frame.
// Row indices match the new 20x28 layout.
// ---------------------------------------------------------------------------

export const HAIR_STYLES: Record<string, (frame: SpriteFrame) => SpriteFrame> = {
  short: (frame) => frame,  // default — no change
  bald: (frame) => {
    const f = frame.map((r) => [...r])
    f[0] = [_,_,_,_,_,O,O,O,O,O,O,O,_,_,_,_,_,_,_,_]
    f[1] = [_,_,_,_,O,S,S,S,S,S,S,S,O,_,_,_,_,_,_,_]
    f[2] = [_,_,_,O,S,S,S,S,S,S,S,S,S,O,_,_,_,_,_,_]
    return f
  },
  long: (frame) => {
    const f = frame.map((r) => [...r])
    // Hair falls to shoulders — side shadow (D) stays
    f[3] = [_,_,_,O,H,S,S,S,S,S,S,S,S,O,_,_,_,_,_,_]
    f[4] = [_,_,_,O,H,S,E,S,S,S,E,S,H,O,_,_,_,_,_,_]
    f[5] = [_,_,_,O,H,S,S,S,S,S,S,S,H,O,_,_,_,_,_,_]
    f[6] = [_,_,_,_,O,H,S,S,S,S,S,H,O,_,_,_,_,_,_,_]
    return f
  },
  mohawk: (frame) => {
    const f = frame.map((r) => [...r])
    f[0] = [_,_,_,_,_,_,_,O,H,O,_,_,_,_,_,_,_,_,_,_]
    f[1] = [_,_,_,_,_,O,O,H,H,H,O,O,_,_,_,_,_,_,_,_]
    return f
  },
  ponytail: (frame) => {
    const f = frame.map((r) => [...r])
    f[1] = [_,_,_,_,O,H,H,H,H,H,H,H,O,O,_,_,_,_,_,_]
    f[2] = [_,_,_,O,H,H,H,H,H,H,H,H,H,O,H,O,_,_,_,_]
    f[3] = [_,_,_,O,D,S,S,S,S,S,S,S,S,O,H,O,_,_,_,_]
    f[4] = [_,_,_,O,D,S,E,S,S,S,E,S,S,O,H,O,_,_,_,_]
    return f
  },
  curly: (frame) => {
    const f = frame.map((r) => [...r])
    f[0] = [_,_,_,_,O,H,O,H,O,H,O,H,O,_,_,_,_,_,_,_]
    f[1] = [_,_,_,O,H,O,H,H,H,H,O,H,O,H,_,_,_,_,_,_]
    f[2] = [_,_,O,H,H,H,H,H,H,H,H,H,H,H,O,_,_,_,_,_]
    return f
  },
  spiky: (frame) => {
    const f = frame.map((r) => [...r])
    f[0] = [_,_,_,_,O,H,_,O,H,_,O,H,_,_,_,_,_,_,_,_]
    f[1] = [_,_,_,_,O,H,H,H,H,H,H,H,O,_,_,_,_,_,_,_]
    f[2] = [_,_,_,O,H,H,H,H,H,H,H,H,H,O,_,_,_,_,_,_]
    return f
  },
  bob: (frame) => {
    const f = frame.map((r) => [...r])
    f[2] = [_,_,_,O,H,H,H,H,H,H,H,H,H,O,_,_,_,_,_,_]
    f[3] = [_,_,_,O,H,S,S,S,S,S,S,S,H,O,_,_,_,_,_,_]
    f[4] = [_,_,_,O,H,S,E,S,S,S,E,S,H,O,_,_,_,_,_,_]
    f[5] = [_,_,_,O,H,S,S,S,S,S,S,S,H,O,_,_,_,_,_,_]
    f[6] = [_,_,_,_,O,H,H,H,H,H,H,H,O,_,_,_,_,_,_,_]
    return f
  },
}

// ---------------------------------------------------------------------------
// Accessory overlays — sparse SpriteFrame placed on top of the base sprite.
// 'acc' key resolves to the palette's acc colour.
// ---------------------------------------------------------------------------

const ACC = 'acc'

export const ACCESSORY_OVERLAYS: Record<string, SpriteFrame> = {
  none: [],
  glasses: (() => {
    const frame: SpriteFrame = Array(28).fill(null).map(() => Array(20).fill(null))
    // Glasses frames at eye level (row 4)
    frame[4] = [_,_,_,_,_,O,O,O,_,_,O,O,O,_,_,_,_,_,_,_]
    return frame
  })(),
  headphones: (() => {
    const frame: SpriteFrame = Array(28).fill(null).map(() => Array(20).fill(null))
    frame[0] = [_,_,_,_,O,ACC,O,O,O,O,O,ACC,O,_,_,_,_,_,_,_]
    frame[3] = [_,_,O,ACC,_,_,_,_,_,_,_,_,_,ACC,O,_,_,_,_,_]
    frame[4] = [_,_,O,ACC,_,_,_,_,_,_,_,_,_,ACC,O,_,_,_,_,_]
    return frame
  })(),
  hat: (() => {
    const frame: SpriteFrame = Array(28).fill(null).map(() => Array(20).fill(null))
    frame[0] = [_,_,_,O,ACC,ACC,ACC,ACC,ACC,ACC,ACC,ACC,ACC,O,_,_,_,_,_,_]
    frame[1] = [_,_,_,_,O,ACC,ACC,ACC,ACC,ACC,ACC,ACC,O,_,_,_,_,_,_,_]
    return frame
  })(),
  badge: (() => {
    const frame: SpriteFrame = Array(28).fill(null).map(() => Array(20).fill(null))
    frame[8]  = [_,_,_,_,_,_,ACC,ACC,_,_,_,_,_,_,_,_,_,_,_,_]
    frame[9]  = [_,_,_,_,_,_,ACC,ACC,_,_,_,_,_,_,_,_,_,_,_,_]
    return frame
  })(),
  bowtie: (() => {
    const frame: SpriteFrame = Array(28).fill(null).map(() => Array(20).fill(null))
    frame[6] = [_,_,_,_,_,O,ACC,O,O,ACC,O,_,_,_,_,_,_,_,_,_]
    frame[7] = [_,_,_,_,_,_,O,ACC,ACC,O,_,_,_,_,_,_,_,_,_,_]
    return frame
  })(),
  scarf: (() => {
    const frame: SpriteFrame = Array(28).fill(null).map(() => Array(20).fill(null))
    frame[6] = [_,_,_,_,O,ACC,ACC,ACC,ACC,ACC,ACC,ACC,O,_,_,_,_,_,_,_]
    frame[7] = [_,_,_,O,ACC,ACC,ACC,ACC,ACC,ACC,ACC,ACC,ACC,O,_,_,_,_,_,_]
    return frame
  })(),
}

// Accessory colour map — override the 'acc' palette entry per accessory type
const ACCESSORY_COLORS: Record<string, string | null> = {
  none:       null,
  glasses:    '#3A3030',
  headphones: '#484455',
  hat:        null,      // uses shirt colour
  badge:      '#E8A020',
  bowtie:     '#CC2244',
  scarf:      '#4466AA',
}

/** Resolve the 'acc' colour for a given accessory.
 *  For hats, pass the shirt colour as the fallback so the hat matches the shirt. */
export function resolveAccessoryColor(
  accessory: string,
  shirtColor?: string,
): string {
  if (accessory === 'hat' && shirtColor) return shirtColor
  return ACCESSORY_COLORS[accessory] ?? '#E8A020'
}

// ---------------------------------------------------------------------------
// High-level draw helper — applies hair style + accessory on top of base frame
// ---------------------------------------------------------------------------

/** Draw a sprite frame with optional hair style and accessory overlay applied */
export function drawSpriteWithAppearance(
  ctx: CanvasRenderingContext2D,
  baseFrame: SpriteFrame,
  palette: CharacterPalette,
  hairStyle: string,
  accessory: string,
  offsetX = 0,
  offsetY = 0,
): void {
  // Apply hair style modifier (returns a new frame; original is untouched)
  const styleModifier = HAIR_STYLES[hairStyle] ?? HAIR_STYLES.short
  const styledFrame = styleModifier(baseFrame)

  // Draw the styled base
  drawSpriteFrame(ctx, styledFrame, palette, offsetX, offsetY)

  // Draw accessory overlay on top (if any)
  const overlay = ACCESSORY_OVERLAYS[accessory]
  if (overlay && overlay.length > 0) {
    drawSpriteFrame(ctx, overlay, palette, offsetX, offsetY)
  }
}
