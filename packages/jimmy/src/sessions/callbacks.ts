import { getSession, updateSession, getMessageCount } from "./registry.js";
import { loadConfig } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import type { Session, JinnConfig } from "../shared/types.js";

/**
 * Notify the parent session that a child session has replied.
 * Sends an internal message to the parent via the local HTTP API.
 * Fire-and-forget — errors are logged but never rethrown.
 *
 * If config.notifications.completionSummary is true and this session has a parent,
 * spawns a Hikui session to generate a brief summary instead of waking the COO directly.
 * The _summaryFor guard in transportMeta prevents Hikui sessions from spawning further Hikui sessions.
 */
export function notifyParentSession(
  childSession: Session,
  result: { result?: string | null; error?: string | null; cost?: number; durationMs?: number },
  options?: { alwaysNotify?: boolean },
): void {
  if (!childSession.parentSessionId) return;
  if (options?.alwaysNotify === false) return;

  // Synchronously increment the child completion counter on the parent session.
  // This is a quick DB op and must complete before the async notification fires
  // so the counter is accurate when maybeAutoCompact reads it at the end of the
  // parent's next turn.
  _incrementChildCompletions(childSession.parentSessionId);

  // Check if per-session opt-out is set
  const childMeta = (childSession.transportMeta || {}) as Record<string, unknown>;
  const skipSummary = childMeta.skipCompletionSummary === true;

  // Check config for Hikui summary routing. Guard: skip if this IS a Hikui summary session
  // (_summaryFor is set) to prevent infinite loops.
  const isSummarySession = typeof childMeta._summaryFor === "string";

  if (!skipSummary && !isSummarySession && !result.error) {
    let config: JinnConfig | null = null;
    try {
      config = loadConfig();
    } catch {
      // Config unavailable — fall through to direct notification
    }
    if (config?.notifications?.completionSummary === true) {
      notifyViaHikuiSummary(childSession, result, config).catch((err) => {
        logger.warn(`[callbacks] Hikui summary failed for session ${childSession.id}, falling back to direct notification: ${err instanceof Error ? err.message : String(err)}`);
        // Fall back to direct notification on Hikui failure
        _sendNotification(childSession, result).catch((innerErr) => {
          logger.warn(`[callbacks] Fallback notification also failed: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`);
        });
      });
      return;
    }
  }

  // Run asynchronously — do not await in the caller
  _sendNotification(childSession, result).catch((err) => {
    logger.warn(`[callbacks] Failed to notify parent session ${childSession.parentSessionId}: ${err instanceof Error ? err.message : String(err)}`);
  });
}

/**
 * Spawn a Hikui (Haiku) session to summarise a completed child session,
 * then post the summary passively to the parent session and Discord.
 * Fire-and-forget from the caller — errors propagate to notifyParentSession's catch.
 */
async function notifyViaHikuiSummary(
  childSession: Session,
  result: { result?: string | null; error?: string | null; cost?: number; durationMs?: number },
  config: JinnConfig,
): Promise<void> {
  const port = config.gateway?.port || 7777;
  const employeeName = childSession.employee || "Unknown";
  const resultPreview = (result.result || "(no output)").substring(0, 500);

  const summaryPrompt =
    `A background task just completed. Summarise what was done in 1-2 sentences, in plain English with no markdown. ` +
    `Task: ${childSession.title || employeeName}. ` +
    `Result preview: ${resultPreview}`;

  await fetch(`http://127.0.0.1:${port}/api/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      employee: "hikui",
      model: "haiku",
      prompt: summaryPrompt,
      parentSessionId: childSession.parentSessionId,
      transportMeta: {
        _summaryFor: childSession.parentSessionId,
      },
    }),
  });
}

/**
 * Increment the pending child-completion counter stored in the parent session's
 * transportMeta. Called synchronously inside notifyParentSession so the count is
 * always up-to-date before the parent's next turn checks it.
 */
function _incrementChildCompletions(parentSessionId: string): void {
  const parent = getSession(parentSessionId);
  if (!parent) return;
  const meta = { ...(parent.transportMeta || {}) } as Record<string, unknown>;
  const ac = (meta.autoCompact && typeof meta.autoCompact === 'object' && !Array.isArray(meta.autoCompact))
    ? { ...(meta.autoCompact as Record<string, unknown>) }
    : {} as Record<string, unknown>;
  ac.childCompletions = ((ac.childCompletions as number) ?? 0) + 1;
  meta.autoCompact = ac;
  updateSession(parentSessionId, { transportMeta: meta as any });
}

/**
 * Notify the parent session that a child session has been rate-limited and will auto-resume.
 * Fire-and-forget — errors are logged but never rethrown.
 */
export function notifyRateLimited(
  childSession: Session,
  estimatedResumeTime?: string, // ISO timestamp or human-readable
): void {
  if (!childSession.parentSessionId) return;

  _sendNotification(childSession, {
    error: null,
    result: `⏳ Session is rate-limited and will auto-resume${estimatedResumeTime ? ` around ${estimatedResumeTime}` : ' when the limit resets'}. No action needed.`,
  }).catch((err) => {
    logger.warn(`[callbacks] Failed to send rate-limit notification: ${err instanceof Error ? err.message : String(err)}`);
  });
}

/**
 * Notify the parent session that a rate-limited child session has successfully resumed.
 * Fire-and-forget — errors are logged but never rethrown.
 */
export function notifyRateLimitResumed(
  childSession: Session,
): void {
  if (!childSession.parentSessionId) return;

  const employeeName = childSession.employee || "Unknown";
  _sendRaw(childSession.parentSessionId, `🔄 Employee "${employeeName}" (session ${childSession.id}) has resumed after rate limit cleared.`).catch((err) => {
    logger.warn(`[callbacks] Failed to send resume notification: ${err instanceof Error ? err.message : String(err)}`);
  });
}

async function _sendNotification(
  childSession: Session,
  result: { result?: string | null; error?: string | null; cost?: number; durationMs?: number },
): Promise<void> {
  const parent = getSession(childSession.parentSessionId!);
  if (!parent) return; // Parent gone or expired
  if (parent.status === "error") return; // Parent already in error — skip

  const employeeName = childSession.employee || "Unknown";
  const childId = childSession.id;

  let message: string;
  if (result.error) {
    message = `⚠️ Employee "${employeeName}" (session ${childId}) encountered an error: ${result.error}`;
  } else {
    const raw = result.result || "(no output)";
    const preview = raw.length > 200 ? raw.substring(0, 200) + "..." : raw;
    message = `📩 ${employeeName} completed a task.\nPreview: ${preview}`;
  }

  await _sendRaw(childSession.parentSessionId!, message);
}

/**
 * Send a hardcoded notification to the configured Discord channel.
 * Used for rate-limit alerts that must not depend on the LLM.
 * Fire-and-forget — errors are logged but never rethrown.
 */
export function notifyDiscordChannel(message: string): void {
  _sendDiscordNotification(message).catch((err) => {
    logger.warn(`[callbacks] Failed to send Discord notification: ${err instanceof Error ? err.message : String(err)}`);
  });
}

async function _sendDiscordNotification(message: string): Promise<void> {
  let port = 7777;
  let connector = "discord";
  let channel: string | undefined;

  try {
    const config = loadConfig();
    port = config.gateway?.port || 7777;
    connector = config.notifications?.connector || "discord";
    channel = config.notifications?.channel;
  } catch {
    // Use defaults if config is unavailable
  }

  if (!channel) {
    logger.debug("[callbacks] No notifications.channel configured — skipping Discord notification");
    return;
  }

  await fetch(`http://127.0.0.1:${port}/api/connectors/${connector}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel, text: message }),
  });
}

/**
 * Check auto-compact thresholds for a completed session and compact if needed.
 * Should be called at the end of each turn for top-level (parent-less) sessions.
 * Compaction only fires when the session is idle, so it never interrupts active
 * processing. Fire-and-forget — errors are logged but never rethrown.
 */
export function maybeAutoCompact(session: Session, config: JinnConfig): void {
  const sessionsCfg = config.sessions ?? {};
  if (sessionsCfg.autoCompact === false) return;

  _autoCompact(session.id, sessionsCfg).catch((err) => {
    logger.warn(
      `[callbacks] Auto-compact failed for session ${session.id}: ${err instanceof Error ? err.message : String(err)}`,
    );
  });
}

async function _autoCompact(
  sessionId: string,
  sessionsCfg: NonNullable<JinnConfig['sessions']>,
): Promise<void> {
  const compactAfterChildren = sessionsCfg.compactAfterChildren ?? 3;
  const compactAfterMessages = sessionsCfg.compactAfterMessages ?? 50;

  // Re-read session from DB — status may have changed since the caller checked it
  const session = getSession(sessionId);
  if (!session) return;

  // Only compact when the session is idle — never interrupt a running turn
  if (session.status === 'running' || session.status === 'waiting') return;

  const meta = (session.transportMeta || {}) as Record<string, unknown>;
  const ac = (meta.autoCompact && typeof meta.autoCompact === 'object' && !Array.isArray(meta.autoCompact))
    ? (meta.autoCompact as Record<string, unknown>)
    : {} as Record<string, unknown>;
  const childCompletions = (ac.childCompletions as number) ?? 0;

  const msgCount = getMessageCount(sessionId);

  const compactByChildren = childCompletions >= compactAfterChildren;
  const compactByMessages = msgCount >= compactAfterMessages;

  if (!compactByChildren && !compactByMessages) return;

  const reason = compactByChildren
    ? `${childCompletions} child sessions completed`
    : `${msgCount} messages`;

  logger.info(`Session ${sessionId} auto-compacting (reason: ${reason})`);

  let port = 7777;
  try {
    const cfg = loadConfig();
    port = cfg.gateway?.port ?? 7777;
  } catch {
    // Use default port
  }

  await fetch(`http://127.0.0.1:${port}/api/sessions/${sessionId}/compact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  // Reset the child completion counter after a successful compact
  const freshSession = getSession(sessionId);
  if (freshSession) {
    const freshMeta = { ...(freshSession.transportMeta || {}) } as Record<string, unknown>;
    const freshAc = (freshMeta.autoCompact && typeof freshMeta.autoCompact === 'object' && !Array.isArray(freshMeta.autoCompact))
      ? { ...(freshMeta.autoCompact as Record<string, unknown>) }
      : {} as Record<string, unknown>;
    freshAc.childCompletions = 0;
    freshMeta.autoCompact = freshAc;
    updateSession(sessionId, { transportMeta: freshMeta as any });
  }
}

async function _sendRaw(parentSessionId: string, message: string): Promise<void> {
  let port = 7777;
  try {
    const config = loadConfig();
    port = config.gateway?.port || 7777;
  } catch {
    // Use default port if config is unavailable
  }

  await fetch(`http://127.0.0.1:${port}/api/sessions/${parentSessionId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, role: "notification" }),
  });
}
