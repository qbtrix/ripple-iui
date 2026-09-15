/**
 * @file resolve-tree.test.ts
 * @description Behaviour of the pure resolver.
 *
 * The load-bearing assertions are the structural invariants: a resolved
 * tree contains no unevaluated `{...}` templates and no control-flow
 * nodes. Those two properties are what a downstream renderer, a
 * serializer, or a diff is allowed to rely on, so they get a sweep over
 * the whole output rather than a spot check.
 *
 * @changes
 *   - 2026-08-25: created (headless core, wave 1).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveTree } from './resolve-tree.js';
import type { ResolvedNode } from './types.js';
import type { UINode } from '../schema/ui-spec.js';

/** Depth-first flatten, for whole-tree invariant sweeps. */
function flatten(nodes: ResolvedNode[]): ResolvedNode[] {
	const out: ResolvedNode[] = [];
	for (const node of nodes) {
		out.push(node);
		out.push(...flatten(node.children));
	}
	return out;
}

const node = (n: Partial<UINode> & { type?: string }) => n as UINode;

describe('resolveTree', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('evaluates expressions in props', () => {
		const tree = resolveTree(node({ type: 'text', props: { content: 'Hi {state.name}' } }), {
			state: { name: 'Ada' }
		});
		expect(tree.nodes[0].props.content).toBe('Hi Ada');
	});

	it('resolves a non-string prop to its typed value, not a string', () => {
		const tree = resolveTree(node({ type: 'progress', props: { value: '{state.pct}' } }), {
			state: { pct: 42 }
		});
		expect(tree.nodes[0].props.value).toBe(42);
	});

	it('omits a node whose show condition is false, with its subtree', () => {
		const tree = resolveTree(
			node({
				type: 'container',
				show: '{state.visible}',
				children: [node({ type: 'text', props: { content: 'hidden' } })]
			}),
			{ state: { visible: false } }
		);
		expect(tree.nodes).toEqual([]);
	});

	it('keeps a node whose show condition is true', () => {
		const tree = resolveTree(node({ type: 'text', show: '{state.visible}' }), {
			state: { visible: true }
		});
		expect(tree.nodes).toHaveLength(1);
	});

	describe('control flow collapses out of the output', () => {
		const ifSpec = node({
			type: 'if',
			condition: '{state.loggedIn}',
			children: [node({ type: 'text', props: { content: 'welcome' } })],
			else_children: [node({ type: 'text', props: { content: 'sign in' } })]
		});

		it('takes the then-branch and drops the if node itself', () => {
			const tree = resolveTree(ifSpec, { state: { loggedIn: true } });
			expect(tree.nodes).toHaveLength(1);
			expect(tree.nodes[0].type).toBe('text');
			expect(tree.nodes[0].props.content).toBe('welcome');
		});

		it('takes the else-branch when the condition fails', () => {
			const tree = resolveTree(ifSpec, { state: { loggedIn: false } });
			expect(tree.nodes[0].props.content).toBe('sign in');
		});

		it('yields nothing when the failing branch has no else_children', () => {
			const tree = resolveTree(
				node({ type: 'if', condition: '{state.no}', children: [node({ type: 'text' })] }),
				{ state: { no: false } }
			);
			expect(tree.nodes).toEqual([]);
		});
	});

	describe('each', () => {
		const eachSpec = node({
			type: 'each',
			items: '{state.users}',
			children: [node({ type: 'text', props: { content: '{item.name}' } })]
		});

		it('expands one copy of the children per item', () => {
			const tree = resolveTree(eachSpec, {
				state: { users: [{ name: 'Ada' }, { name: 'Grace' }, { name: 'Katherine' }] }
			});
			expect(tree.nodes.map((n) => n.props.content)).toEqual(['Ada', 'Grace', 'Katherine']);
		});

		it('exposes the index and honours custom aliases', () => {
			const tree = resolveTree(
				node({
					type: 'each',
					items: '{state.rows}',
					item_as: 'row',
					index_as: 'i',
					children: [node({ type: 'text', props: { content: '{i}:{row.id}' } })]
				}),
				{ state: { rows: [{ id: 'a' }, { id: 'b' }] } }
			);
			expect(tree.nodes.map((n) => n.props.content)).toEqual(['0:a', '1:b']);
		});

		it('reads items from the data bag before state', () => {
			const tree = resolveTree(
				node({
					type: 'each',
					items: 'users',
					children: [node({ type: 'text', props: { content: '{item.name}' } })]
				}),
				{
					state: { users: [{ name: 'from-state' }] },
					data: { users: [{ name: 'from-data' }] }
				}
			);
			expect(tree.nodes.map((n) => n.props.content)).toEqual(['from-data']);
		});

		it('reads from state when the path is explicitly state-scoped', () => {
			// `{state.users}` keeps its prefix after brace-stripping, so the data
			// bag is not consulted — the escape hatch when both hold the key.
			const tree = resolveTree(eachSpec, {
				state: { users: [{ name: 'from-state' }] },
				data: { users: [{ name: 'from-data' }] }
			});
			expect(tree.nodes.map((n) => n.props.content)).toEqual(['from-state']);
		});

		it('yields nothing for a missing or non-array items path', () => {
			expect(resolveTree(eachSpec, { state: {} }).nodes).toEqual([]);
			expect(resolveTree(eachSpec, { state: { users: 'nope' } }).nodes).toEqual([]);
		});

		it('layers loop context into descendants, not just direct children', () => {
			const tree = resolveTree(
				node({
					type: 'each',
					items: '{state.rows}',
					item_as: 'row',
					children: [
						node({
							type: 'card',
							children: [
								node({
									type: 'container',
									children: [node({ type: 'text', props: { content: '{row.id}' } })]
								})
							]
						})
					]
				}),
				{ state: { rows: [{ id: 'a' }, { id: 'b' }] } }
			);
			const leaves = tree.nodes.map((n) => n.children[0].children[0].props.content);
			expect(leaves).toEqual(['a', 'b']);
		});

		it('does NOT resolve items from loop context (known engine limit)', () => {
			// NodeRenderer.svelte reads `each` items from the data bag or state
			// only — never from loop context — so a nested each over an outer
			// item's array yields nothing THERE too. Pinned so the headless
			// runtime is not "fixed" into diverging from the Svelte one; the
			// fix, when it comes, has to land in both.
			const tree = resolveTree(
				node({
					type: 'each',
					items: '{state.groups}',
					item_as: 'group',
					children: [
						node({
							type: 'each',
							items: '{group.members}',
							item_as: 'member',
							children: [node({ type: 'text', props: { content: '{member}' } })]
						})
					]
				}),
				{ state: { groups: [{ name: 'eng', members: ['a', 'b'] }] } }
			);
			expect(tree.nodes).toEqual([]);
		});
	});

	describe('bind', () => {
		it('resolves the path, current value, and the widget bind contract', () => {
			const tree = resolveTree(node({ type: 'input', bind: '{state.form.email}' }), {
				state: { form: { email: 'ada@example.com' } }
			});
			expect(tree.nodes[0].bind).toEqual({
				path: 'form.email',
				value: 'ada@example.com',
				prop: 'value',
				event: 'onchange'
			});
		});

		it('uses the per-widget contract where one is registered', () => {
			const tree = resolveTree(node({ type: 'checkbox', bind: '{state.agreed}' }), {
				state: { agreed: true }
			});
			expect(tree.nodes[0].bind?.prop).toBe('checked');
		});

		it('substitutes loop placeholders inside the bind path', () => {
			const tree = resolveTree(
				node({
					type: 'each',
					items: '{state.lines}',
					index_as: 'i',
					children: [node({ type: 'input', bind: 'lines.{i}.qty' })]
				}),
				{ state: { lines: [{ qty: 5 }, { qty: 9 }] } }
			);
			expect(tree.nodes.map((n) => n.bind?.path)).toEqual(['lines.0.qty', 'lines.1.qty']);
			expect(tree.nodes.map((n) => n.bind?.value)).toEqual([5, 9]);
		});

		it('reports an undefined value for a path that does not exist yet', () => {
			const tree = resolveTree(node({ type: 'input', bind: '{state.absent.deep}' }), {
				state: {}
			});
			expect(tree.nodes[0].bind).toMatchObject({ path: 'absent.deep', value: undefined });
		});
	});

	describe('events', () => {
		it('keys handlers by renderer prop name', () => {
			// `on_open_change` is not a declared UINode field — the schema names
			// six on_* keys and widgets carry arbitrary others through. The cast
			// is the point of the test: resolution must handle the undeclared
			// ones, because that is what a real widget spec contains.
			const spec = {
				type: 'button',
				on_click: { action: 'set', target: 'x', value: 1 },
				on_open_change: { action: 'emit', target: 'opened' }
			} as unknown as UINode;
			const tree = resolveTree(spec, { state: {} });
			expect(Object.keys(tree.nodes[0].events ?? {}).sort()).toEqual([
				'onclick',
				'onopenchange'
			]);
		});

		it('leaves handler specs unevaluated for the dispatcher to resolve', () => {
			// Expressions inside a handler must survive to dispatch time, when the
			// live state (and loop context) is what they should resolve against.
			const tree = resolveTree(
				node({ type: 'button', on_click: { action: 'set', target: 'x', value: '{state.y}' } }),
				{ state: { y: 'later' } }
			);
			expect(tree.nodes[0].events?.onclick).toEqual({
				action: 'set',
				target: 'x',
				value: '{state.y}'
			});
		});

		it('omits the events key entirely when a node has no handlers', () => {
			const tree = resolveTree(node({ type: 'text' }), { state: {} });
			expect(tree.nodes[0].events).toBeUndefined();
		});
	});

	describe('unknown widgets', () => {
		it('warns and keeps the node by default, so it stays visible', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const tree = resolveTree(node({ type: 'not-a-widget' }), {
				state: {},
				isKnownWidget: () => false
			});
			expect(tree.nodes).toHaveLength(1);
			expect(warn).toHaveBeenCalled();
		});

		it('drops the node when the host returns false', () => {
			const tree = resolveTree(node({ type: 'not-a-widget' }), {
				state: {},
				isKnownWidget: () => false,
				onUnknownWidget: () => false
			});
			expect(tree.nodes).toEqual([]);
		});

		it('runs no catalog check at all when isKnownWidget is omitted', () => {
			const onUnknown = vi.fn();
			resolveTree(node({ type: 'anything' }), { state: {}, onUnknownWidget: onUnknown });
			expect(onUnknown).not.toHaveBeenCalled();
		});
	});

	it('contains a throwing prop expression to the node that owns it', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const hostile = {
			type: 'text',
			props: {
				get boom(): string {
					throw new Error('prop getter exploded');
				}
			}
		} as unknown as UINode;

		const tree = resolveTree(
			node({ type: 'container', children: [hostile, node({ type: 'text', props: { ok: 1 } })] }),
			{ state: {} }
		);

		expect(tree.nodes[0].children).toHaveLength(2);
		expect(tree.nodes[0].children[0].props).toEqual({});
		expect(tree.nodes[0].children[1].props).toEqual({ ok: 1 });
	});

	it('resolves the class expression and strips class/children from props', () => {
		const tree = resolveTree(
			node({
				type: 'text',
				class: 'base {state.tone}',
				props: { class: 'ignored', children: 'ignored', keep: 'yes' }
			}),
			{ state: { tone: 'danger' } }
		);
		expect(tree.nodes[0].class).toBe('base danger');
		expect(tree.nodes[0].props).toEqual({ keep: 'yes' });
	});

	it('carries id, slot, and the source node through', () => {
		const source = node({ type: 'text', id: 'n1', slot: 'header' });
		const tree = resolveTree(source, { state: {} });
		expect(tree.nodes[0]).toMatchObject({ id: 'n1', slot: 'header', source });
	});

	it('accepts a list of roots', () => {
		const tree = resolveTree([node({ type: 'text' }), node({ type: 'button' })], { state: {} });
		expect(tree.nodes.map((n) => n.type)).toEqual(['text', 'button']);
	});

	it('never mutates the input spec', () => {
		const spec = node({
			type: 'each',
			items: '{state.xs}',
			children: [node({ type: 'text', props: { content: '{item}' } })]
		});
		const before = JSON.stringify(spec);
		resolveTree(spec, { state: { xs: [1, 2] } });
		expect(JSON.stringify(spec)).toBe(before);
	});

	describe('whole-tree invariants', () => {
		const kitchenSink = node({
			type: 'container',
			children: [
				node({ type: 'text', props: { content: 'Hello {state.name}' }, class: '{state.tone}' }),
				node({
					type: 'if',
					condition: '{state.on}',
					children: [
						node({
							type: 'each',
							items: '{state.rows}',
							children: [
								node({
									type: 'card',
									props: { title: '{item.title}', n: '{index}' },
									children: [node({ type: 'input', bind: 'rows.{index}.title' })]
								})
							]
						})
					]
				}),
				node({ type: 'text', show: '{state.off}', props: { content: 'never' } })
			]
		});
		const ctx = {
			state: {
				name: 'Ada',
				tone: 'calm',
				on: true,
				off: false,
				rows: [{ title: 'one' }, { title: 'two' }]
			}
		};

		it('leaves no unevaluated expression anywhere in the output', () => {
			const tree = resolveTree(kitchenSink, ctx);
			for (const n of flatten(tree.nodes)) {
				// `source` intentionally preserves the raw spec, so only the
				// resolved fields are swept. Each value is checked on its own —
				// wrapping them in one JSON object would introduce braces of its
				// own and make the assertion match its own scaffolding.
				const values = [
					...Object.values(n.props).map((v) => JSON.stringify(v)),
					n.class,
					n.bind?.path
				];
				for (const value of values) {
					if (typeof value !== 'string') continue;
					expect(value, `unresolved template in <${n.type}>`).not.toMatch(/\{[^}]+\}/);
				}
			}
		});

		it('leaves no control-flow node anywhere in the output', () => {
			const tree = resolveTree(kitchenSink, ctx);
			const types = flatten(tree.nodes).map((n) => n.type);
			expect(types).not.toContain('if');
			expect(types).not.toContain('each');
			expect(types).toContain('card');
		});

		it('produces the same tree twice for the same inputs', () => {
			const a = resolveTree(kitchenSink, ctx);
			const b = resolveTree(kitchenSink, ctx);
			const strip = (nodes: ResolvedNode[]): unknown =>
				nodes.map((n) => ({
					type: n.type,
					props: n.props,
					bind: n.bind,
					children: strip(n.children)
				}));
			expect(strip(a.nodes)).toEqual(strip(b.nodes));
		});
	});
});
