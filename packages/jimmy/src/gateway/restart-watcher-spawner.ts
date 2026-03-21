/**
 * Provides spawnRestartWatcher() — spawns a detached watcher process that
 * waits for the current process to exit, then starts a new daemon.
 *
 * Kept in its own module (not lifecycle.ts) to avoid a circular dependency:
 * lifecycle.ts imports server.ts, and server.ts needs spawnRestartWatcher.
 */
import { fork } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JINN_HOME } from "../shared/paths.js";
import { logger } from "../shared/logger.js";

const __filename = fileURLToPath(import.meta.url);

/**
 * Spawns a detached watcher process that waits for the current process to exit,
 * then starts a new daemon. This solves the "restart via API kills but never restarts" bug.
 * Must be called BEFORE sending SIGTERM so the watcher can survive the parent's exit.
 */
export function spawnRestartWatcher(port: number): void {
  const watcherScript = path.resolve(path.dirname(__filename), "restart-watcher.js");

  if (!fs.existsSync(watcherScript)) {
    logger.error(`Restart watcher script not found at ${watcherScript}`);
    return;
  }

  const child = fork(watcherScript, [String(port)], {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, JINN_HOME },
  });

  child.unref();
  logger.info(`Restart watcher spawned (PID ${child.pid}) — will restart daemon after port ${port} is free`);
}
