<!--
  widgets/data-kit/SectionGrid.svelte — lays sections out by the pairing rule
  (pair.ts, design doc 2026-10-09 §2.7): one column below 720px of container
  width; at 720px+ two consecutive half-eligible sections share a row and
  every other section spans both columns, so no half card sits beside empty
  space. The outer div is the @container; the grid's cells query it (an
  element cannot query its own width). `half` decides eligibility per
  section; `section` renders one.
-->
<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import { pairSpans } from './pair.js';

	interface Props {
		sections: readonly T[];
		half: (section: T) => boolean;
		section: Snippet<[T, number]>;
		class?: string;
	}

	let { sections, half, section, class: className }: Props = $props();

	const list = $derived(Array.isArray(sections) ? sections : []);
	const spans = $derived(pairSpans(list, half));
</script>

<div class={['@container', className]}>
	<div class="grid grid-cols-1 gap-3 @min-[720px]:grid-cols-2">
		{#each list as s, i}
			<div class={['min-w-0', spans[i] === 'full' && '@min-[720px]:col-span-2']} data-span={spans[i]}>
				{@render section(s, i)}
			</div>
		{/each}
	</div>
</div>
