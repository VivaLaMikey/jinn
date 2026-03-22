export interface RoomDef {
  id: string
  name: string
  department: string
}

// ---------------------------------------------------------------------------
// Isometric grid constants
// ---------------------------------------------------------------------------

/** Width of one isometric tile in pixels (the horizontal diagonal of the diamond) */
export const TILE_WIDTH = 64

/** Height of one isometric tile in pixels (the vertical diagonal of the diamond) */
export const TILE_HEIGHT = 32

/** Standard room grid dimensions */
export const ROOM_GRID_COLS = 10
export const ROOM_GRID_ROWS = 10

// ---------------------------------------------------------------------------
// Isometric coordinate conversion utilities
// ---------------------------------------------------------------------------

/**
 * Convert grid (logical) coordinates to screen (pixel) position.
 * The screen origin is the left-most corner of the grid (grid 0,0).
 *
 * Formula:
 *   screenX = (gridX - gridY) * TILE_WIDTH / 2
 *   screenY = (gridX + gridY) * TILE_HEIGHT / 2
 */
export function gridToScreen(gridX: number, gridY: number): { x: number; y: number } {
  return {
    x: (gridX - gridY) * (TILE_WIDTH / 2),
    y: (gridX + gridY) * (TILE_HEIGHT / 2),
  }
}

/**
 * Convert screen (pixel) position back to grid coordinates.
 *
 * Inverse of gridToScreen:
 *   gridX = (screenX / (TILE_WIDTH / 2) + screenY / (TILE_HEIGHT / 2)) / 2
 *   gridY = (screenY / (TILE_HEIGHT / 2) - screenX / (TILE_WIDTH / 2)) / 2
 */
export function screenToGrid(screenX: number, screenY: number): { gridX: number; gridY: number } {
  const halfW = TILE_WIDTH / 2
  const halfH = TILE_HEIGHT / 2
  return {
    gridX: (screenX / halfW + screenY / halfH) / 2,
    gridY: (screenY / halfH - screenX / halfW) / 2,
  }
}

/**
 * Return the CSS clip-path polygon that creates a diamond (isometric tile) shape.
 * Points: top-center → right-center → bottom-center → left-center
 */
export function getTileClipPath(): string {
  return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
}

// ---------------------------------------------------------------------------
// Display name helper
// ---------------------------------------------------------------------------

/**
 * Convert a raw department slug into a display name.
 * "engineering" → "Engineering"
 * "head-of-legal" → "Head Of Legal"
 */
export function getDeptDisplayName(dept: string): string {
  return dept
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ---------------------------------------------------------------------------
// Room builder
// ---------------------------------------------------------------------------

/**
 * Build room definitions and a department→employee map from live employee data.
 * The "coo" department is excluded — Jinn gets the special COO Office component.
 */
export function buildRoomsFromEmployees(
  employees: { name: string; department: string }[],
): { rooms: RoomDef[]; roomEmployees: Map<string, string[]> } {
  const roomEmployees = new Map<string, string[]>()

  for (const emp of employees) {
    const dept = emp.department
    if (!dept || dept === 'coo') continue
    if (!roomEmployees.has(dept)) {
      roomEmployees.set(dept, [])
    }
    roomEmployees.get(dept)!.push(emp.name)
  }

  const rooms: RoomDef[] = Array.from(roomEmployees.keys()).map((dept) => ({
    id: dept,
    name: getDeptDisplayName(dept),
    department: dept,
  }))

  return { rooms, roomEmployees }
}
