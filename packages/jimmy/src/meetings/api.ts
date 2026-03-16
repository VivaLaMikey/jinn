import type { IncomingMessage as HttpRequest, ServerResponse } from "node:http";
import type { ApiContext } from "../gateway/api.js";
import { scanOrg } from "../gateway/org.js";
import { getMessages } from "../sessions/registry.js";
import { logger } from "../shared/logger.js";
import { runMeeting } from "./orchestrator.js";
import {
  getMeeting,
  listMeetings,
  updateMeeting,
  deleteMeeting,
} from "./store.js";
import type { MeetingConfig, MeetingRunDeps } from "./types.js";

// ── Helpers (matching api.ts patterns) ──────────────────────────

function json(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function badRequest(res: ServerResponse, message: string): void {
  json(res, { error: message }, 400);
}

function notFound(res: ServerResponse): void {
  json(res, { error: "Not found" }, 404);
}

function serverError(res: ServerResponse, message: string): void {
  json(res, { error: message }, 500);
}

function readBody(req: HttpRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString()));
    req.on("error", reject);
  });
}

async function readJsonBody(
  req: HttpRequest,
  res: ServerResponse,
): Promise<{ ok: true; body: unknown } | { ok: false }> {
  const raw = await readBody(req);
  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    badRequest(res, "Invalid JSON in request body");
    return { ok: false };
  }
}

function matchRoute(
  pattern: string,
  pathname: string,
): Record<string, string> | null {
  const patternParts = pattern.split("/");
  const pathParts = pathname.split("/");
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

// ── Meeting API Handler ─────────────────────────────────────────

/**
 * Handle all /api/meetings/* routes.
 * Returns true if the route was handled, false if not a meetings route.
 */
export async function handleMeetingsApi(
  req: HttpRequest,
  res: ServerResponse,
  context: ApiContext,
): Promise<boolean> {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;
  const method = req.method || "GET";

  // Only handle /api/meetings* routes
  if (!pathname.startsWith("/api/meetings")) return false;

  let params: Record<string, string> | null;

  // GET /api/meetings — List all meetings
  if (method === "GET" && pathname === "/api/meetings") {
    const statusFilter = url.searchParams.get("status") || undefined;
    const meetings = listMeetings(statusFilter ? { status: statusFilter as any } : undefined);
    return json(res, meetings), true;
  }

  // POST /api/meetings — Create and start a new meeting
  if (method === "POST" && pathname === "/api/meetings") {
    const parsed = await readJsonBody(req, res);
    if (!parsed.ok) return true;

    const body = parsed.body as any;

    // Validate required fields
    if (!body.title) return badRequest(res, "title is required"), true;
    if (!body.agenda || !Array.isArray(body.agenda) || body.agenda.length === 0) {
      return badRequest(res, "agenda is required and must be a non-empty array"), true;
    }
    if (!body.participants || !Array.isArray(body.participants) || body.participants.length < 2) {
      return badRequest(res, "participants is required and must have at least 2 members"), true;
    }
    if (!body.chair) return badRequest(res, "chair is required"), true;

    // Validate participant format
    for (const p of body.participants) {
      if (!p.employeeName) return badRequest(res, "each participant must have an employeeName"), true;
      if (!["chair", "participant", "observer"].includes(p.role || "participant")) {
        return badRequest(res, `invalid role "${p.role}" — must be chair, participant, or observer`), true;
      }
      p.role = p.role || "participant";
    }

    // Ensure chair is in participants list
    const chairInParticipants = body.participants.some(
      (p: any) => p.employeeName === body.chair,
    );
    if (!chairInParticipants) {
      body.participants.push({ employeeName: body.chair, role: "chair" });
    }

    const meetingConfig: MeetingConfig = {
      title: body.title,
      agenda: body.agenda,
      participants: body.participants,
      chair: body.chair,
      calledBy: body.calledBy || "api",
      settings: body.settings || {},
    };

    // Build meeting dependencies from API context
    const deps: MeetingRunDeps = {
      getEngine: (name: string) => context.sessionManager.getEngine(name),
      getConfig: () => context.getConfig(),
      getEmployeeRegistry: () => scanOrg(),
      emit: (event: string, payload: unknown) => context.emit(event, payload),
      parentSessionId: body.parentSessionId,
    };

    try {
      // Start the meeting asynchronously — return immediately
      const employees = scanOrg();

      // Validate employees exist before starting
      for (const p of meetingConfig.participants) {
        if (p.employeeName === "michael") continue;
        if (!employees.has(p.employeeName)) {
          return badRequest(res, `Employee "${p.employeeName}" not found in org`), true;
        }
      }
      if (meetingConfig.chair !== "michael" && !employees.has(meetingConfig.chair)) {
        return badRequest(res, `Chair "${meetingConfig.chair}" not found in org`), true;
      }

      // Run meeting in background — don't await
      const meetingPromise = runMeeting(meetingConfig, deps);

      // Give it a moment to create the meeting record
      await new Promise(r => setTimeout(r, 100));

      // Get the created meeting to return its ID
      const meetings = listMeetings();
      const latest = meetings[0]; // Most recent first

      if (latest) {
        // Fire-and-forget: the meeting runs in the background
        meetingPromise.catch(err => {
          logger.error(`Meeting "${meetingConfig.title}" failed: ${err instanceof Error ? err.message : String(err)}`);
        });
        return json(res, latest, 201), true;
      }

      // Fallback: wait for meeting creation
      const meeting = await meetingPromise;
      return json(res, meeting, 201), true;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return serverError(res, errMsg), true;
    }
  }

  // GET /api/meetings/:id — Get meeting details
  params = matchRoute("/api/meetings/:id", pathname);
  if (method === "GET" && params) {
    const meeting = getMeeting(params.id);
    if (!meeting) return notFound(res), true;

    // Include session messages for full transcript view
    const messages = getMessages(meeting.sessionId);
    return json(res, { ...meeting, messages }), true;
  }

  // POST /api/meetings/:id/contribute — Human contributes to meeting
  params = matchRoute("/api/meetings/:id/contribute", pathname);
  if (method === "POST" && params) {
    const meeting = getMeeting(params.id);
    if (!meeting) return notFound(res), true;
    if (meeting.status !== "in_progress" && meeting.status !== "awaiting_human") {
      return badRequest(res, `Meeting is ${meeting.status}, not accepting contributions`), true;
    }

    const parsed = await readJsonBody(req, res);
    if (!parsed.ok) return true;
    const body = parsed.body as any;
    if (!body.message) return badRequest(res, "message is required"), true;

    const { insertMessage } = await import("../sessions/registry.js");

    // Add Michael's contribution as a message in the meeting session
    insertMessage(meeting.sessionId, "user", `**[Michael — Human Participant]**\n\n${body.message}`);

    // Add to transcript
    const entry = {
      agendaIndex: meeting.currentAgendaIndex,
      round: meeting.currentRound,
      speaker: "michael",
      speakerRole: "participant" as const,
      department: "management",
      content: body.message,
      timestamp: new Date().toISOString(),
    };

    const updatedTranscript = [...meeting.transcript, entry];
    updateMeeting(meeting.id, {
      transcript: updatedTranscript,
      status: "in_progress",
    });

    context.emit("meeting:human_contribution", {
      meetingId: meeting.id,
      entry,
    });

    return json(res, { status: "contributed", entry }), true;
  }

  // POST /api/meetings/:id/stop — Cancel a running meeting
  params = matchRoute("/api/meetings/:id/stop", pathname);
  if (method === "POST" && params) {
    const meeting = getMeeting(params.id);
    if (!meeting) return notFound(res), true;
    if (meeting.status === "completed" || meeting.status === "cancelled") {
      return badRequest(res, `Meeting already ${meeting.status}`), true;
    }

    updateMeeting(meeting.id, {
      status: "cancelled",
      completedAt: new Date().toISOString(),
    });

    context.emit("meeting:cancelled", { meetingId: meeting.id });
    logger.info(`Meeting ${meeting.id} cancelled via API`);

    return json(res, { status: "cancelled", meetingId: meeting.id }), true;
  }

  // DELETE /api/meetings/:id — Delete a meeting
  params = matchRoute("/api/meetings/:id", pathname);
  if (method === "DELETE" && params) {
    const deleted = deleteMeeting(params.id);
    if (!deleted) return notFound(res), true;
    return json(res, { status: "deleted" }), true;
  }

  return false;
}
