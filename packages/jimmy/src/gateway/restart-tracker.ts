/**
 * Restart circuit breaker, session freeze, and persistence for crash-loop detection.
 *
 * The tracker state is written to ~/.jinn/tmp/restart-tracker.json so that
 * crash-restart loops are detected even when the process fully exits between
 * restarts. On startup, call loadRestartTracker() to restore prior state.
 */

import fs from "node:fs";
import path from "node:path";
import { TMP_DIR } from "../shared/paths.js";
import { logger } from "../shared/logger.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const RESTART_LIMIT = 3;
export const RESTART_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const TRACKER_FILE = path.join(TMP_DIR, "restart-tracker.json");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RestartTrackerState {
  timestamps: number[];
  halted: boolean;
  haltReason?: string;
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let tracker: RestartTrackerState = {
  timestamps: [],
  halted: false,
};

let sessionFrozen = false;
let frozenReason = "";

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

/**
 * Load the tracker state from disk. Call once at server startup so prior
 * restart timestamps are taken into account for crash-loop detection.
 */
export function loadRestartTracker(): void {
  try {
    if (!fs.existsSync(TRACKER_FILE)) return;
    const raw = fs.readFileSync(TRACKER_FILE, "utf-8");
    const parsed = JSON.parse(raw) as RestartTrackerState;
    // Only keep timestamps that are still within the window.
    const now = Date.now();
    const recentTimestamps = (parsed.timestamps ?? []).filter(
      (t) => now - t < RESTART_WINDOW_MS,
    );
    tracker = {
      timestamps: recentTimestamps,
      halted: parsed.halted ?? false,
      haltReason: parsed.haltReason,
    };
    if (tracker.halted) {
      logger.warn(
        `Restart circuit breaker is HALTED from previous run: ${tracker.haltReason ?? "unknown reason"}`,
      );
    } else if (recentTimestamps.length > 0) {
      logger.info(
        `Loaded ${recentTimestamps.length} recent restart timestamp(s) from previous run`,
      );
    }
  } catch (err) {
    logger.warn(
      `Could not load restart tracker: ${err instanceof Error ? err.message : err}`,
    );
  }
}

function persistTracker(): void {
  try {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    fs.writeFileSync(TRACKER_FILE, JSON.stringify(tracker, null, 2), "utf-8");
  } catch (err) {
    logger.warn(
      `Could not persist restart tracker: ${err instanceof Error ? err.message : err}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Circuit breaker
// ---------------------------------------------------------------------------

/**
 * Check whether a restart is currently permitted.
 */
export function canRestart(): { allowed: boolean; reason?: string } {
  if (tracker.halted) {
    return {
      allowed: false,
      reason: tracker.haltReason ?? "Restart halted — manual intervention required",
    };
  }
  const now = Date.now();
  const recent = tracker.timestamps.filter((t) => now - t < RESTART_WINDOW_MS);
  if (recent.length >= RESTART_LIMIT) {
    return {
      allowed: false,
      reason: `Circuit breaker: ${RESTART_LIMIT} restarts in ${RESTART_WINDOW_MS / 60000} minutes — halted. Manual intervention required.`,
    };
  }
  return { allowed: true };
}

/**
 * Record a restart attempt. Automatically trips the circuit breaker when the
 * limit is reached and persists the updated state to disk.
 */
export function recordRestart(): void {
  const now = Date.now();
  tracker.timestamps.push(now);
  // Prune timestamps outside the window.
  tracker.timestamps = tracker.timestamps.filter(
    (t) => now - t < RESTART_WINDOW_MS,
  );
  if (tracker.timestamps.length >= RESTART_LIMIT && !tracker.halted) {
    tracker.halted = true;
    tracker.haltReason = `Circuit breaker: ${RESTART_LIMIT} restarts within ${RESTART_WINDOW_MS / 60000} minutes`;
    logger.error(tracker.haltReason);
  }
  persistTracker();
}

/**
 * Manually reset the circuit breaker. Clears halt state and restart history.
 */
export function resetCircuitBreaker(): void {
  tracker = { timestamps: [], halted: false };
  persistTracker();
  logger.info("Restart circuit breaker reset");
}

/**
 * Returns a read-only snapshot of the current circuit-breaker state.
 */
export function getRestartTrackerState(): Readonly<RestartTrackerState> {
  return { ...tracker };
}

// ---------------------------------------------------------------------------
// Session freeze
// ---------------------------------------------------------------------------

/**
 * Freeze new session creation. Should be called as soon as a restart is
 * scheduled so no new sessions start during the countdown.
 */
export function freezeSessions(reason: string): void {
  sessionFrozen = true;
  frozenReason = reason;
  logger.info(`Session intake frozen: ${reason}`);
}

/**
 * Lift the session intake freeze (called on clean startup after a restart
 * completes, if the process ever wants to cancel a pending restart).
 */
export function unfreezeSessions(): void {
  sessionFrozen = false;
  frozenReason = "";
  logger.info("Session intake unfrozen");
}

/**
 * Returns the current freeze state. Use this to gate session creation.
 */
export function isSessionFrozen(): { frozen: boolean; reason: string } {
  return { frozen: sessionFrozen, reason: frozenReason };
}
