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
	const onchange = createEventHandler(node.on_change);
	const onsubmit = createEventHandler(node.on_submit);

	/**
	 * Get bound value if 'bind' is specified.
	 * For simple top-level state keys, access directly for reactivity.
	 */
	const boundValue = $derived.by(() => {
		if (!node.bind) return undefined;
		// Remove curly braces if present
		const path = node.bind.replace(/^\{|\}$/g, '').trim();
		const statePath = path.replace(/^state\./, '');

		// For simple keys (no dots), access state directly for proper reactivity tracking
		// The $state proxy will track this property access
		if (!statePath.includes('.')) {
			return stateManager.state[statePath];
		}

		// For nested paths, use the get method (less reactive but works for reads)
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
	const childBuckets = $derived.by<Record<string, UINode[]>>(() => {
		const buckets: Record<string, UINode[]> = { default: [] };
		if (!node.children) return buckets;
		for (const child of node.children) {
			const key = child.slot ?? 'default';
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
		{@const widgetProps = {
			id: node.id,
			...(resolvedClass !== undefined && { class: resolvedClass }),
			...(node.style !== undefined && { style: node.style }),
			...resolvedProps,
			...(boundValue !== undefined && { value: boundValue }),
			...((node.type === 'checkbox' || node.type === 'switch') && boundValue !== undefined && { checked: boundValue }),
			...(onclick !== undefined && { onclick }),
			...(onchange !== undefined && { onchange }),
			...(onsubmit !== undefined && { onsubmit }),
			...(defaultKids.length > 0 && { hasChildren: true })
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
		<WidgetComponent
			{...widgetProps}
			header={headerKids.length > 0 ? headerSnippet : undefined}
			footer={footerKids.length > 0 ? footerSnippet : undefined}
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
