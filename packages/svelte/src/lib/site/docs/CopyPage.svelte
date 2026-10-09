<!--
  @file site/docs/CopyPage.svelte
  @description The "Copy page" split button every docs page carries: the main
    half copies the page as Markdown, the chevron opens a small menu with Copy as
    Markdown, View as Markdown (the page's .md twin) and Copy for your model (the
    Markdown plus the slim manifest URL). A disclosure, not an ARIA menu: Escape,
    a click outside or tabbing away closes it and focus returns to the chevron.
-->
<script lang="ts">
	import { forYourModel } from './model.js';

	let { markdown, href }: { markdown: string; href: string } = $props();

	const uid = $props.id();
	let open = $state(false);
	let copied = $state('');
	let root = $state<HTMLElement>();
	let toggle = $state<HTMLButtonElement>();

	async function copy(text: string, what: string) {
		open = false;
		await navigator.clipboard.writeText(text);
		copied = what;
		setTimeout(() => (copied = ''), 1500);
	}

	function close(refocus = false) {
		open = false;
		if (refocus) toggle?.focus();
	}
</script>

<svelte:window
	onclick={(e) => {
		if (open && !root?.contains(e.target as Node)) close();
	}}
/>

<div
	class="split"
	bind:this={root}
	data-pagefind-ignore
	onkeydown={(e) => {
		if (e.key === 'Escape' && open) close(true);
	}}
	onfocusout={(e) => {
		if (open && !root?.contains(e.relatedTarget as Node | null)) close();
	}}
	role="presentation"
>
	<button type="button" class="main" onclick={() => copy(markdown, 'page')}>
		<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="8" height="9" rx="1.5" /><path d="M3 11V3.5A1.5 1.5 0 0 1 4.5 2H10" /></svg>
		{copied === 'page' ? 'Copied' : 'Copy page'}
	</button>
	<button
		type="button"
		class="more"
		bind:this={toggle}
		aria-expanded={open}
		aria-controls="{uid}-menu"
		aria-label="More copy options"
		onclick={() => (open = !open)}
	>
		<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
	</button>
	{#if open}
		<ul class="menu" id="{uid}-menu">
			<li>
				<button type="button" onclick={() => copy(markdown, 'page')}>
					<span>Copy as Markdown</span><small>The page as plain Markdown</small>
				</button>
			</li>
			<li>
				<a {href} onclick={() => close()}><span>View as Markdown</span><small>Open the raw .md file</small></a>
			</li>
			<li>
				<button type="button" onclick={() => copy(forYourModel(markdown), 'model')}>
					<span>Copy for your model</span><small>Markdown plus the widget catalog link</small>
				</button>
			</li>
		</ul>
	{/if}
	<span class="sr-only" aria-live="polite">{copied ? 'Copied to clipboard' : ''}</span>
</div>

<style>
	.split {
		position: relative;
		display: inline-flex;
	}
	.main,
	.more {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 11px;
		border: 1px solid var(--site-line);
		background: transparent;
		color: var(--site-soft);
		font: 500 13px/1.2 var(--font-sans);
		cursor: pointer;
		transition:
			color 0.15s,
			background 0.15s;
	}
	.main {
		border-radius: var(--radius-control) 0 0 var(--radius-control);
	}
	.more {
		margin-left: -1px;
		padding: 6px 7px;
		border-radius: 0 var(--radius-control) var(--radius-control) 0;
	}
	.more[aria-expanded='true'] {
		color: var(--site-ink);
		background: var(--site-pressed);
	}
	:is(.main, .more):hover {
		color: var(--site-ink);
		background: var(--site-hover);
	}
	svg {
		width: 14px;
		height: 14px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.menu {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		z-index: 20;
		width: max-content;
		min-width: 240px;
		margin: 0;
		padding: 4px;
		list-style: none;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		background: var(--site-ground);
		box-shadow: var(--shadow-card);
	}
	.menu :is(a, button) {
		display: flex;
		flex-direction: column;
		gap: 2px;
		width: 100%;
		padding: 8px 10px;
		border: 0;
		border-radius: calc(var(--radius-card) - 4px);
		background: transparent;
		color: var(--site-ink);
		font: 500 13.5px/1.3 var(--font-sans);
		text-align: left;
		text-decoration: none;
		cursor: pointer;
	}
	.menu :is(a, button):hover {
		background: var(--site-hover);
	}
	small {
		font-size: 12.5px;
		font-weight: 400;
		color: var(--site-soft);
	}
	:is(a, button):focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
		position: relative;
		z-index: 1;
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
