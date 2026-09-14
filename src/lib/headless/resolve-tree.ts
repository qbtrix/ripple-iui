/**
 * @file resolve-tree.ts
 * @description Pure spec-tree resolution — the headless counterpart to
 * `components/NodeRenderer.svelte`.
 *
 * NodeRenderer does two jobs at once: it decides WHAT should render
 * (evaluate `show`, pick the `if` branch, expand `each`, resolve props
 * and binds) and then it renders. Only the second half needs Svelte.
 * This module is the first half, extracted as a plain function.
 *
 * The rules below are transcribed from NodeRenderer deliberately — the
 * value of a headless runtime is that it agrees with the Svelte one, so
 * each rule cites the behaviour it mirrors:
 *
 *   - `show` false      → node and its subtree are omitted entirely.
 *   - `if`              → collapses to `children` or `else_children`;
 *                         the `if` node itself never appears in output.
 *   - `each`            → resolves `items` (data bag first, then state,
 *                         exactly as NodeRenderer does), then emits one
 *                         copy of the children per item with `item_as` /
 *                         `index_as` layered into loop context.
 *   - `bind`            → path template is resolved against loop context,
 *                         `state.` prefix stripped, and paired with the
 *                         widget's bind contract.
 *   - `on_*`            → collected as raw specs keyed by renderer-prop
 *                         name (`on_open_change` → `onopenchange`).
 *   - unknown widget    → reported, and KEPT by default so it stays visible.
 *
 * Prop resolution failures are contained per node (NodeRenderer warns and
 * falls back to `{}`); a throwing expression cannot take down the tree.
 *
 * @changes
 *   - 2026-08-25: created (headless core, wave 1).
 */

import type { UINode } from '../schema/ui-spec.js';
import type { EventHandlerOrArray } from '../schema/event-handler.js';
import {
	resolveValue,
	resolveString,
	evaluateCondition,
	type ResolverContext
} from '../core/expression-resolver.js';
import { getBindContract } from '../core/widget-bind-contract.js';
import type { ResolveContext, ResolvedNode, ResolvedTree } from './types.js';

function buildResolverContext(ctx: ResolveContext): ResolverContext {
	return {
		state: ctx.state,
		data: ctx.data ?? {},
		...(ctx.loop ?? {})
	};
}

/** Strip the outer braces off a bind/items path. */
function stripPath(raw: string): string {
	return raw.replace(/^\{|\}$/g, '').trim();
}

/**
 * Resolve `{...}` placeholders inside a path template (e.g. `lines.{i}.qty`).
 * Mirrors NodeRenderer's `resolveBoundPath`.
 */
function resolvePathTemplate(tpl: string, rctx: ResolverContext): string {
	if (!tpl.includes('{')) return tpl;
	const result = resolveString(tpl, rctx);
	return typeof result === 'string' ? result : String(result ?? '');
}

/** Read a dotted path out of a plain object. */
function readPath(state: Record<string, unknown>, path: string): unknown {
	let current: unknown = state;
	for (const part of path.split('.')) {
		if (current === null || current === undefined) return undefined;
		if (typeof current !== 'object') return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

/**
 * Resolve the `items` of an `each` node. Data bag first, then state —
 * the same precedence NodeRenderer uses.
 *
 * KNOWN ENGINE LIMIT (shared with the Svelte renderer, not introduced
 * here): `items` is read from the data bag or from state ONLY, never
 * from loop context. So a nested `each` over an outer item's array
 * (`items: '{group.members}'`) resolves to nothing in BOTH runtimes.
 * Pinned by a test so the behaviour is documented rather than
 * rediscovered; fixing it is a spec-engine change that must land in
 * NodeRenderer and here together, or the two runtimes diverge.
 */
function resolveEachItems(node: UINode, ctx: ResolveContext): unknown[] {
	const raw = (node as { items?: string }).items;
	if (!raw) return [];
	const path = stripPath(raw);
	const data = ctx.data;

	let items: unknown;
	if (path.startsWith('data.') && data) {
		items = data[path.replace(/^data\./, '')];
	} else if (data && data[path]) {
		// Truthiness, not `!== undefined`, to match NodeRenderer exactly: a
		// null/empty entry in the data bag falls through to state there, and
		// parity with the Svelte renderer outranks the tidier check.
		items = data[path];
	} else {
		items = readPath(ctx.state, path.replace(/^state\./, ''));
	}
	return Array.isArray(items) ? items : [];
}

/**
 * Collect `on_*` handler specs, keyed by the prop name a renderer uses.
 *
 * Every `on_*` key is collected the same way. The six NodeRenderer wires
 * explicitly (click/change/input/submit/focus/blur) differ only in how a
 * RENDERER binds them — `onchange` also writes the bound path — and that
 * is a rendering decision, not a resolution one. `ResolvedNode.bind`
 * already carries everything a renderer needs to make it.
 */
function collectEvents(node: UINode): Record<string, EventHandlerOrArray> | undefined {
	const raw = node as unknown as Record<string, unknown>;
	const out: Record<string, EventHandlerOrArray> = {};

	for (const key of Object.keys(raw)) {
		if (!key.startsWith('on_')) continue;
		const spec = raw[key];
		if (!spec) continue;
		// on_click → onclick; on_open_change → onopenchange.
		const prop = 'on' + key.slice(3).replace(/_/g, '');
		out[prop] = spec as EventHandlerOrArray;
	}

	return Object.keys(out).length > 0 ? out : undefined;
}

function resolveNode(node: UINode, ctx: ResolveContext): ResolvedNode[] {
	const rctx = buildResolverContext(ctx);

	// 1. `show` gates the whole subtree.
	if (node.show && !evaluateCondition(node.show, rctx)) return [];

	const type = (node as { type?: string }).type;

	// 2. Control flow collapses — these node types never reach the output.
	if (type === 'if') {
		const condition = (node as { condition?: string }).condition;
		const passed = condition ? evaluateCondition(condition, rctx) : true;
		const branch = passed ? node.children : node.else_children;
		return resolveChildren(branch, ctx);
	}

	if (type === 'each') {
		const items = resolveEachItems(node, ctx);
		const itemAs = (node as { item_as?: string }).item_as ?? 'item';
		const indexAs = (node as { index_as?: string }).index_as ?? 'index';
		const out: ResolvedNode[] = [];
		items.forEach((item, index) => {
			const loop = { ...(ctx.loop ?? {}), [itemAs]: item, [indexAs]: index };
			out.push(...resolveChildren(node.children, { ...ctx, loop }));
		});
		return out;
	}

	// 3. A real widget. Report it if it is not in the catalog; keep it unless
	//    the host explicitly says to drop it, so unknowns stay visible.
	if (type && ctx.isKnownWidget && !ctx.isKnownWidget(type)) {
		let keep: boolean | void = true;
		if (ctx.onUnknownWidget) {
			keep = ctx.onUnknownWidget(type, node);
		} else {
			console.warn(`[Ripple headless] Unknown widget type: ${type}`);
		}
		if (keep === false) return [];
	}

	// 4. Props. A throwing expression degrades this node to `{}` rather than
	//    failing the tree — the same containment NodeRenderer applies.
	let props: Record<string, unknown> = {};
	try {
		props = resolveValue(node.props ?? {}, rctx) as Record<string, unknown>;
	} catch (err) {
		console.warn('[Ripple headless] Failed to resolve props:', node.props, err);
	}
	const { children: _children, class: _class, ...restProps } = props;

	const resolved: ResolvedNode = {
		type: type ?? 'unknown',
		props: restProps,
		children: resolveChildren(node.children, ctx),
		source: node
	};

	if (node.id) resolved.id = node.id;
	if (node.slot) resolved.slot = node.slot;

	if (node.class) {
		const value = resolveString(node.class, rctx);
		resolved.class = typeof value === 'string' ? value : String(value ?? '');
	}

	// 5. Bind, resolved to a concrete path plus the widget's contract.
	if (node.bind) {
		const tpl = stripPath(node.bind).replace(/^state\./, '');
		const path = resolvePathTemplate(tpl, rctx);
		const contract = getBindContract(type ?? '');
		resolved.bind = {
			path,
			value: readPath(ctx.state, path),
			prop: contract.prop,
			event: contract.event
		};
	}

	const events = collectEvents(node);
	if (events) resolved.events = events;

	return [resolved];
}

function resolveChildren(children: UINode[] | undefined, ctx: ResolveContext): ResolvedNode[] {
	if (!children) return [];
	const out: ResolvedNode[] = [];
	for (const child of children) out.push(...resolveNode(child, ctx));
	return out;
}

/**
 * Resolve a spec tree against state. Pure: no DOM, no Svelte, and no
 * mutation of the inputs. Call it again after state changes to get the
 * next tree — `runtime.ts` does exactly that on state notifications.
 */
export function resolveTree(root: UINode | UINode[], ctx: ResolveContext): ResolvedTree {
	const roots = Array.isArray(root) ? root : [root];
	const nodes: ResolvedNode[] = [];
	for (const node of roots) nodes.push(...resolveNode(node, ctx));
	return { nodes, state: ctx.state };
}
