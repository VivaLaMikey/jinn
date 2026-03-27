"use client"
import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '@/lib/api'
import type { Employee, OrgData } from '@/lib/api'
import { useGateway } from '@/hooks/use-gateway'
import { PageLayout } from '@/components/page-layout'
import { useSettings } from '@/app/settings-provider'
import {
  Plus,
  Users,
  Clock,
  ChevronRight,
  X,
  Trash2,
  StopCircle,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BarChart2,
  Filter,
  ChevronDown,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgendaItem {
  topic: string
  description?: string
  goal?: string
}

interface Participant {
  employeeName: string
  role: 'chair' | 'participant' | 'observer'
}

interface MeetingSettings {
  roundsPerTopic: number
  humanParticipant: boolean
  allowDebate: boolean
}

interface MeetingEntry {
  speaker: string
  department?: string
  content: string
  timestamp?: string
  type?: string
}

interface MeetingRound {
  agendaIndex: number
  round: number
  entries: MeetingEntry[]
}

// NOTE: actionItems may arrive as strings (flattened by the API layer in
// jinn-cli/src/meetings/api.ts) or as ActionItem objects
// { description, assignee?, priority? } if consumed before the API layer
// processes the response. Both shapes are handled in the render below.
// Backend canonical type: jinn-cli/src/meetings/types.ts (MeetingSummary).
interface MeetingSummary {
  decisions?: string[]
  actionItems?: (string | { description: string; assignee?: string; priority?: string })[]
  keyPoints?: string[]
  summary?: string
}

// NOTE: chair, participants, agenda, settings, calledBy are flattened from
// config by the API layer (jinn-cli/src/meetings/api.ts flattenMeeting).
// Backend canonical type: jinn-cli/src/meetings/types.ts (Meeting).
// Keep both in sync when changing this interface.
interface TranscriptEntry {
  agendaIndex: number
  round: number
  speaker: string
  speakerRole?: string
  department?: string
  content: string
  timestamp?: string
}

interface Meeting {
  id: string
  title: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  chair?: string
  calledBy?: string
  participants?: Participant[]
  agenda?: AgendaItem[]
  settings?: MeetingSettings
  rounds?: MeetingRound[]
  summary?: MeetingSummary
  createdAt?: string
  updatedAt?: string
  completedAt?: string
  messages?: MeetingEntry[]
  sessionId?: string
  transcript?: TranscriptEntry[]
  // Backend may also send nested config before flattenMeeting runs
  config?: {
    agenda?: AgendaItem[]
    participants?: Participant[]
    chair?: string
    calledBy?: string
    settings?: MeetingSettings
  }
}

interface MeetingLogEntry {
  meetingId: string
  calledBy: string
  title: string
  participants: string[]
  departments: string[]
  agenda: string[]
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  status: 'completed' | 'cancelled' | 'in_progress'
  outcomeSummary: string | null
  decisions: string[]
  actionItems: { description: string; assignee: string; priority: string }[]
  timestamp: string
}

interface MeetingStats {
  employeeStats: { employee: string; count: number }[]
  globalCount: number
}

// ---------------------------------------------------------------------------
// Normalize meeting data from backend
// ---------------------------------------------------------------------------

/** Normalize a raw meeting from the API into the shape our components expect. */
function normalizeMeeting(raw: any): Meeting {
  const m = { ...raw } as Meeting

  // Flatten config → top-level if backend didn't do it
  if (m.config && !m.participants) {
    m.participants = m.config.participants
    m.agenda = m.config.agenda
    m.chair = m.config.chair
    m.calledBy = m.config.calledBy
    m.settings = m.config.settings
  }

  // Map completedAt → updatedAt for sorting
  if (!m.updatedAt && (m as any).completedAt) {
    m.updatedAt = (m as any).completedAt
  }

  // Convert transcript[] → rounds[] so MeetingDetail can render them
  if (!m.rounds && m.transcript && m.transcript.length > 0) {
    const roundMap = new Map<string, MeetingRound>()
    for (const entry of m.transcript) {
      const key = `${entry.agendaIndex}-${entry.round}`
      if (!roundMap.has(key)) {
        roundMap.set(key, {
          agendaIndex: entry.agendaIndex,
          round: entry.round,
          entries: [],
        })
      }
      roundMap.get(key)!.entries.push({
        speaker: entry.speaker,
        department: entry.department,
        content: entry.content,
        timestamp: entry.timestamp,
        type: entry.speakerRole,
      })
    }
    // Sort by agendaIndex then round
    m.rounds = Array.from(roundMap.values()).sort(
      (a, b) => a.agendaIndex - b.agendaIndex || a.round - b.round
    )
  }

  // Normalize actionItems — may be objects or strings
  if (m.summary?.actionItems) {
    m.summary.actionItems = m.summary.actionItems.map((a: any) =>
      typeof a === 'string' ? a : a
    )
  }

  return m
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(ms: number | null): string {
  if (!ms) return '—'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

function statusColor(status: Meeting['status']): string {
  switch (status) {
    case 'completed': return 'var(--system-green)'
    case 'in_progress': return 'var(--system-blue)'
    case 'pending': return 'var(--system-orange)'
    case 'cancelled': return 'var(--system-red)'
    default: return 'var(--text-tertiary)'
  }
}

function statusLabel(status: Meeting['status']): string {
  switch (status) {
    case 'completed': return 'Completed'
    case 'in_progress': return 'In Progress'
    case 'pending': return 'Pending'
    case 'cancelled': return 'Cancelled'
    default: return status
  }
}

// Generate a consistent accent color per speaker name
const SPEAKER_COLORS = [
  'var(--system-blue)',
  'var(--system-purple)',
  'var(--system-orange)',
  'var(--system-green)',
  '#FF6B9D',
  '#00BCD4',
  '#8BC34A',
  '#FF7043',
]
const speakerColorCache: Record<string, string> = {}
function speakerColor(name: string): string {
  if (!speakerColorCache[name]) {
    const idx = Object.keys(speakerColorCache).length % SPEAKER_COLORS.length
    speakerColorCache[name] = SPEAKER_COLORS[idx]
  }
  return speakerColorCache[name]
}

// ---------------------------------------------------------------------------
// New Meeting Modal
// ---------------------------------------------------------------------------

interface NewMeetingModalProps {
  employees: Employee[]
  onClose: () => void
  onCreated: (meeting: Meeting) => void
}

function NewMeetingModal({ employees, onClose, onCreated }: NewMeetingModalProps) {
  const [title, setTitle] = useState('')
  const [agenda, setAgenda] = useState<AgendaItem[]>([{ topic: '' }])
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set())
  const [chair, setChair] = useState('')
  const [roundsPerTopic, setRoundsPerTopic] = useState(2)
  const [humanParticipant, setHumanParticipant] = useState(false)
  const [allowDebate, setAllowDebate] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedList = Array.from(selectedEmployees)

  // Auto-select first selected employee as chair
  useEffect(() => {
    if (selectedList.length > 0 && (!chair || !selectedList.includes(chair))) {
      setChair(selectedList[0])
    } else if (selectedList.length === 0) {
      setChair('')
    }
  }, [selectedList.join(',')])

  function toggleEmployee(name: string) {
    setSelectedEmployees(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function addAgendaItem() {
    setAgenda(prev => [...prev, { topic: '' }])
  }

  function removeAgendaItem(idx: number) {
    setAgenda(prev => prev.filter((_, i) => i !== idx))
  }

  function updateAgendaItem(idx: number, field: keyof AgendaItem, value: string) {
    setAgenda(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  async function handleSubmit() {
    if (!title.trim()) { setError('Please enter a meeting title.'); return }
    if (selectedList.length === 0) { setError('Please select at least one participant.'); return }
    if (!chair) { setError('Please select a chair.'); return }

    const validAgenda = agenda.filter(a => a.topic.trim())
    if (validAgenda.length === 0) { setError('Please add at least one agenda item.'); return }

    setSubmitting(true)
    setError(null)

    try {
      const config = {
        title: title.trim(),
        agenda: validAgenda,
        participants: selectedList.map(name => ({
          employeeName: name,
          role: name === chair ? 'chair' : 'participant',
        })) as Participant[],
        chair,
        settings: { roundsPerTopic, humanParticipant, allowDebate },
      }
      const meeting = normalizeMeeting(await api.createMeeting(config))
      onCreated(meeting)
    } catch (err: any) {
      setError(err.message || 'Failed to create meeting.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="animate-scale-in"
        style={{
          width: '100%',
          maxWidth: 600,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-overlay)',
          border: '1px solid var(--separator)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-5) var(--space-6)',
          borderBottom: '1px solid var(--separator)',
          flexShrink: 0,
        }}>
          <h2 style={{ fontSize: 'var(--text-title3)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', margin: 0 }}>
            New Meeting
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--fill-tertiary)', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 'var(--space-5) var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-footnote)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Meeting Title
            </label>
            <input
              className="apple-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
              placeholder="e.g. Q2 Strategy Review"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Agenda */}
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-footnote)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Agenda
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {agenda.map((item, idx) => (
                <div key={idx} style={{
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                  position: 'relative',
                }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 'var(--text-footnote)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-tertiary)', minWidth: 20, paddingTop: 2 }}>
                      {idx + 1}.
                    </span>
                    <input
                      className="apple-input"
                      style={{ flex: 1, padding: '8px 12px', fontSize: 'var(--text-footnote)' }}
                      placeholder="Topic"
                      value={item.topic}
                      onChange={e => updateAgendaItem(idx, 'topic', e.target.value)}
                    />
                    {agenda.length > 1 && (
                      <button
                        onClick={() => removeAgendaItem(idx)}
                        style={{
                          width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: 'var(--text-tertiary)', flexShrink: 0,
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', paddingLeft: 28 }}>
                    <input
                      className="apple-input"
                      style={{ flex: 1, padding: '6px 10px', fontSize: 'var(--text-caption1)' }}
                      placeholder="Description (optional)"
                      value={item.description || ''}
                      onChange={e => updateAgendaItem(idx, 'description', e.target.value)}
                    />
                    <input
                      className="apple-input"
                      style={{ flex: 1, padding: '6px 10px', fontSize: 'var(--text-caption1)' }}
                      placeholder="Goal (optional)"
                      value={item.goal || ''}
                      onChange={e => updateAgendaItem(idx, 'goal', e.target.value)}
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={addAgendaItem}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                  padding: 'var(--space-2) var(--space-3)',
                  background: 'var(--fill-quaternary)',
                  border: '1px dashed var(--separator)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer', color: 'var(--text-secondary)',
                  fontSize: 'var(--text-footnote)',
                  width: '100%', justifyContent: 'center',
                }}
              >
                <Plus size={14} />
                Add Agenda Item
              </button>
            </div>
          </div>

          {/* Participants */}
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-footnote)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Participants
            </label>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 'var(--space-2)',
            }}>
              {employees.map(emp => {
                const checked = selectedEmployees.has(emp.name)
                return (
                  <button
                    key={emp.name}
                    onClick={() => toggleEmployee(emp.name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${checked ? 'var(--accent)' : 'var(--separator)'}`,
                      background: checked ? 'var(--accent-fill)' : 'var(--fill-quaternary)',
                      cursor: 'pointer',
                      color: checked ? 'var(--accent)' : 'var(--text-secondary)',
                      fontSize: 'var(--text-footnote)',
                      fontWeight: checked ? 'var(--weight-semibold)' : 'var(--weight-regular)',
                      textAlign: 'left',
                      transition: 'all 150ms var(--ease-smooth)',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{emp.emoji || '🤖'}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {emp.displayName || emp.name}
                    </span>
                  </button>
                )
              })}
              {employees.length === 0 && (
                <div style={{ gridColumn: '1 / -1', color: 'var(--text-tertiary)', fontSize: 'var(--text-footnote)', padding: 'var(--space-3)' }}>
                  No employees found. Hire some first in the Organisation tab.
                </div>
              )}
            </div>
          </div>

          {/* Chair */}
          {selectedList.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-footnote)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Chair
              </label>
              <select
                className="apple-input"
                style={{ width: '100%' }}
                value={chair}
                onChange={e => setChair(e.target.value)}
              >
                {selectedList.map(name => {
                  const emp = employees.find(e => e.name === name)
                  return (
                    <option key={name} value={name}>
                      {emp?.displayName || name}
                    </option>
                  )
                })}
              </select>
            </div>
          )}

          {/* Settings */}
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-footnote)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Settings
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {/* Rounds */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 'var(--text-footnote)', color: 'var(--text-primary)' }}>Rounds per topic</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <button
                    onClick={() => setRoundsPerTopic(v => Math.max(1, v - 1))}
                    style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--fill-tertiary)', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}
                  >−</button>
                  <span style={{ fontSize: 'var(--text-footnote)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', minWidth: 16, textAlign: 'center' }}>{roundsPerTopic}</span>
                  <button
                    onClick={() => setRoundsPerTopic(v => Math.min(10, v + 1))}
                    style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: '1px solid var(--separator)', background: 'var(--fill-tertiary)', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}
                  >+</button>
                </div>
              </div>

              {/* Toggles */}
              {[
                { label: 'Human participant', value: humanParticipant, set: setHumanParticipant },
                { label: 'Allow debate', value: allowDebate, set: setAllowDebate },
              ].map(({ label, value, set }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 'var(--text-footnote)', color: 'var(--text-primary)' }}>{label}</span>
                  <button
                    onClick={() => set(!value)}
                    style={{
                      width: 44, height: 26, borderRadius: 13,
                      background: value ? 'var(--system-green)' : 'var(--fill-primary)',
                      border: 'none', cursor: 'pointer', position: 'relative',
                      transition: 'background 200ms var(--ease-smooth)',
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: 3, left: value ? 21 : 3,
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      transition: 'left 200ms var(--ease-spring)',
                    }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-4)',
              background: 'color-mix(in srgb, var(--system-red) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--system-red) 30%, transparent)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--system-red)',
              fontSize: 'var(--text-footnote)',
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: 'var(--space-4) var(--space-6)',
          borderTop: '1px solid var(--separator)',
          display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)',
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: 'var(--space-2) var(--space-5)',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--separator)',
              background: 'var(--fill-tertiary)', color: 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 'var(--text-footnote)', fontWeight: 'var(--weight-semibold)',
            }}
          >
            Cancel
          </button>
          <button
            className="apple-btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
            style={{ padding: 'var(--space-2) var(--space-5)', fontSize: 'var(--text-footnote)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            {submitting && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            Start Meeting
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Meeting List Sidebar
// ---------------------------------------------------------------------------

interface MeetingListProps {
  meetings: Meeting[]
  selectedId: string | null
  onSelect: (id: string) => void
  filter: 'all' | 'active' | 'completed'
  onFilterChange: (f: 'all' | 'active' | 'completed') => void
  onNewMeeting: () => void
}

function MeetingList({ meetings, selectedId, onSelect, filter, onFilterChange, onNewMeeting }: MeetingListProps) {
  const filtered = meetings.filter(m => {
    if (filter === 'active') return m.status === 'in_progress' || m.status === 'pending'
    if (filter === 'completed') return m.status === 'completed' || m.status === 'cancelled'
    return true
  })

  return (
    <div style={{
      width: 280,
      flexShrink: 0,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid var(--separator)',
      background: 'var(--bg-secondary)',
    }}>
      {/* Header */}
      <div style={{
        padding: 'var(--space-4)',
        borderBottom: '1px solid var(--separator)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <h1 style={{ fontSize: 'var(--text-subheadline)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', margin: 0 }}>
          Meetings
        </h1>
        <button
          onClick={onNewMeeting}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
            padding: 'var(--space-1) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent)', color: 'var(--accent-contrast)',
            border: 'none', cursor: 'pointer',
            fontSize: 'var(--text-caption1)', fontWeight: 'var(--weight-semibold)',
          }}
        >
          <Plus size={13} />
          New
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{
        display: 'flex',
        padding: 'var(--space-2) var(--space-3)',
        gap: 'var(--space-1)',
        borderBottom: '1px solid var(--separator)',
        flexShrink: 0,
      }}>
        {(['all', 'active', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            style={{
              padding: 'var(--space-1) var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              border: 'none', cursor: 'pointer',
              fontSize: 'var(--text-caption1)',
              fontWeight: filter === f ? 'var(--weight-semibold)' : 'var(--weight-regular)',
              background: filter === f ? 'var(--fill-secondary)' : 'transparent',
              color: filter === f ? 'var(--text-primary)' : 'var(--text-secondary)',
              transition: 'all 150ms var(--ease-smooth)',
              textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-footnote)' }}>
            No meetings yet
          </div>
        )}
        {filtered.map(m => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            style={{
              width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
              padding: 'var(--space-3) var(--space-4)',
              background: selectedId === m.id ? 'var(--accent-fill)' : 'transparent',
              borderLeft: `3px solid ${selectedId === m.id ? 'var(--accent)' : 'transparent'}`,
              display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
              transition: 'background 150ms var(--ease-smooth)',
            }}
            className="hover-bg"
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
              <span style={{
                fontSize: 'var(--text-footnote)', fontWeight: 'var(--weight-semibold)',
                color: selectedId === m.id ? 'var(--accent)' : 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
              }}>
                {m.title}
              </span>
              <span style={{
                fontSize: 'var(--text-caption2)', color: 'var(--text-tertiary)', flexShrink: 0,
              }}>
                {formatTime(m.createdAt)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{
                fontSize: 'var(--text-caption2)', fontWeight: 'var(--weight-semibold)',
                color: statusColor(m.status),
                background: `color-mix(in srgb, ${statusColor(m.status)} 12%, transparent)`,
                padding: '1px 6px', borderRadius: 4,
              }}>
                {statusLabel(m.status)}
              </span>
              {(m.participants?.length ?? 0) > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text-tertiary)', fontSize: 'var(--text-caption2)' }}>
                  <Users size={11} />
                  {m.participants!.length}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Message Bubble
// ---------------------------------------------------------------------------

function MessageBubble({ entry }: { entry: MeetingEntry }) {
  const color = speakerColor(entry.speaker)
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', padding: 'var(--space-1) 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        {/* Avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: `color-mix(in srgb, ${color} 20%, var(--bg-tertiary))`,
          border: `1.5px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 'var(--weight-semibold)', color: color,
        }}>
          {entry.speaker.charAt(0).toUpperCase()}
        </div>
        <span style={{ fontSize: 'var(--text-caption1)', fontWeight: 'var(--weight-semibold)', color }}>
          {entry.speaker}
        </span>
        {entry.department && (
          <span style={{
            fontSize: 'var(--text-caption2)',
            background: 'var(--fill-tertiary)',
            color: 'var(--text-tertiary)',
            padding: '1px 6px', borderRadius: 4,
          }}>
            {entry.department}
          </span>
        )}
        {entry.timestamp && (
          <span style={{ fontSize: 'var(--text-caption2)', color: 'var(--text-quaternary)', marginLeft: 'auto' }}>
            {formatTime(entry.timestamp)}
          </span>
        )}
      </div>
      <div style={{
        marginLeft: 36,
        padding: 'var(--space-3) var(--space-4)',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        borderTopLeftRadius: 4,
        fontSize: 'var(--text-footnote)',
        color: 'var(--text-primary)',
        lineHeight: 'var(--leading-relaxed)',
        border: '1px solid var(--separator)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {entry.content}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Round Divider
// ---------------------------------------------------------------------------

function RoundDivider({ agendaIndex, round, topicLabel }: { agendaIndex: number; round: number; topicLabel?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
      padding: 'var(--space-4) 0',
    }}>
      <div style={{ flex: 1, height: 1, background: 'var(--separator)' }} />
      <span style={{
        fontSize: 'var(--text-caption2)', fontWeight: 'var(--weight-semibold)',
        color: 'var(--text-tertiary)',
        background: 'var(--fill-tertiary)',
        padding: '2px 10px', borderRadius: 10,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        whiteSpace: 'nowrap',
      }}>
        {topicLabel ? `${topicLabel} — Round ${round}` : `Agenda ${agendaIndex + 1} · Round ${round}`}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--separator)' }} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Meeting Detail
// ---------------------------------------------------------------------------

interface MeetingDetailProps {
  meeting: Meeting
  onStop: () => void
  onDelete: () => void
  onContribute: (message: string) => Promise<void>
}

function MeetingDetail({ meeting, onStop, onDelete, onContribute }: MeetingDetailProps) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [detailTab, setDetailTab] = useState<'summary' | 'transcript'>(
    meeting.status === 'completed' && meeting.summary ? 'summary' : 'transcript'
  )
  const scrollRef = useRef<HTMLDivElement>(null)

  const isActive = meeting.status === 'in_progress' || meeting.status === 'pending'
  const awaitingHuman = meeting.status === 'in_progress' && (meeting.settings?.humanParticipant ?? false)
  const hasSummary = meeting.status === 'completed' && meeting.summary

  // Auto-switch to transcript for active meetings
  useEffect(() => {
    if (isActive) setDetailTab('transcript')
  }, [isActive])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [meeting.rounds, meeting.messages, detailTab])

  async function handleSend() {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      await onContribute(input.trim())
      setInput('')
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Flatten rounds into chronological messages
  const allMessages: Array<MeetingEntry & { _roundMeta?: { agendaIndex: number; round: number; topicLabel?: string; isFirst: boolean } }> = []
  if (meeting.rounds) {
    meeting.rounds.forEach(r => {
      const topicLabel = meeting.agenda?.[r.agendaIndex]?.topic
      allMessages.push({
        speaker: '__round_divider__',
        content: '',
        _roundMeta: {
          agendaIndex: r.agendaIndex,
          round: r.round,
          topicLabel,
          isFirst: r.round === 1,
        },
      })
      r.entries.forEach(e => allMessages.push(e))
    })
  }
  // Also handle flat messages array if backend returns that
  if (!meeting.rounds && meeting.messages) {
    meeting.messages.forEach(e => allMessages.push(e))
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: 'var(--space-4) var(--space-5)',
        borderBottom: '1px solid var(--separator)',
        display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
        flexShrink: 0,
        background: 'var(--bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <h2 style={{ fontSize: 'var(--text-subheadline)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', margin: 0 }}>
                {meeting.title}
              </h2>
              <span style={{
                fontSize: 'var(--text-caption2)', fontWeight: 'var(--weight-semibold)',
                color: statusColor(meeting.status),
                background: `color-mix(in srgb, ${statusColor(meeting.status)} 12%, transparent)`,
                padding: '2px 8px', borderRadius: 4,
              }}>
                {statusLabel(meeting.status)}
              </span>
            </div>
            {meeting.participants && meeting.participants.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
                <Users size={12} style={{ color: 'var(--text-tertiary)' }} />
                <span style={{ fontSize: 'var(--text-caption2)', color: 'var(--text-tertiary)' }}>
                  {meeting.participants.map(p => {
                    const label = p.role === 'chair' ? `${p.employeeName} (Chair)` : p.employeeName
                    return label
                  }).join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
            {isActive && (
              <button
                onClick={onStop}
                title="Stop meeting"
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                  padding: 'var(--space-1) var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid color-mix(in srgb, var(--system-red) 40%, transparent)',
                  background: 'color-mix(in srgb, var(--system-red) 12%, transparent)',
                  color: 'var(--system-red)', cursor: 'pointer',
                  fontSize: 'var(--text-caption1)', fontWeight: 'var(--weight-semibold)',
                }}
              >
                <StopCircle size={13} />
                Stop
              </button>
            )}
            <button
              onClick={onDelete}
              title="Delete meeting"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--separator)',
                background: 'var(--fill-quaternary)',
                color: 'var(--text-tertiary)', cursor: 'pointer',
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Agenda pills */}
        {meeting.agenda && meeting.agenda.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {meeting.agenda.map((item, idx) => (
              <span key={idx} style={{
                fontSize: 'var(--text-caption2)', color: 'var(--text-secondary)',
                background: 'var(--fill-tertiary)',
                padding: '2px 8px', borderRadius: 10,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <ChevronRight size={10} />
                {item.topic}
              </span>
            ))}
          </div>
        )}

        {/* Summary / Transcript tab toggle — only show for completed meetings with summaries */}
        {hasSummary && (
          <div style={{ display: 'flex', gap: 'var(--space-1)', background: 'var(--fill-tertiary)', borderRadius: 'var(--radius-sm)', padding: 2, alignSelf: 'flex-start', marginTop: 'var(--space-1)' }}>
            {(['summary', 'transcript'] as const).map(key => (
              <button
                key={key}
                onClick={() => setDetailTab(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: 'var(--space-1) var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none', cursor: 'pointer',
                  fontSize: 'var(--text-caption1)',
                  fontWeight: detailTab === key ? 'var(--weight-semibold)' : 'var(--weight-regular)',
                  background: detailTab === key ? 'var(--bg)' : 'transparent',
                  color: detailTab === key ? 'var(--text-primary)' : 'var(--text-secondary)',
                  transition: 'all 150ms var(--ease-smooth)',
                  boxShadow: detailTab === key ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  textTransform: 'capitalize',
                }}
              >
                {key === 'summary' && <CheckCircle2 size={12} />}
                {key === 'transcript' && <Users size={12} />}
                {key === 'summary' ? 'Outcome' : 'Conversation'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary tab content */}
      {detailTab === 'summary' && hasSummary && (
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: 'var(--space-5)',
          background: 'color-mix(in srgb, var(--system-green) 4%, var(--bg))',
        }}>
          {meeting.summary!.summary && (
            <p style={{ fontSize: 'var(--text-footnote)', color: 'var(--text-secondary)', margin: '0 0 var(--space-4)', lineHeight: 'var(--leading-relaxed)' }}>
              {meeting.summary!.summary}
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-5)' }}>
            {meeting.summary!.decisions && meeting.summary!.decisions.length > 0 && (
              <div>
                <div style={{ fontSize: 'var(--text-caption2)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                  Decisions
                </div>
                {meeting.summary!.decisions.map((d, i) => (
                  <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', fontSize: 'var(--text-caption1)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)', lineHeight: 'var(--leading-relaxed)' }}>
                    <span style={{ color: 'var(--system-green)', flexShrink: 0, marginTop: 2 }}>✓</span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            )}

            {meeting.summary!.actionItems && meeting.summary!.actionItems.length > 0 && (
              <div>
                <div style={{ fontSize: 'var(--text-caption2)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                  Action Items
                </div>
                {meeting.summary!.actionItems.map((a, i) => (
                  <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', fontSize: 'var(--text-caption1)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)', lineHeight: 'var(--leading-relaxed)' }}>
                    <span style={{ color: 'var(--system-blue)', flexShrink: 0, marginTop: 2 }}>→</span>
                    <span>{typeof a === 'string'
                      ? a
                      : `${a.description}${a.assignee ? ` — ${a.assignee}` : ''}${a.priority ? ` (${a.priority})` : ''}`}</span>
                  </div>
                ))}
              </div>
            )}

            {meeting.summary!.keyPoints && meeting.summary!.keyPoints.length > 0 && (
              <div>
                <div style={{ fontSize: 'var(--text-caption2)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                  Key Points
                </div>
                {meeting.summary!.keyPoints.map((k, i) => (
                  <div key={i} style={{ display: 'flex', gap: 'var(--space-2)', fontSize: 'var(--text-caption1)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)', lineHeight: 'var(--leading-relaxed)' }}>
                    <span style={{ color: 'var(--system-purple)', flexShrink: 0, marginTop: 2 }}>•</span>
                    <span>{k}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transcript tab content */}
      {(detailTab === 'transcript' || !hasSummary) && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: 'var(--space-4) var(--space-5)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {allMessages.length === 0 && (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-tertiary)', fontSize: 'var(--text-footnote)',
              }}>
                {meeting.status === 'pending' ? 'Meeting is starting…' : 'No transcript yet'}
              </div>
            )}

            {allMessages.map((entry, idx) => {
              if (entry.speaker === '__round_divider__' && entry._roundMeta) {
                return (
                  <RoundDivider
                    key={`divider-${idx}`}
                    agendaIndex={entry._roundMeta.agendaIndex}
                    round={entry._roundMeta.round}
                    topicLabel={entry._roundMeta.topicLabel}
                  />
                )
              }
              return <MessageBubble key={idx} entry={entry} />
            })}

            {/* Active indicator */}
            {isActive && allMessages.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3) 0' }}>
                <div style={{ width: 28, height: 28 }} />
                <div style={{ display: 'flex', gap: 4 }}>
                  <span className="typing-dot" style={{ animationDelay: '0ms' }} />
                  <span className="typing-dot" style={{ animationDelay: '150ms' }} />
                  <span className="typing-dot" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Human input */}
          {awaitingHuman && (
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              borderTop: '1px solid var(--separator)',
              display: 'flex', gap: 'var(--space-2)',
              background: 'var(--bg)',
              flexShrink: 0,
            }}>
              <textarea
                style={{
                  flex: 1,
                  background: 'var(--fill-tertiary)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                  fontSize: 'var(--text-footnote)',
                  color: 'var(--text-primary)',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 'var(--leading-normal)',
                  minHeight: 38,
                  maxHeight: 120,
                  fontFamily: 'inherit',
                }}
                placeholder="Add your contribution…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                style={{
                  width: 38, height: 38, borderRadius: 'var(--radius-md)',
                  background: input.trim() ? 'var(--accent)' : 'var(--fill-secondary)',
                  border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: input.trim() ? 'var(--accent-contrast)' : 'var(--text-tertiary)',
                  flexShrink: 0,
                  transition: 'all 150ms var(--ease-smooth)',
                }}
              >
                {sending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Meeting Log
// ---------------------------------------------------------------------------

function logStatusColor(status: MeetingLogEntry['status']): string {
  switch (status) {
    case 'completed': return 'var(--system-green)'
    case 'in_progress': return 'var(--system-blue)'
    case 'cancelled': return 'var(--system-red)'
    default: return 'var(--text-tertiary)'
  }
}

function MeetingLog() {
  const [entries, setEntries] = useState<MeetingLogEntry[]>([])
  const [stats, setStats] = useState<MeetingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filters
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [calledByFilter, setCalledByFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')

  const callers = Array.from(new Set(entries.map(e => e.calledBy))).sort()
  const departments = Array.from(new Set(entries.flatMap(e => e.departments))).sort()

  const loadLog = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params: Record<string, string> = {}
      if (fromDate) params.from = fromDate
      if (toDate) params.to = toDate
      if (calledByFilter) params.calledBy = calledByFilter
      if (deptFilter) params.department = deptFilter
      const data = await api.getMeetingLog(params)
      setEntries(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load meeting log.')
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, calledByFilter, deptFilter])

  useEffect(() => {
    api.getMeetingStats().then(setStats).catch(() => {})
  }, [])

  useEffect(() => {
    loadLog()
  }, [loadLog])

  // Meetings this week
  const thisWeekCount = entries.filter(e => {
    const d = new Date(e.timestamp)
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    return d >= weekStart
  }).length

  const mostActiveCaller = stats?.employeeStats?.[0]?.employee ?? '—'

  const inputStyle: React.CSSProperties = {
    background: 'var(--fill-tertiary)',
    border: '1px solid var(--separator)',
    borderRadius: 'var(--radius-sm)',
    padding: 'var(--space-1) var(--space-2)',
    fontSize: 'var(--text-caption1)',
    color: 'var(--text-primary)',
    outline: 'none',
  }

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    minWidth: 120,
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Stats bar */}
      <div style={{
        padding: 'var(--space-4) var(--space-5)',
        borderBottom: '1px solid var(--separator)',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'var(--space-3)',
        flexShrink: 0,
        background: 'var(--bg-secondary)',
      }}>
        {[
          { label: 'Total Logged', value: stats?.globalCount ?? entries.length },
          { label: 'This Week', value: thisWeekCount },
          { label: 'Most Active Caller', value: mostActiveCaller },
          { label: 'Showing', value: entries.length },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: 'var(--bg)',
            border: '1px solid var(--separator)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3)',
          }}>
            <div style={{ fontSize: 'var(--text-caption2)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>
              {label}
            </div>
            <div style={{ fontSize: 'var(--text-subheadline)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{
        padding: 'var(--space-3) var(--space-5)',
        borderBottom: '1px solid var(--separator)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        flexShrink: 0,
        background: 'var(--bg-secondary)',
        flexWrap: 'wrap',
      }}>
        <Filter size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-caption1)', color: 'var(--text-secondary)' }}>
          From
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-caption1)', color: 'var(--text-secondary)' }}>
          To
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inputStyle} />
        </label>
        <select value={calledByFilter} onChange={e => setCalledByFilter(e.target.value)} style={selectStyle}>
          <option value="">All callers</option>
          {callers.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} style={selectStyle}>
          <option value="">All departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        {(fromDate || toDate || calledByFilter || deptFilter) && (
          <button
            onClick={() => { setFromDate(''); setToDate(''); setCalledByFilter(''); setDeptFilter('') }}
            style={{
              fontSize: 'var(--text-caption1)', color: 'var(--text-tertiary)', background: 'none',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', fontSize: 'var(--text-footnote)', gap: 8 }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Loading log…
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 'var(--space-3)' }}>
            <div style={{ padding: 'var(--space-3) var(--space-5)', background: 'color-mix(in srgb, var(--system-red) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--system-red) 30%, transparent)', borderRadius: 'var(--radius-md)', color: 'var(--system-red)', fontSize: 'var(--text-footnote)' }}>
              {error}
            </div>
            <button onClick={loadLog} style={{ padding: 'var(--space-2) var(--space-4)', background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 'var(--text-footnote)', fontWeight: 'var(--weight-semibold)' }}>
              Retry
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', fontSize: 'var(--text-footnote)' }}>
            No logged meetings found
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-footnote)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 1 }}>
                {['Title', 'Called By', 'Participants', 'Departments', 'Duration', 'Status', 'Date', ''].map(h => (
                  <th key={h} style={{
                    padding: 'var(--space-2) var(--space-3)',
                    textAlign: 'left',
                    fontSize: 'var(--text-caption2)',
                    fontWeight: 'var(--weight-semibold)',
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid var(--separator)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => {
                const isExpanded = expandedId === entry.meetingId
                return (
                  <>
                    <tr
                      key={entry.meetingId}
                      onClick={() => setExpandedId(isExpanded ? null : entry.meetingId)}
                      style={{
                        borderBottom: isExpanded ? 'none' : '1px solid var(--separator)',
                        cursor: 'pointer',
                        background: isExpanded ? 'color-mix(in srgb, var(--accent) 4%, var(--bg))' : 'var(--bg)',
                        transition: 'background 150ms var(--ease-smooth)',
                      }}
                      className="hover-bg"
                    >
                      <td style={{ padding: 'var(--space-3)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.title}
                      </td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {entry.calledBy}
                      </td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={12} />
                          {entry.participants.length}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--text-tertiary)', fontSize: 'var(--text-caption1)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.departments.join(', ') || '—'}
                      </td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={12} />
                          {formatDuration(entry.durationMs)}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <span style={{
                          fontSize: 'var(--text-caption2)',
                          fontWeight: 'var(--weight-semibold)',
                          color: logStatusColor(entry.status),
                          background: `color-mix(in srgb, ${logStatusColor(entry.status)} 12%, transparent)`,
                          padding: '2px 7px',
                          borderRadius: 4,
                          whiteSpace: 'nowrap',
                        }}>
                          {entry.status === 'in_progress' ? 'In Progress' : entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--text-tertiary)', fontSize: 'var(--text-caption1)', whiteSpace: 'nowrap' }}>
                        {new Date(entry.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ padding: 'var(--space-3)', color: 'var(--text-tertiary)' }}>
                        <ChevronDown size={14} style={{ transition: 'transform 200ms', transform: isExpanded ? 'rotate(180deg)' : 'none' }} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${entry.meetingId}-detail`} style={{ borderBottom: '1px solid var(--separator)' }}>
                        <td colSpan={8} style={{ padding: '0 var(--space-3) var(--space-4)', background: 'color-mix(in srgb, var(--accent) 4%, var(--bg))' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', paddingTop: 'var(--space-3)' }}>
                            {/* Participants */}
                            {entry.participants.length > 0 && (
                              <div>
                                <div style={{ fontSize: 'var(--text-caption2)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                                  Participants
                                </div>
                                {entry.participants.map((p, i) => (
                                  <div key={i} style={{ fontSize: 'var(--text-caption1)', color: 'var(--text-secondary)', marginBottom: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ color: 'var(--text-quaternary)' }}>·</span> {p}
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Agenda */}
                            {entry.agenda.length > 0 && (
                              <div>
                                <div style={{ fontSize: 'var(--text-caption2)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                                  Agenda
                                </div>
                                {entry.agenda.map((a, i) => (
                                  <div key={i} style={{ fontSize: 'var(--text-caption1)', color: 'var(--text-secondary)', marginBottom: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ color: 'var(--text-quaternary)', flexShrink: 0 }}>{i + 1}.</span> {a}
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Decisions */}
                            {entry.decisions.length > 0 && (
                              <div>
                                <div style={{ fontSize: 'var(--text-caption2)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                                  Decisions
                                </div>
                                {entry.decisions.map((d, i) => (
                                  <div key={i} style={{ fontSize: 'var(--text-caption1)', color: 'var(--text-primary)', marginBottom: 'var(--space-1)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                    <span style={{ color: 'var(--system-green)', flexShrink: 0 }}>✓</span> {d}
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Action Items */}
                            {entry.actionItems.length > 0 && (
                              <div>
                                <div style={{ fontSize: 'var(--text-caption2)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                                  Action Items
                                </div>
                                {entry.actionItems.map((ai, i) => (
                                  <div key={i} style={{ fontSize: 'var(--text-caption1)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 2 }}>
                                      <span style={{ color: 'var(--system-blue)', flexShrink: 0 }}>→</span>
                                      {ai.description}
                                    </div>
                                    <div style={{ marginLeft: 18, fontSize: 'var(--text-caption2)', color: 'var(--text-tertiary)' }}>
                                      {ai.assignee} · {ai.priority}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {/* Outcome summary */}
                          {entry.outcomeSummary && (
                            <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'color-mix(in srgb, var(--system-green) 6%, var(--bg))', borderRadius: 'var(--radius-md)', border: '1px solid color-mix(in srgb, var(--system-green) 20%, transparent)' }}>
                              <div style={{ fontSize: 'var(--text-caption2)', fontWeight: 'var(--weight-semibold)', color: 'var(--system-green)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                                Outcome Summary
                              </div>
                              <p style={{ fontSize: 'var(--text-footnote)', color: 'var(--text-secondary)', margin: 0, lineHeight: 'var(--leading-relaxed)' }}>
                                {entry.outcomeSummary}
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MeetingsPage() {
  const { settings } = useSettings()
  const [tab, setTab] = useState<'meetings' | 'log'>('meetings')
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [showModal, setShowModal] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [error, setError] = useState<string | null>(null)
  const { subscribe } = useGateway()
  const selectedIdRef = useRef<string | null>(null)

  // Keep ref in sync
  useEffect(() => { selectedIdRef.current = selectedId }, [selectedId])

  // Load employees for new meeting modal
  useEffect(() => {
    api.getOrg().then(async (data: OrgData) => {
      const details = await Promise.all(
        data.employees.map(async (emp) => {
          try { return await api.getEmployee(emp.name) }
          catch { return { name: emp.name, displayName: emp.displayName || emp.name, department: emp.department || '', rank: emp.rank || 'employee', engine: emp.engine || 'unknown', model: emp.model || 'unknown', persona: emp.persona || '' } as Employee }
        })
      )
      setEmployees(details)
    }).catch(() => {})
  }, [])

  // Load meetings list
  const loadMeetings = useCallback(async () => {
    try {
      setError(null)
      const data = await api.getMeetings()
      const normalized = data.map(normalizeMeeting)
      const sorted = [...normalized].sort((a, b) => {
        const aTime = a.updatedAt || a.createdAt || ''
        const bTime = b.updatedAt || b.createdAt || ''
        return bTime.localeCompare(aTime)
      })
      setMeetings(sorted)
    } catch (err: any) {
      setError(err.message || 'Failed to load meetings.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMeetings()
  }, [loadMeetings])

  // Load selected meeting detail
  const loadMeeting = useCallback(async (id: string) => {
    try {
      const data = await api.getMeeting(id)
      setSelectedMeeting(normalizeMeeting(data))
    } catch (err: any) {
      console.error('Failed to load meeting:', err)
    }
  }, [])

  useEffect(() => {
    if (selectedId) {
      loadMeeting(selectedId)
    } else {
      setSelectedMeeting(null)
    }
  }, [selectedId, loadMeeting])

  // WebSocket — listen for meeting events
  useEffect(() => {
    return subscribe((event, payload) => {
      const p = payload as Record<string, unknown>
      const meetingId = String(p.meetingId || '')

      if (event === 'meeting:created') {
        // Reload list
        loadMeetings()
      }

      if (event === 'meeting:round_complete') {
        // Append round entries to selected meeting
        if (meetingId === selectedIdRef.current) {
          const entries = (p.entries as MeetingEntry[]) || []
          const round: MeetingRound = {
            agendaIndex: Number(p.agendaIndex ?? 0),
            round: Number(p.round ?? 1),
            entries,
          }
          setSelectedMeeting(prev => {
            if (!prev) return prev
            return {
              ...prev,
              rounds: [...(prev.rounds ?? []), round],
              status: 'in_progress',
            }
          })
        }
        // Update status in list
        setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, status: 'in_progress' } : m))
      }

      if (event === 'meeting:awaiting_human') {
        if (meetingId === selectedIdRef.current) {
          setSelectedMeeting(prev => prev ? { ...prev, status: 'in_progress' } : prev)
        }
      }

      if (event === 'meeting:completed') {
        const summary = p.summary as MeetingSummary | undefined
        if (meetingId === selectedIdRef.current) {
          setSelectedMeeting(prev => prev ? { ...prev, status: 'completed', summary: summary ?? prev.summary } : prev)
        }
        setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, status: 'completed' } : m))
      }

      if (event === 'meeting:cancelled') {
        if (meetingId === selectedIdRef.current) {
          setSelectedMeeting(prev => prev ? { ...prev, status: 'cancelled' } : prev)
        }
        setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, status: 'cancelled' } : m))
      }

      if (event === 'meeting:error') {
        if (meetingId === selectedIdRef.current) {
          setSelectedMeeting(prev => prev ? { ...prev, status: 'cancelled' } : prev)
        }
        setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, status: 'cancelled' } : m))
      }

      if (event === 'meeting:human_contribution') {
        if (meetingId === selectedIdRef.current) {
          const entry = p.entry as MeetingEntry | undefined
          if (entry) {
            setSelectedMeeting(prev => {
              if (!prev) return prev
              // Append to last round if available, otherwise add to messages
              if (prev.rounds && prev.rounds.length > 0) {
                const rounds = [...prev.rounds]
                const lastRound = { ...rounds[rounds.length - 1] }
                lastRound.entries = [...lastRound.entries, entry]
                rounds[rounds.length - 1] = lastRound
                return { ...prev, rounds }
              }
              return { ...prev, messages: [...(prev.messages ?? []), entry] }
            })
          }
        }
      }
    })
  }, [subscribe, loadMeetings])

  async function handleStop() {
    if (!selectedId) return
    try {
      await api.stopMeeting(selectedId)
      setSelectedMeeting(prev => prev ? { ...prev, status: 'cancelled' } : prev)
      setMeetings(prev => prev.map(m => m.id === selectedId ? { ...m, status: 'cancelled' } : m))
    } catch (err: any) {
      console.error('Failed to stop meeting:', err)
    }
  }

  async function handleDelete() {
    if (!selectedId) return
    try {
      await api.deleteMeeting(selectedId)
      setMeetings(prev => prev.filter(m => m.id !== selectedId))
      setSelectedId(null)
      setSelectedMeeting(null)
    } catch (err: any) {
      console.error('Failed to delete meeting:', err)
    }
  }

  async function handleContribute(message: string) {
    if (!selectedId) return
    await api.contributeMeeting(selectedId, message)
  }

  function handleCreated(meeting: Meeting) {
    setShowModal(false)
    setMeetings(prev => [meeting, ...prev])
    setSelectedId(meeting.id)
  }

  return (
    <PageLayout>
      <div style={{
        display: 'flex',
        flex: 1,
        minHeight: 0,
        background: 'var(--bg)',
        position: 'relative',
      }}>
        {/* Sidebar — always visible */}
        <div style={{
          width: 280,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--separator)',
          background: 'var(--bg-secondary)',
          overflow: 'hidden',
        }}>
          {/* Header with tab toggle */}
          <div style={{
            padding: 'var(--space-4)',
            borderBottom: '1px solid var(--separator)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            {/* Tab toggle */}
            <div style={{ display: 'flex', gap: 'var(--space-1)', background: 'var(--fill-tertiary)', borderRadius: 'var(--radius-sm)', padding: 2 }}>
              {(['meetings', 'log'] as const).map(key => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: 'var(--space-1) var(--space-2)',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none', cursor: 'pointer',
                    fontSize: 'var(--text-caption1)',
                    fontWeight: tab === key ? 'var(--weight-semibold)' : 'var(--weight-regular)',
                    background: tab === key ? 'var(--bg)' : 'transparent',
                    color: tab === key ? 'var(--text-primary)' : 'var(--text-secondary)',
                    transition: 'all 150ms var(--ease-smooth)',
                    boxShadow: tab === key ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {key === 'log' && <BarChart2 size={12} />}
                  {key === 'meetings' ? 'Meetings' : 'Log'}
                </button>
              ))}
            </div>

            {tab === 'meetings' && (
              <button
                onClick={() => setShowModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                  padding: 'var(--space-1) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent)', color: 'var(--accent-contrast)',
                  border: 'none', cursor: 'pointer',
                  fontSize: 'var(--text-caption1)', fontWeight: 'var(--weight-semibold)',
                }}
              >
                <Plus size={13} />
                New
              </button>
            )}
          </div>

          {tab === 'meetings' && (
            <>
              {/* Filter tabs */}
              <div style={{
                display: 'flex',
                padding: 'var(--space-2) var(--space-3)',
                gap: 'var(--space-1)',
                borderBottom: '1px solid var(--separator)',
                flexShrink: 0,
              }}>
                {(['all', 'active', 'completed'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      padding: 'var(--space-1) var(--space-3)',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none', cursor: 'pointer',
                      fontSize: 'var(--text-caption1)',
                      fontWeight: filter === f ? 'var(--weight-semibold)' : 'var(--weight-regular)',
                      background: filter === f ? 'var(--fill-secondary)' : 'transparent',
                      color: filter === f ? 'var(--text-primary)' : 'var(--text-secondary)',
                      transition: 'all 150ms var(--ease-smooth)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Meetings list */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {meetings.filter(m => {
                  if (filter === 'active') return m.status === 'in_progress' || m.status === 'pending'
                  if (filter === 'completed') return m.status === 'completed' || m.status === 'cancelled'
                  return true
                }).length === 0 && (
                  <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-footnote)' }}>
                    No meetings yet
                  </div>
                )}
                {meetings.filter(m => {
                  if (filter === 'active') return m.status === 'in_progress' || m.status === 'pending'
                  if (filter === 'completed') return m.status === 'completed' || m.status === 'cancelled'
                  return true
                }).map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    style={{
                      width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                      padding: 'var(--space-3) var(--space-4)',
                      background: selectedId === m.id ? 'var(--accent-fill)' : 'transparent',
                      borderLeft: `3px solid ${selectedId === m.id ? 'var(--accent)' : 'transparent'}`,
                      display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
                      transition: 'background 150ms var(--ease-smooth)',
                    }}
                    className="hover-bg"
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                      <span style={{
                        fontSize: 'var(--text-footnote)', fontWeight: 'var(--weight-semibold)',
                        color: selectedId === m.id ? 'var(--accent)' : 'var(--text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                      }}>
                        {m.title}
                      </span>
                      <span style={{ fontSize: 'var(--text-caption2)', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                        {formatTime(m.createdAt)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span style={{
                        fontSize: 'var(--text-caption2)', fontWeight: 'var(--weight-semibold)',
                        color: statusColor(m.status),
                        background: `color-mix(in srgb, ${statusColor(m.status)} 12%, transparent)`,
                        padding: '1px 6px', borderRadius: 4,
                      }}>
                        {statusLabel(m.status)}
                      </span>
                      {(m.participants?.length ?? 0) > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text-tertiary)', fontSize: 'var(--text-caption2)' }}>
                          <Users size={11} />
                          {m.participants!.length}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === 'log' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-footnote)', padding: 'var(--space-5)', textAlign: 'center' }}>
              Meeting history is shown in the main panel
            </div>
          )}
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {tab === 'log' ? (
            <MeetingLog />
          ) : loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-footnote)' }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} />
              Loading meetings…
            </div>
          ) : error ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)' }}>
              <div style={{
                padding: 'var(--space-3) var(--space-5)',
                background: 'color-mix(in srgb, var(--system-red) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--system-red) 30%, transparent)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--system-red)', fontSize: 'var(--text-footnote)',
              }}>
                {error}
              </div>
              <button
                onClick={loadMeetings}
                style={{
                  padding: 'var(--space-2) var(--space-4)',
                  borderRadius: 'var(--radius-md)', background: 'var(--accent)',
                  color: 'var(--accent-contrast)', border: 'none', cursor: 'pointer',
                  fontSize: 'var(--text-footnote)', fontWeight: 'var(--weight-semibold)',
                }}
              >
                Retry
              </button>
            </div>
          ) : !selectedMeeting ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-4)', color: 'var(--text-tertiary)' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 'var(--radius-xl)',
                background: 'var(--fill-quaternary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Users size={28} style={{ color: 'var(--text-quaternary)' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 'var(--text-subheadline)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-secondary)', margin: '0 0 var(--space-2)' }}>
                  Select a meeting or start a new one
                </p>
                <p style={{ fontSize: 'var(--text-footnote)', color: 'var(--text-tertiary)', margin: 0 }}>
                  Meetings let your AI employees discuss, decide, and collaborate.
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                  padding: 'var(--space-2) var(--space-5)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent)', color: 'var(--accent-contrast)',
                  border: 'none', cursor: 'pointer',
                  fontSize: 'var(--text-footnote)', fontWeight: 'var(--weight-semibold)',
                }}
              >
                <Plus size={15} />
                New Meeting
              </button>
            </div>
          ) : (
            <MeetingDetail
              meeting={selectedMeeting}
              onStop={handleStop}
              onDelete={handleDelete}
              onContribute={handleContribute}
            />
          )}
        </div>
      </div>

      {/* New meeting modal */}
      {showModal && (
        <NewMeetingModal
          employees={employees}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </PageLayout>
  )
}
