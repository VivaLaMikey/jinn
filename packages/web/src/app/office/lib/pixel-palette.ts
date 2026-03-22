// Department colors
export const DEPT_COLORS: Record<string, string> = {
  engineering: '#29adff',
  executive: '#ffd700',
  legal: '#8899aa',
  marketing: '#ff6b9d',
  operations: '#00e436',
  research: '#b06cff',
  coo: '#ff8c00',
  meetings: '#4a5568',
}

// Status colors (use CSS vars where possible, hex fallbacks for canvas/animations)
export const STATUS_COLORS = {
  idle: { css: 'var(--text-tertiary)', hex: '#4a5568' },
  working: { css: 'var(--system-green)', hex: '#48bb78' },
  meeting: { css: 'var(--system-orange, #ed8936)', hex: '#ed8936' },
  error: { css: 'var(--system-red)', hex: '#fc5c65' },
}

// Skin/hair palettes for deterministic sprite generation
export const SKIN_COLORS = ['#ffdbb4', '#e8c39e', '#c68642', '#8d5524']
export const HAIR_COLORS = ['#2c1810', '#4a3728', '#8b6914', '#1a1a1a', '#c9842b']
