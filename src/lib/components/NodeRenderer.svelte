<!--
  @file NodeRenderer.svelte
  @description Recursive node renderer - renders a single UINode and its children.
  @created 2024-12-XX
  @changes
    - Initial creation with recursive rendering logic
    - Expression resolution for props and bindings
    - Event handler integration
    - Control flow support (if, each)
    - Fixed: Use self-import instead of deprecated svelte:self
    - Wired on_focus and on_blur handlers through widget props
    - Warn on unknown slot names (non-blocking, aids spec debugging)
-->
<script lang="ts">
	import { getContext } from 'svelte';
	import type { UINode, EventHandlerOrArray } from '../schema/index.js';
	import type { StateManager } from '../core/state-manager.svelte.js';
	import type { EventDispatcher } from '../core/event-dispatcher.js';
	import {
		resolveValue,
		resolveString,
		evaluateCondition,
		hasExpressions,
		type ResolverContext
	} from '../core/expression-resolver.js';
	import { getBindContract, warnUnregisteredBindContract } from '../core/widget-bind-contract.js';

	// Self-import for recursion (Svelte 5 pattern)
	import Self from './NodeRenderer.svelte';

	interface Props {
		/** The UI node to render */
		node: UINode;
		/** Additional context variables (from loops) */
		loopContext?: Record<string, unknown>;
	}

	let { node, loopContext = {} }: Props = $props();

	// Get context from parent UIRenderer
	const stateManager = getContext<StateManager>('ui-state');
	const eventDispatcher = getContext<EventDispatcher>('ui-events');
	const dataStore = getContext<Record<string, unknown>>('ui-data');
	const getWidget = getContext<(type: string) => any>('ui-widget-resolver');

	/**
	 * Build the resolver context for expression evaluation.
	 * We pass the state proxy reference directly - Svelte 5's $state proxy
	 * will track property access during derived computations.
	 */
	function getResolverContext(): ResolverContext {
		return {
			state: stateManager.state,
			data: dataStore ?? {},
			...loopContext
		};
	}

	/**
	 * Evaluate the 'show' condition if present.
	 * Force state tracking via JSON.stringify for reactivity.
	 */
	// Check once if this node uses any expressions (avoid JSON.stringify for static nodes)
	const nodeHasExpressions = node.show ? true
		: node.bind ? true
		: node.props ? Object.values(node.props).some(v => typeof v === 'string' && hasExpressions(v))
		: false;

	const shouldShow = $derived.by(() => {
		if (!node.show) return true;
		if (nodeHasExpressions) { const _ = stateManager.state; }
		return evaluateCondition(node.show, getResolverContext());
	});

	/**
	 * Resolve all props with expression evaluation.
	 * For checkbox/switch, filter out 'checked' to avoid conflicts with bound value.
	 */
	const resolvedProps = $derived.by(() => {
		// Only track state reactivity if this node actually uses expressions
		if (nodeHasExpressions) { const _ = stateManager.state; }
		const ctx = getResolverContext();
		const props = node.props ?? {};

		let resolved: Record<string, unknown>;
		try {
			resolved = resolveValue(props, ctx) as Record<string, unknown>;
		} catch (e) {
			console.warn('Failed to resolve props:', props, e);
			resolved = {};
		}

		// Remove 'children' and 'class' to avoid conflicts with explicit props/snippets
		const { children: _c, class: _cl, ...rest } = resolved;

		if ((node.type === 'checkbox' || node.type === 'switch') && 'checked' in rest) {
			const { checked: _, ...final } = rest;
			return final;
		}
		return rest;
	});

	/**
	 * Get the widget component for this node type.
	 */
	const WidgetComponent = $derived(getWidget(node.type));

	/**
	 * Per-widget bind contract: which prop receives the bound value and
	 * which event fires when the widget mutates it. Defaults to
	 * `value`/`onchange`; composites like wizard-layout override this.
	 */
	const bindContract = $derived(getBindContract(node.type));

	// Dev-only discoverability: warn once if a `bind` is used on a widget
	// that isn't classified in widget-bind-contract.ts.
	$effect(() => {
		if (node.bind) warnUnregisteredBindContract(node.type);
	});

	/**
	 * Create event handler functions that get fresh context on each invocation.
	 */
	function createEventHandler(handler: EventHandlerOrArray | undefined) {
		if (!handler) return undefined;

		return async (eventValue?: unknown) => {
			// Get fresh context at invocation time
			await eventDispatcher.dispatch(handler, getResolverContext(), eventValue);
		};
	}

	// Event handlers are computed once but context is fresh on each call
	const onclick = createEventHandler(node.on_click);
	const onsubmit = createEventHandler(node.on_submit);
	const onfocus = createEventHandler(node.on_focus);
	const onblur = createEventHandler(node.on_blur);
	const oninputUser = createEventHandler(node.on_input);

	/**
	 * Build handlers for any other `on_*` keys on the node (e.g. on_close, on_resize,
	 * on_navigate, on_select). The well-known events above are wired explicitly
	 * because they participate in two-way binding or have special semantics; the
	 * rest are passed through generically as `on<event>` props.
	 */
	const KNOWN_ON_KEYS = new Set([
		'on_click', 'on_change', 'on_input', 'on_submit', 'on_focus', 'on_blur'
	]);
	const extraHandlers = $derived.by<Record<string, (v?: unknown) => unknown>>(() => {
		const out: Record<string, (v?: unknown) => unknown> = {};
		const raw = node as unknown as Record<string, unknown>;
		for (const key of Object.keys(raw)) {
			if (!key.startsWith('on_') || KNOWN_ON_KEYS.has(key)) continue;
			const handler = createEventHandler(raw[key] as EventHandlerOrArray);
			if (!handler) continue;
			// on_close → onclose, on_open_change → onopenchange
			const propName = 'on' + key.slice(3).replace(/_/g, '');
			out[propName] = handler;
		}
		return out;
	});

	// `bind` may itself contain `{...}` placeholders (e.g. `lines.{i}.qty`)
	// that reference loop-local variables. This template is resolved per
	// invocation of onchange / oninput so the path picks up the current
	// loop context.
	const boundPathTemplate = $derived.by(() => {
		if (!node.bind) return null;
		const stripped = node.bind.replace(/^\{|\}$/g, '').trim();
		return stripped.replace(/^state\./, '');
	});

	function resolveBoundPath(): string | null {
		const tpl = boundPathTemplate;
		if (!tpl) return null;
		if (!tpl.includes('{')) return tpl;
		const result = resolveString(tpl, getResolverContext());
		return typeof result === 'string' ? result : String(result ?? '');
	}

	const onchangeUser = createEventHandler(node.on_change);
	const onchange = (eventValue?: unknown) => {
		const path = resolveBoundPath();
		if (path) stateManager.set(path, eventValue);
		return onchangeUser?.(eventValue);
	};

	const oninput = (eventValue?: unknown) => {
		const path = resolveBoundPath();
		if (path) stateManager.set(path, eventValue);
		return oninputUser?.(eventValue);
	};

	/**
	 * Get bound value if 'bind' is specified.
	 * For simple top-level state keys, access directly for reactivity.
	 */
	const boundValue = $derived.by(() => {
		if (!node.bind) return undefined;
		const tpl = boundPathTemplate;
		if (!tpl) return undefined;
		// Resolve `{...}` placeholders against current loop context.
		const statePath = tpl.includes('{')
			? (() => {
					const r = resolveString(tpl, getResolverContext());
					return typeof r === 'string' ? r : String(r ?? '');
			  })()
			: tpl;

		if (!statePath.includes('.')) {
			return stateManager.state[statePath];
		}
		return stateManager.get(statePath);
	});

	/**
	 * Resolve class prop with expression evaluation.
	 * We serialize state to force Svelte to track all nested changes.
	 */
	const resolvedClass = $derived.by(() => {
		if (!node.class) return undefined;
		if (hasExpressions(node.class)) {
			if (nodeHasExpressions) { const _ = stateManager.state; }
			try {
				const result = resolveString(node.class, getResolverContext());
				return typeof result === 'string' ? result : String(result ?? '');
			} catch (e) {
				console.warn('Failed to resolve class expression:', node.class, e);
				return '';
			}
		}
		return node.class;
	});

	/**
	 * Handle 'if' widget - evaluate condition.
	 */
	const ifCondition = $derived.by(() => {
		if (node.type !== 'if' || !node.condition) return true;
		return evaluateCondition(node.condition, getResolverContext());
	});

	/**
	 * Handle 'each' widget - get items array.
	 */
	const eachItems = $derived.by(() => {
		if (node.type !== 'each' || !node.items) return [];

		// Resolve the items path
		const path = node.items.replace(/^\{|\}$/g, '').trim();
		let items: unknown;

		// Check data store first
		if (path.startsWith('data.') && dataStore) {
			const dataPath = path.replace(/^data\./, '');
			items = dataStore[dataPath];
		} else if (dataStore && dataStore[path]) {
			items = dataStore[path];
		} else {
			// Fall back to state - access directly for reactivity
			const statePath = path.replace(/^state\./, '');
			// For top-level keys, access state directly for proper reactive tracking
			if (!statePath.includes('.')) {
				items = stateManager.state[statePath];
			} else {
				items = stateManager.get(statePath);
			}
		}

		return Array.isArray(items) ? items : [];
	});

	/**
	 * Partition node.children by the optional slot field.
	 * Children without `slot` go to the default bucket (the body children snippet).
	 * Named-slot children are forwarded to the widget via matching snippet props.
	 */
	const KNOWN_SLOTS = new Set(['default', 'header', 'footer', 'sidebar', 'topbar', 'actions']);

	const childBuckets = $derived.by<Record<string, UINode[]>>(() => {
		const buckets: Record<string, UINode[]> = { default: [] };
		if (!node.children) return buckets;
		for (const child of node.children) {
			const key = child.slot ?? 'default';
			if (!KNOWN_SLOTS.has(key)) {
				console.warn(`[Ripple] Unknown slot name: ${key}`);
			}
			if (!buckets[key]) buckets[key] = [];
			buckets[key].push(child);
		}
		return buckets;
	});
</script>

<!-- Don't render if show condition is false -->
{#if shouldShow}
	{#if node.type === 'if'}
		<!-- Conditional rendering -->
		{#if ifCondition}
			{#if node.children}
				{#each node.children as child, i (child.id ?? i)}
					<Self node={child} {loopContext} />
				{/each}
			{/if}
		{:else if node.else_children}
			{#each node.else_children as child, i (child.id ?? i)}
				<Self node={child} {loopContext} />
			{/each}
		{/if}
	{:else if node.type === 'each'}
		<!-- Loop rendering -->
		{#each eachItems as item, index (index)}
			{@const itemContext = {
				...loopContext,
				item,
				index,
				[node.item_as ?? 'item']: item,
				[node.index_as ?? 'index']: index
			}}
			{#if node.children}
				{#each node.children as child, i (child.id ?? i)}
					<Self node={child} loopContext={itemContext} />
				{/each}
			{/if}
		{/each}
	{:else if WidgetComponent}
		<!-- Regular widget rendering -->
		{@const defaultKids = childBuckets.default ?? []}
		{@const headerKids = childBuckets.header ?? []}
		{@const footerKids = childBuckets.footer ?? []}
		{@const sidebarKids = childBuckets.sidebar ?? []}
		{@const topbarKids = childBuckets.topbar ?? []}
		{@const actionsKids = childBuckets.actions ?? []}
		{@const widgetProps = {
			id: node.id,
			...(resolvedClass !== undefined && { class: resolvedClass }),
			...(node.style !== undefined && { style: node.style }),
			...resolvedProps,
			...(boundValue !== undefined && { [bindContract.prop]: boundValue }),
			...(onclick !== undefined && { onclick }),
			...((boundPathTemplate || onchangeUser) && { [bindContract.event]: onchange }),
			...((boundPathTemplate ||oninputUser) && { oninput }),
			...(onsubmit !== undefined && { onsubmit }),
			...(onfocus !== undefined && { onfocus }),
			...(onblur !== undefined && { onblur }),
			...extraHandlers,
			...(defaultKids.length > 0 && { hasChildren: true }),
			...(node.type === 'tabs' && defaultKids.length > 0 && { panels: defaultKids, panelLoopContext: loopContext })
		}}
		{#snippet headerSnippet()}
			{#each headerKids as child, i (child.id ?? i)}
				<Self node={child} {loopContext} />
			{/each}
		{/snippet}
		{#snippet footerSnippet()}
			{#each footerKids as child, i (child.id ?? i)}
				<Self node={child} {loopContext} />
			{/each}
		{/snippet}
		{#snippet sidebarSnippet()}
			{#each sidebarKids as child, i (child.id ?? i)}
				<Self node={child} {loopContext} />
			{/each}
		{/snippet}
		{#snippet topbarSnippet()}
			{#each topbarKids as child, i (child.id ?? i)}
				<Self node={child} {loopContext} />
			{/each}
		{/snippet}
		{#snippet actionsSnippet()}
			{#each actionsKids as child, i (child.id ?? i)}
				<Self node={child} {loopContext} />
			{/each}
		{/snippet}
		<WidgetComponent
			{...widgetProps}
			header={headerKids.length > 0 ? headerSnippet : undefined}
			footer={footerKids.length > 0 ? footerSnippet : undefined}
			sidebar={sidebarKids.length > 0 ? sidebarSnippet : undefined}
			topbar={topbarKids.length > 0 ? topbarSnippet : undefined}
			actions={actionsKids.length > 0 ? actionsSnippet : undefined}
		>
			{#snippet children()}
				{#each defaultKids as child, i (child.id ?? i)}
					<Self node={child} {loopContext} />
				{/each}
			{/snippet}
		</WidgetComponent>
	{:else}
		<!-- Unknown widget type -->
		<div class="text-red-500 p-2 border border-red-300 rounded bg-red-50">
			Unknown widget type: {node.type}
		</div>
	{/if}
{/if}
