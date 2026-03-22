'use client'

import React, { useState, useCallback, useEffect, useReducer } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useOfficeState } from './hooks/use-office-state'
import { TitleBar } from './components/title-bar'
import { OfficeFloor } from './components/office-floor'
import { StatusBar } from './components/status-bar'
import { EmployeePanel } from './components/employee-panel'
import { TaskAssigner } from './components/task-assigner'
import { MeetingCreator } from './components/meeting-creator'
import { StorePanel } from './components/store-panel'
import { DecorationMode } from './components/decoration-mode'
import { api } from '@/lib/api'

// Managers whose delegation triggers the COO walk animation
const MANAGER_NAMES = new Set([
  'head-of-development',
  'head-of-research',
  'head-of-legal',
])

export default function OfficeView() {
  const { employees, activeMeetings, connected, departments, subscribe } = useOfficeState()

  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [showMeetingCreator, setShowMeetingCreator] = useState(false)
  const [taskAssignerTarget, setTaskAssignerTarget] = useState<string | null>(null)
  const [cooWalkTarget, setCooWalkTarget] = useState<string | null>(null)
  const [showStore, setShowStore] = useState(false)
  const [decorationMode, setDecorationMode] = useState(false)

  const queryClient = useQueryClient()

  const { data: officeState } = useQuery({
    queryKey: ['office-state'],
    queryFn: () => api.getOfficeState(),
    staleTime: 15_000,
  })

  const { data: storeCatalog = [] } = useQuery({
    queryKey: ['store-catalog'],
    queryFn: () => api.getStoreCatalog(),
    staleTime: 60_000,
  })

  const [pendingDecorationItemId, setPendingDecorationItemId] = useState<string | null>(null)

  const placeDecorationMutation = useMutation({
    mutationFn: ({ itemId, room, owner, x, y }: { itemId: string; room: string; owner: string; x: number; y: number }) =>
      api.placeDecoration(itemId, room, owner, x, y),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['office-state'] })
      queryClient.invalidateQueries({ queryKey: ['inventory', selectedEmployee ?? ''] })
    },
  })

  const handleRoomClick = useCallback(
    (room: string, x: number, y: number) => {
      if (!decorationMode || !pendingDecorationItemId) return
      placeDecorationMutation.mutate({
        itemId: pendingDecorationItemId,
        room,
        owner: selectedEmployee ?? 'jinn',
        x,
        y,
      })
    },
    [decorationMode, pendingDecorationItemId, selectedEmployee, placeDecorationMutation],
  )

  const handleSelectEmployee = useCallback((name: string) => {
    setSelectedEmployee(name)
  }, [])

  const handleClosePanel = useCallback(() => {
    setSelectedEmployee(null)
  }, [])

  const handleAssignTask = useCallback((name: string) => {
    setTaskAssignerTarget(name)
    // Trigger COO walk toward the employee's room
    setCooWalkTarget(name)
    setTimeout(() => setCooWalkTarget(null), 4000)
  }, [])

  const handleCloseTaskAssigner = useCallback(() => {
    setTaskAssignerTarget(null)
  }, [])

  // Force a re-render on window resize so the flex layout recalculates
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    const handleResize = () => forceUpdate()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Listen for session:created events — if any manager delegates, trigger COO walk
  useEffect(() => {
    if (!subscribe) return
    return subscribe((event: string, payload: unknown) => {
      if (event !== 'session:created') return
      const p = payload as Record<string, unknown> | null
      if (!p) return
      const employee = typeof p.employee === 'string' ? p.employee : null
      const creator = typeof p.creator === 'string' ? p.creator : null
      // If a manager created the session, animate the COO walking to that employee
      if (creator && MANAGER_NAMES.has(creator) && employee) {
        setCooWalkTarget(employee)
        setTimeout(() => setCooWalkTarget(null), 4000)
      }
    })
  }, [subscribe])

  const selectedEmployeeData =
    selectedEmployee
      ? employees.find((e) => e.name === selectedEmployee) ?? null
      : null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        width: '100%',
        background: 'var(--bg, #0a0a0a)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <TitleBar connected={connected} />

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <OfficeFloor
          employees={employees}
          activeMeetings={activeMeetings}
          onSelectEmployee={handleSelectEmployee}
          cooTargetEmployee={cooWalkTarget}
          departments={departments}
          decorations={officeState?.decorations}
          storeItems={storeCatalog}
          decorationMode={decorationMode}
          onRoomClick={handleRoomClick}
        />

        {/* Employee detail panel */}
        {selectedEmployee && !showStore && (
          <EmployeePanel
            employee={selectedEmployeeData}
            onClose={handleClosePanel}
            onAssignTask={handleAssignTask}
          />
        )}

        {/* Store panel */}
        {showStore && (
          <StorePanel
            buyerName={selectedEmployee ?? 'jinn'}
            onClose={() => setShowStore(false)}
          />
        )}

        {/* Decoration mode overlay */}
        {decorationMode && (
          <DecorationMode
            ownerName={selectedEmployee ?? 'jinn'}
            onExit={() => { setDecorationMode(false); setPendingDecorationItemId(null) }}
            onSelectItem={setPendingDecorationItemId}
            selectedItemId={pendingDecorationItemId}
          />
        )}
      </div>

      <StatusBar
        employees={employees}
        onCallMeeting={() => setShowMeetingCreator(true)}
        onOpenStore={() => setShowStore((v) => !v)}
        onToggleDecorationMode={() => setDecorationMode((v) => !v)}
        decorationMode={decorationMode}
      />

      {/* Task assigner modal */}
      {taskAssignerTarget && (
        <TaskAssigner
          employeeName={taskAssignerTarget}
          onClose={handleCloseTaskAssigner}
        />
      )}

      {/* Meeting creator modal */}
      {showMeetingCreator && (
        <MeetingCreator
          employees={employees}
          onClose={() => setShowMeetingCreator(false)}
        />
      )}
    </div>
  )
}
