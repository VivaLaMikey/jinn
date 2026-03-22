export interface RoomDef {
  id: string
  name: string
  department: string
  gridColumn: string
  gridRow: string
  employees: string[]
}

export const ROOMS: RoomDef[] = [
  // Row 1 (top floor)
  {
    id: 'engineering',
    name: 'Engineering',
    department: 'engineering',
    gridColumn: '1 / 3',
    gridRow: '1',
    employees: [
      'code-architect',
      'code-implementer',
      'code-reviewer',
      'code-explorer',
      'head-of-development',
      'lead-programmer',
      'ui-ux-reviewer',
      'bug-verifier',
      'changelog-updater',
    ],
  },
  {
    id: 'executive',
    name: 'Executive',
    department: 'executive',
    gridColumn: '3',
    gridRow: '1',
    employees: ['cfo', 'cto', 'cmo'],
  },
  {
    id: 'legal',
    name: 'Legal',
    department: 'legal',
    gridColumn: '4',
    gridRow: '1',
    employees: ['head-of-legal', 'contract-analyst', 'compliance-analyst'],
  },
  {
    id: 'coo-office',
    name: 'COO Office',
    department: 'coo',
    gridColumn: '5',
    gridRow: '1',
    employees: [],
  },
  // Row 2 (bottom floor)
  {
    id: 'marketing',
    name: 'Marketing',
    department: 'marketing',
    gridColumn: '1',
    gridRow: '3',
    employees: ['content-writer'],
  },
  {
    id: 'operations',
    name: 'Operations',
    department: 'operations',
    gridColumn: '2',
    gridRow: '3',
    employees: ['exec-assistant', 'jinn-guide'],
  },
  {
    id: 'research',
    name: 'Research',
    department: 'research',
    gridColumn: '3 / 5',
    gridRow: '3',
    employees: [
      'head-of-research',
      'market-researcher',
      'osint-analyst',
      'pricing-psychologist',
      'technical-researcher',
    ],
  },
  {
    id: 'meeting-room',
    name: 'Meeting Room',
    department: 'meetings',
    gridColumn: '5',
    gridRow: '3',
    employees: [],
  },
]
