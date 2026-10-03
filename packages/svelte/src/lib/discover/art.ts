// discover/art.ts — placeholder art rules for a Discover item with no picture:
// a stable tint picked from the id and the title's initial. Both are total: any
// id yields a palette entry, any title yields a glyph. Every tint is a theme
// token, so the placeholder re-themes with the page.

export const CARD_PALETTE = [
  'var(--ripple-success)',
  'var(--ripple-accent)',
  'var(--ripple-warning)',
  'var(--ripple-error)',
  'var(--ripple-info)',
  'var(--ripple-muted-foreground)',
] as const;

export function tintFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return CARD_PALETTE[Math.abs(hash) % CARD_PALETTE.length];
}

export function initialFor(title: string): string {
  return (title.trim().charAt(0) || '?').toUpperCase();
}
