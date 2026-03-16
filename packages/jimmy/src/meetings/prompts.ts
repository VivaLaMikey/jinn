import type { AgendaItem, MeetingConfig, MeetingTranscriptEntry } from "./types.js";
import type { Employee } from "../shared/types.js";

/**
 * Build the system prompt for a participant in the meeting.
 * This is their persona + meeting context.
 */
export function buildParticipantSystemPrompt(
  employee: Employee,
  meeting: MeetingConfig,
  role: "chair" | "participant" | "observer",
): string {
  const roleInstruction = role === "chair"
    ? "You are the CHAIR of this meeting. Your job is to moderate discussion, ensure all perspectives are heard, keep the conversation focused, and summarise key points. Challenge weak arguments and push for concrete decisions."
    : role === "observer"
    ? "You are an OBSERVER in this meeting. Contribute only when your specific expertise is directly relevant. Do not dominate discussion."
    : "You are a PARTICIPANT in this meeting. Share your professional perspective based on your expertise. Be direct, challenge assumptions when warranted, and propose concrete solutions.";

  const participantList = meeting.participants
    .map(p => `- ${p.employeeName} (${p.role})`)
    .join("\n");

  const agendaList = meeting.agenda
    .map((item, i) => `${i + 1}. **${item.topic}**${item.description ? `: ${item.description}` : ""}${item.goal ? ` (Goal: ${item.goal})` : ""}`)
    .join("\n");

  return `# Meeting: ${meeting.title}

## Your Role
You are ${employee.displayName} (${employee.department} department, ${employee.rank}).
${employee.persona}

${roleInstruction}

## Meeting Rules
- Be concise and substantive — no filler, no pleasantries, no "great point" responses
- Back positions with reasoning, data, or experience
- If you disagree with someone, say so directly and explain why
- Propose actionable next steps when possible
- Stay focused on the current agenda topic
- Respond in 2-4 paragraphs maximum

## Participants
${participantList}

## Full Agenda
${agendaList}`;
}

/**
 * Build the prompt for a participant's initial response to an agenda topic.
 */
export function buildInitialTurnPrompt(
  agendaItem: AgendaItem,
  agendaIndex: number,
  totalAgenda: number,
): string {
  return `## Agenda Item ${agendaIndex + 1}/${totalAgenda}: ${agendaItem.topic}

${agendaItem.description ? `Context: ${agendaItem.description}\n` : ""}${agendaItem.goal ? `Goal: ${agendaItem.goal}\n` : ""}

Share your perspective on this topic. Consider: What is the current state? What are the key challenges or opportunities? What do you recommend and why?`;
}

/**
 * Build the prompt for a rebuttal/response round where a participant
 * sees all other participants' initial responses.
 */
export function buildRebuttalPrompt(
  agendaItem: AgendaItem,
  agendaIndex: number,
  totalAgenda: number,
  previousResponses: MeetingTranscriptEntry[],
): string {
  const responseSummary = previousResponses
    .map(r => `### ${r.speaker} (${r.department})\n${r.content}`)
    .join("\n\n---\n\n");

  return `## Agenda Item ${agendaIndex + 1}/${totalAgenda}: ${agendaItem.topic} — Response Round

Here is what other participants said in the previous round:

${responseSummary}

---

Now respond. Do you agree or disagree with any points? What was missed? What concrete actions or decisions should result from this discussion? Be direct.`;
}

/**
 * Build the prompt for the chair to moderate after discussion rounds.
 */
export function buildChairModerationPrompt(
  agendaItem: AgendaItem,
  agendaIndex: number,
  totalAgenda: number,
  allResponses: MeetingTranscriptEntry[],
): string {
  const responseSummary = allResponses
    .map(r => `### ${r.speaker} (${r.department}, Round ${r.round + 1})\n${r.content}`)
    .join("\n\n---\n\n");

  return `## Chair Summary — Agenda Item ${agendaIndex + 1}/${totalAgenda}: ${agendaItem.topic}

Here is the full discussion:

${responseSummary}

---

As chair, provide a brief summary:
1. **Key points of agreement**
2. **Points of contention** (if any)
3. **Decision or recommendation** for this agenda item
4. **Action items** arising from this discussion (with assignees if clear)

Be concise and decisive.`;
}

/**
 * Build the final summary prompt sent to the chair after all agenda items.
 */
export function buildFinalSummaryPrompt(
  meeting: MeetingConfig,
  allTranscript: MeetingTranscriptEntry[],
): string {
  const groupedByAgenda = meeting.agenda.map((item, idx) => {
    const entries = allTranscript.filter(e => e.agendaIndex === idx);
    const discussion = entries
      .map(r => `**${r.speaker}** (${r.department}, Round ${r.round + 1}): ${r.content.slice(0, 300)}${r.content.length > 300 ? "..." : ""}`)
      .join("\n\n");
    return `### ${idx + 1}. ${item.topic}\n${discussion}`;
  });

  return `# Meeting Summary Request: ${meeting.title}

You chaired this meeting. Below is a condensed transcript of all agenda items and discussion.

${groupedByAgenda.join("\n\n---\n\n")}

---

Generate a structured meeting summary in the following JSON format. Return ONLY valid JSON, no markdown code fences:

{
  "decisions": ["Decision 1", "Decision 2"],
  "actionItems": [
    {"description": "What needs to be done", "assignee": "employee-name", "priority": "high|medium|low"}
  ],
  "dissentingOpinions": ["Any notable disagreements that were not fully resolved"],
  "followUpItems": ["Items that need further discussion or investigation"],
  "keyPoints": ["The most important takeaways from this meeting"]
}`;
}
