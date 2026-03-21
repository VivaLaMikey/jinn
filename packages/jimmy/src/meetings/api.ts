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
import {
  checkEmployeeMeetingLimit,
  recordEmployeeMeetingProposal,
  getEmployeeMeetingStats,
} from "./employeeRateLimit.js";
import { readMeetingLog } from "./meetingLog.js";

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

// ── Response shaping ────────────────────────────────────────────

/**
 * Flatten a stored Meeting for API responses.
 *
 * The Meeting record keeps config nested under `config`, but the frontend
 * (packages/web/src/app/meetings/page.tsx — Meeting interface) expects
 * agenda, participants, chair, settings, and calledBy at the top level.
 *
 * This helper spreads those fields to the top level while preserving the
 * original `config` object for backwards compatibility.
 *
 * It also converts summary.actionItems from ActionItem objects
 * ({ description, assignee, priority }) to a richer string so that the
 * frontend's string[] rendering path still works without crashing.
 */
function flattenMeeting(meeting: import("./types.js").Meeting): Record<string, unknown> {
  const { config, summary, ...rest } = meeting as any;

  // Flatten config fields to top level
  const flattened: Record<string, unknown> = {
    ...rest,
    config,
    agenda: config?.agenda,
    participants: config?.participants,
    chair: config?.chair,
    calledBy: config?.calledBy,
    settings: config?.settings,
  };

  // Convert ActionItem objects to formatted strings for the frontend
  if (summary) {
    const actionItems = summary.actionItems ?? [];
    flattened.summary = {
      ...summary,
      actionItems: actionItems.map((item: any) => {
        if (typeof item === "string") return item;
        let s = item.description ?? "";
        if (item.assignee) s += ` — ${item.assignee}`;
        if (item.priority) s += ` (${item.priority})`;
        return s;
      }),
    };
  } else {
    flattened.summary = summary;
  }

  return flattened;
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
    return json(res, meetings.map(flattenMeeting)), true;
  }

  // POST /api/meetings — Create and start a new meeting
  if (method === "POST" && pathname === "/api/meetings") {
    const parsed = await readJsonBody(req, res);
    if (!parsed.ok) return true;

    const body = parsed.body as any;

    // Normalise agenda: convert plain strings to {topic: string} objects
    if (Array.isArray(body.agenda)) {
      let converted = 0;
      body.agenda = body.agenda.map((item: any) => {
        if (typeof item === "string") { converted++; return { topic: item }; }
        return item;
      });
      if (converted > 0) {
        logger.info(`Meeting API: auto-converted ${converted} string agenda items to AgendaItem objects`);
      }
    }
    if (body.config?.agenda && Array.isArray(body.config.agenda)) {
      let converted = 0;
      body.config.agenda = body.config.agenda.map((item: any) => {
        if (typeof item === "string") { converted++; return { topic: item }; }
        return item;
      });
      if (converted > 0) {
        logger.info(`Meeting API: auto-converted ${converted} string config.agenda items to AgendaItem objects`);
      }
    }

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

    // Derive calledBy identity: prefer server-supplied header over self-asserted body field.
    // NOTE: For full server-derived identity, the session manager would need to inject an
    // x-employee-name header when an employee session makes HTTP requests to the gateway.
    // Until that middleware exists, we accept the header if present and fall back to body.calledBy.
    const derivedCalledBy = req.headers["x-employee-name"] as string | undefined
      || req.headers["x-jinn-employee"] as string | undefined
      || (req as any).employeeName as string | undefined
      || null;
    const calledBy: string = derivedCalledBy || body.calledBy || "api";
    if (!derivedCalledBy && body.calledBy) {
      logger.warn(`Meeting create using self-asserted calledBy: ${body.calledBy} — no server-derived identity available`);
    }

    const meetingConfig: MeetingConfig = {
      title: body.title,
      agenda: body.agenda,
      participants: body.participants,
      chair: body.chair,
      calledBy,
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
        return json(res, flattenMeeting(latest), 201), true;
      }

      // Fallback: wait for meeting creation
      const meeting = await meetingPromise;
      return json(res, flattenMeeting(meeting), 201), true;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return serverError(res, errMsg), true;
    }
  }

  // GET /api/meetings/log — Meeting audit log (queryable)
  if (method === "GET" && pathname === "/api/meetings/log") {
    const from = url.searchParams.get("from") || undefined;
    const to = url.searchParams.get("to") || undefined;
    const calledBy = url.searchParams.get("calledBy") || undefined;
    const department = url.searchParams.get("department") || undefined;
    const entries = readMeetingLog({ from, to, calledBy, department });
    return json(res, entries), true;
  }

  // GET /api/meetings/stats — Employee rate limit observability
  if (method === "GET" && pathname === "/api/meetings/stats") {
    const employeeStats = getEmployeeMeetingStats();
    const globalCount = employeeStats.reduce((sum, s) => sum + s.count, 0);
    return json(res, { employeeStats, globalCount }), true;
  }

  // POST /api/meetings/propose — Employee-initiated meeting proposal
  if (method === "POST" && pathname === "/api/meetings/propose") {
    const parsed = await readJsonBody(req, res);
    if (!parsed.ok) return true;

    const body = parsed.body as any;

    // Normalise agenda: convert plain strings to {topic: string} objects
    if (Array.isArray(body.agenda)) {
      let converted = 0;
      body.agenda = body.agenda.map((item: any) => {
        if (typeof item === "string") { converted++; return { topic: item }; }
        return item;
      });
      if (converted > 0) {
        logger.info(`Meeting API (propose): auto-converted ${converted} string agenda items to AgendaItem objects`);
      }
    }

    // Derive proposer identity: prefer server-supplied header over self-asserted body field.
    // This prevents callers from spoofing another employee's identity and bypassing rate limits.
    // NOTE: For full server-derived identity, the session manager should inject an x-employee-name
    // header whenever an employee session makes HTTP requests to the gateway API. Until that
    // middleware is in place, the header is trusted when present and body.proposedBy is the fallback.
    const derivedIdentity = req.headers["x-employee-name"] as string | undefined
      || req.headers["x-jinn-employee"] as string | undefined
      || (req as any).employeeName as string | undefined
      || null;

    const proposedBy: string | undefined = derivedIdentity || body.proposedBy || undefined;

    if (derivedIdentity) {
      logger.info(`Meeting proposal: identity derived from request header — ${derivedIdentity}`);
    } else if (body.proposedBy) {
      logger.warn(`Meeting proposal using self-asserted identity: ${body.proposedBy} — no server-derived identity available`);
    }

    // Validate required fields
    if (!proposedBy) return badRequest(res, "proposedBy is required"), true;
    if (!body.title) return badRequest(res, "title is required"), true;
    if (!body.agenda || !Array.isArray(body.agenda) || body.agenda.length === 0) {
      return badRequest(res, "agenda is required and must be a non-empty array"), true;
    }
    if (!body.participants || !Array.isArray(body.participants) || body.participants.length === 0) {
      return badRequest(res, "participants is required and must be a non-empty array"), true;
    }

    const employees = scanOrg();

    // Allowlist check: proposedBy must be a registered employee in the org registry.
    // This is the primary guard — even if body.proposedBy was self-asserted, an unknown
    // name will be rejected here. The header path is trusted; the body path is validated.
    if (!employees.has(proposedBy)) {
      logger.warn(`Meeting proposal rejected — unknown employee: ${proposedBy}`);
      json(res, { error: "Forbidden", message: `Unknown employee: ${proposedBy}. Must be a registered employee.` }, 403);
      return true;
    }

    // Validate all participants exist
    for (const name of body.participants) {
      if (!employees.has(name)) {
        return badRequest(res, `Participant "${name}" not found in org`), true;
      }
    }

    // Require at least 1 other participant besides the proposer
    const otherParticipants = (body.participants as string[]).filter(
      (n: string) => n !== proposedBy,
    );
    if (otherParticipants.length === 0) {
      return badRequest(res, "At least 1 participant other than the proposer is required"), true;
    }

    // Rate limit check — applied against the server-resolved proposedBy, not self-asserted body field
    const limitCheck = checkEmployeeMeetingLimit(proposedBy);
    if (!limitCheck.allowed) {
      json(res, { error: limitCheck.reason, retryAfterMs: limitCheck.retryAfterMs }, 429);
      return true;
    }

    // Determine chair: proposer chairs if rank is manager or higher; otherwise highest-ranked participant
    const RANK_ORDER: Record<string, number> = {
      executive: 3,
      manager: 2,
      senior: 1,
      employee: 0,
    };

    const proposer = employees.get(proposedBy)!;
    let chairName: string;

    if (proposer.rank === "executive" || proposer.rank === "manager") {
      chairName = proposedBy;
    } else {
      // Find highest-ranked participant; ties broken alphabetically
      const allNames: string[] = [proposedBy, ...(body.participants as string[])];
      const uniqueNames = [...new Set(allNames)];
      uniqueNames.sort((a, b) => {
        const rankDiff =
          (RANK_ORDER[employees.get(b)?.rank ?? "employee"] ?? 0) -
          (RANK_ORDER[employees.get(a)?.rank ?? "employee"] ?? 0);
        if (rankDiff !== 0) return rankDiff;
        return a.localeCompare(b);
      });
      chairName = uniqueNames[0];
    }

    // Build MeetingParticipant array
    const allParticipantNames: string[] = [
      proposedBy,
      ...(body.participants as string[]),
    ];
    const uniqueParticipantNames = [...new Set(allParticipantNames)];
    const meetingParticipants = uniqueParticipantNames.map((name: string) => ({
      employeeName: name,
      role: name === chairName ? ("chair" as const) : ("participant" as const),
    }));

    const meetingConfig: MeetingConfig = {
      title: body.title,
      agenda: body.agenda,
      participants: meetingParticipants,
      chair: chairName,
      calledBy: proposedBy,
      settings: body.settings || {},
    };

    const deps: MeetingRunDeps = {
      getEngine: (name: string) => context.sessionManager.getEngine(name),
      getConfig: () => context.getConfig(),
      getEmployeeRegistry: () => scanOrg(),
      emit: (event: string, payload: unknown) => context.emit(event, payload),
    };

    try {
      const meetingPromise = runMeeting(meetingConfig, deps);

      // Give it a moment to create the meeting record
      await new Promise(r => setTimeout(r, 100));

      const meetings = listMeetings();
      const latest = meetings[0];

      if (latest) {
        meetingPromise.catch(err => {
          logger.error(
            `Employee-proposed meeting "${meetingConfig.title}" failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        });

        // Record the proposal only after successful start
        recordEmployeeMeetingProposal(proposedBy);

        context.emit("meeting:employee_proposed", {
          meetingId: latest.id,
          proposedBy,
          participants: uniqueParticipantNames,
          reason: body.reason,
        });

        return json(res, flattenMeeting(latest), 201), true;
      }

      // Fallback: wait for meeting creation
      const meeting = await meetingPromise;
      recordEmployeeMeetingProposal(proposedBy);
      context.emit("meeting:employee_proposed", {
        meetingId: meeting.id,
        proposedBy,
        participants: uniqueParticipantNames,
        reason: body.reason,
      });
      return json(res, flattenMeeting(meeting), 201), true;
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
    return json(res, { ...flattenMeeting(meeting), messages }), true;
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
