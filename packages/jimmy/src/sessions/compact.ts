import type { SessionMessage } from './registry.js';

export interface CompactResult {
  summary: string;
  keptMessages: SessionMessage[];
  originalCount: number;
  compactedCount: number;
}

const SIGNAL_KEYWORDS = ['decided', 'decision', 'plan', 'planning', 'task', 'todo', 'important', 'remember', 'note:', 'action', 'agreed', 'conclusion', 'summary', 'status'];

function containsSignalKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return SIGNAL_KEYWORDS.some((kw) => lower.includes(kw));
}

function isToolUseMessage(content: string): boolean {
  // Tool use messages stored by the engine typically start with known patterns
  return content.startsWith('Using ') || content.startsWith('Used ');
}

/**
 * Algorithmically compact a message list.
 *
 * Strategy:
 * - Always keep the last `keepLast` messages verbatim.
 * - From the older messages, extract:
 *   - The first user message (original intent).
 *   - The last user message before the kept window.
 *   - Any message whose content contains signal keywords.
 *   - A count of tool-use/tool-result messages (summarised as a line).
 * - Collapse everything into a single summary string.
 */
export function compactMessages(
  messages: SessionMessage[],
  keepLast = 5,
): CompactResult {
  const originalCount = messages.length;

  if (originalCount <= keepLast) {
    return {
      summary: '',
      keptMessages: messages,
      originalCount,
      compactedCount: originalCount,
    };
  }

  const keptMessages = messages.slice(messages.length - keepLast);
  const olderMessages = messages.slice(0, messages.length - keepLast);

  const lines: string[] = ['[Context summary — older messages compacted]', ''];

  // First user message
  const firstUser = olderMessages.find((m) => m.role === 'user');
  if (firstUser) {
    const preview = firstUser.content.slice(0, 300);
    lines.push(`Original request: ${preview}${firstUser.content.length > 300 ? '...' : ''}`);
  }

  // Last user message in the older window (if different from first)
  const userMessages = olderMessages.filter((m) => m.role === 'user');
  if (userMessages.length > 1) {
    const lastUser = userMessages[userMessages.length - 1];
    const preview = lastUser.content.slice(0, 300);
    lines.push(`Most recent prior request: ${preview}${lastUser.content.length > 300 ? '...' : ''}`);
  }

  // Signal messages (decisions, plans, tasks, etc.)
  const signalMessages = olderMessages.filter(
    (m) => !isToolUseMessage(m.content) && containsSignalKeyword(m.content),
  );
  if (signalMessages.length > 0) {
    lines.push('');
    lines.push('Key points from prior context:');
    for (const msg of signalMessages) {
      const prefix = msg.role === 'user' ? 'User' : 'Assistant';
      const preview = msg.content.slice(0, 400);
      lines.push(`- [${prefix}] ${preview}${msg.content.length > 400 ? '...' : ''}`);
    }
  }

  // Tool usage summary
  const toolMessages = olderMessages.filter((m) => isToolUseMessage(m.content));
  if (toolMessages.length > 0) {
    lines.push('');
    lines.push(`Tool usage: ${toolMessages.length} tool call(s) were made in the compacted history.`);
  }

  // Assistant response count
  const assistantMessages = olderMessages.filter(
    (m) => m.role === 'assistant' && !isToolUseMessage(m.content),
  );
  if (assistantMessages.length > 0) {
    lines.push(`Prior assistant responses: ${assistantMessages.length} (compacted).`);
  }

  const summary = lines.join('\n');
  const compactedCount = 1 + keepLast; // summary message + kept messages

  return {
    summary,
    keptMessages,
    originalCount,
    compactedCount,
  };
}
