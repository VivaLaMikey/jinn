"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { Employee } from "@/lib/api";
import { EmployeeAvatar } from "@/components/ui/employee-avatar";
import { useSettings } from "@/app/settings-provider";
import { emojiForName } from "@/lib/emoji-pool";
import { EmojiPicker } from "@/components/ui/emoji-picker";

interface SessionData {
  id: string;
  employee?: string | null;
  status?: string;
  createdAt?: string;
  source?: string;
  [key: string]: unknown;
}

function RankBadge({ rank }: { rank: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    executive: {
      bg: "color-mix(in srgb, var(--system-purple) 15%, transparent)",
      text: "var(--system-purple)",
    },
    manager: {
      bg: "color-mix(in srgb, var(--system-blue) 15%, transparent)",
      text: "var(--system-blue)",
    },
    senior: {
      bg: "color-mix(in srgb, var(--system-green) 15%, transparent)",
      text: "var(--system-green)",
    },
    employee: {
      bg: "var(--fill-tertiary)",
      text: "var(--text-tertiary)",
    },
  };
  const c = colors[rank] || colors.employee;

  return (
    <span
      className="text-[length:var(--text-caption2)] font-[var(--weight-semibold)] px-[10px] py-[2px] rounded-[10px] uppercase tracking-[0.02em]"
      style={{ color: c.text, background: c.bg }}
    >
      {rank}
    </span>
  );
}

function PipSection({ name, isExecutive }: { name: string; isExecutive: boolean }) {
  const [pip, setPip] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ reason: '', expectations: '', reviewDate: '' })
  const [saving, setSaving] = useState(false)

  const fetchPip = useCallback(async () => {
    try {
      const data = await api.getPip(name)
      setPip(data)
    } catch { setPip(null) }
    finally { setLoading(false) }
  }, [name])

  useEffect(() => { fetchPip() }, [fetchPip])

  const handleCreate = async () => {
    if (!formData.reason) return
    setSaving(true)
    try {
      const created = await api.createPip(name, formData)
      setPip(created)
      setShowForm(false)
      setFormData({ reason: '', expectations: '', reviewDate: '' })
    } catch { }
    finally { setSaving(false) }
  }

  const handleStatusChange = async (status: string) => {
    setSaving(true)
    try {
      const updated = await api.updatePip(name, { status })
      setPip(updated)
    } catch { }
    finally { setSaving(false) }
  }

  const handleExtend = async () => {
    const newDate = prompt('New review date (YYYY-MM-DD):')
    if (!newDate) return
    setSaving(true)
    try {
      const updated = await api.updatePip(name, { reviewDate: newDate, status: 'extended' })
      setPip(updated)
    } catch { }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm('Remove this PIP entirely?')) return
    setSaving(true)
    try {
      await api.deletePip(name)
      setPip(null)
    } catch { }
    finally { setSaving(false) }
  }

  if (loading) return null
  if (isExecutive) return null

  const statusColors: Record<string, { bg: string; text: string }> = {
    active: { bg: 'color-mix(in srgb, var(--system-orange, #f59e0b) 15%, transparent)', text: 'var(--system-orange, #f59e0b)' },
    completed: { bg: 'color-mix(in srgb, var(--system-green) 15%, transparent)', text: 'var(--system-green)' },
    extended: { bg: 'color-mix(in srgb, var(--system-orange, #f59e0b) 15%, transparent)', text: 'var(--system-orange, #f59e0b)' },
    terminated: { bg: 'color-mix(in srgb, var(--system-red) 15%, transparent)', text: 'var(--system-red)' },
  }

  const outcomeColors: Record<string, { bg: string; text: string }> = {
    pass: { bg: 'color-mix(in srgb, var(--system-green) 15%, transparent)', text: 'var(--system-green)' },
    fail: { bg: 'color-mix(in srgb, var(--system-red) 15%, transparent)', text: 'var(--system-red)' },
    partial: { bg: 'color-mix(in srgb, var(--system-orange, #f59e0b) 15%, transparent)', text: 'var(--system-orange, #f59e0b)' },
  }

  if (!pip) {
    return (
      <div>
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="text-[length:var(--text-caption1)] text-[var(--text-tertiary)] bg-none border border-dashed border-[var(--separator)] rounded-[var(--radius-md,12px)] px-[var(--space-4)] py-[var(--space-3)] cursor-pointer w-full hover:border-[var(--system-orange,#f59e0b)] hover:text-[var(--system-orange,#f59e0b)] transition-colors"
          >
            + Create Performance Improvement Plan
          </button>
        ) : (
          <div className="rounded-[var(--radius-lg,16px)] border border-[var(--separator)] bg-[var(--material-regular)] p-[var(--space-5)]">
            <h3 className="text-[length:var(--text-body)] font-[var(--weight-semibold)] text-[var(--text-primary)] mb-[var(--space-4)] mt-0">Create PIP</h3>
            <div className="flex flex-col gap-[var(--space-3)]">
              <div>
                <label className="text-[length:var(--text-caption2)] font-[var(--weight-semibold)] uppercase tracking-[var(--tracking-wide)] text-[var(--text-tertiary)] mb-[var(--space-1)] block">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={e => setFormData(d => ({ ...d, reason: e.target.value }))}
                  className="w-full rounded-[var(--radius-md,12px)] border border-[var(--separator)] bg-[var(--bg)] px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-body)] text-[var(--text-primary)] resize-none"
                  rows={2}
                  placeholder="Why is this PIP being created?"
                />
              </div>
              <div>
                <label className="text-[length:var(--text-caption2)] font-[var(--weight-semibold)] uppercase tracking-[var(--tracking-wide)] text-[var(--text-tertiary)] mb-[var(--space-1)] block">Expectations</label>
                <textarea
                  value={formData.expectations}
                  onChange={e => setFormData(d => ({ ...d, expectations: e.target.value }))}
                  className="w-full rounded-[var(--radius-md,12px)] border border-[var(--separator)] bg-[var(--bg)] px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-body)] text-[var(--text-primary)] resize-none"
                  rows={2}
                  placeholder="What must improve?"
                />
              </div>
              <div>
                <label className="text-[length:var(--text-caption2)] font-[var(--weight-semibold)] uppercase tracking-[var(--tracking-wide)] text-[var(--text-tertiary)] mb-[var(--space-1)] block">Review Date</label>
                <input
                  type="date"
                  value={formData.reviewDate}
                  onChange={e => setFormData(d => ({ ...d, reviewDate: e.target.value }))}
                  className="w-full rounded-[var(--radius-md,12px)] border border-[var(--separator)] bg-[var(--bg)] px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-body)] text-[var(--text-primary)]"
                />
              </div>
              <div className="flex gap-[var(--space-2)] justify-end mt-[var(--space-2)]">
                <button onClick={() => setShowForm(false)} className="px-[var(--space-3)] py-[var(--space-2)] rounded-[var(--radius-md,12px)] border border-[var(--separator)] bg-transparent text-[var(--text-secondary)] text-[length:var(--text-caption1)] cursor-pointer">Cancel</button>
                <button onClick={handleCreate} disabled={saving || !formData.reason} className="px-[var(--space-3)] py-[var(--space-2)] rounded-[var(--radius-md,12px)] border-none bg-[var(--system-orange,#f59e0b)] text-white text-[length:var(--text-caption1)] cursor-pointer disabled:opacity-50">
                  {saving ? 'Creating...' : 'Create PIP'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const sc = statusColors[pip.status] || statusColors.active

  return (
    <div className="rounded-[var(--radius-lg,16px)] border border-[var(--separator)] bg-[var(--material-regular)] p-[var(--space-5)]" style={{ borderColor: sc.text, borderWidth: '1.5px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-[var(--space-4)]">
        <div className="flex items-center gap-[var(--space-2)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={sc.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <h3 className="text-[length:var(--text-body)] font-[var(--weight-bold)] m-0" style={{ color: sc.text }}>Performance Improvement Plan</h3>
        </div>
        <span className="text-[length:var(--text-caption2)] font-[var(--weight-semibold)] px-[10px] py-[2px] rounded-[10px] uppercase" style={{ background: sc.bg, color: sc.text }}>{pip.status}</span>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-[var(--space-3)] mb-[var(--space-4)]">
        <div>
          <p className="text-[length:var(--text-caption2)] font-[var(--weight-semibold)] uppercase tracking-[var(--tracking-wide)] text-[var(--text-tertiary)] mb-[var(--space-1)]">Reason</p>
          <p className="text-[length:var(--text-body)] text-[var(--text-primary)] m-0">{pip.reason}</p>
        </div>
        {pip.expectations && (
          <div>
            <p className="text-[length:var(--text-caption2)] font-[var(--weight-semibold)] uppercase tracking-[var(--tracking-wide)] text-[var(--text-tertiary)] mb-[var(--space-1)]">Expectations</p>
            <p className="text-[length:var(--text-body)] text-[var(--text-primary)] m-0">{pip.expectations}</p>
          </div>
        )}
        <div className="flex gap-[var(--space-4)]">
          <div>
            <p className="text-[length:var(--text-caption2)] font-[var(--weight-semibold)] uppercase tracking-[var(--tracking-wide)] text-[var(--text-tertiary)] mb-[var(--space-1)]">Start Date</p>
            <p className="text-[length:var(--text-body)] text-[var(--text-primary)] m-0">{pip.startDate}</p>
          </div>
          {pip.reviewDate && (
            <div>
              <p className="text-[length:var(--text-caption2)] font-[var(--weight-semibold)] uppercase tracking-[var(--tracking-wide)] text-[var(--text-tertiary)] mb-[var(--space-1)]">Review Date</p>
              <p className="text-[length:var(--text-body)] text-[var(--text-primary)] m-0">{pip.reviewDate}</p>
            </div>
          )}
        </div>
      </div>

      {/* Task Log */}
      {pip.taskLog && pip.taskLog.length > 0 && (
        <div className="mb-[var(--space-4)]">
          <p className="text-[length:var(--text-caption2)] font-[var(--weight-semibold)] uppercase tracking-[var(--tracking-wide)] text-[var(--text-tertiary)] mb-[var(--space-2)]">Task Log</p>
          <div className="rounded-[var(--radius-md,12px)] border border-[var(--separator)] overflow-hidden">
            {pip.taskLog.map((t: any, i: number) => {
              const oc = outcomeColors[t.outcome] || outcomeColors.partial
              return (
                <div key={i} className={`px-[var(--space-3)] py-[var(--space-2)] flex items-center gap-[var(--space-3)] text-[length:var(--text-caption1)]${i > 0 ? ' border-t border-[var(--separator)]' : ''}`}>
                  <span className="text-[var(--text-tertiary)] shrink-0 w-[70px]">{new Date(t.date).toLocaleDateString()}</span>
                  <span className="px-[6px] py-px rounded-[6px] text-[length:var(--text-caption2)] font-[var(--weight-semibold)] uppercase shrink-0" style={{ background: oc.bg, color: oc.text }}>{t.outcome}</span>
                  <span className="text-[var(--text-secondary)] truncate">{t.notes}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* History */}
      {pip.history && pip.history.length > 0 && (
        <div className="mb-[var(--space-4)]">
          <p className="text-[length:var(--text-caption2)] font-[var(--weight-semibold)] uppercase tracking-[var(--tracking-wide)] text-[var(--text-tertiary)] mb-[var(--space-2)]">History</p>
          <div className="flex flex-col gap-[var(--space-1)]">
            {pip.history.map((h: any, i: number) => (
              <div key={i} className="flex items-start gap-[var(--space-2)] text-[length:var(--text-caption1)]">
                <span className="text-[var(--text-quaternary)] shrink-0">{new Date(h.date).toLocaleDateString()}</span>
                <span className="text-[var(--text-tertiary)]">{h.action}:</span>
                <span className="text-[var(--text-secondary)]">{h.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {pip.status === 'active' || pip.status === 'extended' ? (
        <div className="flex gap-[var(--space-2)] pt-[var(--space-3)] border-t border-[var(--separator)]">
          <button onClick={handleExtend} disabled={saving} className="px-[var(--space-3)] py-[var(--space-2)] rounded-[var(--radius-md,12px)] border border-[var(--separator)] bg-transparent text-[var(--text-secondary)] text-[length:var(--text-caption1)] cursor-pointer hover:bg-[var(--fill-quaternary)]">Extend</button>
          <button onClick={() => handleStatusChange('completed')} disabled={saving} className="px-[var(--space-3)] py-[var(--space-2)] rounded-[var(--radius-md,12px)] border-none bg-[var(--system-green)] text-white text-[length:var(--text-caption1)] cursor-pointer">Resolve</button>
          <button onClick={() => handleStatusChange('terminated')} disabled={saving} className="px-[var(--space-3)] py-[var(--space-2)] rounded-[var(--radius-md,12px)] border-none bg-[var(--system-red)] text-white text-[length:var(--text-caption1)] cursor-pointer">Terminate</button>
          <button onClick={handleDelete} disabled={saving} className="ml-auto px-[var(--space-3)] py-[var(--space-2)] rounded-[var(--radius-md,12px)] border border-[var(--separator)] bg-transparent text-[var(--text-quaternary)] text-[length:var(--text-caption1)] cursor-pointer hover:text-[var(--system-red)]">Remove</button>
        </div>
      ) : (
        <div className="flex gap-[var(--space-2)] pt-[var(--space-3)] border-t border-[var(--separator)]">
          <span className="text-[length:var(--text-caption1)] text-[var(--text-tertiary)]">PIP {pip.status}</span>
          <button onClick={handleDelete} disabled={saving} className="ml-auto px-[var(--space-3)] py-[var(--space-2)] rounded-[var(--radius-md,12px)] border border-[var(--separator)] bg-transparent text-[var(--text-quaternary)] text-[length:var(--text-caption1)] cursor-pointer hover:text-[var(--system-red)]">Remove</button>
        </div>
      )}
    </div>
  )
}

export function EmployeeDetail({ name, prefetched }: { name: string; prefetched?: Employee }) {
  const [employee, setEmployee] = useState<Employee | null>(prefetched ?? null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(!prefetched);
  const [error, setError] = useState<string | null>(null);
  const [personaExpanded, setPersonaExpanded] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const { settings, setEmployeeOverride } = useSettings();

  useEffect(() => {
    setPersonaExpanded(false);

    if (prefetched) {
      setEmployee(prefetched);
      setLoading(true);
      setError(null);
      api.getSessions()
        .then((allSessions) => {
          const empSessions = (allSessions as SessionData[]).filter(
            (s) => s.employee === name || (!s.employee && name === prefetched.name),
          );
          setSessions(empSessions.slice(0, 10));
        })
        .catch(() => setSessions([]))
        .finally(() => setLoading(false));
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([api.getEmployee(name), api.getSessions()])
      .then(([emp, allSessions]) => {
        setEmployee(emp);
        const empSessions = (allSessions as SessionData[]).filter(
          (s) => s.employee === name,
        );
        setSessions(empSessions.slice(0, 10));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [name, prefetched]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--text-tertiary)] text-[length:var(--text-caption1)]">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-[var(--radius-md,12px)] px-[var(--space-4)] py-[var(--space-3)] text-[length:var(--text-caption1)] text-[var(--system-red)]"
        style={{ background: "color-mix(in srgb, var(--system-red) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--system-red) 30%, transparent)" }}
      >
        Failed to load employee: {error}
      </div>
    );
  }

  if (!employee) return null;

  const rank = employee.rank || "employee";
  const persona = employee.persona || "";
  const currentEmoji = settings.employeeOverrides[employee.name]?.emoji || emojiForName(employee.name);
  const truncatedPersona =
    persona.length > 200 && !personaExpanded
      ? persona.slice(0, 200) + "..."
      : persona;

  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      {/* Main info card */}
      <div className="rounded-[var(--radius-lg,16px)] border border-[var(--separator)] bg-[var(--material-regular)] p-[var(--space-6)]">
        <div className="flex items-start justify-between mb-[var(--space-4)]">
          <div className="flex items-center gap-[var(--space-3)]">
            <div className="relative">
              <EmployeeAvatar
                name={employee.name}
                size={36}
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              />
              {showAvatarPicker && (
                <EmojiPicker
                  current={currentEmoji}
                  onSelect={(emoji) => {
                    setEmployeeOverride(employee.name, { emoji: emoji === emojiForName(employee.name) ? undefined : emoji });
                    setShowAvatarPicker(false);
                  }}
                  onClose={() => setShowAvatarPicker(false)}
                />
              )}
            </div>
            <div>
              <h2 className="text-[length:var(--text-title2)] font-[var(--weight-bold)] tracking-[var(--tracking-tight)] text-[var(--text-primary)] m-0">
                {employee.displayName || employee.name}
              </h2>
              <p className="text-[length:var(--text-caption1)] text-[var(--text-tertiary)] mt-[2px] mb-0 ml-0 mr-0 font-[family-name:var(--font-mono)]">
                {employee.name}
              </p>
            </div>
          </div>
          <RankBadge rank={rank} />
        </div>

        <div className="grid grid-cols-2 gap-[var(--space-4)]">
          <div>
            <p className="text-[length:var(--text-caption2)] font-[var(--weight-semibold)] uppercase tracking-[var(--tracking-wide)] text-[var(--text-tertiary)] mb-[var(--space-1)]">
              Department
            </p>
            <p className="text-[length:var(--text-body)] text-[var(--text-primary)] m-0">
              {employee.department || "None"}
            </p>
          </div>
          <div>
            <p className="text-[length:var(--text-caption2)] font-[var(--weight-semibold)] uppercase tracking-[var(--tracking-wide)] text-[var(--text-tertiary)] mb-[var(--space-1)]">
              Engine
            </p>
            <p className="text-[length:var(--text-body)] text-[var(--text-primary)] m-0">
              {employee.engine || "claude"}{" "}
              <span className="text-[var(--text-tertiary)]">
                / {employee.model || "default"}
              </span>
            </p>
          </div>
        </div>

        {persona && (
          <div className="mt-[var(--space-4)] pt-[var(--space-4)] border-t border-[var(--separator)]">
            <p className="text-[length:var(--text-caption2)] font-[var(--weight-semibold)] uppercase tracking-[var(--tracking-wide)] text-[var(--text-tertiary)] mb-[var(--space-2)]">
              Persona
            </p>
            <p className="text-[length:var(--text-body)] text-[var(--text-secondary)] leading-[var(--leading-relaxed)] whitespace-pre-wrap m-0">
              {truncatedPersona}
            </p>
            {persona.length > 200 && (
              <button
                onClick={() => setPersonaExpanded(!personaExpanded)}
                className="text-[length:var(--text-caption1)] text-[var(--accent)] bg-none border-none cursor-pointer p-0 mt-[var(--space-1)]"
              >
                {personaExpanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* PIP Section */}
      <PipSection name={name} isExecutive={rank === 'executive'} />

      {/* Recent Sessions */}
      <div>
        <h3 className="text-[length:var(--text-caption1)] font-[var(--weight-semibold)] tracking-[var(--tracking-wide)] uppercase text-[var(--text-tertiary)] mb-[var(--space-3)]">
          Recent Sessions
        </h3>
        {sessions.length === 0 ? (
          <p className="text-[length:var(--text-caption1)] text-[var(--text-tertiary)] text-center py-[var(--space-6)] px-0">
            No sessions found for this employee.
          </p>
        ) : (
          <div className="rounded-[var(--radius-lg,16px)] border border-[var(--separator)] bg-[var(--material-regular)] overflow-hidden">
            {sessions.map((session, idx) => (
              <div
                key={session.id}
                className={`px-[var(--space-5)] py-[var(--space-3)] flex items-center justify-between${idx > 0 ? " border-t border-[var(--separator)]" : ""}`}
              >
                <div>
                  <p className="text-[length:var(--text-body)] font-[family-name:var(--font-mono)] text-[var(--text-primary)] m-0">
                    {session.id.slice(0, 8)}
                  </p>
                  <p className="text-[length:var(--text-caption2)] text-[var(--text-tertiary)] mt-[2px]">
                    {session.source || "unknown"}{" "}
                    {session.createdAt
                      ? new Date(session.createdAt).toLocaleDateString()
                      : ""}
                  </p>
                </div>
                <span
                  className="text-[length:var(--text-caption2)] font-[var(--weight-semibold)] py-[2px] px-[8px] rounded-[10px]"
                  style={
                    session.status === "running"
                      ? {
                          background:
                            "color-mix(in srgb, var(--system-green) 15%, transparent)",
                          color: "var(--system-green)",
                        }
                      : session.status === "error"
                        ? {
                            background:
                              "color-mix(in srgb, var(--system-red) 15%, transparent)",
                            color: "var(--system-red)",
                          }
                        : {
                            background: "var(--fill-tertiary)",
                            color: "var(--text-tertiary)",
                          }
                  }
                >
                  {session.status || "idle"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
