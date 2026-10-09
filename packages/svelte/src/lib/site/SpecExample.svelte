<!--
  @file site/SpecExample.svelte
  @description A live spec on the docs site: the spec rendered by <Ripple>, with
    a Preview | Spec toggle and Copy. Spec view is the pretty JSON with the docs
    code tokens. Only the rendered Ripple gets the card shadow. The render sits
    in its own box and this component sets no widget token (--primary,
    --background, ...), so the spec's theme reaches its widgets untouched. The
    live render is kept out of the search index.
-->
<script lang="ts">
	import { Ripple } from '$lib/index.js';
	import { highlightJson } from './docs/highlight.js';

	let { spec }: { spec: Record<string, unknown> } = $props();

	let view = $state<'preview' | 'spec'>('preview');
	let copied = $state(false);
	const json = $derived(JSON.stringify(spec, null, 2));

	async function copy() {
		await navigator.clipboard.writeText(json);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<figure class="example">
	<div class="bar">
		<div class="seg" role="group" aria-label="Example view">
			<button type="button" aria-pressed={view === 'preview'} onclick={() => (view = 'preview')}>Preview</button>
			<button type="button" aria-pressed={view === 'spec'} onclick={() => (view = 'spec')}>Spec</button>
		</div>
		<button type="button" class="copy" onclick={copy}>{copied ? 'Copied' : 'Copy spec'}</button>
		<span class="sr-only" aria-live="polite">{copied ? 'Spec copied' : ''}</span>
	</div>
	{#if view === 'preview'}
		<div class="render" data-pagefind-ignore="all"><Ripple {spec} /></div>
	{:else}
		<pre class="spec"><code>{@html highlightJson(json)}</code></pre>
	{/if}
</figure>

<style>
	.example {
		margin: 24px 0;
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin-bottom: 8px;
	}
	.seg {
		display: inline-flex;
		padding: 2px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
	}
	.seg button,
	.copy {
		font: 500 13px/1 var(--font-sans);
		padding: 7px 11px;
		border: 0;
		border-radius: calc(var(--radius-control) - 2px);
		background: transparent;
		color: var(--site-soft);
		cursor: pointer;
		transition:
			color 0.15s,
			background 0.15s;
	}
	.seg button:hover,
	.copy:hover {
		color: var(--site-ink);
		background: var(--site-hover);
	}
	.seg button[aria-pressed='true'] {
		color: var(--site-ink);
		background: var(--site-pressed);
	}
	.seg button:focus-visible,
	.copy:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	.render {
		padding: 20px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		background: var(--card);
		box-shadow: var(--shadow-card);
	}
	.spec {
		margin: 0;
		padding: 16px 18px;
		overflow-x: auto;
		border: 1px solid var(--code-line);
		border-radius: var(--radius-card);
		background: var(--code-bg);
		color: var(--code-ink);
		font: 13.5px/1.6 var(--font-mono);
		font-variant-ligatures: none;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
