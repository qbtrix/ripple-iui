<!--
  SummaryLayout.svelte — designed confirm/summary layout for intent='confirm'.
  Created 2026-06-07.
  Adapted from ocean-flow's SummaryLayout, rendered with RIPPLE elements + tokens.

  DUAL MODE (locked decision C):
    - 'data'   structured rows (from `data.items`, `form_fields`, or — for a
               confirm step — the flow's accumulated context) render as a clean
               key/value review card.
    - 'raw-ui' the step's own `ui` tree (which carries the confirm/Finish button
               that fires flow.submit) renders via NodeRenderer. When the adapter
               also surfaced accumulated context, the review rows render ABOVE the
               tree so the user sees what they chose and the button still works.

  PURE: reads only `input` from the adapter; no fetch / service.
-->
<script lang="ts">
	import NodeRenderer from '../../components/NodeRenderer.svelte';
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

	function rowLabel(item: Record<string, unknown>): unknown {
		return field(item, 'title') ?? item.title ?? item.label;
	}

	function rowValue(item: Record<string, unknown>): unknown {
		return (
			field(item, 'subtitle') ??
			field(item, 'description') ??
			item.value ??
			item.subtitle ??
			''
		);
	}

	function formatPrice(value: unknown): string {
		if (value == null) return '';
		const str = String(value);
		if (str.startsWith('$') || str.startsWith('€') || str.startsWith('£')) return str;
		return `$${str}`;
	}

	const totalItem = $derived(rows.find((r) => field(r, 'price')));
	const showRows = $derived(rows.length > 0);
</script>

<div class="summary-layout">
	{#if showRows}
		<div class="summary-layout__rows">
			{#each rows as item, i (i)}
				<div class="summary-layout__row">
					<span class="summary-layout__label">{rowLabel(item)}</span>
					<span class="summary-layout__value">{rowValue(item)}</span>
				</div>
			{/each}
		</div>

		{#if totalItem}
			<div class="summary-layout__total">
				<span>Total</span>
				<span class="summary-layout__total-value">{formatPrice(field(totalItem, 'price'))}</span>
			</div>
		{/if}
	{/if}

	{#if input.mode === 'raw-ui' && input.spec.ui}
		<!-- The step's own tree (carries the Finish/confirm button → flow.submit). -->
		<div class="summary-layout__actions">
			<NodeRenderer node={input.spec.ui} />
		</div>
	{/if}
</div>

<style>
	.summary-layout {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.summary-layout__rows {
		border: 1px solid var(--ripple-border);
		border-radius: var(--ripple-radius);
		overflow: hidden;
		background: var(--ripple-surface);
	}

	.summary-layout__row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.7rem 0.95rem;
	}

	.summary-layout__row + .summary-layout__row {
		border-top: 1px solid color-mix(in oklch, var(--ripple-border) 70%, transparent);
	}

	.summary-layout__label {
		font-size: 0.85rem;
		color: var(--ripple-muted-foreground);
	}

	.summary-layout__value {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--ripple-surface-foreground);
		text-align: right;
	}

	.summary-layout__total {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.7rem 0.95rem;
		border-radius: var(--ripple-radius);
		background: var(--ripple-muted);
		font-weight: 500;
	}

	.summary-layout__total-value {
		font-size: 1.05rem;
		font-weight: 700;
		color: var(--ripple-accent);
	}

	.summary-layout__actions {
		margin-top: 0.25rem;
	}
</style>
