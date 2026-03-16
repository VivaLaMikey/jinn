import { v4 as uuidv4 } from "uuid";
import type { Engine, Employee, JinnConfig } from "../shared/types.js";
import { logger } from "../shared/logger.js";
import { createSession, insertMessage, updateSession } from "../sessions/registry.js";
import { JINN_HOME } from "../shared/paths.js";
import {
  createMeeting,
  getMeeting,
  updateMeeting,
} from "./store.js";
import {
  buildParticipantSystemPrompt,
  buildInitialTurnPrompt,
  buildRebuttalPrompt,
  buildChairModerationPrompt,
  buildFinalSummaryPrompt,
} from "./prompts.js";
import type {
  MeetingConfig,
  MeetingRunDeps,
  MeetingTranscriptEntry,
  MeetingSummary,
  Meeting,
} from "./types.js";

/**
 * Start and run a meeting to completion (or until it needs human input).
 * This is an async function that runs the entire meeting lifecycle.
 * Call it from the API handler — it runs in the background.
 */
export async function runMeeting(
  config: MeetingConfig,
  deps: MeetingRunDeps,
): Promise<Meeting> {
  const jinnConfig = deps.getConfig();
  const employees = deps.getEmployeeRegistry();
  const engineName = config.settings?.engine || jinnConfig.engines.default;
  const engine = deps.getEngine(engineName);

  if (!engine) {
    throw new Error(`Engine "${engineName}" is not available`);
  }

  // Validate all participants exist
  for (const p of config.participants) {
    if (p.employeeName === "michael") continue; // Human participant
    if (!employees.has(p.employeeName)) {
      throw new Error(`Employee "${p.employeeName}" not found in org registry`);
    }
  }

  // Validate chair exists
  if (config.chair !== "michael" && !employees.has(config.chair)) {
    throw new Error(`Chair "${config.chair}" not found in org registry`);
  }

  // Create the meeting session
  const session = createSession({
    engine: engineName,
    source: "meeting",
    sourceRef: `meeting:${Date.now()}`,
    connector: "meeting",
    sessionKey: `meeting:${Date.now()}`,
    replyContext: { source: "meeting" },
    title: `Meeting: ${config.title}`,
    parentSessionId: deps.parentSessionId,
    prompt: `Meeting: ${config.title}`,
  });

  // Create the meeting record
  const meeting = createMeeting({
    sessionId: session.id,
    title: config.title,
    config,
  });

  logger.info(`Meeting "${config.title}" created (id: ${meeting.id}, session: ${session.id})`);
  deps.emit("meeting:created", { meetingId: meeting.id, sessionId: session.id, title: config.title });

  // Insert opening message
  insertMessage(session.id, "notification", `Meeting started: ${config.title}\nParticipants: ${config.participants.map(p => p.employeeName).join(", ")}\nChair: ${config.chair}`);

  // Update status
  updateMeeting(meeting.id, { status: "in_progress", startedAt: new Date().toISOString() });
  updateSession(session.id, { status: "running", lastActivity: new Date().toISOString() });

  const transcript: MeetingTranscriptEntry[] = [];
  const roundsPerTopic = config.settings?.roundsPerTopic ?? 2;

  try {
    // Run each agenda item
    for (let agendaIdx = 0; agendaIdx < config.agenda.length; agendaIdx++) {
      const agendaItem = config.agenda[agendaIdx];
      logger.info(`Meeting ${meeting.id}: Starting agenda item ${agendaIdx + 1}/${config.agenda.length} — "${agendaItem.topic}"`);

      insertMessage(session.id, "notification", `--- Agenda Item ${agendaIdx + 1}: ${agendaItem.topic} ---`);
      updateMeeting(meeting.id, { currentAgendaIndex: agendaIdx });

      // Get active participants (not observers for initial round, unless they're the chair)
      const activeParticipants = config.participants.filter(
        p => p.role !== "observer" && p.employeeName !== "michael"
      );

      for (let round = 0; round < roundsPerTopic; round++) {
        logger.info(`Meeting ${meeting.id}: Agenda ${agendaIdx + 1}, Round ${round + 1}/${roundsPerTopic}`);
        updateMeeting(meeting.id, { currentRound: round });

        const roundEntries: MeetingTranscriptEntry[] = [];

        // Get responses from all AI participants in parallel
        const participantPromises = activeParticipants.map(async (participant) => {
          const employee = employees.get(participant.employeeName);
          if (!employee) return null;

          const systemPrompt = buildParticipantSystemPrompt(employee, config, participant.role);

          let turnPrompt: string;
          if (round === 0) {
            turnPrompt = buildInitialTurnPrompt(agendaItem, agendaIdx, config.agenda.length);
          } else {
            const previousRoundEntries = transcript.filter(
              e => e.agendaIndex === agendaIdx && e.round === round - 1
            );
            turnPrompt = buildRebuttalPrompt(agendaItem, agendaIdx, config.agenda.length, previousRoundEntries);
          }

          try {
            const engineConfig = engineName === "codex" ? jinnConfig.engines.codex : jinnConfig.engines.claude;
            const result = await engine.run({
              prompt: turnPrompt,
              systemPrompt,
              cwd: JINN_HOME,
              bin: engineConfig.bin,
              model: config.settings?.model ?? engineConfig.model,
              effortLevel: config.settings?.effortLevel ?? "medium",
            });

            const content = result.result?.trim() || "(No response)";
            const entry: MeetingTranscriptEntry = {
              agendaIndex: agendaIdx,
              round,
              speaker: participant.employeeName,
              speakerRole: participant.role,
              department: employee.department,
              content,
              timestamp: new Date().toISOString(),
            };

            return entry;
          } catch (err) {
            logger.warn(`Meeting ${meeting.id}: Error from ${participant.employeeName}: ${err instanceof Error ? err.message : String(err)}`);
            return {
              agendaIndex: agendaIdx,
              round,
              speaker: participant.employeeName,
              speakerRole: participant.role,
              department: employee.department,
              content: `(Error: ${err instanceof Error ? err.message : String(err)})`,
              timestamp: new Date().toISOString(),
            } as MeetingTranscriptEntry;
          }
        });

        const results = await Promise.all(participantPromises);
        for (const entry of results) {
          if (entry) {
            roundEntries.push(entry);
            transcript.push(entry);
            // Store in session messages for UI visibility
            insertMessage(
              session.id,
              "assistant",
              `**[${entry.speaker}** — ${entry.department}, Round ${round + 1}]\n\n${entry.content}`,
            );
          }
        }

        // Check for human participant — if configured, pause after AI round
        if (config.settings?.humanParticipant && round < roundsPerTopic - 1) {
          updateMeeting(meeting.id, {
            status: "awaiting_human",
            transcript: [...transcript],
          });
          deps.emit("meeting:awaiting_human", {
            meetingId: meeting.id,
            sessionId: session.id,
            agendaIndex: agendaIdx,
            round,
            message: `Waiting for your input on: ${agendaItem.topic}`,
          });
          // For now, we don't block — human input is optional and gets incorporated if present
          // In a future version, this could pause and wait for POST /api/meetings/:id/contribute
        }

        // Persist transcript after each round
        updateMeeting(meeting.id, { transcript: [...transcript] });
        deps.emit("meeting:round_complete", {
          meetingId: meeting.id,
          agendaIndex: agendaIdx,
          round,
          entries: roundEntries,
        });
      }

      // Chair moderation after all rounds for this agenda item
      const chairEmployee = employees.get(config.chair);
      if (chairEmployee) {
        const allAgendaEntries = transcript.filter(e => e.agendaIndex === agendaIdx);
        const moderationPrompt = buildChairModerationPrompt(
          agendaItem, agendaIdx, config.agenda.length, allAgendaEntries,
        );
        const chairSystem = buildParticipantSystemPrompt(chairEmployee, config, "chair");
        const engineConfig = engineName === "codex" ? jinnConfig.engines.codex : jinnConfig.engines.claude;

        try {
          const modResult = await engine.run({
            prompt: moderationPrompt,
            systemPrompt: chairSystem,
            cwd: JINN_HOME,
            bin: engineConfig.bin,
            model: config.settings?.model ?? engineConfig.model,
            effortLevel: config.settings?.effortLevel ?? "medium",
          });

          const modContent = modResult.result?.trim() || "(No moderation summary)";
          const modEntry: MeetingTranscriptEntry = {
            agendaIndex: agendaIdx,
            round: roundsPerTopic,  // moderation is after all rounds
            speaker: config.chair,
            speakerRole: "chair",
            department: chairEmployee.department,
            content: modContent,
            timestamp: new Date().toISOString(),
          };
          transcript.push(modEntry);
          insertMessage(
            session.id,
            "assistant",
            `**[CHAIR: ${config.chair}** — Moderation Summary]\n\n${modContent}`,
          );
          updateMeeting(meeting.id, { transcript: [...transcript] });
        } catch (err) {
          logger.warn(`Meeting ${meeting.id}: Chair moderation error: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // Generate final summary
    logger.info(`Meeting ${meeting.id}: Generating final summary`);
    let summary: MeetingSummary | null = null;

    const chairEmployee = employees.get(config.chair);
    if (chairEmployee) {
      const summaryPrompt = buildFinalSummaryPrompt(config, transcript);
      const chairSystem = buildParticipantSystemPrompt(chairEmployee, config, "chair");
      const engineConfig = engineName === "codex" ? jinnConfig.engines.codex : jinnConfig.engines.claude;

      try {
        const summaryResult = await engine.run({
          prompt: summaryPrompt,
          systemPrompt: chairSystem,
          cwd: JINN_HOME,
          bin: engineConfig.bin,
          model: config.settings?.model ?? engineConfig.model,
          effortLevel: config.settings?.effortLevel ?? "high",
        });

        const raw = summaryResult.result?.trim() || "";
        try {
          // Try to parse the JSON from the response
          // The LLM might wrap it in markdown code fences, so strip those
          const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
          summary = JSON.parse(cleaned) as MeetingSummary;
        } catch {
          logger.warn(`Meeting ${meeting.id}: Could not parse summary as JSON, using raw text`);
          summary = {
            decisions: [],
            actionItems: [],
            dissentingOpinions: [],
            followUpItems: [],
            keyPoints: [raw],
          };
        }
      } catch (err) {
        logger.warn(`Meeting ${meeting.id}: Summary generation error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Format the final summary message
    const summaryText = summary
      ? formatSummaryForDisplay(config.title, summary)
      : "Meeting completed but summary could not be generated.";

    insertMessage(session.id, "notification", summaryText);

    // Update meeting as completed
    const completedAt = new Date().toISOString();
    updateMeeting(meeting.id, {
      status: "completed",
      transcript: [...transcript],
      summary,
      completedAt,
    });
    updateSession(session.id, { status: "idle", lastActivity: completedAt });

    logger.info(`Meeting "${config.title}" completed (id: ${meeting.id})`);
    deps.emit("meeting:completed", { meetingId: meeting.id, sessionId: session.id, summary });

    return getMeeting(meeting.id)!;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error(`Meeting ${meeting.id} failed: ${errMsg}`);
    updateMeeting(meeting.id, { status: "cancelled", transcript: [...transcript] });
    updateSession(session.id, { status: "error", lastActivity: new Date().toISOString(), lastError: errMsg });
    deps.emit("meeting:error", { meetingId: meeting.id, error: errMsg });
    throw err;
  }
}

function formatSummaryForDisplay(title: string, summary: MeetingSummary): string {
  const lines: string[] = [`# Meeting Summary: ${title}\n`];

  if (summary.decisions.length > 0) {
    lines.push("## Decisions");
    summary.decisions.forEach(d => lines.push(`- ${d}`));
    lines.push("");
  }

  if (summary.actionItems.length > 0) {
    lines.push("## Action Items");
    summary.actionItems.forEach(a => lines.push(`- [${a.priority.toUpperCase()}] ${a.description} → **${a.assignee}**`));
    lines.push("");
  }

  if (summary.dissentingOpinions.length > 0) {
    lines.push("## Dissenting Opinions");
    summary.dissentingOpinions.forEach(d => lines.push(`- ${d}`));
    lines.push("");
  }

  if (summary.followUpItems.length > 0) {
    lines.push("## Follow-up Items");
    summary.followUpItems.forEach(f => lines.push(`- ${f}`));
    lines.push("");
  }

  if (summary.keyPoints.length > 0) {
    lines.push("## Key Points");
    summary.keyPoints.forEach(k => lines.push(`- ${k}`));
  }

  return lines.join("\n");
}
