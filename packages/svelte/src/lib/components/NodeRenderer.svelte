<!--
  @file NodeRenderer.svelte
  @description Recursive node renderer: renders one UINode and its children.
  Its rule-for-rule twin without rendering is packages/core/src/headless/resolve-tree.ts;
  change both together.

  - Props, `show`, `class` and `bind` resolve through $derived against live state,
    loop context and the optional Chain Flow context ('ui-flow-context').
  - Event handlers read the handler spec from the current `node` at call time.
    Streamed specs mount a node before all its keys parse, so nothing about a
    handler may be captured at mount. The functions themselves are stable; only
    their presence (handler set or not) is derived.
  - Generic `on_*` keys pass through as `on<event>` props (on_open_change ->
    onopenchange). Input widgets get a form `name`: explicit props.name, else
    the resolved bind path, so a no-JS <form action> POST carries the field.
  - Dispatch tiers: control flow (if/each), organism refs (`{ organism, props }`
    with no `type`, routed to OrganismRenderer), catalog widgets, and a loud
    "not in the catalog" box for unknown types.
  - Default children go to the widget as a `children` snippet prop only when
    there are any; named slots (header/footer/sidebar/topbar/actions) likewise.
  - node.motion wraps the widget in a block-level div with use:withMotion (it
    must be a real box, not display:contents, or the transform never paints).
  - Widget and organism branches sit in <svelte:boundary> with an ErrorState
    fallback, so one throwing widget can't blank the message. Raw error text
    goes to `detail`, never `description`.
  - `data-ripple-node` / `data-ripple-type` are stamped last into widgetProps
    for the visual editor; they reach the DOM only where a widget forwards them.
-->
<!--
  LAYOUT CAVEAT: the motion wrapper is `display: block`. Block is the right
  default — the RFC-12 marketing/premium widgets are block-level sections,
  cards, and buttons, and a block box is what makes the transform actually
  paint. The one trade-off: a node.motion on an intrinsically inline widget
  (e.g. a bare inline span) now sits in a block box, which can change its
  inline flow. Inline-level motion targets should prefer the sugar widgets or
  carry their own display override; revisit with an inline variant if a real
  inline-widget motion case shows up.
-->
<script lang="ts">
	import { safeStyle } from '@ripple-ui/core';
	import { getContext } from 'svelte';
	import {
		resolveValue,
		resolveString,
		evaluateCondition,
		hasExpressions,
		withFlowContext,
		getBindContract,
		warnUnregisteredBindContract,
		type UINode,
		type EventHandlerOrArray,
		type EventDispatcher,
		type ResolverContext
	} from '@ripple-ui/core';
	import type { StateManager } from '../core/state-manager.svelte.js';
	import { withMotion } from '../actions/index.js';

	// Self-import for recursion (Svelte 5 pattern)
	import Self from './NodeRenderer.svelte';

	// 3rd dispatch tier: organism references. A spec node can reference a ripple
	// organism by name (`{ organism, props }`) instead of inlining a widget tree.
	import OrganismRenderer from '../organisms/OrganismRenderer.svelte';
	// Per-node error-boundary fallback (RCR-4).
	import ErrorState from '../widgets/overlay/ErrorState.svelte';
	import { isOrganismType } from '../organisms/schema.js';

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
	// RFC 13: optional Chain Flow context accessor. When a host renders a flow,
	// it provides `setContext('ui-flow-context', () => chainExecutor.context)`,
	// layering the flow's accumulated `<flowId>_selection`/`_formData` keys onto
	// the `state` scope so a later step can pre-fill from an earlier one. Read as
	// a getter so it tracks the executor's reactive `$state` context.
	const getFlowContext = getContext<(() => Record<string, unknown>) | undefined>('ui-flow-context');

	/**
	 * Build the resolver context for expression evaluation.
	 * We pass the state proxy reference directly - Svelte 5's $state proxy
	 * will track property access during derived computations.
	 */
	function getResolverContext(): ResolverContext {
		const ctx: ResolverContext = {
			state: stateManager.state,
			data: dataStore ?? {},
			...loopContext
		};
		// Layer the flow's accumulated context onto `state` (a no-op when absent).
		return getFlowContext ? withFlowContext(ctx, getFlowContext()) : ctx;
	}

	/**
	 * Evaluate the 'show' condition if present.
	 * Force state tracking via JSON.stringify for reactivity.
	 */
	// Whether this node uses any expressions (avoid JSON.stringify for static nodes).
	// $derived so it tracks the `node` prop — it's consumed inside the shouldShow /
	// resolvedProps deriveds, which already re-run when `node` changes, so deriving
	// it keeps the expression-gate correct for the current node rather than freezing
	// the first node's classification.
	const nodeHasExpressions = $derived(
		node.show ? true
		: node.bind ? true
		: node.props ? Object.values(node.props).some(v => typeof v === 'string' && hasExpressions(v))
		: false
	);

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
	 * Is this node an organism reference (`{ organism, props }`) rather than a
	 * widget node (`{ type, props, children }`)? Two conditions, both required,
	 * so the guard never mis-fires on a widget that happens to carry a stray
	 * `organism` prop:
	 *   1. `node.organism` is a registered OrganismType (isOrganismType), AND
	 *   2. the node has NO widget `type` — every widget node always has `type`,
	 *      so a typed node always routes through the widget path, untouched.
	 */
	const organismRef = $derived.by(() => {
		const raw = node as unknown as { organism?: unknown; type?: unknown };
		if (raw.type != null) return null; // a widget node — never an organism ref
		if (!isOrganismType(raw.organism)) return null;
		return {
			organism: raw.organism,
			props: (resolvedProps ?? {}) as Record<string, unknown>
		};
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
	 * Wrap a generic `on_*` handler spec; resolver context is fetched per call.
	 */
	function createEventHandler(handler: EventHandlerOrArray | undefined) {
		if (!handler) return undefined;

		return async (eventValue?: unknown) => {
			// Get fresh context at invocation time
			await eventDispatcher.dispatch(handler, getResolverContext(), eventValue);
		};
	}

	// The well-known handlers read the handler spec from the CURRENT `node` when
	// they fire, not at mount: streamSpec() mounts a node as soon as its type and
	// props parse, so its `on_*` key can arrive later. Each function is created
	// once (stable identity, no widget prop churn); only its presence is $derived,
	// because some widgets change role/cursor depending on whether a handler is set.
	type KnownOnKey = 'on_click' | 'on_change' | 'on_input' | 'on_submit' | 'on_focus' | 'on_blur';
	const fire = (key: KnownOnKey) => async (eventValue?: unknown) => {
		const handler = node[key];
		if (handler) await eventDispatcher.dispatch(handler, getResolverContext(), eventValue);
	};
	const fireClick = fire('on_click');
	const fireSubmit = fire('on_submit');
	const fireFocus = fire('on_focus');
	const fireBlur = fire('on_blur');
	const fireInput = fire('on_input');
	const fireChange = fire('on_change');
	const onclick = $derived(node.on_click ? fireClick : undefined);
	const onsubmit = $derived(node.on_submit ? fireSubmit : undefined);
	const onfocus = $derived(node.on_focus ? fireFocus : undefined);
	const onblur = $derived(node.on_blur ? fireBlur : undefined);
	const oninputUser = $derived(node.on_input ? fireInput : undefined);
	const onchangeUser = $derived(node.on_change ? fireChange : undefined);

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

	/**
	 * Form-field name for input widgets, so a native `<form action>` POST
	 * (Form.svelte's static-host mode) carries the field with JS disabled —
	 * the browser only submits controls that have a `name`.
	 *
	 * Priority: an explicit `name` in the spec props wins; otherwise we fall
	 * back to the resolved `bind` path. Form.svelte validates and serializes
	 * by state-path key, so defaulting `name` to the bind path lines the
	 * POSTed body keys up with the form's field rules with no extra config.
	 *
	 * Loop placeholders (`lines.{i}.qty`) are resolved against the current
	 * loop context, matching the bound value/onchange wiring above.
	 */
	const resolvedName = $derived.by(() => {
		const explicit = resolvedProps.name;
		if (typeof explicit === 'string' && explicit.length > 0) return explicit;
		return resolveBoundPath() ?? undefined;
	});

	// Bind write-back first, then the node's current user handler (if any).
	const onchange = (eventValue?: unknown) => {
		const path = resolveBoundPath();
		if (path) stateManager.set(path, eventValue);
		return fireChange(eventValue);
	};

	const oninput = (eventValue?: unknown) => {
		const path = resolveBoundPath();
		if (path) stateManager.set(path, eventValue);
		return fireInput(eventValue);
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
	{:else if organismRef}
		<!--
			Organism reference — the node is `{ organism, props }`, not a widget
			tree. Route to OrganismRenderer (3rd dispatch tier). The resolved props
			(expressions evaluated) are forwarded; widget nodes never reach here
			because they always carry a `type`.

			RCR-4: same per-node boundary as the widget branch below — organisms
			are exactly the rich generated cards this boundary exists for, and a
			top-level throwing organism would otherwise blank the whole message.
		-->
		<svelte:boundary>
			<OrganismRenderer organism={organismRef.organism} props={organismRef.props} />
			{#snippet failed(error, reset)}
				<div role="alert" data-ripple-node-error={node.id}>
					<ErrorState
						icon="error"
						title="This widget hit an error"
						description="The rest of the message is unaffected."
						detail={error instanceof Error ? error.message : String(error)}
						onaction={reset}
					/>
				</div>
			{/snippet}
		</svelte:boundary>
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
			...resolvedProps,
			// Widgets join this record into a style attribute; drop any url()/
			// image-set() target that fails safeUrl, after expressions resolve.
			...((node.style !== undefined || resolvedProps.style !== undefined) && {
				style: safeStyle(resolvedProps.style ?? node.style)
			}),
			...(resolvedName !== undefined && { name: resolvedName }),
			...(boundValue !== undefined && { [bindContract.prop]: boundValue }),
			...(onclick !== undefined && { onclick }),
			...((boundPathTemplate || onchangeUser) && { [bindContract.event]: onchange }),
			...((boundPathTemplate ||oninputUser) && { oninput }),
			...(onsubmit !== undefined && { onsubmit }),
			...(onfocus !== undefined && { onfocus }),
			...(onblur !== undefined && { onblur }),
			...extraHandlers,
			...(defaultKids.length > 0 && { hasChildren: true }),
			...(node.type === 'tabs' && defaultKids.length > 0 && { panels: defaultKids, panelLoopContext: loopContext }),
			// SP-0 editor spike: per-node DOM stamp for the visual-editor overlay.
			// Placed LAST so an author-supplied prop can never clobber the node's
			// identity (resolvedProps spreads earlier). NOTE: these only reach the
			// DOM for widgets whose root element actually forwards them — see the
			// spike report; most widgets surface `id` but drop unknown attrs, so
			// the overlay's primary selector is the DOM `id`, with these as the
			// dedicated-attribute path for widgets that opt in.
			'data-ripple-node': node.id,
			'data-ripple-type': node.type
		}}
		<!-- The default-children snippet is passed as a PROP (below) and only when
		     `defaultKids` is non-empty. Inlining it as component content passed an
		     always-truthy `children` to every widget, so a widget could not tell
		     "renderer, zero kids" from "hand-written caller with kids" — which is
		     why `hasChildren` had to exist. Matching header/footer/sidebar/topbar/
		     actions makes `children` a truthful signal for both callers. -->
		{#snippet defaultSnippet()}
			{#each defaultKids as child, i (child.id ?? i)}
				<Self node={child} {loopContext} />
			{/each}
		{/snippet}
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
		<svelte:boundary>
			<!-- RCR-4: per-node error boundary. A widget that throws during
			     render shows an inline ErrorState for THIS node while its siblings
			     keep rendering, so one bad widget can't take down the message. -->
			{#if node.motion}
			<!--
				The motion wrapper MUST be a real layout box (block), not
				`display: contents`. `display: contents` generates no box, so the
				transform/opacity/filter withMotion sets here would paint nothing
				(the motion runs but never animates). `block` matches the working
				reveal/parallax sugar widgets. See the LAYOUT CAVEAT at the top of
				this file for the inline-widget trade-off.
			-->
			<div data-ripple-motion data-ripple-node={node.id} class="block" use:withMotion={node.motion}>
				<WidgetComponent
					{...widgetProps}
					header={headerKids.length > 0 ? headerSnippet : undefined}
					footer={footerKids.length > 0 ? footerSnippet : undefined}
					sidebar={sidebarKids.length > 0 ? sidebarSnippet : undefined}
					topbar={topbarKids.length > 0 ? topbarSnippet : undefined}
					actions={actionsKids.length > 0 ? actionsSnippet : undefined}
					children={defaultKids.length > 0 ? defaultSnippet : undefined}
				/>
			</div>
		{:else}
			<WidgetComponent
				{...widgetProps}
				header={headerKids.length > 0 ? headerSnippet : undefined}
				footer={footerKids.length > 0 ? footerSnippet : undefined}
				sidebar={sidebarKids.length > 0 ? sidebarSnippet : undefined}
				topbar={topbarKids.length > 0 ? topbarSnippet : undefined}
				actions={actionsKids.length > 0 ? actionsSnippet : undefined}
				children={defaultKids.length > 0 ? defaultSnippet : undefined}
			/>
		{/if}
			{#snippet failed(error, reset)}
				<!-- Wire the boundary's reset() to ErrorState's "Try again" action.
				     Without it the button rendered but did nothing, so a node that
				     transiently threw (e.g. a mid-stream partial spec, or a widget
				     fixed in-place by the editor) stayed wedged on ErrorState with no
				     way back. reset() re-attempts the render. (The chat streaming
				     preview also self-heals on close — the final interactive render is
				     a separate mount — so this covers the editor / stable cases.)
				     Raw exception messages can leak internals (paths, expression
				     fragments) into a consumer-facing card, so the description
				     stays generic and the message goes to `detail` (small
				     monospace, built for exactly this). -->
				<div role="alert" data-ripple-node-error={node.id}>
					<ErrorState
						icon="error"
						title="This widget hit an error"
						description="The rest of the message is unaffected."
						detail={error instanceof Error ? error.message : String(error)}
						onaction={reset}
					/>
				</div>
			{/snippet}
		</svelte:boundary>
	{:else}
		<!--
			Unknown widget type — the node's `type` is not in the widget catalog.
			Fail loud: surface the offending type and the node id so the spec
			author (or the catalog gate) can pinpoint it.
		-->
		<div
			class="text-red-500 p-2 border border-red-300 rounded bg-red-50 text-sm"
			role="alert"
			data-ripple-unknown-widget={node.type}
		>
			<strong>Widget type "{node.type}" isn't in the catalog.</strong>
			{#if node.id}
				<span class="block opacity-80">node id: {node.id}</span>
			{/if}
			<span class="block opacity-80">
				Use a registered widget type, or register a custom widget before mount.
			</span>
		</div>
	{/if}
{/if}
