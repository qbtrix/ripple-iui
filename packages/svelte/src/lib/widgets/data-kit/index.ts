// widgets/data-kit/index.ts — the shared data kit the data widgets build on
// (design doc 2026-10-09 §2, task DW-S). Internal: nothing here is a
// registered widget, a manifest entry or a package export. Import types from
// ./types.js, not from this barrel.
export { default as StatusPill } from './StatusPill.svelte';
export { default as VerdictLine } from './VerdictLine.svelte';
export { default as StatChip } from './StatChip.svelte';
export { default as SectionCard } from './SectionCard.svelte';
export { default as SectionGrid } from './SectionGrid.svelte';
export { default as PhotoTile } from './PhotoTile.svelte';
export { default as StageRail } from './StageRail.svelte';
export { finite, num, sum, money, plain, dateKey, dateLabel } from './format.js';
export { STATUSES, toStatus, RISK_STATUS, STATUS_ICONS, STATUS_WORDS, STATUS_CLASS, STATUS_VAR } from './status.js';
export {
	FALLBACK_ICON,
	ICON,
	kindIcon,
	STOP_ICONS,
	LEG_ICONS,
	MEAL_ICONS,
	AISLE_ICONS,
	MENU_ICONS,
	SERVICE_ICONS,
	EXERCISE_ICONS,
	RECORD_ICONS,
	FEATURE_ICONS
} from './icons.js';
export { pairSpans, MAX_HALF_ROWS } from './pair.js';
export { rise, slide } from './motion.js';
export { holds, nextEdit } from './edit.js';
