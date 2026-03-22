import {
  SKIN_COLORS,
  HAIR_COLORS,
  PANTS_COLORS,
  SHOE_COLORS,
  DEPT_COLORS,
} from './pixel-palette'

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
    shirt: DEPT_COLORS[department] || '#888888',
    pants: PANTS_COLORS[h % PANTS_COLORS.length],
    shoes: SHOE_COLORS[h % SHOE_COLORS.length],
    eye: '#1a1a2a',
    outline: '#0d0d14',
    shadow: '#00000033',
  }
}

// ---------------------------------------------------------------------------
// 16x24 sprite frames — palette key grid
// Row 0-1   : hair
// Row 2-5   : head / face (eyes on row 3)
// Row 6-9   : torso / shirt
// Row 10-15 : arms + lower torso
// Row 16-19 : legs / pants
// Row 20-23 : feet / shoes
// ---------------------------------------------------------------------------

// Shorthand helpers so the frame data stays readable
const _ = null   // transparent
const O = 'outline'
const S = 'skin'
const H = 'hair'
const T = 'shirt'  // torso / shirt colour (dept colour)
const P = 'pants'
const F = 'shoes'  // feet
const E = 'eye'

// Base idle frame 0 — arms slightly down
const IDLE_0: SpriteFrame = [
  // 0         1         2         3         4         5         6         7         8         9        10        11        12        13        14        15
  [_,_,_,_,_,O,O,O,O,O,O,_,_,_,_,_],  // 0
  [_,_,_,_,O,H,H,H,H,H,H,O,_,_,_,_],  // 1
  [_,_,_,O,H,H,H,H,H,H,H,H,O,_,_,_],  // 2
  [_,_,_,O,S,S,E,S,S,E,S,S,O,_,_,_],  // 3
  [_,_,_,O,S,S,S,S,S,S,S,S,O,_,_,_],  // 4
  [_,_,_,_,O,S,S,S,S,S,S,O,_,_,_,_],  // 5
  [_,_,_,O,T,T,T,T,T,T,T,T,O,_,_,_],  // 6
  [_,_,O,T,T,T,T,T,T,T,T,T,T,O,_,_],  // 7
  [_,_,O,T,T,T,T,T,T,T,T,T,T,O,_,_],  // 8
  [_,_,_,O,T,T,T,T,T,T,T,T,O,_,_,_],  // 9
  [_,O,S,S,O,T,T,T,T,T,T,O,S,S,O,_],  // 10
  [_,O,S,S,O,T,T,T,T,T,T,O,S,S,O,_],  // 11
  [_,O,S,S,O,T,T,T,T,T,T,O,S,S,O,_],  // 12
  [_,_,O,S,O,T,T,T,T,T,T,O,S,O,_,_],  // 13
  [_,_,_,O,O,T,T,T,T,T,T,O,O,_,_,_],  // 14
  [_,_,_,_,O,T,T,T,T,T,T,O,_,_,_,_],  // 15
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 16
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 17
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 18
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 19
  [_,_,_,O,F,F,O,_,_,O,F,F,O,_,_,_],  // 20
  [_,_,O,F,F,F,O,_,_,O,F,F,F,O,_,_],  // 21
  [_,_,O,F,F,F,O,_,_,O,F,F,F,O,_,_],  // 22
  [_,_,_,O,O,O,_,_,_,_,O,O,O,_,_,_],  // 23
]

// Idle frame 1 — very slight breathing shift (hands up 1px)
const IDLE_1: SpriteFrame = [
  [_,_,_,_,_,O,O,O,O,O,O,_,_,_,_,_],  // 0
  [_,_,_,_,O,H,H,H,H,H,H,O,_,_,_,_],  // 1
  [_,_,_,O,H,H,H,H,H,H,H,H,O,_,_,_],  // 2
  [_,_,_,O,S,S,E,S,S,E,S,S,O,_,_,_],  // 3
  [_,_,_,O,S,S,S,S,S,S,S,S,O,_,_,_],  // 4
  [_,_,_,_,O,S,S,S,S,S,S,O,_,_,_,_],  // 5
  [_,_,_,O,T,T,T,T,T,T,T,T,O,_,_,_],  // 6
  [_,_,O,T,T,T,T,T,T,T,T,T,T,O,_,_],  // 7
  [_,_,O,T,T,T,T,T,T,T,T,T,T,O,_,_],  // 8
  [_,_,_,O,T,T,T,T,T,T,T,T,O,_,_,_],  // 9
  [O,S,S,O,O,T,T,T,T,T,T,O,O,S,S,O],  // 10  arms raised 1px
  [_,O,S,S,O,T,T,T,T,T,T,O,S,S,O,_],  // 11
  [_,O,S,S,O,T,T,T,T,T,T,O,S,S,O,_],  // 12
  [_,_,O,S,O,T,T,T,T,T,T,O,S,O,_,_],  // 13
  [_,_,_,O,O,T,T,T,T,T,T,O,O,_,_,_],  // 14
  [_,_,_,_,O,T,T,T,T,T,T,O,_,_,_,_],  // 15
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 16
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 17
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 18
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 19
  [_,_,_,O,F,F,O,_,_,O,F,F,O,_,_,_],  // 20
  [_,_,O,F,F,F,O,_,_,O,F,F,F,O,_,_],  // 21
  [_,_,O,F,F,F,O,_,_,O,F,F,F,O,_,_],  // 22
  [_,_,_,O,O,O,_,_,_,_,O,O,O,_,_,_],  // 23
]

// Working frame 0 — arms forward (typing start)
const WORK_0: SpriteFrame = [
  [_,_,_,_,_,O,O,O,O,O,O,_,_,_,_,_],  // 0
  [_,_,_,_,O,H,H,H,H,H,H,O,_,_,_,_],  // 1
  [_,_,_,O,H,H,H,H,H,H,H,H,O,_,_,_],  // 2
  [_,_,_,O,S,S,E,S,S,E,S,S,O,_,_,_],  // 3
  [_,_,_,O,S,S,S,S,S,S,S,S,O,_,_,_],  // 4
  [_,_,_,_,O,S,S,S,S,S,S,O,_,_,_,_],  // 5
  [_,_,_,O,T,T,T,T,T,T,T,T,O,_,_,_],  // 6
  [_,_,O,T,T,T,T,T,T,T,T,T,T,O,_,_],  // 7
  [_,_,O,T,T,T,T,T,T,T,T,T,T,O,_,_],  // 8
  [_,_,_,O,T,T,T,T,T,T,T,T,O,_,_,_],  // 9
  [_,_,O,S,O,T,T,T,T,T,T,O,S,O,_,_],  // 10
  [_,O,S,S,O,T,T,T,T,T,T,O,S,S,O,_],  // 11
  [O,S,S,_,O,T,T,T,T,T,T,O,_,S,S,O],  // 12 arms extended
  [_,O,S,O,O,T,T,T,T,T,T,O,O,S,O,_],  // 13
  [_,_,_,O,O,T,T,T,T,T,T,O,O,_,_,_],  // 14
  [_,_,_,_,O,T,T,T,T,T,T,O,_,_,_,_],  // 15
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 16
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 17
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 18
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 19
  [_,_,_,O,F,F,O,_,_,O,F,F,O,_,_,_],  // 20
  [_,_,O,F,F,F,O,_,_,O,F,F,F,O,_,_],  // 21
  [_,_,O,F,F,F,O,_,_,O,F,F,F,O,_,_],  // 22
  [_,_,_,O,O,O,_,_,_,_,O,O,O,_,_,_],  // 23
]

// Working frame 1 — right hand down, left hand up
const WORK_1: SpriteFrame = [
  [_,_,_,_,_,O,O,O,O,O,O,_,_,_,_,_],  // 0
  [_,_,_,_,O,H,H,H,H,H,H,O,_,_,_,_],  // 1
  [_,_,_,O,H,H,H,H,H,H,H,H,O,_,_,_],  // 2
  [_,_,_,O,S,S,E,S,S,E,S,S,O,_,_,_],  // 3
  [_,_,_,O,S,S,S,S,S,S,S,S,O,_,_,_],  // 4
  [_,_,_,_,O,S,S,S,S,S,S,O,_,_,_,_],  // 5
  [_,_,_,O,T,T,T,T,T,T,T,T,O,_,_,_],  // 6
  [_,_,O,T,T,T,T,T,T,T,T,T,T,O,_,_],  // 7
  [_,_,O,T,T,T,T,T,T,T,T,T,T,O,_,_],  // 8
  [_,_,_,O,T,T,T,T,T,T,T,T,O,_,_,_],  // 9
  [O,S,S,O,O,T,T,T,T,T,T,O,O,S,O,_],  // 10 left arm up, right low
  [_,O,S,S,O,T,T,T,T,T,T,O,S,S,O,_],  // 11
  [_,_,O,S,O,T,T,T,T,T,T,O,_,S,S,O],  // 12
  [_,_,O,S,O,T,T,T,T,T,T,O,O,S,O,_],  // 13
  [_,_,_,O,O,T,T,T,T,T,T,O,O,_,_,_],  // 14
  [_,_,_,_,O,T,T,T,T,T,T,O,_,_,_,_],  // 15
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 16
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 17
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 18
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 19
  [_,_,_,O,F,F,O,_,_,O,F,F,O,_,_,_],  // 20
  [_,_,O,F,F,F,O,_,_,O,F,F,F,O,_,_],  // 21
  [_,_,O,F,F,F,O,_,_,O,F,F,F,O,_,_],  // 22
  [_,_,_,O,O,O,_,_,_,_,O,O,O,_,_,_],  // 23
]

// Working frame 2 — left hand down, right hand up
const WORK_2: SpriteFrame = [
  [_,_,_,_,_,O,O,O,O,O,O,_,_,_,_,_],  // 0
  [_,_,_,_,O,H,H,H,H,H,H,O,_,_,_,_],  // 1
  [_,_,_,O,H,H,H,H,H,H,H,H,O,_,_,_],  // 2
  [_,_,_,O,S,S,E,S,S,E,S,S,O,_,_,_],  // 3
  [_,_,_,O,S,S,S,S,S,S,S,S,O,_,_,_],  // 4
  [_,_,_,_,O,S,S,S,S,S,S,O,_,_,_,_],  // 5
  [_,_,_,O,T,T,T,T,T,T,T,T,O,_,_,_],  // 6
  [_,_,O,T,T,T,T,T,T,T,T,T,T,O,_,_],  // 7
  [_,_,O,T,T,T,T,T,T,T,T,T,T,O,_,_],  // 8
  [_,_,_,O,T,T,T,T,T,T,T,T,O,_,_,_],  // 9
  [_,O,S,O,O,T,T,T,T,T,T,O,O,S,S,O],  // 10 right arm up, left low
  [_,O,S,S,O,T,T,T,T,T,T,O,S,S,O,_],  // 11
  [O,S,S,_,O,T,T,T,T,T,T,O,_,S,O,_],  // 12
  [_,O,S,O,O,T,T,T,T,T,T,O,O,S,O,_],  // 13
  [_,_,_,O,O,T,T,T,T,T,T,O,O,_,_,_],  // 14
  [_,_,_,_,O,T,T,T,T,T,T,O,_,_,_,_],  // 15
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 16
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 17
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 18
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 19
  [_,_,_,O,F,F,O,_,_,O,F,F,O,_,_,_],  // 20
  [_,_,O,F,F,F,O,_,_,O,F,F,F,O,_,_],  // 21
  [_,_,O,F,F,F,O,_,_,O,F,F,F,O,_,_],  // 22
  [_,_,_,O,O,O,_,_,_,_,O,O,O,_,_,_],  // 23
]

// Meeting frame 0 — slight body turn (facing forward/right)
const MEETING_0: SpriteFrame = [
  [_,_,_,_,_,O,O,O,O,O,O,_,_,_,_,_],  // 0
  [_,_,_,_,O,H,H,H,H,H,H,O,_,_,_,_],  // 1
  [_,_,_,O,H,H,H,H,H,H,H,H,O,_,_,_],  // 2
  [_,_,_,O,S,S,S,E,S,E,S,S,O,_,_,_],  // 3 eyes shifted right
  [_,_,_,O,S,S,S,S,S,S,S,S,O,_,_,_],  // 4
  [_,_,_,_,O,S,S,S,S,S,S,O,_,_,_,_],  // 5
  [_,_,_,O,T,T,T,T,T,T,T,T,O,_,_,_],  // 6
  [_,_,O,T,T,T,T,T,T,T,T,T,T,O,_,_],  // 7
  [_,_,O,T,T,T,T,T,T,T,T,T,T,O,_,_],  // 8
  [_,_,_,O,T,T,T,T,T,T,T,T,O,_,_,_],  // 9
  [_,_,O,S,O,T,T,T,T,T,T,O,S,S,O,_],  // 10
  [_,_,O,S,O,T,T,T,T,T,T,O,S,S,O,_],  // 11
  [_,_,O,S,O,T,T,T,T,T,T,O,S,S,O,_],  // 12
  [_,_,_,O,O,T,T,T,T,T,T,O,S,O,_,_],  // 13
  [_,_,_,O,O,T,T,T,T,T,T,O,O,_,_,_],  // 14
  [_,_,_,_,O,T,T,T,T,T,T,O,_,_,_,_],  // 15
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 16
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 17
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 18
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 19
  [_,_,_,O,F,F,O,_,_,O,F,F,O,_,_,_],  // 20
  [_,_,O,F,F,F,O,_,_,O,F,F,F,O,_,_],  // 21
  [_,_,O,F,F,F,O,_,_,O,F,F,F,O,_,_],  // 22
  [_,_,_,O,O,O,_,_,_,_,O,O,O,_,_,_],  // 23
]

// Meeting frame 1 — slight lean
const MEETING_1: SpriteFrame = [
  [_,_,_,_,O,O,O,O,O,O,O,_,_,_,_,_],  // 0 shifted 1px left
  [_,_,_,O,H,H,H,H,H,H,H,O,_,_,_,_],  // 1
  [_,_,O,H,H,H,H,H,H,H,H,H,O,_,_,_],  // 2
  [_,_,O,S,S,E,S,S,E,S,S,S,O,_,_,_],  // 3
  [_,_,O,S,S,S,S,S,S,S,S,S,O,_,_,_],  // 4
  [_,_,_,O,S,S,S,S,S,S,S,O,_,_,_,_],  // 5
  [_,_,O,T,T,T,T,T,T,T,T,T,O,_,_,_],  // 6
  [_,O,T,T,T,T,T,T,T,T,T,T,T,O,_,_],  // 7
  [_,O,T,T,T,T,T,T,T,T,T,T,T,O,_,_],  // 8
  [_,_,O,T,T,T,T,T,T,T,T,T,O,_,_,_],  // 9
  [_,O,S,O,O,T,T,T,T,T,T,O,S,S,O,_],  // 10
  [_,O,S,O,O,T,T,T,T,T,T,O,S,S,O,_],  // 11
  [_,O,S,O,O,T,T,T,T,T,T,O,S,S,O,_],  // 12
  [_,_,O,O,O,T,T,T,T,T,T,O,S,O,_,_],  // 13
  [_,_,_,O,O,T,T,T,T,T,T,O,O,_,_,_],  // 14
  [_,_,_,_,O,T,T,T,T,T,T,O,_,_,_,_],  // 15
  [_,_,O,P,P,O,_,_,_,O,P,P,O,_,_,_],  // 16
  [_,_,O,P,P,O,_,_,_,O,P,P,O,_,_,_],  // 17
  [_,_,O,P,P,O,_,_,_,O,P,P,O,_,_,_],  // 18
  [_,_,O,P,P,O,_,_,_,O,P,P,O,_,_,_],  // 19
  [_,_,O,F,F,O,_,_,_,O,F,F,O,_,_,_],  // 20
  [_,O,F,F,F,O,_,_,_,O,F,F,F,O,_,_],  // 21
  [_,O,F,F,F,O,_,_,_,O,F,F,F,O,_,_],  // 22
  [_,_,O,O,O,_,_,_,_,_,O,O,O,_,_,_],  // 23
]

// Error frame 0 — arms raised up in alarm
const ERROR_0: SpriteFrame = [
  [_,_,_,_,_,O,O,O,O,O,O,_,_,_,_,_],  // 0
  [_,_,_,_,O,H,H,H,H,H,H,O,_,_,_,_],  // 1
  [_,_,_,O,H,H,H,H,H,H,H,H,O,_,_,_],  // 2
  [_,_,_,O,S,S,E,S,S,E,S,S,O,_,_,_],  // 3
  [_,_,_,O,S,S,S,S,S,S,S,S,O,_,_,_],  // 4
  [_,_,_,_,O,S,S,S,S,S,S,O,_,_,_,_],  // 5
  [_,_,_,O,T,T,T,T,T,T,T,T,O,_,_,_],  // 6
  [_,_,O,T,T,T,T,T,T,T,T,T,T,O,_,_],  // 7
  [_,_,O,T,T,T,T,T,T,T,T,T,T,O,_,_],  // 8
  [_,_,_,O,T,T,T,T,T,T,T,T,O,_,_,_],  // 9
  [_,O,S,O,O,T,T,T,T,T,T,O,O,S,O,_],  // 10 arms angled up
  [O,S,S,O,O,T,T,T,T,T,T,O,O,S,S,O],  // 11
  [O,S,_,O,O,T,T,T,T,T,T,O,O,_,S,O],  // 12
  [_,_,_,O,O,T,T,T,T,T,T,O,O,_,_,_],  // 13
  [_,_,_,O,O,T,T,T,T,T,T,O,O,_,_,_],  // 14
  [_,_,_,_,O,T,T,T,T,T,T,O,_,_,_,_],  // 15
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 16
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 17
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 18
  [_,_,_,O,P,P,O,_,_,O,P,P,O,_,_,_],  // 19
  [_,_,_,O,F,F,O,_,_,O,F,F,O,_,_,_],  // 20
  [_,_,O,F,F,F,O,_,_,O,F,F,F,O,_,_],  // 21
  [_,_,O,F,F,F,O,_,_,O,F,F,F,O,_,_],  // 22
  [_,_,_,O,O,O,_,_,_,_,O,O,O,_,_,_],  // 23
]

// Error frame 1 — arms at sides (quick flash alternation)
const ERROR_1: SpriteFrame = IDLE_0

export const SPRITE_FRAMES: Record<string, SpriteFrame[]> = {
  idle: [IDLE_0, IDLE_1],
  work: [WORK_0, WORK_1, WORK_2],
  meeting: [MEETING_0, MEETING_1],
  error: [ERROR_0, ERROR_1],
}
