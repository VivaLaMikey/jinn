export function nameHash(name: string): number {
  return name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
}

export function getInitials(name: string): string {
  return name
    .split('-')
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export function getDisplayName(name: string): string {
  return name
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}
