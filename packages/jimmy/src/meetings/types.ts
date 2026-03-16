import type { Employee } from "../shared/types.js";

export interface AgendaItem {
  topic: string;
  description?: string;
  goal?: string;
}

export interface MeetingParticipant {
  employeeName: string;
  role: "chair" | "participant" | "observer";
}

export interface MeetingConfig {
  title: string;
  agenda: AgendaItem[];
  participants: MeetingParticipant[];
  chair: string; // employee name who chairs the meeting
  calledBy?: string; // who initiated: "michael", employee name, or "jinn"
  settings?: MeetingSettings;
}

export interface MeetingSettings {
  roundsPerTopic?: number;      // default 2 (initial + rebuttal)
  model?: string;               // engine model override
  engine?: string;              // engine override (default: config default)
  effortLevel?: string;         // effort level for participants
  humanParticipant?: boolean;   // Michael is in the meeting
  allowDebate?: boolean;        // encourage challenging (default: true)
}

export interface MeetingTranscriptEntry {
  agendaIndex: number;
  round: number;
  speaker: string;           // employee name or "michael"
  speakerRole: string;       // "chair", "participant", "observer"
  department: string;
  content: string;
  timestamp: string;         // ISO-8601
}

export interface ActionItem {
  description: string;
  assignee: string;
  priority: "high" | "medium" | "low";
}

export interface MeetingSummary {
  decisions: string[];
  actionItems: ActionItem[];
  dissentingOpinions: string[];
  followUpItems: string[];
  keyPoints: string[];
}

export type MeetingStatus = "pending" | "in_progress" | "awaiting_human" | "completed" | "cancelled";

export interface Meeting {
  id: string;
  sessionId: string;
  title: string;
  config: MeetingConfig;
  status: MeetingStatus;
  transcript: MeetingTranscriptEntry[];
  summary: MeetingSummary | null;
  currentAgendaIndex: number;
  currentRound: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface MeetingRunDeps {
  getEngine: (name: string) => import("../shared/types.js").Engine | undefined;
  getConfig: () => import("../shared/types.js").JinnConfig;
  getEmployeeRegistry: () => Map<string, Employee>;
  emit: (event: string, payload: unknown) => void;
  parentSessionId?: string;
}
