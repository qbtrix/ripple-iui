/**
 * @file flow-options.ts
 * @description Extracts selectable flow options from a flow `select` step's raw
 * `ui` widget tree, so a goal-pick step's bare buttons can be re-rendered as
 * polished OptionList cards (issue c) WITHOUT changing the spec contract.
 *
 * A flow `select` step ships its choices as raw `button` nodes whose `on_click`
 * is an `emit` action targeting a flow verb (`flow.next` / `flow.submit`) with a
 * `value.selection`. extractFlowOptions() finds those buttons at any depth,
 * returning one option per button plus the original `on_click` handler so the
 * caller can re-dispatch the exact same event through the live EventDispatcher.
 * pruneFlowOptions() returns a copy of the tree without those same buttons (at
 * any depth), so the rest of the step renders above the cards and no choice
 * shows twice. Both walkers share isFlowOption(), so what becomes a card is
 * exactly what leaves the tree.
 *
 * PURE: reads the tree only, never mutates it. No state, no dispatch, no fetch.
 */

import type { UINode } from '@ripple-ui/core';
import { asText } from '../widgets/text-coerce.js';

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

function isFlowOption(n: Record<string, unknown>): boolean {
	return n.type === 'button' && isFlowSelectClick(n.on_click);
}

function labelOf(node: Record<string, unknown>): string {
	const props = asRecord(node.props) ?? {};
	return asText(props.label ?? props.text);
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
		if (isFlowOption(n)) {
			const handler = onClick as Record<string, unknown>;
			const sel = selectionOf(handler);
			const label = labelOf(n);
			const props = asRecord(n.props) ?? {};
			out.push({
				id: asText(sel?.id ?? sel?.value ?? label),
				label,
				description: sel?.description != null ? asText(sel.description) : (props.description != null ? asText(props.description) : undefined),
				icon: sel?.icon != null ? asText(sel.icon) : (props.icon != null ? asText(props.icon) : undefined),
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

/**
 * A copy of `root` without its flow-option buttons, at any depth. With `all`
 * (a step still streaming in) every button goes: one whose `on_click` has not
 * arrived yet cannot be told apart from an option, and showing it as a plain
 * button only to swap it for a card is the duplicate flash. A container whose
 * children were all removed goes too; leaves (text, image) always stay. An
 * untouched subtree keeps its original reference. Returns undefined when
 * nothing is left.
 */
export function pruneFlowOptions(
	root: UINode | undefined,
	{ all = false }: { all?: boolean } = {}
): UINode | undefined {
	const drop = (n: Record<string, unknown>) => isFlowOption(n) || (all && n.type === 'button');

	const prune = (node: unknown): unknown => {
		const n = asRecord(node);
		if (!n) return node;
		if (drop(n)) return undefined;
		const children = n.children;
		if (!Array.isArray(children) || children.length === 0) return node;
		const kept = children.map(prune).filter((c) => c !== undefined);
		if (kept.length === 0) return undefined;
		const same = kept.length === children.length && kept.every((c, i) => c === children[i]);
		return same ? node : { ...n, children: kept };
	};

	return prune(root) as UINode | undefined;
}
