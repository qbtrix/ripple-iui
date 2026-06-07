<!--
  IntentRenderer.svelte — the intent→layout dispatch (genesis IntentRenderer,
  adapted to ripple's UniversalSpec + widgets).
  Created 2026-06-07.
  Updated 2026-06-07 (Wave 3: layouts) — wired ALL intents to designed layouts:
    browse    → CardGridLayout (card-grid family) or ListLayout (list family)
    select    → SelectLayout  (OptionList for raw-ui option sets; CardGrid/List for data)
    detail    → DetailLayout
    info      → InfoHeroLayout
    search    → SearchLayout
    form      → FormLayout    (now composes FormSection — Wave 3 upgrade)
    confirm   → SummaryLayout (now composes ResultsSummary — Wave 3 upgrade)
    dashboard → DashboardRenderer (existing, unchanged)
    workspace → NodeRenderer escape hatch (no WorkspaceRenderer in ripple yet)
    action    → NodeRenderer escape hatch
    custom    → NodeRenderer escape hatch  ← LOAD-BEARING, never remove
    unmapped  → NodeRenderer escape hatch

  Takes a UniversalSpec, uses the layout engine + the adapter to pick and feed a
  designed layout. The ESCAPE HATCH is load-bearing: `custom` and ANY unmapped
  intent fall straight through to `<NodeRenderer node={spec.ui}>`, so a render is
  NEVER blocked and existing specs behave exactly as before (byte-identical for
  custom).

  The adapter (layout-adapter.ts) is the schema bridge: it turns the spec (+ the
  optional flow `context`) into the LayoutInput every layout reads. PURE — no fetch,
  no service; the layout reads data already on the spec / context.
-->
<script lang="ts">
	import type { UniversalSpec } from '../schema/universal-spec.js';
	import { toLayoutInput } from './layout-adapter.js';
	import { determineLayout } from './layout-engine.js';
	import NodeRenderer from '../components/NodeRenderer.svelte';
	import DashboardRenderer from './DashboardRenderer.svelte';
	import FormLayout from './layouts/FormLayout.svelte';
	import SummaryLayout from './layouts/SummaryLayout.svelte';
	import CardGridLayout from './layouts/CardGridLayout.svelte';
	import ListLayout from './layouts/ListLayout.svelte';
	import SelectLayout from './layouts/SelectLayout.svelte';
	import DetailLayout from './layouts/DetailLayout.svelte';
	import InfoHeroLayout from './layouts/InfoHeroLayout.svelte';
	import SearchLayout from './layouts/SearchLayout.svelte';

	interface Props {
		/** The step / spec to render. */
		spec: UniversalSpec;
		/**
		 * Flow's accumulated context (from the ChainExecutor), used by the adapter
		 * to build a confirm step's review rows. Absent for a standalone spec.
		 */
		context?: Record<string, unknown>;
		/** Forwarded to DashboardRenderer when intent='dashboard'. */
		onSpecChanged?: (spec: unknown) => void;
		/** Fired when a designed form field changes (data mode). */
		onFieldChange?: (id: string, value: unknown) => void;
	}

	let { spec, context, onSpecChanged, onFieldChange }: Props = $props();

	// The layout engine maps intent (+ data/display hints) to a layout family.
	const layout = $derived(determineLayout(spec as never));
	const input = $derived(toLayoutInput(spec, context));

	// Local selection state owned by this renderer for data-mode grids.
	// Raw-ui selection (flow.next + flow.submit) is handled inside SelectLayout
	// via the EventDispatcher context — no local state needed.
	let selectedIds = $state<string[]>([]);
	function handleSelect(id: string) {
		if (spec.selection === 'multiple') {
			selectedIds = selectedIds.includes(id)
				? selectedIds.filter((s) => s !== id)
				: [...selectedIds, id];
		} else {
			selectedIds = [id];
		}
	}

	// Search query (layout-local; the SearchLayout is purely presentational).
	let searchQuery = $state('');

	/**
	 * Which designed layout handles this spec.
	 *
	 * Resolution order:
	 *  1. dashboard           → DashboardRenderer
	 *  2. form / form-*       → FormLayout
	 *  3. confirm / summary-card → SummaryLayout
	 *  4. select              → SelectLayout
	 *  5. browse + list family → ListLayout
	 *  6. browse + card family → CardGridLayout
	 *  7. detail              → DetailLayout
	 *  8. info                → InfoHeroLayout
	 *  9. search              → SearchLayout
	 * 10. everything else     → NodeRenderer (escape hatch — load-bearing)
	 */
	type Designed =
		| 'dashboard'
		| 'form'
		| 'summary'
		| 'select'
		| 'card-grid'
		| 'list'
		| 'detail'
		| 'info'
		| 'search'
		| 'node';

	const designed = $derived.by<Designed>(() => {
		if (spec.intent === 'dashboard' || layout === 'dashboard') return 'dashboard';
		if (spec.intent === 'form' || layout.startsWith('form')) return 'form';
		if (
			spec.intent === 'confirm' ||
			spec.intent === 'quick_confirm' ||
			layout === 'summary-card'
		)
			return 'summary';
		// select / form / confirm handle raw-ui in their own chrome (a flow step's
		// option buttons → OptionList, etc.), so they route regardless of mode.
		if (spec.intent === 'select') return 'select';
		// The PURE data layouts (browse/detail/info/search) read structured data
		// and ignore `spec.ui`. When a spec is in raw-ui mode (a hand-authored
		// widget tree, no structured data — e.g. our start_flow steps or legacy
		// specs), fall straight to the NodeRenderer escape hatch so the raw tree
		// still renders. Only route to the designed data layout when data exists.
		if (input.mode === 'raw-ui') return 'node';
		if (spec.intent === 'browse') {
			if (
				layout === 'list' ||
				layout === 'list-detail' ||
				layout === 'scrollable-list' ||
				layout === 'icon-grid'
			)
				return 'list';
			return 'card-grid';
		}
		if (spec.intent === 'detail') return 'detail';
		if (spec.intent === 'info') return 'info';
		if (spec.intent === 'search') return 'search';
		// action / workspace / custom / unmapped → escape hatch.
		return 'node';
	});
</script>

{#if designed === 'dashboard'}
	<DashboardRenderer {spec} {onSpecChanged} />
{:else if designed === 'form'}
	<FormLayout {input} {onFieldChange} />
{:else if designed === 'summary'}
	<SummaryLayout {input} />
{:else if designed === 'select'}
	<SelectLayout {input} {selectedIds} onSelect={(id) => handleSelect(id)} />
{:else if designed === 'card-grid'}
	<CardGridLayout {input} {selectedIds} onSelect={(id) => handleSelect(id)} />
{:else if designed === 'list'}
	<ListLayout {input} {selectedIds} onSelect={(id) => handleSelect(id)} />
{:else if designed === 'detail'}
	<DetailLayout {input} />
{:else if designed === 'info'}
	<InfoHeroLayout {input} />
{:else if designed === 'search'}
	<SearchLayout
		{input}
		query={searchQuery}
		onSearch={(q) => (searchQuery = q)}
		{selectedIds}
		onSelect={(id) => handleSelect(id)}
	/>
{:else if spec.ui}
	<!-- Escape hatch: custom / action / workspace / unmapped intents render their
	     raw tree unchanged. This branch is LOAD-BEARING — never remove it. -->
	<NodeRenderer node={spec.ui} />
{:else}
	<div class="intent-renderer__empty">No UI definition for intent: {spec.intent}</div>
{/if}

<style>
	.intent-renderer__empty {
		padding: 1rem;
		font-size: 0.85rem;
		color: var(--ripple-muted-foreground);
	}
</style>
