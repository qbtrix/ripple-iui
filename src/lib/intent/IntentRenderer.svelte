<!--
  IntentRenderer.svelte — the intent→layout dispatch (genesis IntentRenderer,
  adapted to ripple's UniversalSpec + widgets). Created 2026-06-07.

  Takes a UniversalSpec, decides a layout from `spec.intent` (via the layout
  engine + the adapter), and renders the matching designed layout. The ESCAPE
  HATCH is load-bearing: `custom` and ANY unmapped intent fall straight through
  to `<NodeRenderer node={spec.ui}>`, so a render is NEVER blocked and existing
  specs behave exactly as before (byte-identical for custom).

  This slice wires:
    - form    → FormLayout      (designed fields, or the raw ui tree in raw-ui mode)
    - confirm → SummaryLayout    (review rows from context + the step's confirm tree)
    - dashboard → DashboardRenderer (existing)
    - everything else → NodeRenderer(spec.ui)   (touch-time later)

  The adapter (layout-adapter.ts) is the schema bridge: it turns the spec (+ the
  optional flow `context`) into the LayoutInput every layout reads. PURE — no
  fetch, no service; the layout reads data already on the spec / context.
-->
<script lang="ts">
	import type { UniversalSpec } from '../schema/universal-spec.js';
	import { toLayoutInput } from './layout-adapter.js';
	import { determineLayout } from './layout-engine.js';
	import NodeRenderer from '../components/NodeRenderer.svelte';
	import DashboardRenderer from './DashboardRenderer.svelte';
	import FormLayout from './layouts/FormLayout.svelte';
	import SummaryLayout from './layouts/SummaryLayout.svelte';

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

	// Which designed layout (if any) handles this intent for THIS slice.
	type Designed = 'form' | 'summary' | 'dashboard' | 'node';
	const designed = $derived.by<Designed>(() => {
		if (spec.intent === 'dashboard' || layout === 'dashboard') return 'dashboard';
		if (spec.intent === 'form' || layout.startsWith('form')) return 'form';
		if (spec.intent === 'confirm' || spec.intent === 'quick_confirm' || layout === 'summary-card')
			return 'summary';
		return 'node';
	});
</script>

{#if designed === 'dashboard'}
	<DashboardRenderer {spec} {onSpecChanged} />
{:else if designed === 'form'}
	<FormLayout {input} {onFieldChange} />
{:else if designed === 'summary'}
	<SummaryLayout {input} />
{:else if spec.ui}
	<!-- Escape hatch: custom / unmapped intents render their raw tree unchanged. -->
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
