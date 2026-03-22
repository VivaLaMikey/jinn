'use client'

import React, { useState, useCallback } from 'react'
import { useOfficeState } from './hooks/use-office-state'
import { TitleBar } from './components/title-bar'
import { OfficeFloor } from './components/office-floor'
import { StatusBar } from './components/status-bar'
import { EmployeePanel } from './components/employee-panel'
import { TaskAssigner } from './components/task-assigner'
import { MeetingCreator } from './components/meeting-creator'

export default function OfficeView() {
  const { employees, activeMeetings, connected } = useOfficeState()

  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [showMeetingCreator, setShowMeetingCreator] = useState(false)
  const [taskAssignerTarget, setTaskAssignerTarget] = useState<string | null>(null)
  const [cooWalkTarget, setCooWalkTarget] = useState<string | null>(null)

  const handleSelectEmployee = useCallback((name: string) => {
    setSelectedEmployee(name)
  }, [])

  const handleClosePanel = useCallback(() => {
    setSelectedEmployee(null)
  }, [])

  const handleAssignTask = useCallback((name: string) => {
    setTaskAssignerTarget(name)
    // Trigger Jinn to "walk" toward the employee's room
    setCooWalkTarget(name)
    setTimeout(() => setCooWalkTarget(null), 4000)
  }, [])

  const handleCloseTaskAssigner = useCallback(() => {
    setTaskAssignerTarget(null)
  }, [])

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
        />

        {/* Employee detail panel */}
        {selectedEmployee && (
          <EmployeePanel
            employee={selectedEmployeeData}
            onClose={handleClosePanel}
            onAssignTask={handleAssignTask}
          />
        )}
      </div>

      <StatusBar
        employees={employees}
        onCallMeeting={() => setShowMeetingCreator(true)}
      />

      {/* Task assigner popover */}
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
