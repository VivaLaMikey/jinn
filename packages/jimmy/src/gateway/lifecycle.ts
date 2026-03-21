import { execSync, fork } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { PID_FILE, JINN_HOME, INSTANCES_REGISTRY } from "../shared/paths.js";
import { logger } from "../shared/logger.js";
import { spawnRestartWatcher } from "./restart-watcher-spawner.js";
export { spawnRestartWatcher };
import type { JinnConfig } from "../shared/types.js";
import { startGateway } from "./server.js";
import { loadConfig } from "../shared/config.js";
import { listSessions } from "../sessions/registry.js";

export async function startForeground(config: JinnConfig): Promise<void> {
  const cleanup = await startGateway(config);

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) {
      logger.info("Forced exit");
      process.exit(1);
    }
    shuttingDown = true;
    logger.info("Shutting down gateway...");

    // Force exit if graceful shutdown takes too long
    const forceTimer = setTimeout(() => {
      logger.warn("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, 5000);
    forceTimer.unref();

    await cleanup();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

export function startDaemon(config: JinnConfig): void {
  const __filename = fileURLToPath(import.meta.url);
  const candidateEntryScripts = [
    // When running from a built bundle, __filename is dist/src/gateway/lifecycle.js
    path.resolve(path.dirname(__filename), "daemon-entry.js"),
    // Fallback for unusual layouts
    path.resolve(path.dirname(__filename), "..", "..", "dist", "src", "gateway", "daemon-entry.js"),
  ];
  const entryScript = candidateEntryScripts.find((p) => fs.existsSync(p)) ?? candidateEntryScripts[0];

  // Fork a child process that will run the gateway
  const child = fork(entryScript, [], {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, JINN_HOME },
  });

  if (child.pid) {
    fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
    fs.writeFileSync(PID_FILE, String(child.pid));
    logger.info(`Gateway daemon started with PID ${child.pid}`);
  }

  child.unref();
}

export function stop(port?: number): boolean {
  // Try PID file first
  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, "utf-8").trim(), 10);

    try {
      process.kill(pid, "SIGTERM");
      logger.info(`Sent SIGTERM to gateway process ${pid}`);
      fs.unlinkSync(PID_FILE);
      return true;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ESRCH") {
        logger.warn(`Process ${pid} not found. Cleaning up stale PID file.`);
        fs.unlinkSync(PID_FILE);
      } else {
        throw err;
      }
    }
    // PID file existed but was stale; fall through to kill by port.
  }

  // No PID file — try to kill whatever is listening on the port
  const targetPort = port ?? resolvePort();
  const pid = findPidOnPort(targetPort);
  if (pid) {
    try {
      process.kill(pid, "SIGTERM");
      logger.info(`Killed process ${pid} on port ${targetPort}`);
      return true;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === "ESRCH") {
        logger.warn(`Process ${pid} already gone.`);
        return true;
      }
      throw err;
    }
  }

  logger.warn(`No PID file found and nothing listening on port ${targetPort}.`);
  return false;
}

function resolvePort(): number {
  try {
    const config = loadConfig();
    return config.gateway?.port || 7777;
  } catch {
    return 7777;
  }
}

function findPidOnPort(port: number): number | null {
  try {
    if (process.platform === "win32") {
      const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: "utf-8" }).trim();
      if (!output) return null;
      // netstat output: proto  local_addr  foreign_addr  state  PID
      const parts = output.split("\n")[0].trim().split(/\s+/);
      const pid = parseInt(parts[parts.length - 1], 10);
      return isNaN(pid) ? null : pid;
    } else {
      const output = execSync(
        process.platform === "darwin"
          ? `/usr/sbin/lsof -ti tcp:${port}`
          : `lsof -ti tcp:${port}`,
        { encoding: "utf-8" },
      ).trim();
      if (!output) return null;
      const pid = parseInt(output.split("\n")[0], 10);
      return isNaN(pid) ? null : pid;
    }
  } catch {
    return null;
  }
}

/** Returns the count of sessions currently in "running" status. */
export function getActiveSessions(): number {
  try {
    return listSessions({ status: "running" }).length;
  } catch {
    return 0;
  }
}

export interface RestartResult {
  instance: string;
  success: boolean;
  error?: string;
}

/**
 * Gracefully restarts this gateway instance.
 * Sends SIGTERM (triggering the existing cleanup handler). The cleanup handler
 * marks sessions as interrupted and exits cleanly. A new daemon should be
 * started by whatever invoked the restart (API handler or CLI).
 *
 * Note: startDaemon() is intentionally NOT called here to avoid a port conflict
 * — the old process must release the port before the new one can bind it.
 * The API endpoint triggers the SIGTERM and the CLI `jinn restart` command
 * polls for the old process to exit before starting the new one.
 */
export async function restart(_port?: number): Promise<void> {
  const port = _port ?? resolvePort();
  logger.info("Restart requested — spawning watcher then sending SIGTERM");

  spawnRestartWatcher(port);

  // Delay slightly so any in-flight HTTP response can be sent first
  setTimeout(() => {
    process.kill(process.pid, "SIGTERM");
  }, 500);
}

/**
 * Restarts all registered instances by calling their REST API.
 * Restarts self last.
 */
export async function restartAll(): Promise<RestartResult[]> {
  let instances: Array<{ name: string; port: number }> = [];
  try {
    if (fs.existsSync(INSTANCES_REGISTRY)) {
      instances = JSON.parse(fs.readFileSync(INSTANCES_REGISTRY, "utf-8"));
    }
  } catch {
    // fall through with empty list
  }

  const currentPort = resolvePort();
  const results: RestartResult[] = [];

  // Restart remote instances first
  for (const inst of instances) {
    if (inst.port === currentPort) continue;
    try {
      await postRestart(inst.port, true);
      results.push({ instance: inst.name, success: true });
    } catch (err) {
      results.push({ instance: inst.name, success: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Restart self last (fire-and-forget — process will exit via SIGTERM)
  const selfName = instances.find((i) => i.port === currentPort)?.name ?? "self";
  results.push({ instance: selfName, success: true });
  spawnRestartWatcher(currentPort);
  setTimeout(() => process.kill(process.pid, "SIGTERM"), 200);

  return results;
}

function postRestart(port: number, force: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ force });
    const req = http.request(
      { hostname: "127.0.0.1", port, path: "/api/restart", method: "POST", timeout: 5000,
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
      (res) => { res.resume(); resolve(); },
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error(`Timeout restarting instance on port ${port}`)); });
    req.write(body);
    req.end();
  });
}

export interface GatewayStatus {
  running: boolean;
  pid: number | null;
}

export function getStatus(): GatewayStatus {
  const targetPort = resolvePort();

  if (fs.existsSync(PID_FILE)) {
    const pid = parseInt(fs.readFileSync(PID_FILE, "utf-8").trim(), 10);
    try {
      process.kill(pid, 0);
      return { running: true, pid };
    } catch {
      // Process not alive, stale PID file — fall back to port check.
      const portPid = findPidOnPort(targetPort);
      if (portPid) return { running: true, pid: portPid };
      return { running: false, pid };
    }
  }

  const portPid = findPidOnPort(targetPort);
  if (portPid) return { running: true, pid: portPid };
  return { running: false, pid: null };
}
