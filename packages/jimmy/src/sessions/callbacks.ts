import { getSession } from "./registry.js";
import { loadConfig } from "../shared/config.js";
import { logger } from "../shared/logger.js";
import type { Session } from "../shared/types.js";

/**
 * Notify the parent session that a child session has completed.
 * Sends an internal message to the parent via the local HTTP API.
 * Fire-and-forget — errors are logged but never rethrown.
 */
export function notifyParentSession(
  childSession: Session,
  result: { result?: string | null; error?: string | null; cost?: number; durationMs?: number },
): void {
  if (!childSession.parentSessionId) return;

  // Run asynchronously — do not await in the caller
  _sendNotification(childSession, result).catch((err) => {
    logger.warn(`[callbacks] Failed to notify parent session ${childSession.parentSessionId}: ${err instanceof Error ? err.message : String(err)}`);
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
    const raw = result.result || "Task completed (no output)";
    const preview = raw.length > 500 ? raw.substring(0, 500) + "..." : raw;
    message = `✅ Employee "${employeeName}" (session ${childId}) has completed their task.\n\nResult preview:\n${preview}`;
  }

  let port = 7777;
  try {
    const config = loadConfig();
    port = config.gateway?.port || 7777;
  } catch {
    // Use default port if config is unavailable
  }

  await fetch(`http://127.0.0.1:${port}/api/sessions/${childSession.parentSessionId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
}
