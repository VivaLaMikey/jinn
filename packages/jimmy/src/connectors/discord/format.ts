const DISCORD_MAX_LENGTH = 2000;
/** Messages exceeding this many chunks get uploaded as a file attachment instead */
const FILE_UPLOAD_CHUNK_THRESHOLD = 3;

export interface FormattedMessage {
  content: string;
  file?: { name: string; data: Buffer };
}

export function formatResponse(text: string): string[] {
  if (text.length <= DISCORD_MAX_LENGTH) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= DISCORD_MAX_LENGTH) {
      chunks.push(remaining);
      break;
    }
    let cutAt = remaining.lastIndexOf("\n", DISCORD_MAX_LENGTH);
    if (cutAt <= 0) cutAt = remaining.lastIndexOf(" ", DISCORD_MAX_LENGTH);
    if (cutAt <= 0) cutAt = DISCORD_MAX_LENGTH;
    chunks.push(remaining.slice(0, cutAt));
    remaining = remaining.slice(cutAt).trimStart();
  }

  // Add chunk numbering (and "continued" indicator on non-final chunks) when there are multiple chunks
  if (chunks.length > 1) {
    const n = chunks.length;
    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === n - 1;
      const continued = isLast ? "" : " (continued...)";
      if (i === 0) {
        const suffix = ` (1/${n})${continued}`;
        const maxContent = DISCORD_MAX_LENGTH - suffix.length;
        chunks[i] = chunks[i].slice(0, maxContent) + suffix;
      } else {
        const prefix = `(${i + 1}/${n}) `;
        const maxContent = DISCORD_MAX_LENGTH - prefix.length - continued.length;
        chunks[i] = prefix + chunks[i].slice(0, maxContent) + continued;
      }
    }
  }

  return chunks;
}

/**
 * Format a response for Discord, uploading long messages as file attachments.
 * Returns a summary message + optional file for messages that would exceed
 * the chunk threshold.
 */
export function formatResponseWithFile(text: string): FormattedMessage {
  if (text.length <= DISCORD_MAX_LENGTH) {
    return { content: text };
  }

  // Check how many chunks this would produce
  const chunks = formatResponse(text);
  if (chunks.length <= FILE_UPLOAD_CHUNK_THRESHOLD) {
    // Short enough to send as chunks — caller handles multi-send
    return { content: text };
  }

  // Too many chunks — upload as file with a summary
  const summary = extractSummary(text);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `response-${timestamp}.md`;
  return {
    content: `${summary}\n\n*Full response attached as \`${filename}\` (${text.length.toLocaleString()} chars)*`,
    file: { name: filename, data: Buffer.from(text, "utf-8") },
  };
}

/** Extract first meaningful paragraph or heading as a summary */
function extractSummary(text: string): string {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  let summary = "";
  for (const line of lines) {
    summary += line + "\n";
    // Stop after first paragraph-ish block (2+ non-empty lines or 300 chars)
    if (summary.length >= 300 || (summary.includes("\n") && !line.startsWith("#") && !line.startsWith("-") && !line.startsWith("*"))) {
      break;
    }
  }
  return summary.trim().slice(0, DISCORD_MAX_LENGTH - 200); // Leave room for the file notice
}

export async function downloadAttachment(
  url: string,
  destDir: string,
  filename: string,
): Promise<string> {
  const { default: fs } = await import("node:fs");
  const { default: path } = await import("node:path");
  const destPath = path.join(destDir, filename);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download attachment: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  return destPath;
}
