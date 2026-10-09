<!--
  widgets/data-kit/StatChip.svelte — one stat as an inset tile: label, value
  with its unit, then status and trend (design doc 2026-10-09 §2.3, the Stat
  type in §3). Value, judgement and direction in one tile. A number renders
  through num() (non-finite is 'n/a'); a string renders as written, so money
  arrives pre-formatted with money(). A trend is coloured only when `good`
  says which way is good; otherwise it is neutral ink.
-->
<script lang="ts">
	import type { LucideIcon } from '@lucide/svelte';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Minus from '@lucide/svelte/icons/minus';
	import { num, plain } from './format.js';
	import StatusPill from './StatusPill.svelte';
	import type { Status, Trend } from './types.js';

	interface Props {
		label?: string;
		value?: number | string | null;
		unit?: string;
		status?: Status;
		trend?: Trend;
		icon?: LucideIcon;
		class?: string;
	}

	let { label, value, unit, status, trend, icon: Icon, class: className }: Props = $props();

	const shown = $derived(typeof value === 'string' && value.trim() ? plain(value) : num(value));
	const dir = $derived(trend?.dir === 'up' || trend?.dir === 'down' ? trend.dir : 'flat');
	const tone = $derived(
		dir === 'flat' || !trend?.good
			? 'text-ripple-muted-foreground'
			: dir === trend.good
				? 'text-ripple-success-text'
				: 'text-ripple-error-text'
	);
	const TrendIcon = $derived(dir === 'up' ? ArrowUp : dir === 'down' ? ArrowDown : Minus);
</script>

<div class={['flex min-w-0 flex-col gap-1 rounded-md bg-ripple-muted px-3 py-2.5', className]}>
	<div class="flex min-w-0 items-center gap-1.5 text-ripple-muted-foreground">
		{#if Icon}<Icon size={14} strokeWidth={1.75} aria-hidden="true" class="shrink-0" />{/if}
		<span class="truncate text-footnote">{plain(label)}</span>
	</div>
	<div class="flex min-w-0 items-baseline gap-1">
		<span class="truncate text-headline tabular-nums text-ripple-surface-foreground">{shown}</span>
		{#if unit}<span class="text-footnote text-ripple-muted-foreground">{plain(unit)}</span>{/if}
	</div>
	{#if status || trend}
		<div class="flex flex-wrap items-center gap-1.5">
			{#if status}<StatusPill {status} />{/if}
			{#if trend}
				<span class={['inline-flex items-center gap-0.5 text-footnote tabular-nums', tone]} data-trend={dir}>
					<TrendIcon size={12} strokeWidth={2} aria-hidden="true" />
					{#if trend.text}{plain(trend.text)}{:else}<span class="sr-only">{dir}</span>{/if}
				</span>
			{/if}
		</div>
	{/if}
</div>
