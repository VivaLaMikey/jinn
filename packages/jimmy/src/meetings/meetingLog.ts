import fs from "node:fs";
import path from "node:path";
import { LOGS_DIR } from "../shared/paths.js";

const LOG_FILE = path.join(LOGS_DIR, "meetings.json");

export interface MeetingLogEntry {
  meetingId: string;
  calledBy: string;        // "michael", "jinn", employee name, or "api"
  title: string;
  participants: string[];  // employee names
  departments: string[];   // unique departments of participants
  agenda: string[];        // agenda topic strings
  startedAt: string;       // ISO-8601
  completedAt: string | null;
  durationMs: number | null;
  status: "completed" | "cancelled" | "in_progress";
  outcomeSummary: string | null;   // brief text summary or null
  decisions: string[];             // from MeetingSummary
  actionItems: { description: string; assignee: string; priority: string }[];
  timestamp: string;       // when this log entry was written (ISO-8601)
}

/**
 * Append a log entry to the meetings log file.
 * Creates the file and directory if they do not exist.
 */
export function appendMeetingLog(entry: MeetingLogEntry): void {
  fs.mkdirSync(LOGS_DIR, { recursive: true });

  let entries: MeetingLogEntry[] = [];
  if (fs.existsSync(LOG_FILE)) {
    try {
      const raw = fs.readFileSync(LOG_FILE, "utf-8");
      entries = JSON.parse(raw) as MeetingLogEntry[];
    } catch {
      entries = [];
    }
  }

  entries.push(entry);
  fs.writeFileSync(LOG_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

/**
 * Read the full meetings log, optionally filtered by date range, caller, or department.
 * Date filtering is applied against the `startedAt` field.
 */
export function readMeetingLog(filters?: {
  from?: string;       // ISO date string, inclusive
  to?: string;         // ISO date string, inclusive
  calledBy?: string;   // exact match on calledBy
  department?: string; // matches if department is in the departments array
}): MeetingLogEntry[] {
  if (!fs.existsSync(LOG_FILE)) {
    return [];
  }

  let entries: MeetingLogEntry[];
  try {
    const raw = fs.readFileSync(LOG_FILE, "utf-8");
    entries = JSON.parse(raw) as MeetingLogEntry[];
  } catch {
    return [];
  }

  if (!filters) return entries;

  const { from, to, calledBy, department } = filters;

  return entries.filter(entry => {
    if (from && entry.startedAt < from) return false;
    if (to && entry.startedAt > to) return false;
    if (calledBy && entry.calledBy !== calledBy) return false;
    if (department && !entry.departments.includes(department)) return false;
    return true;
  });
}
