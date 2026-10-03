// discover/item.ts — what a tile or row derives from a DiscoverItem: the studio
// flag, the usage line, the playable media, and the primary action. Pure
// functions, so the components stay props-in markup-out and the rules are
// testable without a DOM. Only http(s) urls survive into an href or a src.

import type { DiscoverItem, DiscoverMediaKind } from './types.js';

export interface DiscoverPrimary {
  label: 'Use' | 'Play' | 'Claim' | 'Use this recipe';
  /** Opens in a new tab when set. */
  href: string | null;
  needsAccount: boolean;
}

export const isStudioKind = (kind: DiscoverItem['kind']): boolean =>
  kind === 'image' || kind === 'video' || kind === 'music';

export function httpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

export function remixLabel(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return 'No remixes yet';
  if (count === 1) return '1 remix';
  return `${compact.format(count).toLowerCase()} remixes`;
}

/** Studio listings count recipe opens, not copies. */
export function usedLabel(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return 'Not used yet';
  return `${compact.format(count).toLowerCase()} used`;
}

export const usageLabel = (item: DiscoverItem): string =>
  isStudioKind(item.kind) ? usedLabel(item.remixCount) : remixLabel(item.remixCount);

export function mediaFor(item: DiscoverItem): { kind: DiscoverMediaKind; url: string } | null {
  const url = isStudioKind(item.kind) ? httpUrl(item.mediaUrl) : null;
  return url && item.mediaKind ? { kind: item.mediaKind, url } : null;
}

export function primaryFor(item: DiscoverItem): DiscoverPrimary | null {
  if (isStudioKind(item.kind)) return { label: 'Use this recipe', href: null, needsAccount: true };
  if (item.kind === 'site') return { label: 'Claim', href: null, needsAccount: true };
  const href = httpUrl(item.liveUrl);
  if (!href) return null;
  return { label: item.kind === 'game' ? 'Play' : 'Use', href, needsAccount: false };
}
