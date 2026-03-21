import { v4 as uuidv4 } from "uuid";
import { initDb } from "../sessions/registry.js";
import type {
  Meeting,
  MeetingConfig,
  MeetingStatus,
  MeetingTranscriptEntry,
  MeetingSummary,
} from "./types.js";

/**
 * Ensure the meetings table exists. Called lazily on first access.
 */
let migrated = false;
function ensureMeetingsTable(): void {
  if (migrated) return;
  const db = initDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      title TEXT NOT NULL,
      config TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      transcript TEXT NOT NULL DEFAULT '[]',
      summary TEXT,
      current_agenda_index INTEGER NOT NULL DEFAULT 0,
      current_round INTEGER NOT NULL DEFAULT 0,
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      originating_session_id TEXT
    )
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_meetings_session ON meetings (session_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings (status)`);
  // Add column to existing tables that pre-date this migration
  try {
    db.exec(`ALTER TABLE meetings ADD COLUMN originating_session_id TEXT`);
  } catch {
    // Column already exists — safe to ignore
  }
  migrated = true;
}

function rowToMeeting(row: Record<string, unknown>): Meeting {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    title: row.title as string,
    config: JSON.parse(row.config as string) as MeetingConfig,
    status: row.status as MeetingStatus,
    transcript: JSON.parse((row.transcript as string) || "[]") as MeetingTranscriptEntry[],
    summary: row.summary ? JSON.parse(row.summary as string) as MeetingSummary : null,
    currentAgendaIndex: (row.current_agenda_index as number) ?? 0,
    currentRound: (row.current_round as number) ?? 0,
    startedAt: (row.started_at as string) ?? null,
    completedAt: (row.completed_at as string) ?? null,
    createdAt: row.created_at as string,
    originatingSessionId: (row.originating_session_id as string) ?? null,
  };
}

export function createMeeting(opts: {
  sessionId: string;
  title: string;
  config: MeetingConfig;
  originatingSessionId?: string | null;
}): Meeting {
  ensureMeetingsTable();
  const db = initDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO meetings (id, session_id, title, config, status, transcript, created_at, originating_session_id)
    VALUES (?, ?, ?, ?, 'pending', '[]', ?, ?)
  `).run(id, opts.sessionId, opts.title, JSON.stringify(opts.config), now, opts.originatingSessionId ?? null);

  return {
    id,
    sessionId: opts.sessionId,
    title: opts.title,
    config: opts.config,
    status: "pending",
    transcript: [],
    summary: null,
    currentAgendaIndex: 0,
    currentRound: 0,
    startedAt: null,
    completedAt: null,
    createdAt: now,
    originatingSessionId: opts.originatingSessionId ?? null,
  };
}

export function getMeeting(id: string): Meeting | undefined {
  ensureMeetingsTable();
  const db = initDb();
  const row = db.prepare("SELECT * FROM meetings WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToMeeting(row) : undefined;
}

export function getMeetingBySessionId(sessionId: string): Meeting | undefined {
  ensureMeetingsTable();
  const db = initDb();
  const row = db.prepare("SELECT * FROM meetings WHERE session_id = ?").get(sessionId) as Record<string, unknown> | undefined;
  return row ? rowToMeeting(row) : undefined;
}

export function listMeetings(filter?: { status?: MeetingStatus }): Meeting[] {
  ensureMeetingsTable();
  const db = initDb();
  let query = "SELECT * FROM meetings";
  const params: unknown[] = [];
  if (filter?.status) {
    query += " WHERE status = ?";
    params.push(filter.status);
  }
  query += " ORDER BY created_at DESC";
  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
  return rows.map(rowToMeeting);
}

export interface UpdateMeetingFields {
  status?: MeetingStatus;
  transcript?: MeetingTranscriptEntry[];
  summary?: MeetingSummary | null;
  currentAgendaIndex?: number;
  currentRound?: number;
  startedAt?: string;
  completedAt?: string;
  originatingSessionId?: string | null;
}

export function updateMeeting(id: string, updates: UpdateMeetingFields): Meeting | undefined {
  ensureMeetingsTable();
  const db = initDb();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (updates.status !== undefined) {
    sets.push("status = ?");
    values.push(updates.status);
  }
  if (updates.transcript !== undefined) {
    sets.push("transcript = ?");
    values.push(JSON.stringify(updates.transcript));
  }
  if (updates.summary !== undefined) {
    sets.push("summary = ?");
    values.push(updates.summary ? JSON.stringify(updates.summary) : null);
  }
  if (updates.currentAgendaIndex !== undefined) {
    sets.push("current_agenda_index = ?");
    values.push(updates.currentAgendaIndex);
  }
  if (updates.currentRound !== undefined) {
    sets.push("current_round = ?");
    values.push(updates.currentRound);
  }
  if (updates.startedAt !== undefined) {
    sets.push("started_at = ?");
    values.push(updates.startedAt);
  }
  if (updates.completedAt !== undefined) {
    sets.push("completed_at = ?");
    values.push(updates.completedAt);
  }
  if (updates.originatingSessionId !== undefined) {
    sets.push("originating_session_id = ?");
    values.push(updates.originatingSessionId);
  }

  if (sets.length === 0) return getMeeting(id);

  values.push(id);
  db.prepare(`UPDATE meetings SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  return getMeeting(id);
}

export function deleteMeeting(id: string): boolean {
  ensureMeetingsTable();
  const db = initDb();
  const result = db.prepare("DELETE FROM meetings WHERE id = ?").run(id);
  return result.changes > 0;
}
