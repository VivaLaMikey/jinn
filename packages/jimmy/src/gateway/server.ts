import http from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";
import type { JinnConfig, Connector, Employee } from "../shared/types.js";
import { loadConfig } from "../shared/config.js";
import { configureLogger, logger } from "../shared/logger.js";
import { initDb, recoverStaleSessions, recoverStaleQueueItems, getInterruptedSessions, listSessions, updateSession } from "../sessions/registry.js";
import { SessionManager } from "../sessions/manager.js";
import { ClaudeEngine } from "../engines/claude.js";
import { CodexEngine } from "../engines/codex.js";
import { handleApiRequest, resumePendingWebQueueItems, type ApiContext } from "./api.js";
import { ensureFilesDir } from "./files.js";
import { initStt } from "../stt/stt.js";
import { startWatchers, stopWatchers, syncSkillSymlinks } from "./watcher.js";
import { SlackConnector } from "../connectors/slack/index.js";
import { DiscordConnector } from "../connectors/discord/index.js";
import { RemoteDiscordConnector } from "../connectors/discord/remote.js";
import { WhatsAppConnector } from "../connectors/whatsapp/index.js";
import { loadJobs } from "../cron/jobs.js";
import { startScheduler, reloadScheduler, stopScheduler } from "../cron/scheduler.js";
import { scanOrg } from "./org.js";
import {
  loadRestartTracker,
  canRestart,
  recordRestart,
  freezeSessions,
} from "./restart-tracker.js";
import { spawnRestartWatcher } from "./restart-watcher-spawner.js";
import { UsageMonitor } from "../shared/usageAwareness.js";
import { startUsagePoller, stopUsagePoller } from "../shared/usagePoller.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function serveStatic(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  webDir: string,
): boolean {
  if (!fs.existsSync(webDir)) return false;

  // Strip query string before resolving file path
  const urlPath = (req.url || "/").split("?")[0];
  let filePath = path.join(webDir, urlPath);
  if (filePath.endsWith("/")) filePath = path.join(filePath, "index.html");

  // Prevent directory traversal
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(webDir))) {
    res.writeHead(403);
    res.end("Forbidden");
    return true;
  }

  if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    // Next.js static export produces /chat.html, /sessions.html, etc.
    // Try appending .html before falling back to index.html
    const htmlPath = resolved.endsWith("/")
      ? path.join(resolved, "index.html")
      : resolved + ".html";
    if (fs.existsSync(htmlPath) && !fs.statSync(htmlPath).isDirectory()) {
      res.writeHead(200, { "Content-Type": "text/html" });
      fs.createReadStream(htmlPath).pipe(res);
      return true;
    }

    // SPA fallback: serve index.html for non-API, non-WS routes
    const indexPath = path.join(webDir, "index.html");
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { "Content-Type": "text/html" });
      fs.createReadStream(indexPath).pipe(res);
      return true;
    }
    return false;
  }

  const ext = path.extname(resolved);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(resolved).pipe(res);
  return true;
}

export type GatewayCleanup = () => Promise<void>;

export async function startGateway(
  config: JinnConfig,
): Promise<GatewayCleanup> {
  const bootId = randomUUID().slice(0, 8);

  // Configure logging
  configureLogger({
    level: config.logging.level,
    stdout: config.logging.stdout,
    file: config.logging.file,
  });

  const gatewayName = config.portal?.portalName || "Jinn";
  logger.info(`Starting ${gatewayName} gateway (boot ${bootId}, pid ${process.pid})...`);

  // Initialize database and recover any sessions stuck from a previous run
  initDb();
  ensureFilesDir();
  loadRestartTracker();
  const recovered = recoverStaleSessions();
  if (recovered > 0) {
    logger.info(`Recovered ${recovered} stale session(s) — marked as "interrupted" for resume`);
  }

  // Log resumable sessions so operators know what can be picked up
  const resumable = getInterruptedSessions();
  if (resumable.length > 0) {
    logger.info(`${resumable.length} interrupted session(s) available for resume:`);
    for (const s of resumable) {
      logger.info(`  - ${s.id} (engine: ${s.engine}, employee: ${s.employee || "none"}, engineSessionId: ${s.engineSessionId})`);
    }
  }
  const recoveredQueue = recoverStaleQueueItems();
  if (recoveredQueue > 0) {
    logger.info(`Recovered ${recoveredQueue} in-flight queue item(s) from previous run — reset to pending`);
  }

  // Set up engines
  const claudeEngine = new ClaudeEngine();
  const codexEngine = new CodexEngine();
  const engines = new Map<string, InstanceType<typeof ClaudeEngine> | InstanceType<typeof CodexEngine>>();
  engines.set("claude", claudeEngine);
  engines.set("codex", codexEngine);

  // Start usage poller (proactive Claude utilisation monitoring)
  startUsagePoller();

  // Derive connector names from config
  const connectorNames: string[] = [];
  if (config.connectors?.slack?.appToken && config.connectors?.slack?.botToken) {
    connectorNames.push("slack");
  }
  if (config.connectors?.discord?.botToken || config.connectors?.discord?.proxyVia) {
    connectorNames.push("discord");
  }
  if (config.connectors?.whatsapp) {
    connectorNames.push("whatsapp");
  }

  // Session manager — emit is defined below; pass a forwarding closure so it's
  // always current even though emit captures wsClients by reference.
  const sessionManager = new SessionManager(config, engines, connectorNames, (event, payload) => emit(event, payload));

  // Build employee registry
  let employeeRegistry = scanOrg();
  logger.info(`Loaded ${employeeRegistry.size} employee(s) from org directory`);

  // Start connectors
  const connectors: Connector[] = [];
  const connectorMap = new Map<string, Connector>();

  if (config.connectors?.slack?.appToken && config.connectors?.slack?.botToken) {
    try {
      const slack = new SlackConnector({
        appToken: config.connectors.slack.appToken,
        botToken: config.connectors.slack.botToken,
        allowFrom: config.connectors.slack.allowFrom,
        ignoreOldMessagesOnBoot: config.connectors.slack.ignoreOldMessagesOnBoot,
      });
      slack.onMessage((msg) => {
        sessionManager.route(msg, slack).catch((err) => {
          logger.error(`Slack route error: ${err instanceof Error ? err.message : err}`);
        });
      });
      await slack.start();
      connectors.push(slack);
      connectorMap.set("slack", slack);
    } catch (err) {
      logger.error(`Failed to start Slack connector: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (config.connectors?.discord?.proxyVia) {
    // Remote mode: proxy all Discord operations through the primary instance
    try {
      const discord = new RemoteDiscordConnector({
        proxyVia: config.connectors.discord.proxyVia,
        channelId: config.connectors.discord.channelId,
      });
      discord.onMessage((msg) => {
        sessionManager.route(msg, discord).catch((err) => {
          logger.error(`Discord route error: ${err instanceof Error ? err.message : err}`);
        });
      });
      await discord.start();
      connectors.push(discord);
      connectorMap.set("discord", discord);
      logger.info(`Discord connector started in remote mode (via ${config.connectors.discord.proxyVia})`);
    } catch (err) {
      logger.error(`Failed to start remote Discord connector: ${err instanceof Error ? err.message : err}`);
    }
  } else if (config.connectors?.discord?.botToken) {
    // Primary mode: direct Discord bot connection
    try {
      const discord = new DiscordConnector(config.connectors.discord as import("../connectors/discord/index.js").DiscordConnectorConfig);
      discord.onMessage((msg) => {
        sessionManager.route(msg, discord).catch((err) => {
          logger.error(`Discord route error: ${err instanceof Error ? err.message : err}`);
        });
      });
      await discord.start();
      connectors.push(discord);
      connectorMap.set("discord", discord);
      logger.info("Discord connector started");
    } catch (err) {
      logger.error(`Failed to start Discord connector: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (config.connectors?.whatsapp) {
    try {
      const whatsapp = new WhatsAppConnector(config.connectors.whatsapp ?? {});
      whatsapp.onMessage((msg) => {
        sessionManager.route(msg, whatsapp).catch((err) => {
          logger.error(`WhatsApp route error: ${err instanceof Error ? err.message : err}`);
        });
      });
      await whatsapp.start();
      connectors.push(whatsapp);
      connectorMap.set("whatsapp", whatsapp);
      logger.info("WhatsApp connector started (scan QR code if first run)");
    } catch (err) {
      logger.error(`Failed to start WhatsApp connector: ${err instanceof Error ? err.message : err}`);
    }
  }

  sessionManager.setConnectorProvider(() => connectorMap);

  // Start cron scheduler
  const cronJobs = loadJobs();
  startScheduler(cronJobs, sessionManager, config, connectorMap);
  logger.info(`Loaded ${cronJobs.length} cron job(s)`);

  // Mutable config reference for hot-reload
  let currentConfig = config;

  const startTime = Date.now();

  // Broadcast function (defined early so apiContext can reference it)
  const wsClients = new Set<import("ws").WebSocket>();

  // Sequence counter and ring buffer for missed-message replay
  let messageSequence = 0;
  const MESSAGE_BUFFER_SIZE = 200;
  const messageBuffer: Array<{ seq: number; event: string; payload: unknown; ts: number; raw: string }> = [];

  const emit = (event: string, payload: unknown): void => {
    const seq = ++messageSequence;
    const ts = Date.now();
    let raw: string;

    try {
      raw = JSON.stringify({ event, payload, ts, seq });
    } catch (err) {
      logger.error(`WebSocket: failed to serialise event ${event}: ${err instanceof Error ? err.message : err}`);
      return;
    }

    // Buffer for replay on reconnect
    messageBuffer.push({ seq, event, payload, ts, raw });
    if (messageBuffer.length > MESSAGE_BUFFER_SIZE) {
      messageBuffer.shift();
    }

    // Broadcast to all connected clients; collect dead ones to remove after the loop
    const deadClients: import("ws").WebSocket[] = [];
    for (const client of wsClients) {
      if (client.readyState === 1) { // OPEN
        try {
          client.send(raw);
        } catch (err) {
          logger.warn(`WebSocket send failed, marking client for removal: ${err instanceof Error ? err.message : err}`);
          deadClients.push(client);
        }
      } else if (client.readyState !== 0) { // Not CONNECTING — treat as dead
        deadClients.push(client);
      }
    }

    for (const dc of deadClients) {
      wsClients.delete(dc);
    }
  };

  // Usage monitor — polls Anthropic usage API if credentials are configured
  let usageMonitor: UsageMonitor | undefined;
  const anthropicCfg = config.anthropic;
  if (anthropicCfg?.sessionKey && anthropicCfg?.orgId) {
    usageMonitor = new UsageMonitor(anthropicCfg.sessionKey, anthropicCfg.orgId);
    usageMonitor.start();
  } else {
    logger.info("UsageMonitor: no anthropic credentials in config — usage polling disabled");
  }

  // API context
  const apiContext: ApiContext = {
    config: currentConfig,
    sessionManager,
    startTime,
    getConfig: () => currentConfig,
    emit,
    connectors: connectorMap,
    usageMonitor,
  };

  // Replay any pending web queue items (e.g. gateway restart mid-run)
  resumePendingWebQueueItems(apiContext);

  // Resolve web UI directory — bundled into dist/web/ by postbuild script
  // At runtime __dirname is dist/src/gateway/, so ../../web resolves to dist/web/
  const webDir = path.resolve(__dirname, "..", "..", "web");

  // Create HTTP server
  const server = http.createServer((req, res) => {
    const url = req.url || "/";

    // CORS headers for development
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // API routes
    if (url.startsWith("/api/")) {
      handleApiRequest(req, res, apiContext);
      return;
    }

    // Static files for web UI
    if (!serveStatic(req, res, webDir)) {
      if (url === "/" || url === "/index.html") {
        res.writeHead(503, { "Content-Type": "text/html" });
        res.end("<html><body><h1>Web UI not built</h1><p>Run <code>pnpm build</code> from the project root to build the web UI.</p></body></html>");
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
      }
    }
  });

  // WebSocket server
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws) => {
    wsClients.add(ws);
    logger.info(`WebSocket client connected (${wsClients.size} total)`);

    // Inform the client of the current sequence so it can detect gaps on reconnect
    try {
      ws.send(JSON.stringify({ event: "__sync", seq: messageSequence, ts: Date.now() }));
    } catch (err) {
      logger.warn(`WebSocket __sync send failed: ${err instanceof Error ? err.message : err}`);
    }

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as Record<string, unknown>;
        if (msg.type === "replay" && typeof msg.lastSeq === "number") {
          const missed = messageBuffer.filter((m) => m.seq > (msg.lastSeq as number));
          logger.info(`WebSocket replay: sending ${missed.length} missed message(s) (from seq ${msg.lastSeq})`);
          for (const m of missed) {
            try {
              if (ws.readyState === 1) {
                ws.send(m.raw);
              } else {
                break;
              }
            } catch (err) {
              logger.warn(`WebSocket replay send failed: ${err instanceof Error ? err.message : err}`);
              break;
            }
          }
        }
      } catch {
        // Ignore non-JSON or malformed messages
      }
    });

    ws.on("close", () => {
      wsClients.delete(ws);
      logger.info(`WebSocket client disconnected (${wsClients.size} remaining)`);
    });

    ws.on("error", (err) => {
      logger.error(`WebSocket error: ${err.message}`);
      wsClients.delete(ws);
    });
  });

  server.on("upgrade", (req, socket, head) => {
    if (req.url === "/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });


  // Sync skill symlinks to .claude/skills/ and .agents/skills/
  syncSkillSymlinks();

  // Initialize STT model symlinks
  try {
    initStt();
  } catch (err) {
    logger.warn(`STT init skipped: ${err instanceof Error ? err.message : err}`);
  }

  // Start file watchers
  startWatchers({
    onConfigReload: () => {
      try {
        currentConfig = loadConfig();
        apiContext.config = currentConfig;
        logger.info("Config reloaded successfully");
        emit("config:reloaded", {});
      } catch (err) {
        logger.error(
          `Failed to reload config: ${err instanceof Error ? err.message : err}`,
        );
      }
    },
    onCronReload: () => {
      const updatedJobs = loadJobs();
      reloadScheduler(updatedJobs);
      logger.info(`Cron jobs reloaded (${updatedJobs.length} job(s))`);
      emit("cron:reloaded", {});
    },
    onOrgChange: () => {
      employeeRegistry = scanOrg();
      logger.info(`Org directory changed, reloaded ${employeeRegistry.size} employee(s)`);
      emit("org:changed", {});
    },
    onSkillsChange: () => {
      logger.info("Skills changed, notifying clients");
      emit("skills:changed", {});
    },
    onRestartTrigger: (reason: string) => {
      const check = canRestart();
      if (!check.allowed) {
        logger.error(`Auto-restart blocked by circuit breaker: ${check.reason}`);
        emit("gateway:restart_halted", { reason: check.reason });
        return;
      }
      recordRestart();
      // Freeze new session creation immediately so no sessions start during
      // the countdown window.
      freezeSessions(`Server restart scheduled: ${reason}`);
      emit("gateway:sessions_frozen", {
        reason: `Server restart scheduled: ${reason}`,
        retryAfterMs: 10000,
      });
      emit("gateway:restart_scheduled", {
        reason,
        countdownMs: 5000,
        estimatedDowntimeMs: 10000,
      });
      const watcherPort = config.gateway?.port || 7777;
      spawnRestartWatcher(watcherPort);

      setTimeout(() => {
        emit("gateway:restart_imminent", { reason });
        logger.info(`Auto-restart triggered: ${reason}`);
        setTimeout(() => process.kill(process.pid, "SIGTERM"), 1000);
      }, 4000);
    },
  });

  // Start listening
  const port = config.gateway.port || 7777;
  const host = config.gateway.host || "127.0.0.1";

  await new Promise<void>((resolve, reject) => {
    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        const msg = `Port ${port} is already in use.`;
        logger.error(msg);
        console.error(`\nError: ${msg}`);
        console.error(`\nTry: jinn start -p ${port + 1}`);
        console.error(`Or update the port in config.yaml\n`);
        process.exit(1);
      }
      reject(err);
    });
    server.listen(port, host, () => {
      logger.info(`${gatewayName} gateway listening on http://${host}:${port} (boot ${bootId})`);
      resolve();
    });
  });

  // Notify connected WebSocket clients about interrupted sessions available for resume.
  // Also emit gateway:restarted so the UI knows a restart occurred.
  setTimeout(() => {
    if (resumable.length > 0) {
      emit("sessions:interrupted", {
        count: resumable.length,
        sessions: resumable.map((s) => ({
          id: s.id,
          engine: s.engine,
          employee: s.employee,
          title: s.title,
          lastActivity: s.lastActivity,
        })),
      });
    }
    if (recovered > 0 || recoveredQueue > 0) {
      emit("gateway:restarted", {
        recoveredSessions: recovered,
        recoveredQueueItems: recoveredQueue,
        resumableSessions: resumable.length,
      });
    }
  }, 1000);

  // Prevent macOS from sleeping while the gateway is running
  let caffeinate: ChildProcess | null = null;
  if (process.platform === "darwin") {
    caffeinate = spawn("caffeinate", ["-s"], {
      stdio: "ignore",
      detached: false,
    });
    caffeinate.unref();
    caffeinate.on("error", (err) => {
      logger.warn(`caffeinate failed to start: ${err.message}`);
      caffeinate = null;
    });
    logger.info("caffeinate started — macOS sleep prevention active");
  }

  // Return cleanup function
  return async () => {
    logger.info("Gateway cleanup starting...");

    // Stop caffeinate
    if (caffeinate && caffeinate.exitCode === null) {
      caffeinate.kill();
      logger.info("caffeinate stopped");
    }

    // Mark all running sessions as "interrupted" before killing engine processes.
    // This preserves their engine_session_id so they can be resumed on next startup.
    const runningSessions = listSessions({ status: "running" });
    for (const session of runningSessions) {
      updateSession(session.id, {
        status: "interrupted",
        lastActivity: new Date().toISOString(),
        lastError: "Interrupted: gateway shutting down gracefully",
      });
      logger.info(`Marked session ${session.id} as interrupted for resume`);
    }

    // Terminate live engine subprocesses after marking sessions.
    claudeEngine.killAll();
    codexEngine.killAll();

    // Stop cron scheduler
    stopScheduler();

    // Stop usage poller (Swift-script-based) and config-based usage monitor
    stopUsagePoller();
    usageMonitor?.stop();

    // Stop connectors
    for (const connector of connectors) {
      try {
        await connector.stop();
      } catch (err) {
        logger.error(`Failed to stop ${connector.name} connector: ${err instanceof Error ? err.message : err}`);
      }
    }

    // Stop watchers
    await stopWatchers();

    // Close WebSocket connections
    for (const client of wsClients) {
      client.close(1001, "Server shutting down");
    }
    wsClients.clear();

    // Close WebSocket server
    await new Promise<void>((resolve) => wss.close(() => resolve()));

    // Close HTTP server
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });

    logger.info("Gateway shutdown complete");
  };
}
