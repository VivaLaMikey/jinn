import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { logger } from "./logger.js";

const SWIFT_SCRIPT_PATH = path.join(os.homedir(), ".claude", "fetch-claude-usage.swift");
const POLL_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
const CLAUDE_USAGE_API = "https://claude.ai/api/organizations/{orgId}/usage";

export interface UsageCache {
  utilization: number;      // 0-100 percentage
  resetsAt: string | null;  // ISO timestamp
  fetchedAt: string;        // ISO timestamp of when we fetched
  error?: string;           // last error if fetch failed
}

let cachedUsage: UsageCache | null = null;
let pollerInterval: ReturnType<typeof setInterval> | null = null;

interface SwiftCredentials {
  sessionKey: string;
  orgId: string;
}

function parseSwiftScript(): SwiftCredentials | null {
  try {
    if (!fs.existsSync(SWIFT_SCRIPT_PATH)) {
      logger.warn(`Usage poller: Swift script not found at ${SWIFT_SCRIPT_PATH}`);
      return null;
    }

    const contents = fs.readFileSync(SWIFT_SCRIPT_PATH, "utf-8");

    const keyMatch = contents.match(/let injectedKey\s*=\s*"([^"]+)"/);
    const orgMatch = contents.match(/let injectedOrgId\s*=\s*"([^"]+)"/);

    if (!keyMatch || !keyMatch[1]) {
      logger.warn("Usage poller: could not parse injectedKey from Swift script");
      return null;
    }

    if (!orgMatch || !orgMatch[1]) {
      logger.warn("Usage poller: could not parse injectedOrgId from Swift script");
      return null;
    }

    const sessionKey = keyMatch[1].trim();
    const orgId = orgMatch[1].trim();

    if (!sessionKey || !orgId) {
      logger.warn("Usage poller: sessionKey or orgId is empty in Swift script");
      return null;
    }

    return { sessionKey, orgId };
  } catch (err) {
    logger.warn(`Usage poller: error reading Swift script — ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export async function fetchUsageNow(): Promise<UsageCache | null> {
  const credentials = parseSwiftScript();
  if (!credentials) return null;

  const { sessionKey, orgId } = credentials;
  const url = CLAUDE_USAGE_API.replace("{orgId}", orgId);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Cookie: `sessionKey=${sessionKey}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorMsg = `HTTP ${response.status} ${response.statusText}`;
      logger.warn(`Usage poller: API request failed — ${errorMsg}`);
      if (cachedUsage) {
        cachedUsage = { ...cachedUsage, error: errorMsg };
      }
      return cachedUsage;
    }

    const data = (await response.json()) as {
      five_hour?: { utilization?: number; resets_at?: string };
    };

    const fiveHour = data.five_hour;
    const utilization = typeof fiveHour?.utilization === "number" ? fiveHour.utilization : 0;
    const resetsAt = fiveHour?.resets_at ?? null;
    const fetchedAt = new Date().toISOString();

    cachedUsage = { utilization, resetsAt, fetchedAt };

    logger.debug(`Usage poller: utilization=${utilization}%, resets_at=${resetsAt ?? "unknown"}, org=${orgId}`);

    return cachedUsage;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.warn(`Usage poller: fetch error — ${errorMsg}`);
    if (cachedUsage) {
      cachedUsage = { ...cachedUsage, error: errorMsg };
    }
    return cachedUsage;
  }
}

export function getCachedUsage(): UsageCache | null {
  return cachedUsage;
}

export function startUsagePoller(): void {
  if (pollerInterval !== null) {
    logger.debug("Usage poller: already running, skipping start");
    return;
  }

  // Verify credentials are accessible before starting
  const credentials = parseSwiftScript();
  if (!credentials) {
    logger.warn("Usage poller: could not read credentials — poller will not start");
    return;
  }

  logger.info("Usage poller: starting (3-minute interval)");

  // Immediate fetch on startup
  fetchUsageNow().catch((err) => {
    logger.warn(`Usage poller: initial fetch failed — ${err instanceof Error ? err.message : String(err)}`);
  });

  pollerInterval = setInterval(() => {
    fetchUsageNow().catch((err) => {
      logger.warn(`Usage poller: interval fetch failed — ${err instanceof Error ? err.message : String(err)}`);
    });
  }, POLL_INTERVAL_MS);

  // Allow Node.js to exit even if interval is still active
  if (pollerInterval.unref) {
    pollerInterval.unref();
  }
}

export function stopUsagePoller(): void {
  if (pollerInterval !== null) {
    clearInterval(pollerInterval);
    pollerInterval = null;
    logger.info("Usage poller: stopped");
  }
}
