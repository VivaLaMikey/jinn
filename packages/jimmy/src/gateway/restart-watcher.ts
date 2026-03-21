/**
 * Restart watcher — detached process that waits for the old daemon to release
 * the port, then starts a new daemon. Spawned by lifecycle.ts before SIGTERM.
 *
 * Usage: node restart-watcher.js <port>
 *
 * This script is intentionally self-contained and must NOT import from any
 * module that depends on the running gateway.
 */
import { execSync, fork } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const port = parseInt(process.argv[2] || "7777", 10);
const MAX_WAIT_MS = 30_000;
const POLL_INTERVAL_MS = 500;

const __filename = fileURLToPath(import.meta.url);

function isPortFree(p: number): boolean {
  try {
    if (process.platform === "win32") {
      const output = execSync(`netstat -ano | findstr :${p} | findstr LISTENING`, { encoding: "utf-8" }).trim();
      return !output;
    } else {
      const cmd = process.platform === "darwin"
        ? `/usr/sbin/lsof -ti tcp:${p}`
        : `lsof -ti tcp:${p}`;
      const output = execSync(cmd, { encoding: "utf-8" }).trim();
      return !output;
    }
  } catch {
    // lsof/netstat returns non-zero exit when nothing is listening — port IS free
    return true;
  }
}

function startDaemon(): void {
  const candidateEntryScripts = [
    path.resolve(path.dirname(__filename), "daemon-entry.js"),
    path.resolve(path.dirname(__filename), "..", "..", "dist", "src", "gateway", "daemon-entry.js"),
  ];
  const entryScript = candidateEntryScripts.find((p) => fs.existsSync(p)) ?? candidateEntryScripts[0];

  const jinnHome = process.env.JINN_HOME || path.join(os.homedir(), ".jinn");
  const pidFile = path.join(jinnHome, "gateway.pid");

  const child = fork(entryScript, [], {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, JINN_HOME: jinnHome },
  });

  if (child.pid) {
    fs.mkdirSync(path.dirname(pidFile), { recursive: true });
    fs.writeFileSync(pidFile, String(child.pid));
    console.log(`[restart-watcher] New daemon started with PID ${child.pid}`);
  }

  child.unref();
}

async function main(): Promise<void> {
  console.log(`[restart-watcher] Waiting for port ${port} to be free (max ${MAX_WAIT_MS / 1000}s)`);

  const startTime = Date.now();

  while (Date.now() - startTime < MAX_WAIT_MS) {
    if (isPortFree(port)) {
      console.log(`[restart-watcher] Port ${port} is free — starting new daemon`);
      // Small extra delay to ensure clean shutdown
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
      startDaemon();
      process.exit(0);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  console.error(`[restart-watcher] Timed out waiting for port ${port} to be free after ${MAX_WAIT_MS / 1000}s`);
  process.exit(1);
}

main();
