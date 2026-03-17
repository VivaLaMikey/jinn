import http from "node:http";
import { loadInstances } from "./instances.js";
import { loadConfig } from "../shared/config.js";
import { startDaemon } from "../gateway/lifecycle.js";

function postRestart(port: number, force: boolean, all: boolean): Promise<{ status: string; [key: string]: unknown }> {
  const urlPath = all ? "/api/restart/all" : "/api/restart";
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ force });
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method: "POST",
        timeout: 8000,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString()));
          } catch {
            resolve({ status: "ok" });
          }
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error(`Timeout connecting to port ${port}`)); });
    req.write(body);
    req.end();
  });
}

function getRestartStatus(port: number): Promise<{ safe: boolean; activeSessions: number; activeQueueItems: number }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, path: "/api/restart/status", method: "GET", timeout: 3000 },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString()));
          } catch {
            resolve({ safe: true, activeSessions: 0, activeQueueItems: 0 });
          }
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error(`Timeout`)); });
    req.end();
  });
}

/** Poll until the port is no longer in use (process exited) or timeout. */
async function waitForPortFree(port: number, timeoutMs = 10000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const inUse = await new Promise<boolean>((resolve) => {
      const req = http.request(
        { hostname: "127.0.0.1", port, path: "/api/status", method: "GET", timeout: 500 },
        (res) => { res.resume(); resolve(true); },
      );
      req.on("error", () => resolve(false));
      req.on("timeout", () => { req.destroy(); resolve(false); });
      req.end();
    });
    if (!inUse) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

export async function runRestart(opts: { all?: boolean; force?: boolean; instance?: string }): Promise<void> {
  const instances = loadInstances();

  if (instances.length === 0) {
    console.error("No instances found. Run 'jinn setup' first.");
    process.exit(1);
  }

  if (opts.all) {
    // Find the primary (first) instance to send the restart-all command
    const primary = instances[0];
    console.log(`Restarting all ${instances.length} instance(s) via :${primary.port}...`);
    try {
      const result = await postRestart(primary.port, opts.force ?? false, true);
      if (result.results && Array.isArray(result.results)) {
        for (const r of result.results as Array<{ instance: string; success: boolean; error?: string }>) {
          const mark = r.success ? "+" : "x";
          console.log(`  [${mark}] ${r.instance}${r.error ? ` — ${r.error}` : ""}`);
        }
      }
      console.log("Restart-all command sent. Instances will restart momentarily.");
    } catch (err) {
      console.error(`Failed: ${err instanceof Error ? err.message : err}`);
      console.error("Is the gateway running? Try: jinn status");
      process.exit(1);
    }
    return;
  }

  // Single instance restart
  let targetPort: number;
  if (opts.instance) {
    const inst = instances.find((i) => i.name === opts.instance);
    if (!inst) {
      console.error(`Instance "${opts.instance}" not found.`);
      console.error(`Available: ${instances.map((i) => i.name).join(", ")}`);
      process.exit(1);
    }
    targetPort = inst.port;
  } else {
    try {
      const config = loadConfig();
      targetPort = config.gateway?.port || 7777;
    } catch {
      targetPort = 7777;
    }
  }

  // Check restart safety first (unless force)
  if (!opts.force) {
    try {
      const status = await getRestartStatus(targetPort);
      if (!status.safe) {
        console.warn(`Warning: ${status.activeSessions} active session(s) in progress.`);
        console.warn("Use --force to restart anyway, or wait for sessions to complete.");
        process.exit(1);
      }
    } catch {
      console.warn("Could not reach gateway — is it running? Attempting restart anyway...");
    }
  }

  const instanceLabel = opts.instance ?? `port ${targetPort}`;
  console.log(`Restarting instance: ${instanceLabel}...`);

  try {
    const result = await postRestart(targetPort, opts.force ?? false, false);
    if (result.status === "warning") {
      console.error(`Restart blocked: ${result.message}`);
      console.error("Use --force to override.");
      process.exit(1);
    }
  } catch (err) {
    console.error(`Failed to contact gateway: ${err instanceof Error ? err.message : err}`);
    console.error("Is the gateway running? Try: jinn status");
    process.exit(1);
  }

  // Wait for the old process to release the port
  process.stdout.write("Waiting for gateway to stop...");
  const freed = await waitForPortFree(targetPort, 12000);
  if (!freed) {
    console.warn("\nGateway did not stop within 12s. The new instance may conflict with the old one.");
  } else {
    process.stdout.write(" done.\n");
  }

  // Start the new daemon
  try {
    const config = loadConfig();
    startDaemon(config);
    console.log(`Gateway restarted successfully on port ${targetPort}.`);
  } catch (err) {
    console.error(`Failed to start new daemon: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}
