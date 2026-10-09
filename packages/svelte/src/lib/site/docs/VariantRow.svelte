<!--
  @file site/docs/VariantRow.svelte
  @description One live preview per option of a variant-like prop (variant,
    size, tone, kind) on a /docs/widgets page: the widget's example with only
    that prop changed, each labelled with the prop value it shows. The previews
    mount the first time the row nears the viewport, so a page below the fold
    costs nothing until it is read. Kept out of the search index.
-->
<script lang="ts">
	import { Ripple } from '$lib/index.js';
	import { inView } from './in-view.js';
	import { withProp, type VariantAxis } from './props.js';

	let { spec, axis }: { spec: Record<string, unknown> & { ui?: unknown }; axis: VariantAxis } = $props();

	let shown = $state(false);
</script>

<ul class="row" data-pagefind-ignore="all" {@attach inView((v) => (shown ||= v), { once: true })}>
	{#each axis.options as o (o)}
		<li>
			<div class="stage">
				{#if shown}<Ripple spec={withProp(spec, axis.name, o)} />{/if}
			</div>
			<code>{axis.name}: {JSON.stringify(o)}</code>
		</li>
	{/each}
</ul>

<style>
	.row {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
		gap: 12px;
		margin: 16px 0 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}
	.stage {
		display: flex;
		flex-direction: column;
		justify-content: safe center;
		min-height: 104px;
		padding: 16px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		background: var(--card);
		overflow: auto;
	}
	/* Block widgets (forms, charts) take the stage's width; a root that is an inline element (button, badge) is centred. */
	.stage > :global(.ripple-root:has(> :first-child:is(button, span, a, img, code, kbd, svg))) {
		display: flex;
		justify-content: center;
	}
	code {
		font: 12.5px/1.3 var(--font-mono);
		font-variant-ligatures: none;
		color: var(--site-soft);
		overflow-wrap: anywhere;
	}
</style>
