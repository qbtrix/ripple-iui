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

  Updated 2026-06-08 (genesis V3 Layer 5: pattern auto-detection) — BEFORE the
  generic layout dispatch, the pattern detectors run against the spec + its data:
    isQuizPattern    (intent='select' + items have a `correct` field) → QuizQuestion
    isResultsPattern (intent='info'   + items have label+value)       → ResultsSummary
    isChartPattern   → routed to a Chart widget ONLY when a clean path exists (a
                        chart-widget tree on spec.ui); else SKIP (don't force it).
  This realizes "AI describes intent+data, system auto-detects the organism"
  without an explicit organism ref. GUARDED + ADDITIVE: a spec that matches no
  pattern routes to the normal designed layout exactly as before; a raw-ui spec
  (no structured items) never matches, so flow steps are unaffected and the
  raw-ui→NodeRenderer escape hatch stays intact.

  The adapter (layout-adapter.ts) is the schema bridge: it turns the spec (+ the
  optional flow `context`) into the LayoutInput every layout reads. PURE — no fetch,
  no service; the layout reads data already on the spec / context.

  Updated 2026-06-08 — patternItems now falls back to `spec.data.stats` when
  `items` is absent (`items ?? stats`), matching layout-adapter's normalization so
  a stats-only info spec can still pattern-detect (e.g. ResultsSummary).
-->
<script lang="ts">
	import type { UniversalSpec } from '../schema/universal-spec.js';
	import { toLayoutInput } from './layout-adapter.js';
	import { determineLayout } from './layout-engine.js';
	import {
		isQuizPattern,
		isResultsPattern,
		toQuizOptions,
		toResultsItems
	} from './pattern-detector.js';
	import NodeRenderer from '../components/NodeRenderer.svelte';
	import QuizQuestion from '$lib/organisms/QuizQuestion.svelte';
	import ResultsSummary from '$lib/organisms/ResultsSummary.svelte';
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

	// --- Pattern auto-detection (genesis V3 Layer 5) -------------------------
	// Extract the structured items the detectors inspect. PURE: read only the
	// data already on the spec (inline `data.items`). A raw-ui flow step has no
	// inline items array → patternItems is empty → no pattern ever matches, so
	// the existing raw-ui path is untouched.
	const patternItems = $derived.by<Record<string, unknown>[]>(() => {
		const data = spec.data as { items?: unknown; stats?: unknown } | undefined;
		// Fall back to `stats` when `items` is absent, matching layout-adapter's
		// `s.data?.items ?? s.data?.stats ?? []` so all three agree on the source.
		const items = data && typeof data === 'object' ? (data.items ?? data.stats) : undefined;
		return Array.isArray(items) ? (items as Record<string, unknown>[]) : [];
	});

	// Which organism (if any) the data shape auto-detects to. Checked BEFORE the
	// generic layout dispatch; 'none' falls through to the normal designed layout.
	type Pattern = 'quiz' | 'results' | 'none';
	const pattern = $derived.by<Pattern>(() => {
		if (patternItems.length === 0) return 'none';
		if (isQuizPattern(spec, patternItems)) return 'quiz';
		if (isResultsPattern(spec, patternItems)) return 'results';
		// isChartPattern is intentionally NOT auto-routed: ripple has no clean
		// intent→Chart path yet, so forcing it would regress. Skipped on purpose.
		return 'none';
	});

	const quizOptions = $derived(
		pattern === 'quiz' ? toQuizOptions(patternItems, spec.fields) : []
	);
	const resultsItems = $derived(pattern === 'results' ? toResultsItems(patternItems) : []);

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

{#if pattern === 'quiz'}
	<!-- Auto-detected quiz organism (intent='select' + items carry `correct`).
	     Routed BEFORE the generic dispatch; the verdict is surfaced via
	     onFieldChange('_answer', { optionId, isCorrect }) so the host can react
	     without a new prop. A spec without a `correct` field never reaches here. -->
	<QuizQuestion
		question={spec.title ?? ''}
		options={quizOptions}
		onAnswer={(optionId, isCorrect) =>
			onFieldChange?.('_answer', { optionId, isCorrect })}
	/>
{:else if pattern === 'results'}
	<!-- Auto-detected results/summary organism (intent='info' + items carry
	     label+value). The designed review card instead of the generic info hero. -->
	<ResultsSummary title={spec.title} items={resultsItems} />
{:else if designed === 'dashboard'}
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
