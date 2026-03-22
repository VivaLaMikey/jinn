'use client'

import React, {
  useState,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useMemo,
  type PointerEvent as ReactPointerEvent,
} from 'react'

// ─── COO walk step interval (ms per tile) ────────────────────────────────────
const COO_WALK_STEP_MS = 350
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
import { NoticeBoardPanel } from './components/notice-board-panel'
import { api } from '@/lib/api'

// Managers whose delegation triggers the COO walk animation
const MANAGER_NAMES = new Set([
  'head-of-development',
  'head-of-research',
  'head-of-legal',
])

// ─── Zoom constants ───────────────────────────────────────────────────────────
const ZOOM_MIN  = 0.5
const ZOOM_MAX  = 2.0
const ZOOM_STEP = 0.15

// ─── Pixel-art zoom button ────────────────────────────────────────────────────
function ZoomButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '26px',
        height: '26px',
        fontFamily: 'monospace',
        fontSize: '16px',
        fontWeight: 700,
        color: disabled ? '#6B5B4B' : '#E8A020',
        background: disabled ? '#3A2410' : '#2A1810',
        border: 'none',
        borderRadius: '2px',
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Habbo 3D button effect
        boxShadow: disabled
          ? 'inset 1px 1px 0 rgba(0,0,0,0.3)'
          : 'inset -2px -2px 0 rgba(0,0,0,0.5), inset 2px 2px 0 rgba(255,255,255,0.12), 0 0 0 1px #C8943A60',
        lineHeight: 1,
        transition: 'background 0.1s',
      }}
      onMouseDown={(e) => {
        if (disabled) return
        const el = e.currentTarget as HTMLButtonElement
        el.style.boxShadow = 'inset 2px 2px 0 rgba(0,0,0,0.5), inset -1px -1px 0 rgba(255,255,255,0.08), 0 0 0 1px #C8943A80'
      }}
      onMouseUp={(e) => {
        if (disabled) return
        const el = e.currentTarget as HTMLButtonElement
        el.style.boxShadow = 'inset -2px -2px 0 rgba(0,0,0,0.5), inset 2px 2px 0 rgba(255,255,255,0.12), 0 0 0 1px #C8943A60'
      }}
    >
      {label}
    </button>
  )
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function OfficeView() {
  const { employees, activeMeetings, connected, departments, subscribe } = useOfficeState()

  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [showMeetingCreator, setShowMeetingCreator] = useState(false)
  const [taskAssignerTarget, setTaskAssignerTarget] = useState<string | null>(null)
  const [cooWalkTarget, setCooWalkTarget] = useState<string | null>(null)
  const [showStore, setShowStore] = useState(false)
  const [decorationMode, setDecorationMode] = useState(false)
  const [showNoticeBoard, setShowNoticeBoard] = useState(false)

  // ─── COO click-to-move state ─────────────────────────────────────────────
  const [cooPosition, setCooPosition] = useState<{ x: number; y: number } | null>(null)
  const [cooDestination, setCooDestination] = useState<{ x: number; y: number } | null>(null)
  const [cooPath, setCooPath] = useState<{ x: number; y: number }[]>([])
  const [cooWalking, setCooWalking] = useState(false)
  const [cooDirection, setCooDirection] = useState<'se' | 'sw' | 'ne' | 'nw'>('se')
  const cooWalkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── Zoom state ─────────────────────────────────────────────────────────────
  const [zoomLevel, setZoomLevel] = useState(1)
  const floorWrapperRef = useRef<HTMLDivElement>(null)

  // ─── Pan state (used when zoomed in) ────────────────────────────────────────
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const isPanningRef = useRef(false)
  const panStartRef  = useRef({ x: 0, y: 0 })
  const panOriginRef = useRef({ x: 0, y: 0 })

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

  // ─── COO click-to-move handler ───────────────────────────────────────────
  const handleTileClick = useCallback((dest: { x: number; y: number }) => {
    // Cancel any in-progress walk
    if (cooWalkIntervalRef.current !== null) {
      clearInterval(cooWalkIntervalRef.current)
      cooWalkIntervalRef.current = null
    }

    const start = cooPosition ?? dest

    // Build a straight-line path from start to dest using integer steps
    const dx = dest.x - start.x
    const dy = dest.y - start.y
    const steps = Math.max(Math.abs(dx), Math.abs(dy))

    if (steps === 0) return

    const path: { x: number; y: number }[] = []
    for (let i = 1; i <= steps; i++) {
      path.push({
        x: Math.round(start.x + (dx * i) / steps),
        y: Math.round(start.y + (dy * i) / steps),
      })
    }

    setCooPath(path)
    setCooDestination(dest)
    setCooWalking(true)

    // Determine initial walk direction
    const dirX = dx > 0 ? 1 : dx < 0 ? -1 : 0
    const dirY = dy > 0 ? 1 : dy < 0 ? -1 : 0
    if (dirX >= 0 && dirY >= 0) setCooDirection('se')
    else if (dirX < 0 && dirY >= 0) setCooDirection('sw')
    else if (dirX >= 0 && dirY < 0) setCooDirection('ne')
    else setCooDirection('nw')

    let stepIndex = 0
    cooWalkIntervalRef.current = setInterval(() => {
      if (stepIndex >= path.length) {
        clearInterval(cooWalkIntervalRef.current!)
        cooWalkIntervalRef.current = null
        setCooWalking(false)
        setCooPath([])
        return
      }

      const step = path[stepIndex]
      const prevStep = stepIndex > 0 ? path[stepIndex - 1] : start

      // Update direction per step
      const sdx = step.x - prevStep.x
      const sdy = step.y - prevStep.y
      if (sdx >= 0 && sdy >= 0) setCooDirection('se')
      else if (sdx < 0 && sdy >= 0) setCooDirection('sw')
      else if (sdx >= 0 && sdy < 0) setCooDirection('ne')
      else setCooDirection('nw')

      setCooPosition({ x: step.x, y: step.y })
      stepIndex++
    }, COO_WALK_STEP_MS)
  }, [cooPosition])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (cooWalkIntervalRef.current !== null) {
        clearInterval(cooWalkIntervalRef.current)
      }
    }
  }, [])

  const handleSelectEmployee = useCallback((name: string) => {
    setSelectedEmployee(name)
  }, [])

  const handleClosePanel = useCallback(() => {
    setSelectedEmployee(null)
  }, [])

  const handleAssignTask = useCallback((name: string) => {
    setTaskAssignerTarget(name)
    setCooWalkTarget(name)
    setTimeout(() => setCooWalkTarget(null), 4000)
  }, [])

  const handleCloseTaskAssigner = useCallback(() => {
    setTaskAssignerTarget(null)
  }, [])

  // ─── Window resize ───────────────────────────────────────────────────────────
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    const handleResize = () => forceUpdate()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ─── Session event → COO walk ────────────────────────────────────────────────
  useEffect(() => {
    if (!subscribe) return
    return subscribe((event: string, payload: unknown) => {
      if (event !== 'session:created') return
      const p = payload as Record<string, unknown> | null
      if (!p) return
      const employee = typeof p.employee === 'string' ? p.employee : null
      const creator  = typeof p.creator  === 'string' ? p.creator  : null
      if (creator && MANAGER_NAMES.has(creator) && employee) {
        setCooWalkTarget(employee)
        setTimeout(() => setCooWalkTarget(null), 4000)
      }
    })
  }, [subscribe])

  // ─── Scroll wheel zoom ───────────────────────────────────────────────────────
  useEffect(() => {
    const el = floorWrapperRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()

      // Pinch-to-zoom: ctrlKey is set by browsers for trackpad pinch gestures
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      setZoomLevel((prev) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(prev + delta).toFixed(2))))
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  // ─── Pan via pointer drag ────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    // Only drag with middle mouse or primary mouse on the background (not interactive els)
    if (e.button !== 0 && e.button !== 1) return
    // Prevent drag from firing when clicking employees / buttons
    const target = e.target as HTMLElement
    if (target.tagName === 'BUTTON' || target.closest('button')) return

    isPanningRef.current = true
    panStartRef.current  = { x: e.clientX, y: e.clientY }
    panOriginRef.current = { ...panOffset }
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
  }, [panOffset])

  const handlePointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isPanningRef.current) return
    const dx = e.clientX - panStartRef.current.x
    const dy = e.clientY - panStartRef.current.y
    setPanOffset({
      x: panOriginRef.current.x + dx,
      y: panOriginRef.current.y + dy,
    })
  }, [])

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false
  }, [])

  // Reset pan when zoom returns to 1
  useEffect(() => {
    if (zoomLevel === 1) setPanOffset({ x: 0, y: 0 })
  }, [zoomLevel])

  // ─── Break room: employees idle for 30+ min ───────────────────────────────
  // We use session data here: idle employees with no running session qualify.
  // Since we don't have last-active timestamps in OfficeEmployee, we show all
  // idle employees when any employee has been working (i.e., "break time" is
  // meaningful). If all employees are idle, show the first few as on break.
  const breakEmployees = useMemo(() => {
    const idle = employees.filter((e) => e.status === 'idle' && e.department !== 'coo')
    // Only show break room if there are idle employees and at least someone working
    const anyWorking = employees.some((e) => e.status === 'working' || e.status === 'meeting')
    if (!anyWorking || idle.length === 0) return []
    // Show up to 5 idle employees in the break room
    return idle.slice(0, 5)
  }, [employees])

  // ─── Zoom controls handler ───────────────────────────────────────────────────
  const zoomIn  = useCallback(() => setZoomLevel((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2))), [])
  const zoomOut = useCallback(() => setZoomLevel((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2))), [])

  const selectedEmployeeData = selectedEmployee
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
        // Warm Habbo background instead of near-black
        background: '#3A2418',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <TitleBar connected={connected} />

      {/* Floor viewport — handles zoom + pan */}
      <div
        ref={floorWrapperRef}
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          cursor: isPanningRef.current ? 'grabbing' : zoomLevel > 1 ? 'grab' : 'default',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Scaled + panned office floor */}
        <div
          style={{
            width: '100%',
            height: '100%',
            transformOrigin: 'center center',
            transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
            transition: isPanningRef.current ? 'none' : 'transform 0.15s ease-out',
            willChange: 'transform',
          }}
        >
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
            onNoticeBoard={() => setShowNoticeBoard(true)}
            breakEmployees={breakEmployees}
            cooPosition={cooPosition}
            cooDirection={cooDirection}
            cooWalking={cooWalking}
            cooDestination={cooDestination}
            onTileClick={handleTileClick}
          />
        </div>

        {/* Employee detail panel — rendered outside the scaled layer so it stays sharp */}
        {selectedEmployee && !showStore && (
          <EmployeePanel
            employee={selectedEmployeeData}
            onClose={handleClosePanel}
            onAssignTask={handleAssignTask}
          />
        )}

        {showNoticeBoard && (
          <NoticeBoardPanel onClose={() => setShowNoticeBoard(false)} />
        )}

        {showStore && (
          <StorePanel
            buyerName={selectedEmployee ?? 'jinn'}
            onClose={() => setShowStore(false)}
          />
        )}

        {decorationMode && (
          <DecorationMode
            ownerName={selectedEmployee ?? 'jinn'}
            onExit={() => { setDecorationMode(false); setPendingDecorationItemId(null) }}
            onSelectItem={setPendingDecorationItemId}
            selectedItemId={pendingDecorationItemId}
          />
        )}

        {/* ─── Zoom controls — bottom-right overlay ──────────────────────── */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            zIndex: 50,
            pointerEvents: 'auto',
          }}
        >
          <ZoomButton label='+' onClick={zoomIn}  disabled={zoomLevel >= ZOOM_MAX} />
          {/* Zoom level display */}
          <div
            style={{
              width: '26px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'monospace',
              fontSize: '8px',
              color: '#8C7B6B',
              background: '#2A1810',
              border: '1px solid #4A3020',
              borderRadius: '2px',
              letterSpacing: '0.04em',
            }}
          >
            {Math.round(zoomLevel * 100)}%
          </div>
          <ZoomButton label='-' onClick={zoomOut} disabled={zoomLevel <= ZOOM_MIN} />
        </div>
      </div>

      <StatusBar
        employees={employees}
        onCallMeeting={() => setShowMeetingCreator(true)}
        onOpenStore={() => setShowStore((v) => !v)}
        onToggleDecorationMode={() => setDecorationMode((v) => !v)}
        decorationMode={decorationMode}
      />

      {taskAssignerTarget && (
        <TaskAssigner
          employeeName={taskAssignerTarget}
          onClose={handleCloseTaskAssigner}
        />
      )}

      {showMeetingCreator && (
        <MeetingCreator
          employees={employees}
          onClose={() => setShowMeetingCreator(false)}
        />
      )}
    </div>
  )
}
