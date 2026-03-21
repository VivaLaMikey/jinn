import fs from "node:fs";
import path from "node:path";
import { JINN_HOME } from "./paths.js";
import { logger } from "./logger.js";
import { getCachedUsage } from "./usagePoller.js";

interface ClaudeUsageState {
  lastRateLimitAt?: string; // ISO
  lastResetsAt?: string; // ISO
}

const STATE_PATH = path.join(JINN_HOME, "tmp", "claude-usage.json");

function ensureStateDir(): void {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
}

export function readClaudeUsageState(): ClaudeUsageState {
  try {
    if (!fs.existsSync(STATE_PATH)) return {};
    const raw = fs.readFileSync(STATE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as ClaudeUsageState;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

export function recordClaudeRateLimit(resetsAtSeconds?: number): void {
  const nowIso = new Date().toISOString();
  const next: ClaudeUsageState = {
    ...readClaudeUsageState(),
    lastRateLimitAt: nowIso,
    ...(typeof resetsAtSeconds === "number" && Number.isFinite(resetsAtSeconds)
      ? { lastResetsAt: new Date(resetsAtSeconds * 1000).toISOString() }
      : {}),
  };

  try {
    ensureStateDir();
    const tmp = `${STATE_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2), "utf-8");
    fs.renameSync(tmp, STATE_PATH);
  } catch {
    // best-effort only
  }
}

export function getClaudeExpectedResetAt(now = new Date()): Date | undefined {
  const state = readClaudeUsageState();
  if (!state.lastResetsAt) return undefined;
  const d = new Date(state.lastResetsAt);
  if (Number.isNaN(d.getTime())) return undefined;
  if (d.getTime() <= now.getTime()) return undefined;
  return d;
}

export function isLikelyNearClaudeUsageLimit(now = new Date()): boolean {
  const state = readClaudeUsageState();
  if (!state.lastRateLimitAt) return false;

  // If we know the exact reset time and it has passed, the limit is cleared
  if (state.lastResetsAt) {
    const resetAt = new Date(state.lastResetsAt);
    if (!Number.isNaN(resetAt.getTime()) && now.getTime() > resetAt.getTime()) {
      return false;
    }
  }

  const d = new Date(state.lastRateLimitAt);
  if (Number.isNaN(d.getTime())) return false;
  // Heuristic: if we've hit the limit recently, we're likely near it again.
  return now.getTime() - d.getTime() < 6 * 60 * 60_000;
}

// ---------------------------------------------------------------------------
// UsageMonitor — polls the Anthropic usage API every 5 minutes
// ---------------------------------------------------------------------------

/** Raw five_hour window data from the Anthropic usage API. */
export interface FiveHourWindow {
  utilization: number;
  resetsAt: string;
  remainingMinutes: number;
}

/** All usage data returned by getUsage(). */
export interface UsageData {
  fiveHour: FiveHourWindow | null;
  /** Any additional raw fields from the API response. */
  raw: Record<string, unknown>;
  fetchedAt: string;
}

/** Throttle recommendation from shouldThrottle(). */
export interface ThrottleRecommendation {
  shouldThrottle: boolean;
  reason: string;
}

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const FIVE_HOUR_WINDOW_MS = 300 * 60 * 1000; // 300 minutes in ms

export class UsageMonitor {
  private readonly sessionKey: string;
  private readonly orgId: string;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private cachedUsage: UsageData | null = null;

  constructor(sessionKey: string, orgId: string) {
    this.sessionKey = sessionKey;
    this.orgId = orgId;
  }

  start(): void {
    logger.info("UsageMonitor: starting — will poll Anthropic usage API every 5 minutes");
    // Fetch immediately, then schedule repeating polls
    void this.poll();
    this.scheduleNext();
  }

  stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    logger.info("UsageMonitor: stopped");
  }

  getUsage(): UsageData | null {
    return this.cachedUsage;
  }

  shouldThrottle(): ThrottleRecommendation {
    const usage = this.cachedUsage;
    if (!usage || !usage.fiveHour) {
      return { shouldThrottle: false, reason: "no usage data available" };
    }

    const { utilization, resetsAt } = usage.fiveHour;
    const windowStartMs = new Date(resetsAt).getTime() - FIVE_HOUR_WINDOW_MS;
    const elapsedMs = Date.now() - windowStartMs;
    const elapsedMinutes = Math.max(0, elapsedMs / 60_000);

    // Expected utilisation at this point in the window (0–100)
    const expectedUtilization = (elapsedMinutes / 300) * 100;

    if (utilization > expectedUtilization) {
      return {
        shouldThrottle: true,
        reason: `utilisation ${utilization}% exceeds expected ${Math.round(expectedUtilization)}% at ${Math.round(elapsedMinutes)}min into window`,
      };
    }

    return { shouldThrottle: false, reason: "on pace" };
  }

  private scheduleNext(): void {
    this.timer = setTimeout(() => {
      void this.poll();
      this.scheduleNext();
    }, POLL_INTERVAL_MS);
  }

  private async poll(): Promise<void> {
    try {
      const url = `https://claude.ai/api/organizations/${this.orgId}/usage`;
      const response = await fetch(url, {
        headers: {
          Cookie: `sessionKey=${this.sessionKey}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        logger.warn(`UsageMonitor: API returned ${response.status} — skipping update`);
        return;
      }

      const body = (await response.json()) as Record<string, unknown>;
      const now = new Date().toISOString();

      let fiveHour: FiveHourWindow | null = null;
      const raw = body as Record<string, unknown>;

      if (body.five_hour && typeof body.five_hour === "object") {
        const fh = body.five_hour as Record<string, unknown>;
        const utilization = typeof fh.utilization === "number" ? fh.utilization : 0;
        const resetsAt = typeof fh.resets_at === "string" ? fh.resets_at : now;
        const resetsAtMs = new Date(resetsAt).getTime();
        const remainingMinutes = Math.max(0, Math.round((resetsAtMs - Date.now()) / 60_000));

        fiveHour = { utilization, resetsAt, remainingMinutes };
      }

      this.cachedUsage = { fiveHour, raw, fetchedAt: now };
      logger.debug(`UsageMonitor: fetched usage — utilisation ${fiveHour?.utilization ?? "n/a"}%`);
    } catch (err) {
      logger.warn(`UsageMonitor: fetch failed — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Proactive polling exports (delegates to usagePoller module)
// ---------------------------------------------------------------------------

/**
 * Returns real-time utilisation data from the usage poller.
 * Returns null if the poller has not yet fetched data or is not running.
 */
export function getUtilization(): { percentage: number; resetsAt: string | null; fetchedAt: string } | null {
  const cached = getCachedUsage();
  if (!cached) return null;
  return {
    percentage: cached.utilization,
    resetsAt: cached.resetsAt,
    fetchedAt: cached.fetchedAt,
  };
}

/**
 * Returns true if the current utilisation is disproportionately high relative
 * to how much of the 5-hour window has elapsed (with a 10% buffer).
 *
 * Logic: if utilization > (timeElapsedInWindow / totalWindowDuration) * 100 + 10
 */
export function isPacingExceeded(now = new Date()): boolean {
  const cached = getCachedUsage();
  if (!cached || !cached.resetsAt) return false;

  const WINDOW_MS = 5 * 60 * 60_000; // 5 hours
  const resetsAtMs = new Date(cached.resetsAt).getTime();
  if (Number.isNaN(resetsAtMs)) return false;

  const windowStartMs = resetsAtMs - WINDOW_MS;
  const elapsedMs = now.getTime() - windowStartMs;

  // If elapsed is negative or zero the window hasn't started — treat as not exceeded
  if (elapsedMs <= 0) return false;

  const elapsedFraction = Math.min(elapsedMs / WINDOW_MS, 1);
  const expectedUtilization = elapsedFraction * 100;

  return cached.utilization > expectedUtilization + 10;
}
