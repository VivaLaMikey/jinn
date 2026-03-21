const DISCORD_MAX_LENGTH = 2000;

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

  // Add chunk numbering when there are multiple chunks
  if (chunks.length > 1) {
    const n = chunks.length;
    for (let i = 0; i < chunks.length; i++) {
      if (i === 0) {
        // Append " (1/N)" to the first chunk, trimming content if needed
        const suffix = ` (1/${n})`;
        const maxContent = DISCORD_MAX_LENGTH - suffix.length;
        chunks[i] = chunks[i].slice(0, maxContent) + suffix;
      } else {
        // Prepend "(i+1/N) " to subsequent chunks
        chunks[i] = `(${i + 1}/${n}) ${chunks[i]}`;
      }
    }
  }

  return chunks;
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
