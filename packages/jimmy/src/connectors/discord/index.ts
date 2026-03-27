import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  type Message,
  type TextChannel,
  type DMChannel,
  type ThreadChannel,
  type ChatInputCommandInteraction,
} from "discord.js";
import type {
  Connector,
  ConnectorCapabilities,
  ConnectorHealth,
  IncomingMessage,
  Target,
} from "../../shared/types.js";
import { logger } from "../../shared/logger.js";
import { TMP_DIR } from "../../shared/paths.js";
import { formatResponse, formatResponseWithFile, downloadAttachment } from "./format.js";
import { deriveSessionKey, buildReplyContext, isOldMessage } from "./threads.js";
import { getFullCachedUsage } from "../../shared/usagePoller.js";

export interface DiscordConnectorConfig {
  botToken?: string;
  allowFrom?: string | string[];
  ignoreOldMessagesOnBoot?: boolean;
  guildId?: string;
  /** Only respond to messages in this channel (right-click channel → Copy Channel ID) */
  channelId?: string;
  /** Route messages from specific channels to remote Jinn instances */
  channelRouting?: Record<string, string>;
  /** Route messages from specific channels to a named employee on this instance */
  channelEmployees?: Record<string, string>;
  /** Restrict specific channels to a list of allowed Discord user IDs */
  channelAllowFrom?: Record<string, string[]>;
  /** If set, this instance proxies all Discord operations through the primary instance at this URL */
  proxyVia?: string;
}

export class DiscordConnector implements Connector {
  name = "discord";
  private client: Client;
  private config: DiscordConnectorConfig;
  private handler: ((msg: IncomingMessage) => void) | null = null;
  private bootTimeMs = Date.now();
  private allowedUserIds: Set<string>;
  private status: "starting" | "running" | "stopped" | "error" | "reconnecting" = "starting";
  private lastError: string | null = null;
  private typingIntervals = new Map<string, ReturnType<typeof setInterval>>();

  constructor(config: DiscordConnectorConfig) {
    this.config = config;
    // Normalize Discord IDs to strings (YAML may parse large snowflake IDs as numbers)
    if (this.config.guildId) this.config.guildId = String(this.config.guildId);
    if (this.config.channelId) this.config.channelId = String(this.config.channelId);
    if (this.config.channelRouting) {
      this.config.channelRouting = Object.fromEntries(
        Object.entries(this.config.channelRouting).map(([k, v]) => [String(k), v])
      );
    }
    if (this.config.channelEmployees) {
      this.config.channelEmployees = Object.fromEntries(
        Object.entries(this.config.channelEmployees).map(([k, v]) => [String(k), v])
      );
    }
    if (this.config.channelAllowFrom) {
      this.config.channelAllowFrom = Object.fromEntries(
        Object.entries(this.config.channelAllowFrom).map(([k, v]) => [String(k), v])
      );
    }
    this.allowedUserIds = new Set(
      Array.isArray(config.allowFrom)
        ? config.allowFrom
        : config.allowFrom
        ? [config.allowFrom]
        : [],
    );
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions,
      ],
      partials: [Partials.Channel, Partials.Message],
    });
  }

  onMessage(handler: (msg: IncomingMessage) => void): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    this.client.on("ready", () => {
      logger.info(`Discord connector ready as ${this.client.user?.tag}`);
      this.status = "running";
    });

    this.client.on("messageCreate", async (message) => {
      try {
        await this.handleMessage(message);
      } catch (err) {
        logger.error(`Discord message handler error: ${err instanceof Error ? err.message : err}`);
      }
    });

    this.client.on("error", (err) => {
      this.lastError = err.message;
      this.status = "error";
      logger.error(`Discord client error: ${err.message}`);
    });

    // Fix B: Rate limit detection and user feedback
    this.client.rest.on('rateLimited', (info) => {
      logger.warn(`Discord rate limited: route=${info.route}, timeout=${info.timeToReset}ms, limit=${info.limit}, method=${info.method}`);
      if (info.timeToReset > 5000) {
        logger.error(`Discord rate limit delay >5s on ${info.method} ${info.route} — messages may be noticeably delayed`);
      }
    });

    // Fix C: Reconnection alerting
    this.client.on('shardDisconnect', (event, shardId) => {
      this.status = 'error';
      this.lastError = `Shard ${shardId} disconnected (code: ${event.code})`;
      logger.error(`Discord shard ${shardId} disconnected (code: ${event.code}, reason: ${event.reason || 'unknown'})`);
    });

    this.client.on('shardReconnecting', (shardId) => {
      this.status = 'reconnecting' as any;
      logger.warn(`Discord shard ${shardId} reconnecting...`);
    });

    this.client.on('shardResume', (shardId, replayedEvents) => {
      this.status = 'running';
      this.lastError = null;
      logger.info(`Discord shard ${shardId} resumed (replayed ${replayedEvents} events)`);
    });

    this.client.on('shardError', (error, shardId) => {
      this.lastError = `Shard ${shardId} error: ${error.message}`;
      logger.error(`Discord shard ${shardId} error: ${error.message}`);
    });

    // Register Discord slash commands (zero-token, gateway-level)
    this.client.on("ready", async () => {
      try {
        const commands = [
          new SlashCommandBuilder()
            .setName("usage")
            .setDescription("Show Claude API usage (5h window, 7-day, extra) — no tokens consumed"),
          new SlashCommandBuilder()
            .setName("jstatus")
            .setDescription("Show current Jinn session status — no tokens consumed"),
          new SlashCommandBuilder()
            .setName("jnew")
            .setDescription("Reset the current Jinn session and start fresh — no tokens consumed"),
        ];

        const rest = new REST().setToken(this.config.botToken!);
        const clientId = this.client.user!.id;

        if (this.config.guildId) {
          await rest.put(Routes.applicationGuildCommands(clientId, this.config.guildId), {
            body: commands.map((c) => c.toJSON()),
          });
          logger.info(`Registered ${commands.length} slash commands for guild ${this.config.guildId}`);
        } else {
          await rest.put(Routes.applicationCommands(clientId), {
            body: commands.map((c) => c.toJSON()),
          });
          logger.info(`Registered ${commands.length} global slash commands`);
        }
      } catch (err) {
        logger.error(`Failed to register slash commands: ${err instanceof Error ? err.message : err}`);
      }
    });

    // Handle slash command interactions directly (no AI session)
    this.client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      try {
        switch (interaction.commandName) {
          case "usage":
            await this.handleUsageSlashCommand(interaction);
            break;
          case "jstatus":
            await this.handleStatusSlashCommand(interaction);
            break;
          case "jnew":
            await this.handleNewSlashCommand(interaction);
            break;
          default:
            await interaction.reply({ content: "Unknown command.", ephemeral: true });
        }
      } catch (err) {
        logger.error(`Slash command error: ${err instanceof Error ? err.message : err}`);
        try {
          const reply = interaction.replied || interaction.deferred
            ? interaction.followUp.bind(interaction)
            : interaction.reply.bind(interaction);
          await reply({ content: "An error occurred processing that command.", ephemeral: true });
        } catch { /* best effort */ }
      }
    });

    await this.client.login(this.config.botToken);
  }

  async stop(): Promise<void> {
    this.status = "stopped";
    await this.client.destroy();
    logger.info("Discord connector stopped");
  }

  getCapabilities(): ConnectorCapabilities {
    return {
      threading: true,
      messageEdits: true,
      reactions: true,
      attachments: true,
    };
  }

  getHealth(): ConnectorHealth {
    return {
      status: this.status === "running" ? "running" : this.status === "reconnecting" ? "error" : this.status === "error" ? "error" : "stopped",
      detail: this.lastError ?? (this.status === "reconnecting" ? "Reconnecting to Discord..." : undefined),
      capabilities: this.getCapabilities(),
    };
  }

  reconstructTarget(replyContext: Record<string, unknown> | null | undefined): Target {
    const ctx = (replyContext ?? {}) as Record<string, string | null>;
    return {
      channel: ctx.channel ?? "",
      thread: ctx.thread ?? undefined,
      messageTs: ctx.messageTs ?? undefined,
    };
  }

  async sendMessage(target: Target, text: string): Promise<string | undefined> {
    return this.withRetry(async () => {
      const channel = await this.client.channels.fetch(target.channel);
      if (!channel || !channel.isTextBased()) return undefined;
      return this.sendToChannel(channel as TextChannel | DMChannel | ThreadChannel, text);
    }, 'sendMessage');
  }

  async replyMessage(target: Target, text: string): Promise<string | undefined> {
    return this.withRetry(async () => {
      const channel = await this.client.channels.fetch(target.thread ?? target.channel);
      if (!channel || !channel.isTextBased()) return undefined;
      return this.sendToChannel(channel as TextChannel | DMChannel | ThreadChannel, text);
    }, 'replyMessage');
  }

  /** Send text to a channel, uploading as file attachment if too long */
  private async sendToChannel(channel: TextChannel | DMChannel | ThreadChannel, text: string): Promise<string | undefined> {
    const formatted = formatResponseWithFile(text);

    if (formatted.file) {
      // Long message — send summary + file attachment
      const { AttachmentBuilder } = await import("discord.js");
      const attachment = new AttachmentBuilder(formatted.file.data, { name: formatted.file.name });
      const sent = await channel.send({ content: formatted.content, files: [attachment] });
      return sent.id;
    }

    // Normal message — send as chunks
    const chunks = formatResponse(text);
    let lastId: string | undefined;

    // Auto-thread responses with 3+ chunks to keep the main channel clean.
    // Only applies to guild text channels — DMs and existing threads cannot have nested threads.
    const canThread = chunks.length >= 3 && !channel.isDMBased() && !channel.isThread();
    if (canThread) {
      const firstSent = await channel.send(chunks[0]);
      lastId = firstSent.id;
      try {
        const thread = await firstSent.startThread({ name: "Full response" });
        for (let i = 1; i < chunks.length; i++) {
          const sent = await thread.send(chunks[i]);
          lastId = sent.id;
        }
      } catch (err) {
        // Thread creation failed — fall back to sending remaining chunks in the channel
        logger.warn(`Discord thread creation failed, sending remaining chunks in channel: ${err instanceof Error ? err.message : err}`);
        for (let i = 1; i < chunks.length; i++) {
          const sent = await channel.send(chunks[i]);
          lastId = sent.id;
        }
      }
      return lastId;
    }

    for (const chunk of chunks) {
      const sent = await channel.send(chunk);
      lastId = sent.id;
    }
    return lastId;
  }

  async editMessage(target: Target, text: string): Promise<void> {
    await this.withRetry(async () => {
      if (!target.messageTs) return;
      const channel = await this.client.channels.fetch(target.channel);
      if (!channel || !channel.isTextBased()) return;
      const msg = await (channel as TextChannel).messages.fetch(target.messageTs);
      await msg.edit(text.slice(0, 2000));
    }, 'editMessage');
  }

  async addReaction(target: Target, emoji: string): Promise<void> {
    try {
      if (!target.messageTs) return;
      const channel = await this.client.channels.fetch(target.thread ?? target.channel);
      if (!channel || !channel.isTextBased()) return;
      const msg = await (channel as TextChannel).messages.fetch(target.messageTs);
      await msg.react(emoji);
    } catch {
      // non-fatal
    }
  }

  async removeReaction(target: Target, emoji: string): Promise<void> {
    try {
      if (!target.messageTs) return;
      const channel = await this.client.channels.fetch(target.thread ?? target.channel);
      if (!channel || !channel.isTextBased()) return;
      const msg = await (channel as TextChannel).messages.fetch(target.messageTs);
      await msg.reactions.cache.get(emoji)?.users.remove(this.client.user?.id);
    } catch {
      // non-fatal
    }
  }

  async setTypingStatus(channelId: string, _threadTs: string | undefined, status: string): Promise<void> {
    const existing = this.typingIntervals.get(channelId);
    if (existing) {
      clearInterval(existing);
      this.typingIntervals.delete(channelId);
    }
    if (!status) return;
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (channel && channel.isTextBased()) {
        await (channel as TextChannel).sendTyping();
        // Discord typing expires after 10s — refresh every 8s
        const interval = setInterval(async () => {
          try {
            await (channel as TextChannel).sendTyping();
          } catch { /* non-fatal */ }
        }, 8_000);
        this.typingIntervals.set(channelId, interval);
      }
    } catch {
      // non-fatal
    }
  }

  // Fix A: Exponential backoff retry helper
  private async withRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T | undefined> {
    const delays = [1000, 2000, 4000];
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await operation();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (attempt < 3) {
          const delay = delays[attempt - 1];
          logger.warn(`Discord ${operationName} failed (attempt ${attempt}/3), retrying in ${delay}ms: ${message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          logger.error(`Discord ${operationName} failed after 3 attempts: ${message}`);
        }
      }
    }
    return undefined;
  }

  private async handleMessage(message: Message): Promise<void> {
    // Ignore bots (including self)
    if (message.author.bot) return;
    logger.debug(`Discord message from ${message.author.username} in channel ${message.channel.id}`);

    // Ignore old messages on boot
    if (
      this.config.ignoreOldMessagesOnBoot !== false &&
      isOldMessage(message.createdTimestamp, this.bootTimeMs)
    ) return;

    // Guild restriction
    if (this.config.guildId && message.guild?.id !== this.config.guildId) return;

    // Channel routing — proxy messages to remote instances
    const routeTarget = this.config.channelRouting?.[message.channel.id];
    if (routeTarget) {
      logger.debug(`Routing Discord message from channel ${message.channel.id} to ${routeTarget}`);
      await this.proxyToRemote(routeTarget, message);
      return;
    }

    // Channel employees — explicitly configured channels bypass the channelId restriction
    const isChannelEmployee = !!this.config.channelEmployees?.[message.channel.id];

    // Channel restriction — only respond in configured channel (+ DMs + explicitly routed channels)
    if (this.config.channelId && message.channel.id !== this.config.channelId && !message.channel.isDMBased() && !isChannelEmployee) return;

    // Per-channel allowlist (takes precedence over global allowFrom for that channel)
    // channelEmployee channels are open to any user — global allowFrom does not apply
    const channelAllowList = this.config.channelAllowFrom?.[message.channel.id];
    if (channelAllowList) {
      if (!channelAllowList.map(String).includes(message.author.id)) {
        logger.debug(`Discord: user ${message.author.id} not in allowlist for channel ${message.channel.id}`);
        return;
      }
    } else if (!isChannelEmployee && this.allowedUserIds.size > 0 && !this.allowedUserIds.has(message.author.id)) {
      // Global allowlist only applies to non-employee channels
      return;
    }

    if (!this.handler) return;

    const sessionKey = deriveSessionKey(message);
    const replyContext = buildReplyContext(message);

    // Download attachments
    const attachments = await Promise.all(
      Array.from(message.attachments.values()).map(async (att) => {
        try {
          const localPath = await downloadAttachment(att.url, TMP_DIR, att.name);
          return { name: att.name, localPath, mimeType: att.contentType ?? "application/octet-stream" };
        } catch {
          return null;
        }
      }),
    ).then((results) => results.filter(Boolean) as Array<{ name: string; localPath: string; mimeType: string }>);

    const incomingMessage: IncomingMessage = {
      connector: "discord",
      source: "discord",
      sessionKey,
      channel: message.channel.id,
      thread: message.channel.isThread() ? message.channel.id : undefined,
      user: message.author.username,
      userId: message.author.id,
      text: message.content,
      attachments: attachments.map((a) => ({
        name: a.name,
        url: "",
        mimeType: a.mimeType,
        localPath: a.localPath,
      })),
      replyContext,
      messageId: message.id,
      raw: message,
      transportMeta: {
        channelName: message.channel.isTextBased() && "name" in message.channel
          ? (message.channel as TextChannel).name
          : "dm",
        guildId: message.guild?.id ?? null,
        isDM: message.channel.isDMBased(),
      },
    };

    this.handler(incomingMessage);
  }

  /** Handle /usage slash command — zero tokens */
  private async handleUsageSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const usage = getFullCachedUsage();
    if (!usage) {
      await interaction.reply({ content: "Usage data not available — poller may not be active.", ephemeral: true });
      return;
    }

    const bar = (pct: number): string => {
      const filled = Math.round(Math.min(pct, 100) / 5);
      return "[" + "\u2588".repeat(filled) + "\u2591".repeat(20 - filled) + "]";
    };

    const formatReset = (resetsAt: string | null): string => {
      if (!resetsAt) return "unknown";
      const diff = new Date(resetsAt).getTime() - Date.now();
      if (diff <= 0) return "now";
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    const pacing = (utilization: number, resetsAt: string | null, windowMinutes: number): string => {
      if (!resetsAt) return "";
      const remaining = Math.max(0, (new Date(resetsAt).getTime() - Date.now()) / 60_000);
      const elapsed = windowMinutes - remaining;
      const expected = Math.round((elapsed / windowMinutes) * 100);
      const diff = utilization - expected;
      if (diff > 5) return `\u26a0\ufe0f AHEAD of pace (+${diff}%)`;
      if (diff < -5) return `\u2705 Under pace (${diff}%)`;
      return `\u2705 On pace`;
    };

    const windowPosition = (resetsAt: string | null, windowMinutes: number): string => {
      if (!resetsAt) return "";
      const remaining = Math.max(0, (new Date(resetsAt).getTime() - Date.now()) / 60_000);
      const elapsed = windowMinutes - remaining;
      if (windowMinutes === 300) {
        const eH = Math.floor(elapsed / 60);
        const eM = Math.round(elapsed % 60);
        const rH = Math.floor(remaining / 60);
        const rM = Math.round(remaining % 60);
        return `  Window: ${eH}h${eM}m elapsed / ${rH}h${rM}m remaining`;
      }
      // 7-day window — show day of week position
      const elapsedDays = (elapsed / 1440).toFixed(1);
      const remainingDays = (remaining / 1440).toFixed(1);
      return `  Window: day ${elapsedDays} of 7 (${remainingDays} days left)`;
    };

    const fiveHour = usage.fiveHour;
    const sevenDay = usage.sevenDay;
    const sevenDaySonnet = usage.sevenDaySonnet;
    const extra = usage.extraUsage;

    const lines = [
      "**USAGE REPORT**",
      "",
      `5-Hour Window: ${fiveHour.utilization}%  ${bar(fiveHour.utilization)}`,
      windowPosition(fiveHour.resetsAt, 300),
      `  Resets in: ${formatReset(fiveHour.resetsAt)}`,
      `  Pacing: ${pacing(fiveHour.utilization, fiveHour.resetsAt, 300)}`,
    ];

    if (sevenDay) {
      lines.push("");
      lines.push(`7-Day (Opus): ${sevenDay.utilization}%  ${bar(sevenDay.utilization)}`);
      lines.push(windowPosition(sevenDay.resetsAt, 10080));
      lines.push(`  Resets in: ${formatReset(sevenDay.resetsAt)}`);
      lines.push(`  Pacing: ${pacing(sevenDay.utilization, sevenDay.resetsAt, 10080)}`);
    }

    if (sevenDaySonnet) {
      lines.push("");
      lines.push(`7-Day (Sonnet): ${sevenDaySonnet.utilization}%  ${bar(sevenDaySonnet.utilization)}`);
      lines.push(windowPosition(sevenDaySonnet.resetsAt, 10080));
      lines.push(`  Resets in: ${formatReset(sevenDaySonnet.resetsAt)}`);
      lines.push(`  Pacing: ${pacing(sevenDaySonnet.utilization, sevenDaySonnet.resetsAt, 10080)}`);
    }

    if (extra) {
      lines.push("");
      lines.push(`Extra Usage: $${extra.usedCredits.toFixed(0)} / $${extra.monthlyLimit} (${extra.utilization.toFixed(1)}%)  ${bar(extra.utilization)}`);
    }

    const age = Math.round((Date.now() - new Date(usage.fetchedAt).getTime()) / 60_000);
    lines.push("");
    lines.push(`Last fetched: ${age}m ago`);

    await interaction.reply(lines.join("\n"));
  }

  /** Handle /jstatus slash command — zero tokens */
  private async handleStatusSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({
      content: [
        "**JINN STATUS**",
        "",
        `Gateway: running`,
        `Discord connector: ${this.status}`,
        `Bot: ${this.client.user?.tag ?? "unknown"}`,
        `Uptime: ${this.client.uptime ? Math.round(this.client.uptime / 60_000) + "m" : "unknown"}`,
      ].join("\n"),
      ephemeral: true,
    });
  }

  /** Handle /jnew slash command — zero tokens */
  private async handleNewSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const sessionKey = `discord:${interaction.channelId}`;
    if (this.handler) {
      const fakeMsg: IncomingMessage = {
        connector: "discord",
        source: "discord",
        sessionKey,
        channel: interaction.channelId,
        user: interaction.user.username,
        userId: interaction.user.id,
        text: "/new",
        attachments: [],
        replyContext: { channel: interaction.channelId },
        messageId: interaction.id,
        raw: interaction,
        transportMeta: {},
      };
      this.handler(fakeMsg);
    }
    await interaction.reply({ content: "Session reset. Starting fresh.", ephemeral: true });
  }

  /** Forward a message to a remote Jinn instance via HTTP */
  private async proxyToRemote(remoteUrl: string, message: Message): Promise<void> {
    try {
      const attachments = Array.from(message.attachments.values()).map((att) => ({
        name: att.name,
        url: att.url,
        mimeType: att.contentType ?? "application/octet-stream",
      }));

      const payload = {
        sessionKey: deriveSessionKey(message),
        channel: message.channel.id,
        thread: message.channel.isThread() ? message.channel.id : undefined,
        user: message.author.username,
        userId: message.author.id,
        text: message.content,
        messageId: message.id,
        attachments,
        replyContext: buildReplyContext(message),
        transportMeta: {
          channelName: message.channel.isTextBased() && "name" in message.channel
            ? (message.channel as TextChannel).name
            : "dm",
          guildId: message.guild?.id ?? null,
          isDM: message.channel.isDMBased(),
        },
      };

      const res = await fetch(`${remoteUrl.replace(/\/+$/, "")}/api/connectors/discord/incoming`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        logger.error(`Failed to proxy Discord message to ${remoteUrl}: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      logger.error(`Discord proxy error to ${remoteUrl}: ${err instanceof Error ? err.message : err}`);
    }
  }
}
