// widgets/data-kit/status.ts — the status palette as data (design doc
// 2026-10-09 §2.2). The colours are the existing theme tokens in theme.css:
// fills --ripple-{success,warning,error,info}, text-safe --ripple-*-text
// (contrast-tuned for light and dark by ui/status-text.test.ts), and neutral on
// --ripple-muted-foreground. No new tokens.
//
// Rules the maps encode: status never rides on colour alone (every status has
// an icon and a word); text wears only the -text variant, never the fill;
// status colours are never chart series colours.
//
// The class strings are whole literals so Tailwind's scanner finds them. Join
// them with Svelte's class arrays, not cn(): tailwind-merge reads both
// `text-subheadline` and `text-ripple-success-text` as text colours and drops
// the size.
import type { LucideIcon } from '@lucide/svelte';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
import OctagonAlert from '@lucide/svelte/icons/octagon-alert';
import Info from '@lucide/svelte/icons/info';
import Circle from '@lucide/svelte/icons/circle';
import type { Status } from './types.js';

export const STATUSES: readonly Status[] = ['good', 'warn', 'bad', 'info', 'neutral'];

/** Model data in, a known status out; anything unrecognised is neutral. */
export function toStatus(v: unknown): Status {
	return STATUSES.includes(v as Status) ? (v as Status) : 'neutral';
}

/** Risk levels onto status. `critical` is `bad`; the widget adds the filled tile. */
export const RISK_STATUS: Record<'low' | 'medium' | 'high' | 'critical', Status> = {
	low: 'good',
	medium: 'warn',
	high: 'bad',
	critical: 'bad'
};

export const STATUS_ICONS: Record<Status, LucideIcon> = {
	good: CircleCheck,
	warn: TriangleAlert,
	bad: OctagonAlert,
	info: Info,
	neutral: Circle
};

/** The word shown when the data gives none. */
export const STATUS_WORDS: Record<Status, string> = {
	good: 'Good',
	warn: 'Warning',
	bad: 'Alert',
	info: 'Info',
	neutral: 'Note'
};

/** text: readable ink; tint: a 12% wash for pills and tiles; fill: dots and bars. */
export const STATUS_CLASS: Record<Status, { text: string; tint: string; fill: string }> = {
	good: { text: 'text-ripple-success-text', tint: 'bg-ripple-success/12', fill: 'bg-ripple-success' },
	warn: { text: 'text-ripple-warning-text', tint: 'bg-ripple-warning/12', fill: 'bg-ripple-warning' },
	bad: { text: 'text-ripple-error-text', tint: 'bg-ripple-error/12', fill: 'bg-ripple-error' },
	info: { text: 'text-ripple-info-text', tint: 'bg-ripple-info/12', fill: 'bg-ripple-info' },
	neutral: { text: 'text-ripple-muted-foreground', tint: 'bg-ripple-muted', fill: 'bg-ripple-muted-foreground' }
};

/** The fill as a CSS value, for SVG marks and inline custom properties. */
export const STATUS_VAR: Record<Status, string> = {
	good: 'var(--ripple-success)',
	warn: 'var(--ripple-warning)',
	bad: 'var(--ripple-error)',
	info: 'var(--ripple-info)',
	neutral: 'var(--ripple-muted-foreground)'
};
