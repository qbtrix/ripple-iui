/**
 * @file flow-options.ts
 * @description Extracts selectable flow options from a flow `select` step's raw
 * `ui` widget tree, so a goal-pick step's bare buttons can be re-rendered as
 * polished OptionList cards (issue c) WITHOUT changing the spec contract.
 * @created 2026-06-07
 *
 * A flow `select` step today ships its choices as raw `button` nodes whose
 * `on_click` is an `emit` action targeting a flow verb (`flow.next` / `flow.submit`)
 * with a `value.selection`. This walker finds those buttons, returning one option
 * per button plus the original `on_click` handler so the caller can re-dispatch the
 * exact same event through the live EventDispatcher when the option is chosen. The
 * spec is never mutated; the buttons just render as OptionList instead of pills.
 *
 * PURE: reads the tree only. No state, no dispatch, no fetch.
 */

import type { UINode } from '../schema/ui-spec.js';

/** A flow option distilled from one option button in the step's `ui` tree. */
export interface FlowOption {
	/** Stable option id — the emit value's `selection.id`, else the label. */
	id: string;
	/** Visible label (the button's `props.label`). */
	label: string;
	/** Optional sub-label if the button carries a description prop. */
	description?: string;
	/** Optional Lucide icon slug if the button carries one. */
	icon?: string;
	/** The button's original `on_click` handler — re-dispatched verbatim on select. */
	onClick: unknown;
}

const FLOW_VERBS = new Set(['flow.next', 'flow.submit']);

function asRecord(v: unknown): Record<string, unknown> | null {
	return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

/** Is this `on_click` an emit targeting a flow verb that carries a selection? */
function isFlowSelectClick(onClick: unknown): boolean {
	const h = asRecord(onClick);
	if (!h) return false;
	if (h.action !== 'emit') return false;
	if (typeof h.target !== 'string' || !FLOW_VERBS.has(h.target)) return false;
	const value = asRecord(h.value);
	// Must carry a selection — that's what makes it an OPTION, not a Continue/Finish.
	return !!value && 'selection' in value;
}

function labelOf(node: Record<string, unknown>): string {
	const props = asRecord(node.props) ?? {};
	return String(props.label ?? props.text ?? '');
}

function selectionOf(onClick: Record<string, unknown>): Record<string, unknown> | null {
	const value = asRecord(onClick.value);
	return asRecord(value?.selection);
}

/**
 * Walk a UINode tree and collect every flow-select option button. Returns [] when
 * the step isn't a button-driven option set (then the caller falls back to the raw
 * tree, never blocking a render).
 */
export function extractFlowOptions(root: UINode | undefined): FlowOption[] {
	if (!root) return [];
	const out: FlowOption[] = [];

	const visit = (node: unknown): void => {
		const n = asRecord(node);
		if (!n) return;

		const onClick = (n as Record<string, unknown>).on_click;
		if (n.type === 'button' && isFlowSelectClick(onClick)) {
			const handler = onClick as Record<string, unknown>;
			const sel = selectionOf(handler);
			const label = labelOf(n);
			const props = asRecord(n.props) ?? {};
			out.push({
				id: String(sel?.id ?? sel?.value ?? label),
				label,
				description: sel?.description != null ? String(sel.description) : (props.description != null ? String(props.description) : undefined),
				icon: sel?.icon != null ? String(sel.icon) : (props.icon != null ? String(props.icon) : undefined),
				onClick
			});
		}

		const children = (n as Record<string, unknown>).children;
		if (Array.isArray(children)) {
			for (const c of children) visit(c);
		}
	};

	visit(root);
	return out;
}
