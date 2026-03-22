export interface RoomDef {
  id: string
  name: string
  department: string
}

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
