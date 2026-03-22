import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { logger } from "./logger.js";

const SWIFT_SCRIPT_PATH = path.join(os.homedir(), ".claude", "fetch-claude-usage.swift");
const FULL_USAGE_SCRIPT_PATH = path.join(os.homedir(), ".claude", "fetch-claude-usage-full.swift");
const COMPILED_BINARY_PATH = path.join(os.homedir(), ".claude", "fetch-claude-usage-full");
const POLL_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

export interface WindowData {
  utilization: number;
  resetsAt: string | null;
}

export interface ExtraUsageData {
  isEnabled: boolean;
  monthlyLimit: number;
  usedCredits: number;
  utilization: number;
}

export interface UsageCache {
  fiveHour: WindowData;
  sevenDay: WindowData | null;
  sevenDaySonnet: WindowData | null;
  extraUsage: ExtraUsageData | null;
  fetchedAt: string;
  error?: string;
}

let cachedUsage: UsageCache | null = null;
let pollerInterval: ReturnType<typeof setInterval> | null = null;

// Legacy interface for backward compat with getCachedUsage consumers
export interface LegacyUsageCache {
  utilization: number;
  resetsAt: string | null;
  fetchedAt: string;
  error?: string;
}

/**
 * Ensure the full-JSON Swift script exists. We generate it once from the
 * existing fetch-claude-usage.swift credentials.
 */
function ensureFullScript(): boolean {
  if (fs.existsSync(FULL_USAGE_SCRIPT_PATH)) return true;
  if (!fs.existsSync(SWIFT_SCRIPT_PATH)) return false;

  try {
    const original = fs.readFileSync(SWIFT_SCRIPT_PATH, "utf-8");
    const keyMatch = original.match(/let injectedKey\s*=\s*"([^"]+)"/);
    const orgMatch = original.match(/let injectedOrgId\s*=\s*"([^"]+)"/);
    if (!keyMatch?.[1] || !orgMatch?.[1]) return false;

    const script = `#!/usr/bin/env swift
import Foundation
let sessionKey = "${keyMatch[1]}"
let orgId = "${orgMatch[1]}"
guard let url = URL(string: "https://claude.ai/api/organizations/\\(orgId)/usage") else { print("ERROR:BAD_URL"); exit(1) }
var request = URLRequest(url: url)
request.setValue("sessionKey=\\(sessionKey)", forHTTPHeaderField: "Cookie")
request.setValue("application/json", forHTTPHeaderField: "Accept")
Task {
    do {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { print("ERROR:HTTP_FAIL"); exit(1) }
        print(String(data: data, encoding: .utf8) ?? "ERROR:DECODE")
        exit(0)
    } catch { print("ERROR:\\(error.localizedDescription)"); exit(1) }
}
RunLoop.main.run()
`;
    fs.writeFileSync(FULL_USAGE_SCRIPT_PATH, script, { mode: 0o755 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Compile the Swift script to a native binary for fast cold-boot execution.
 * Returns true if a usable binary exists after this call.
 */
let compileAttempted = false;
function ensureCompiledBinary(): boolean {
  if (fs.existsSync(COMPILED_BINARY_PATH)) {
    // Check if binary is newer than script
    try {
      const binStat = fs.statSync(COMPILED_BINARY_PATH);
      const srcStat = fs.statSync(FULL_USAGE_SCRIPT_PATH);
      if (binStat.mtimeMs >= srcStat.mtimeMs) return true;
    } catch {
      return false;
    }
  }

  if (compileAttempted) return false;
  compileAttempted = true;

  if (!fs.existsSync(FULL_USAGE_SCRIPT_PATH)) return false;

  // Compile asynchronously — don't block startup
  logger.info("Usage poller: compiling Swift script to binary for faster startup...");
  execFile("swiftc", ["-O", FULL_USAGE_SCRIPT_PATH, "-o", COMPILED_BINARY_PATH], { timeout: 120000 }, (err) => {
    if (err) {
      logger.warn(`Usage poller: Swift compilation failed — will use interpreted mode: ${err.message}`);
    } else {
      logger.info("Usage poller: Swift binary compiled successfully");
    }
  });

  return false;
}

function parseWindow(obj: Record<string, unknown> | undefined | null): WindowData | null {
  if (!obj || typeof obj !== "object") return null;
  const utilization = typeof obj.utilization === "number" ? obj.utilization : 0;
  const resetsAt = typeof obj.resets_at === "string" ? obj.resets_at : null;
  return { utilization, resetsAt };
}

/**
 * Fetch full usage data via Swift script (bypasses Cloudflare).
 */
export async function fetchUsageNow(): Promise<UsageCache | null> {
  const hasFullScript = ensureFullScript();
  const hasBinary = ensureCompiledBinary();
  const scriptToRun = hasFullScript ? FULL_USAGE_SCRIPT_PATH : SWIFT_SCRIPT_PATH;

  if (!hasBinary && !fs.existsSync(scriptToRun)) {
    logger.warn(`Usage poller: no Swift script found — cannot fetch usage`);
    return null;
  }

  // Use compiled binary if available (instant startup), otherwise interpret
  const cmd = hasBinary ? COMPILED_BINARY_PATH : "swift";
  const args = hasBinary ? [] : [scriptToRun];
  const timeout = hasBinary ? 15000 : 90000; // binary is fast, interpreter needs time

  try {
    const output = await new Promise<string>((resolve, reject) => {
      execFile(cmd, args, { timeout }, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr?.trim() || err.message));
          return;
        }
        resolve(stdout.trim());
      });
    });

    if (output.startsWith("ERROR:")) {
      logger.warn(`Usage poller: Swift script error — ${output}`);
      if (cachedUsage) cachedUsage = { ...cachedUsage, error: output };
      return cachedUsage;
    }

    const fetchedAt = new Date().toISOString();

    // Full JSON response
    if (output.startsWith("{")) {
      try {
        const data = JSON.parse(output) as Record<string, unknown>;

        const fiveHour = parseWindow(data.five_hour as Record<string, unknown>);
        const sevenDay = parseWindow(data.seven_day as Record<string, unknown>);
        const sevenDaySonnet = parseWindow(data.seven_day_sonnet as Record<string, unknown>);

        let extraUsage: ExtraUsageData | null = null;
        const extra = data.extra_usage as Record<string, unknown> | undefined;
        if (extra && typeof extra === "object") {
          extraUsage = {
            isEnabled: !!extra.is_enabled,
            monthlyLimit: typeof extra.monthly_limit === "number" ? extra.monthly_limit : 0,
            usedCredits: typeof extra.used_credits === "number" ? extra.used_credits : 0,
            utilization: typeof extra.utilization === "number" ? extra.utilization : 0,
          };
        }

        cachedUsage = {
          fiveHour: fiveHour ?? { utilization: 0, resetsAt: null },
          sevenDay,
          sevenDaySonnet,
          extraUsage,
          fetchedAt,
        };

        logger.debug(
          `Usage poller: 5h=${fiveHour?.utilization ?? 0}%, 7d=${sevenDay?.utilization ?? "n/a"}%, extra=${extraUsage?.utilization ?? "n/a"}%`
        );
        return cachedUsage;
      } catch {
        logger.warn(`Usage poller: failed to parse JSON — falling back to legacy`);
      }
    }

    // Legacy format: UTILIZATION|RESETS_AT
    const [utilStr, resetsAtRaw] = output.split("|");
    const utilization = parseInt(utilStr, 10);
    if (Number.isNaN(utilization)) {
      logger.warn(`Usage poller: could not parse output: ${output}`);
      return cachedUsage;
    }

    const resetsAt = resetsAtRaw && resetsAtRaw.length > 0 ? resetsAtRaw : null;
    cachedUsage = {
      fiveHour: { utilization, resetsAt },
      sevenDay: null,
      sevenDaySonnet: null,
      extraUsage: null,
      fetchedAt,
    };
    return cachedUsage;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.warn(`Usage poller: Swift script failed — ${errorMsg}`);
    if (cachedUsage) cachedUsage = { ...cachedUsage, error: errorMsg };
    return cachedUsage;
  }
}

/** Get cached usage (full data). */
export function getFullCachedUsage(): UsageCache | null {
  return cachedUsage;
}

/** Legacy accessor — returns just 5-hour data for backward compat. */
export function getCachedUsage(): LegacyUsageCache | null {
  if (!cachedUsage) return null;
  return {
    utilization: cachedUsage.fiveHour.utilization,
    resetsAt: cachedUsage.fiveHour.resetsAt,
    fetchedAt: cachedUsage.fetchedAt,
    error: cachedUsage.error,
  };
}

export function startUsagePoller(): void {
  if (pollerInterval !== null) {
    logger.debug("Usage poller: already running, skipping start");
    return;
  }

  if (!fs.existsSync(SWIFT_SCRIPT_PATH)) {
    logger.warn(`Usage poller: Swift script not found at ${SWIFT_SCRIPT_PATH} — poller will not start`);
    return;
  }

  logger.info("Usage poller: starting (3-minute interval, via Swift script)");

  // Initial fetch with retry — Swift compilation can be slow on first boot
  fetchUsageNow().catch((err) => {
    logger.warn(`Usage poller: initial fetch failed — retrying in 15s — ${err instanceof Error ? err.message : String(err)}`);
    setTimeout(() => {
      fetchUsageNow().catch((err2) => {
        logger.warn(`Usage poller: retry also failed — will try again on next interval — ${err2 instanceof Error ? err2.message : String(err2)}`);
      });
    }, 15_000);
  });

  pollerInterval = setInterval(() => {
    fetchUsageNow().catch((err) => {
      logger.warn(`Usage poller: interval fetch failed — ${err instanceof Error ? err.message : String(err)}`);
    });
  }, POLL_INTERVAL_MS);

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
