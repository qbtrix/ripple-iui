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
    form      → FormLayout    (composes FormSection — data mode; raw-ui fallback)
    confirm   → SummaryLayout (composes ResultsSummary; reads review_rows / context)
    dashboard → DashboardRenderer (existing, unchanged)
    workspace → NodeRenderer escape hatch (no WorkspaceRenderer in ripple yet)
    action    → NodeRenderer escape hatch
    custom    → NodeRenderer escape hatch  ← LOAD-BEARING, never remove
    unmapped  → NodeRenderer escape hatch

  Updated 2026-06-07 (composite + ported layouts) — added display-hint routing:
    display.layout='comparison' → ComparisonIntentLayout (ComparisonLayout composite)
    display.layout='checklist'  → ChecklistIntentLayout  (ChecklistLayout composite)
    display.layout='invoice'    → InvoiceIntentLayout    (InvoiceLayout composite)
    display.layout='report'     → ReportIntentLayout     (ReportLayout composite)
    display.layout='timeline'   → TimelineLayout         (ported, composes Timeline widget)
    display.layout='table'      → TableLayout            (ported, composes Table widget)
    display.layout='article'    → ArticleLayout          (ported, ripple-native)

  These are routed BEFORE the raw-ui check so a spec that carries only a display
  hint (and optional data) still reaches the designed layout. The raw-ui→NodeRenderer
  escape hatch for intent-driven routing (browse/detail/info/search) is kept intact.

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
	// Composite intent-layout wrappers (display-hint routed).
	import ComparisonIntentLayout from './layouts/ComparisonIntentLayout.svelte';
	import ChecklistIntentLayout from './layouts/ChecklistIntentLayout.svelte';
	import InvoiceIntentLayout from './layouts/InvoiceIntentLayout.svelte';
	import ReportIntentLayout from './layouts/ReportIntentLayout.svelte';
	// Ported agnostic layouts (display-hint routed).
	import TimelineLayout from './layouts/TimelineLayout.svelte';
	import TableLayout from './layouts/TableLayout.svelte';
	import ArticleLayout from './layouts/ArticleLayout.svelte';

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
	 *  1. dashboard                   → DashboardRenderer
	 *  2. form / form-*               → FormLayout
	 *  3. confirm / summary-card      → SummaryLayout
	 *  4. select                      → SelectLayout
	 *  -- Display-hint composite/ported layouts (checked before raw-ui gate) --
	 *  5. comparison hint             → ComparisonIntentLayout
	 *  6. checklist hint              → ChecklistIntentLayout
	 *  7. invoice hint                → InvoiceIntentLayout
	 *  8. report hint                 → ReportIntentLayout
	 *  9. timeline hint               → TimelineLayout
	 * 10. table hint                  → TableLayout
	 * 11. article hint                → ArticleLayout
	 *  -- Data layouts (skip when raw-ui — no structured data) ---------------
	 * 12. browse + list family        → ListLayout
	 * 13. browse + card family        → CardGridLayout
	 * 14. detail                      → DetailLayout
	 * 15. info                        → InfoHeroLayout
	 * 16. search                      → SearchLayout
	 * 17. everything else             → NodeRenderer (escape hatch — load-bearing)
	 */
	type Designed =
		| 'dashboard'
		| 'form'
		| 'summary'
		| 'select'
		| 'comparison'
		| 'checklist'
		| 'invoice'
		| 'report'
		| 'timeline'
		| 'table'
		| 'article'
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

		// Composite + ported layouts: routed by layout-engine result (which mirrors
		// the display.layout hint). These are checked BEFORE the raw-ui gate so a
		// spec that has a hint but no full structured data still routes correctly —
		// the wrappers each handle an empty state internally.
		if (layout === 'comparison') return 'comparison';
		if (layout === 'checklist') return 'checklist';
		if (layout === 'invoice') return 'invoice';
		if (layout === 'report') return 'report';
		if (layout === 'timeline') return 'timeline';
		if (layout === 'table') return 'table';
		if (layout === 'article') return 'article';

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
{:else if designed === 'comparison'}
	<ComparisonIntentLayout {input} onSelect={(id) => handleSelect(id)} />
{:else if designed === 'checklist'}
	<ChecklistIntentLayout {input} />
{:else if designed === 'invoice'}
	<InvoiceIntentLayout {input} />
{:else if designed === 'report'}
	<ReportIntentLayout {input} />
{:else if designed === 'timeline'}
	<TimelineLayout {input} />
{:else if designed === 'table'}
	<TableLayout {input} />
{:else if designed === 'article'}
	<ArticleLayout {input} />
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
