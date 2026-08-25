/**
 * @file layout-adapter.ts
 * @description The SCHEMA-as-adapter boundary (locked decision 2). Ripple keeps
 * its own `UniversalSpec` as the contract; this module maps a spec's fields to
 * what an intent layout needs, WITHOUT adopting genesis's IntentSpec wholesale.
 * @created 2026-06-07
 * @changes
 *   - 2026-06-07: wire `review_rows` (pocketpaw start_flow confirm contract) —
 *     `review_rows: [{label, value}]` emitted by the pocketpaw builder on confirm
 *     steps is treated equivalently to `form_fields` for mode detection, and
 *     surfaced as `items` for SummaryLayout / ResultsSummary so the confirm step
 *     renders a designed review card instead of falling to raw-ui.
 *
 * Two render modes, decided per spec:
 *   - 'data'   the spec carries structured layout DATA (genesis style):
 *              `form_fields` for a form, `review_rows` for a confirm, or
 *              `data.items` / accumulated context for a summary / list. The
 *              designed layout renders the data directly.
 *   - 'raw-ui' the spec only carries a raw `ui` widget tree (our current
 *              `start_flow` steps: heading/input/button). The layout renders that
 *              `ui` via NodeRenderer INSIDE the polished card chrome — the user
 *              still sees a card + step header, never a bare tree, AND the inner
 *              buttons keep driving the flow (flow.next / flow.submit) because the
 *              tree is untouched.
 *
 * PURE: every helper reads only data already present on the spec. No service
 * call, no fetch (locked decision 1).
 */

import type { UniversalSpec } from '@ripple-ui/core';
import type { LayoutMetadata } from './layout-engine.js';
import { getLayoutMetadata } from './layout-engine.js';

/**
 * A spec extended with the optional genesis-style data fields ripple tolerates.
 *
 * `form_fields` — genesis-style array of field descriptors; emitted by pocketpaw
 *   on form steps via the start_flow builder.
 * `review_rows` — pocketpaw confirm contract: [{label, value}] pairs that the
 *   confirm step wants to show as a review card. Treated as structured data so
 *   SummaryLayout / ResultsSummary renders them designed instead of raw-ui.
 */
type SpecWithData = UniversalSpec & {
	form_fields?: unknown[];
	review_rows?: { label: string; value: unknown }[];
	data?: { items?: Record<string, unknown>[]; stats?: Record<string, unknown>[] } & Record<
		string,
		unknown
	>;
	fields?: Record<string, string>;
};

/** How a layout should source its content for a given spec. */
export type LayoutMode = 'data' | 'raw-ui';

/** Field-name mapping a layout uses to read items (genesis FieldMapping). */
export type FieldMapping = Record<string, string>;

/**
 * The normalized input a layout consumes — the adapter's whole output. Layouts
 * read THIS, never the raw UniversalSpec, so the schema bridge lives in one place.
 */
export interface LayoutInput {
	/** The originating spec (for title/description/ui escape hatch). */
	spec: UniversalSpec;
	/** Whether to render structured data or the raw `ui` tree. */
	mode: LayoutMode;
	/** Step heading — the spec title (rendered as the card header). */
	title?: string;
	/** Optional sub-heading. */
	description?: string;
	/** Structured rows for the layout (summary/list); empty in raw-ui mode. */
	items: Record<string, unknown>[];
	/** Form fields (genesis style); empty/undefined in raw-ui mode. */
	formFields: unknown[];
	/** Field-name mapping for reading items. */
	fields: FieldMapping;
	/** Layout sizing/selection metadata from the layout engine. */
	meta: LayoutMetadata;
}

const DEFAULT_FIELDS: FieldMapping = {
	id: 'id',
	title: 'title',
	subtitle: 'subtitle',
	description: 'description',
	price: 'price',
	image: 'image',
	icon: 'icon'
};

/**
 * Does this spec expose structured layout data, or only a raw `ui` tree?
 * Structured = genesis-style `form_fields`, pocketpaw `review_rows`, or
 * `data.items` / `data.stats`. Anything else (flow steps with only a `ui`
 * tree) is raw-ui.
 */
export function resolveLayoutMode(spec: UniversalSpec): LayoutMode {
	const s = spec as SpecWithData;
	const hasFormFields = Array.isArray(s.form_fields) && s.form_fields.length > 0;
	const hasReviewRows = Array.isArray(s.review_rows) && s.review_rows.length > 0;
	const hasItems =
		!!s.data &&
		typeof s.data === 'object' &&
		((Array.isArray(s.data.items) && s.data.items.length > 0) ||
			(Array.isArray(s.data.stats) && s.data.stats.length > 0));
	return hasFormFields || hasReviewRows || hasItems ? 'data' : 'raw-ui';
}

/**
 * Build summary rows from the flow's accumulated context for a confirm step that
 * carries no structured data of its own. Mirrors genesis's confirm fallback:
 * turns each `<flowId>_selection` into a labelled "Goal: …" style row. Pure —
 * `context` is handed in by FlowRunner from the executor; no executor access here.
 */
export function summaryItemsFromContext(
	context: Record<string, unknown> | undefined
): Record<string, unknown>[] {
	if (!context) return [];
	const rows: Record<string, unknown>[] = [];

	const formatLabel = (key: string) =>
		key
			.replace(/_selection$/, '')
			.replace(/_formData$/, '')
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (c) => c.toUpperCase());

	for (const [key, value] of Object.entries(context)) {
		if (value == null) continue;
		if (!key.endsWith('_selection') && !key.endsWith('_formData')) continue;

		let display = '';
		if (typeof value === 'string' || typeof value === 'number') {
			display = String(value);
		} else if (typeof value === 'object') {
			const v = value as Record<string, unknown>;
			display = String(v.label ?? v.title ?? v.name ?? v.id ?? Object.values(v)[0] ?? '');
		}
		if (display) rows.push({ title: formatLabel(key), subtitle: display });
	}
	return rows;
}

/**
 * The adapter: map a UniversalSpec (+ optional flow context) to a LayoutInput.
 * This is the ONLY place that knows how ripple's spec shape feeds a layout.
 */
export function toLayoutInput(
	spec: UniversalSpec,
	context?: Record<string, unknown>
): LayoutInput {
	const s = spec as SpecWithData;
	const mode = resolveLayoutMode(spec);

	let items: Record<string, unknown>[] = [];
	if (mode === 'data') {
		if (Array.isArray(s.review_rows) && s.review_rows.length > 0) {
			// pocketpaw confirm contract: review_rows [{label, value}] → summary rows.
			// SummaryLayout reads `item.label` and `item.value` (via rowLabel/rowValue),
			// so we surface them directly with the `label`/`subtitle` shape the layout
			// understands regardless of the generic field mapping.
			items = s.review_rows.map((r) => ({
				title: r.label,
				subtitle: String(r.value ?? ''),
				label: r.label,
				value: String(r.value ?? '')
			}));
		} else {
			items = s.data?.items ?? s.data?.stats ?? [];
			// A confirm step with no items of its own summarizes the flow context.
			if (items.length === 0 && (spec.intent === 'confirm' || spec.intent === 'quick_confirm')) {
				items = summaryItemsFromContext(context);
			}
		}
	} else if (spec.intent === 'confirm' || spec.intent === 'quick_confirm') {
		// Even in raw-ui mode, a confirm step can show the accumulated summary
		// ABOVE its raw tree, so the user reviews what they chose.
		items = summaryItemsFromContext(context);
	}

	return {
		spec,
		mode,
		title: spec.title,
		description: spec.description,
		items,
		formFields: (s.form_fields as unknown[]) ?? [],
		fields: { ...DEFAULT_FIELDS, ...(s.fields ?? {}) },
		meta: getLayoutMetadata(s as never)
	};
}
