'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { useOrg } from '@/hooks/use-employees'
import { useSessions } from '@/hooks/use-sessions'
import { useGateway } from '@/hooks/use-gateway'
import { api } from '@/lib/api'
import type { EmployeeAppearance } from '@/lib/api'
import { useQuery, useQueries } from '@tanstack/react-query'
import { buildRoomsFromEmployees } from '../lib/office-layout'

export type EmployeeStatus = 'idle' | 'working' | 'meeting' | 'error'

export interface OfficeEmployee {
  name: string
  displayName: string
  department: string
  status: EmployeeStatus
  taskSnippet: string | null
  sessionId: string | null
  rank?: string
  isManager: boolean
  appearance?: EmployeeAppearance
}

export interface ActiveMeeting {
  id: string
  title?: string
  participants: string[]
}

export function useOfficeState() {
  const { data: org } = useOrg()
  const { data: sessions } = useSessions()
  const { data: meetings } = useQuery({
    queryKey: ['meetings', 'active'],
    queryFn: () => api.getMeetings('active'),
    // Meetings don't change that often — poll every 60s
    refetchInterval: 60_000,
  })
  const { subscribe, connected } = useGateway()
  const [version, setVersion] = useState(0)
  const statusOverrides = useRef<Map<string, EmployeeStatus>>(new Map())

  // Fetch all employee details in parallel to get department info
  const employeeNames = org?.employees ?? []
  const employeeDetailResults = useQueries({
    queries: employeeNames.map((name) => ({
      queryKey: ['org', 'employee', name],
      queryFn: () => api.getEmployee(name),
      staleTime: 5 * 60 * 1000, // 5 minutes — personas don't change often
    })),
  })

  // Build a name→department map, name→rank map, and name→appearance map from the fetched detail results
  const { deptMap, rankMap, appearanceMap } = useMemo(() => {
    const dept = new Map<string, string>()
    const rank = new Map<string, string>()
    const appearance = new Map<string, EmployeeAppearance>()
    for (const result of employeeDetailResults) {
      if (result.data) {
        const d = result.data as unknown as Record<string, unknown>
        const name = result.data.name
        dept.set(name, (d.department as string) ?? '')
        if (d.rank) rank.set(name, d.rank as string)
        if (d.appearance) appearance.set(name, d.appearance as EmployeeAppearance)
      }
    }
    return { deptMap: dept, rankMap: rank, appearanceMap: appearance }
    // employeeDetailResults reference changes every render — track by org employees list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeDetailResults.map((r) => r.dataUpdatedAt).join(',')])

  // WebSocket listener for immediate status updates
  useEffect(() => {
    return subscribe((event, payload: any) => {
      const emp = payload?.employee
      if (emp) {
        if (event === 'session:running' || event === 'session:created') {
          statusOverrides.current.set(emp, 'working')
        } else if (event === 'session:completed' || event === 'session:idle') {
          statusOverrides.current.set(emp, 'idle')
        } else if (event === 'session:error') {
          statusOverrides.current.set(emp, 'error')
        }
        setVersion((v) => v + 1)
      }
      if (event === 'meeting:started' || event === 'meeting:ended') {
        const participants: any[] = payload?.participants || []
        for (const p of participants) {
          const n = typeof p === 'string' ? p : p.name
          statusOverrides.current.set(
            n,
            event === 'meeting:started' ? 'meeting' : 'idle',
          )
        }
        setVersion((v) => v + 1)
      }
    })
  }, [subscribe])

  // Clear overrides when React Query data refreshes (the truth catches up)
  useEffect(() => {
    statusOverrides.current.clear()
  }, [sessions, meetings])

  const employees = useMemo((): OfficeEmployee[] => {
    if (!org?.employees) return []

    // Build session lookup
    const sessionMap = new Map<
      string,
      { status: string; id: string; prompt?: string }
    >()
    if (Array.isArray(sessions)) {
      for (const s of sessions as any[]) {
        if (
          s.employee &&
          (s.status === 'running' || s.status === 'waiting')
        ) {
          sessionMap.set(s.employee, {
            status: s.status,
            id: s.id,
            prompt: s.prompt,
          })
        }
      }
    }

    // Build meeting participant set
    const meetingParticipants = new Set<string>()
    if (Array.isArray(meetings)) {
      for (const m of meetings) {
        for (const p of m.participants || []) {
          meetingParticipants.add(typeof p === 'string' ? p : p.name)
        }
      }
    }

    return org.employees.map((name) => {
      const override = statusOverrides.current.get(name)
      let status: EmployeeStatus = 'idle'
      let taskSnippet: string | null = null
      let sessionId: string | null = null

      if (override) {
        status = override
      } else if (meetingParticipants.has(name)) {
        status = 'meeting'
      } else if (sessionMap.has(name)) {
        status = 'working'
        const s = sessionMap.get(name)!
        sessionId = s.id
        taskSnippet = s.prompt
          ? s.prompt.length > 60
            ? s.prompt.slice(0, 57) + '...'
            : s.prompt
          : null
      }

      const displayName = name
        .split('-')
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(' ')

      const department = deptMap.get(name) ?? ''

      // rank — populated if org API returns it per-employee
      const rank: string | undefined = rankMap.get(name)
      const isManager = rank === 'manager' || rank === 'senior'

      const appearance = appearanceMap.get(name)

      return { name, displayName, department, status, taskSnippet, sessionId, rank, isManager, appearance }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org, sessions, meetings, version, deptMap, rankMap, appearanceMap])

  // Build department → employee names map (excludes 'coo' department)
  const departments = useMemo((): Map<string, string[]> => {
    const empList = employees.map((e) => ({
      name: e.name,
      department: e.department,
    }))
    const { roomEmployees } = buildRoomsFromEmployees(empList)
    return roomEmployees
  }, [employees])

  const activeMeetings = useMemo((): ActiveMeeting[] => {
    if (!Array.isArray(meetings)) return []
    return meetings.map((m: any) => ({
      id: m.id,
      title: m.title || m.topic,
      participants: (m.participants || []).map((p: any) =>
        typeof p === 'string' ? p : p.name,
      ),
    }))
  }, [meetings])

  return { employees, activeMeetings, connected, departments, subscribe }
}
