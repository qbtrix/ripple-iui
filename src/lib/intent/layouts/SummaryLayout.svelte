<!--
  SummaryLayout.svelte — designed confirm/summary layout for intent='confirm'.
  Created 2026-06-07.
  Updated 2026-06-07 (Wave 3: layouts) — now COMPOSES the ResultsSummary organism
  (key/value review rows + an optional emphasised total) instead of hand-rolling the
  row markup. The adapter's rows ({title, subtitle, price}) are mapped to
  ResultsSummary's {label, value} shape; a row carrying a price becomes the total.
  Adapted from ocean-flow's SummaryLayout, rendered with ripple organisms.

  DUAL MODE (locked decision C):
    - 'data'   structured rows (from `data.items`, `form_fields`, or — for a
               confirm step — the flow's accumulated context) render as a clean
               key/value review card via ResultsSummary.
    - 'raw-ui' the step's own `ui` tree (which carries the confirm/Finish button
               that fires flow.submit) renders via NodeRenderer. When the adapter
               also surfaced accumulated context, the review rows render ABOVE the
               tree so the user sees what they chose and the button still works.

  PURE: reads only `input` from the adapter; no fetch / service.
-->
<script lang="ts">
	import NodeRenderer from '../../components/NodeRenderer.svelte';
	import ResultsSummary from '$lib/organisms/ResultsSummary.svelte';
	import type { LayoutInput } from '../layout-adapter.js';

	interface Props {
		input: LayoutInput;
	}

	let { input }: Props = $props();

	const fields = $derived(input.fields);
	const rows = $derived(input.items);

	function field(item: Record<string, unknown>, key: string): unknown {
		const mapped = fields[key];
		return mapped ? item[mapped] : undefined;
	}

	function rowLabel(item: Record<string, unknown>): string {
		return String(field(item, 'title') ?? item.title ?? item.label ?? '');
	}

	function rowValue(item: Record<string, unknown>): string {
		const v =
			field(item, 'subtitle') ?? field(item, 'description') ?? item.value ?? item.subtitle ?? '';
		return String(v);
	}

	function formatPrice(value: unknown): string {
		if (value == null) return '';
		const str = String(value);
		if (str.startsWith('$') || str.startsWith('€') || str.startsWith('£')) return str;
		return `$${str}`;
	}

	// A row carrying a price becomes the emphasised total; the rest are plain rows.
	const totalItem = $derived(rows.find((r) => field(r, 'price') != null));
	const summaryItems = $derived(
		rows
			.filter((r) => r !== totalItem)
			.map((r) => ({ label: rowLabel(r), value: rowValue(r) }))
	);
	const total = $derived(
		totalItem
			? { label: rowLabel(totalItem) || 'Total', value: formatPrice(field(totalItem, 'price')) }
			: undefined
	);
	const showSummary = $derived(rows.length > 0);
</script>

<div class="flex flex-col gap-4">
	{#if showSummary}
		<ResultsSummary items={summaryItems} {total} />
	{/if}

	{#if input.mode === 'raw-ui' && input.spec.ui}
		<!-- The step's own tree (carries the Finish/confirm button → flow.submit). -->
		<div class="mt-1">
			<NodeRenderer node={input.spec.ui} />
		</div>
	{/if}
</div>
