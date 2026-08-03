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
    - 2026-05-22: unknown-widget branch fails loud — shows the node id and a
      clear "not in the catalog" message instead of a bare red box
      (Increment 5 catalog-as-allowlist).
    - 2026-05-30: wrap the widget branch in use:withMotion when node.motion is
      set (RFC 12 motion primitive); motion-free specs unchanged.
    - 2026-05-30 (PR #45 motion-wrapper box fix): the motion wrapper was
      `display: contents`, which generates NO box — so the transform/opacity/
      filter withMotion writes onto it painted nothing (motion ran but never
      animated). Changed the wrapper to `class="block"` (a real layout box),
      matching the working reveal/parallax sugar widgets that DO animate.
    - 2026-06-02: derive a form-field `name` for input widgets — explicit
      `props.name` wins, else fall back to the resolved `bind` path — so a
      native <form action> POST carries field values with JS disabled
      (ripple-iui #54).
    - 2026-06-09: cleared 10 state_referenced_locally warnings on the `node` prop.
      Two distinct cases: (1) `nodeHasExpressions` is now $derived so it tracks the
      current `node` (it feeds the shouldShow/resolvedProps deriveds, which already
      re-run on node change) — a correctness improvement, not a behavior change for
      keyed nodes. (2) The event-handler consts (onclick/onsubmit/onfocus/onblur/
      oninputUser/onchangeUser) keep their deliberate "computed once" design — the
      handler spec is seeded once at construction (fresh resolver context is fetched
      per-invocation), so they get svelte-ignore, not derivation. No frozen-snapshot
      bug found; all event handlers already re-read live state at call time.
    - 2026-06-07: route organism-ref nodes (`{ organism, props }`) to
      OrganismRenderer — the 3rd dispatch tier. A node is an organism-ref ONLY
      when it carries a valid `organism` type string and NO widget `type` key,
      so normal `{type, props, children}` widget nodes are byte-identical to
      before. Guarded by isOrganismType so a stray `organism` prop on a widget
      can never mis-fire.
    - 2026-06-27 (SP-0 editor spike): stamp `data-ripple-node` (= node.id) and
      `data-ripple-type` (= node.type) into widgetProps, and add
      `data-ripple-node` to the motion-wrapper div, so the visual-editor overlay
      can map a DOM element back to its spec node. Stamp sits LAST in widgetProps
      so author props can't clobber node identity. CAVEAT: these reach the DOM
      only for widgets whose root forwards unknown attributes (≈none do today) —
      empirically the working selector is the DOM `id` already bound by ~82% of
      widgets; see docs/design/sp0-spike-report.md.
    - 2026-07-08 (RCR-4): wrap the widget AND organism-ref branches in
      <svelte:boundary> with an ErrorState fallback keyed to the node id, so a
      widget that throws during render is isolated to its own node instead of
      blanking the whole message. The raw error message renders in `detail`
      (small monospace), not `description` — exception text can leak internals
      into a consumer-facing card. NOTE: svelte:boundary catches render and
      $effect errors only; event-handler and post-await async throws are not
      boundary-caught (pre-existing Svelte semantics, no regression).
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
	import { getContext } from 'svelte';
	import type { UINode, EventHandlerOrArray } from '../schema/index.js';
	import type { StateManager } from '../core/state-manager.svelte.js';
	import type { EventDispatcher } from '../core/event-dispatcher.js';
	import {
		resolveValue,
		resolveString,
		evaluateCondition,
		hasExpressions,
		withFlowContext,
		type ResolverContext
	} from '../core/expression-resolver.js';
	import { getBindContract, warnUnregisteredBindContract } from '../core/widget-bind-contract.js';
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
	 * Create event handler functions that get fresh context on each invocation.
	 */
	function createEventHandler(handler: EventHandlerOrArray | undefined) {
		if (!handler) return undefined;

		return async (eventValue?: unknown) => {
			// Get fresh context at invocation time
			await eventDispatcher.dispatch(handler, getResolverContext(), eventValue);
		};
	}

	// Event handlers are computed once but context is fresh on each call. The
	// handler spec is read once at construction by design (a new function identity
	// per node change would churn the widget's event props); fresh resolver context
	// is fetched at invocation time inside createEventHandler. Intentional one-time
	// seed, not a stale-snapshot bug.
	// svelte-ignore state_referenced_locally
	const onclick = createEventHandler(node.on_click);
	// svelte-ignore state_referenced_locally
	const onsubmit = createEventHandler(node.on_submit);
	// svelte-ignore state_referenced_locally
	const onfocus = createEventHandler(node.on_focus);
	// svelte-ignore state_referenced_locally
	const onblur = createEventHandler(node.on_blur);
	// svelte-ignore state_referenced_locally
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

	// svelte-ignore state_referenced_locally
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
			{#snippet failed(error)}
				<div role="alert" data-ripple-node-error={node.id}>
					<ErrorState
						icon="error"
						title="This widget hit an error"
						detail={error instanceof Error ? error.message : String(error)}
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
			...(node.style !== undefined && { style: node.style }),
			...resolvedProps,
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
				>
					{#snippet children()}
						{#each defaultKids as child, i (child.id ?? i)}
							<Self node={child} {loopContext} />
						{/each}
					{/snippet}
				</WidgetComponent>
			</div>
		{:else}
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
		{/if}
			{#snippet failed(error)}
				<!-- Raw exception messages can leak internals (paths, expression
				     fragments) into a consumer-facing card, so the description
				     stays generic and the message goes to `detail` (small
				     monospace, built for exactly this). -->
				<div role="alert" data-ripple-node-error={node.id}>
					<ErrorState
						icon="error"
						title="This widget hit an error"
						description="The rest of the message is unaffected."
						detail={error instanceof Error ? error.message : String(error)}
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
