/**
 * migrate-appearances.ts
 *
 * Reads every employee YAML in ~/.jinn/org/, and either:
 * - Converts old-format appearance (clothingColor/bodyType) to new format
 * - Generates a new appearance block for employees without one
 *
 * Run with:
 *   npx tsx packages/jimmy/scripts/migrate-appearances.ts
 *   (from the jinn-pr repo root)
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// ---------------------------------------------------------------------------
// Appearance generation
// ---------------------------------------------------------------------------

const SKIN_TONES = ['#ffdbb4', '#e8c39e', '#c68642', '#8d5524', '#f5cba7', '#a0522d'];
const HAIR_COLORS = ['#2c1810', '#4a3728', '#8b6914', '#1a1a1a', '#c9842b', '#cc3333', '#aaaaaa', '#f5e06e'];
const HAIR_STYLES = ['short', 'long', 'mohawk', 'bald', 'ponytail', 'curly', 'spiky', 'bob'];
const PANTS_COLORS = ['#1a2340', '#2e2e2e', '#3b2a1a', '#1e3a2a', '#4a4a60'];
const SHIRT_COLORS = ['#29adff', '#ffd700', '#8899aa', '#ff6b9d', '#00e436', '#b06cff', '#ff8c00', '#e74c3c', '#1abc9c', '#9b59b6'];
const SHOE_COLORS = ['#1a1a1a', '#3b2a1a', '#4a3a2a'];
const ACCESSORIES = ['none', 'none', 'none', 'glasses', 'headphones', 'hat', 'badge']; // weighted toward 'none'

function nameHash(name: string): number {
  return name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

function generateAppearance(name: string) {
  const h = nameHash(name);
  return {
    skinTone: SKIN_TONES[(h * 13) % SKIN_TONES.length],
    hairColor: HAIR_COLORS[h % HAIR_COLORS.length],
    hairStyle: HAIR_STYLES[(h * 7) % HAIR_STYLES.length],
    shirtColor: SHIRT_COLORS[(h * 3) % SHIRT_COLORS.length],
    pantsColor: PANTS_COLORS[(h * 5) % PANTS_COLORS.length],
    shoeColor: SHOE_COLORS[(h * 2) % SHOE_COLORS.length],
    accessory: ACCESSORIES[(h * 11) % ACCESSORIES.length],
  };
}

// ---------------------------------------------------------------------------
// YAML helpers
// ---------------------------------------------------------------------------

function buildAppearanceBlock(appearance: ReturnType<typeof generateAppearance>): string {
  return [
    'appearance:',
    `  skinTone: '${appearance.skinTone}'`,
    `  hairColor: '${appearance.hairColor}'`,
    `  hairStyle: ${appearance.hairStyle}`,
    `  shirtColor: '${appearance.shirtColor}'`,
    `  pantsColor: '${appearance.pantsColor}'`,
    `  shoeColor: '${appearance.shoeColor}'`,
    `  accessory: ${appearance.accessory}`,
  ].join('\n');
}

/**
 * Check if the appearance block uses the old schema (has clothingColor or bodyType,
 * or is missing shirtColor/pantsColor/shoeColor).
 */
function isOldFormat(raw: string): boolean {
  if (/^\s+clothingColor:/m.test(raw)) return true;
  if (/^\s+bodyType:/m.test(raw)) return true;
  // Has appearance but missing required new fields
  if (/^appearance:/m.test(raw) && !/^\s+pantsColor:/m.test(raw)) return true;
  return false;
}

/**
 * Remove the old appearance block from the YAML string.
 * Matches `appearance:` and all indented lines below it.
 */
function removeOldAppearance(raw: string): string {
  return raw.replace(/^appearance:\n(?:[ \t]+\S.*\n?)*/m, '');
}

/**
 * Extract existing values from old appearance block to preserve what we can.
 */
function extractOldValues(raw: string): { skinTone?: string; hairColor?: string; hairStyle?: string; accessory?: string } {
  const result: Record<string, string> = {};
  const skinMatch = raw.match(/^\s+skinTone:\s*'?([^'\n]+)'?/m);
  if (skinMatch) result.skinTone = skinMatch[1].trim();
  const hairColorMatch = raw.match(/^\s+hairColor:\s*'?([^'\n]+)'?/m);
  if (hairColorMatch) result.hairColor = hairColorMatch[1].trim();
  const hairStyleMatch = raw.match(/^\s+hairStyle:\s*'?([^'\n]+)'?/m);
  if (hairStyleMatch) result.hairStyle = hairStyleMatch[1].trim();
  const accessoryMatch = raw.match(/^\s+accessory:\s*'?([^'\n]+)'?/m);
  if (accessoryMatch) result.accessory = accessoryMatch[1].trim();
  return result;
}

// ---------------------------------------------------------------------------
// File collection
// ---------------------------------------------------------------------------

function collectYamlFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectYamlFiles(full));
    } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
      if (entry.name !== 'department.yaml') {
        results.push(full);
      }
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const ORG_DIR = path.join(os.homedir(), '.jinn', 'org');

if (!fs.existsSync(ORG_DIR)) {
  console.error(`org directory not found: ${ORG_DIR}`);
  process.exit(1);
}

let migrated = 0;
let converted = 0;
let skipped = 0;
let errors = 0;

const files = collectYamlFiles(ORG_DIR);

for (const filePath of files) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');

    // Extract the employee name
    const nameMatch = raw.match(/^name:\s*(.+)$/m);
    if (!nameMatch) {
      console.log(`  SKIP  ${path.basename(filePath)} — no name field found`);
      skipped++;
      continue;
    }

    const employeeName = nameMatch[1].trim();
    const hasAppearance = /^appearance:/m.test(raw);
    const needsConversion = hasAppearance && isOldFormat(raw);
    const needsNew = !hasAppearance;

    if (!needsConversion && !needsNew) {
      console.log(`  SKIP  ${path.basename(filePath)} — already has new-format appearance`);
      skipped++;
      continue;
    }

    // Generate deterministic appearance
    const generated = generateAppearance(employeeName);

    if (needsConversion) {
      // Preserve existing skinTone, hairColor, hairStyle, accessory from old format
      const old = extractOldValues(raw);
      if (old.skinTone) generated.skinTone = old.skinTone;
      if (old.hairColor) generated.hairColor = old.hairColor;
      if (old.hairStyle && HAIR_STYLES.includes(old.hairStyle)) generated.hairStyle = old.hairStyle;
      if (old.accessory && ['none', 'glasses', 'headphones', 'hat', 'badge', 'bowtie', 'scarf'].includes(old.accessory)) generated.accessory = old.accessory;

      // Remove old block and append new
      const stripped = removeOldAppearance(raw);
      const updated = stripped.trimEnd() + '\n' + buildAppearanceBlock(generated) + '\n';
      fs.writeFileSync(filePath, updated, 'utf-8');

      console.log(`  CONV  ${path.basename(filePath)} — ${employeeName} → skin:${generated.skinTone} hair:${generated.hairStyle}/${generated.hairColor} shirt:${generated.shirtColor} pants:${generated.pantsColor} shoes:${generated.shoeColor} acc:${generated.accessory}`);
      converted++;
    } else {
      // Append new appearance block
      const updated = raw.trimEnd() + '\n' + buildAppearanceBlock(generated) + '\n';
      fs.writeFileSync(filePath, updated, 'utf-8');

      console.log(`  NEW   ${path.basename(filePath)} — ${employeeName} → skin:${generated.skinTone} hair:${generated.hairStyle}/${generated.hairColor} shirt:${generated.shirtColor} pants:${generated.pantsColor} shoes:${generated.shoeColor} acc:${generated.accessory}`);
      migrated++;
    }
  } catch (err) {
    console.error(`  ERROR ${filePath}: ${err}`);
    errors++;
  }
}

console.log(`\nMigration complete: ${migrated} new, ${converted} converted, ${skipped} skipped, ${errors} errors.`);
