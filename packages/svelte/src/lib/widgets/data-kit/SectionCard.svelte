<!--
  widgets/data-kit/SectionCard.svelte — one section surface (design doc
  2026-10-09 §2.1, §2.9): --ripple-surface, 1px border, no shadow. The title
  is the section label (caption-1, uppercase, 0.04em tracking) with an
  optional row icon and an `aside` snippet (a count chip, a toggle).
  States, in order: `pending` (the key exists but the array is still empty
  mid-stream) shows two static skeleton rows; `empty` (still empty at
  card.final) shows that one line, which should say what to ask; otherwise
  the children. A section whose key is missing should not render at all;
  that is the caller's {#if}. Pair sections with SectionGrid.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { LucideIcon } from '@lucide/svelte';
	import { plain } from './format.js';

	interface Props {
		title?: string;
		icon?: LucideIcon;
		aside?: Snippet;
		pending?: boolean;
		empty?: string;
		class?: string;
		children?: Snippet;
	}

	let { title, icon: Icon, aside, pending = false, empty, class: className, children }: Props = $props();

	const heading = $derived(plain(title));
</script>

<section class={['h-full min-w-0 rounded-ripple border border-ripple-border bg-ripple-surface p-3', className]} aria-busy={pending || undefined}>
	{#if heading || aside}
		<header class="mb-2 flex min-h-5 items-center gap-1.5 text-ripple-muted-foreground">
			{#if Icon}<Icon size={14} strokeWidth={1.75} aria-hidden="true" class="shrink-0" />{/if}
			{#if heading}
				<h3 class="truncate text-caption-1 font-medium tracking-[0.04em] uppercase">{heading}</h3>
			{/if}
			{#if aside}<div class="ml-auto shrink-0">{@render aside()}</div>{/if}
		</header>
	{/if}
	{#if pending}
		<div class="flex flex-col gap-2 py-0.5" data-slot="section-skeleton">
			<div class="h-3.5 w-3/4 rounded bg-ripple-muted"></div>
			<div class="h-3.5 w-1/2 rounded bg-ripple-muted"></div>
		</div>
	{:else if empty}
		<p class="text-callout text-ripple-muted-foreground">{empty}</p>
	{:else}
		{@render children?.()}
	{/if}
</section>
