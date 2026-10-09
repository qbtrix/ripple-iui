<!--
  @file routes/docs/[...slug]/+page.svelte
  @description One docs page: title, Copy page / Copy for your model, the body
    as HTML segments (marked output from our own src/docs markdown, rendered
    with {@html}) interleaved with live SpecExample blocks, then prev/next.
    Code-block Copy buttons come in the HTML and are wired here by delegation.
    Only this content area is indexed by Pagefind (data-pagefind-body).
-->
<script lang="ts">
	import SpecExample from '$lib/site/SpecExample.svelte';
	import { forYourModel } from '$lib/site/docs/model.js';

	let { data } = $props();

	let copiedWhat = $state('');

	async function copyText(text: string, what: string) {
		await navigator.clipboard.writeText(text);
		copiedWhat = what;
		setTimeout(() => (copiedWhat = ''), 1500);
	}

	function onBodyClick(e: MouseEvent) {
		const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-copy]');
		const code = btn?.parentElement?.querySelector('code');
		if (!btn || !code) return;
		void navigator.clipboard.writeText(code.textContent ?? '').then(() => {
			btn.textContent = 'Copied';
			setTimeout(() => (btn.textContent = 'Copy'), 1500);
		});
	}
</script>

<svelte:head>
	<title>{data.meta.title} · Ripple docs</title>
	<meta name="description" content={data.meta.description} />
</svelte:head>

<article class="doc" data-pagefind-body>
	<header class="head">
		<h1>{data.meta.title}</h1>
		<p class="lede">{data.meta.description}</p>
		<div class="actions" data-pagefind-ignore>
			<button type="button" onclick={() => copyText(data.markdown, 'page')}>
				{copiedWhat === 'page' ? 'Copied' : 'Copy page'}
			</button>
			<button type="button" onclick={() => copyText(forYourModel(data.markdown), 'model')}>
				{copiedWhat === 'model' ? 'Copied' : 'Copy for your model'}
			</button>
			<a href="/docs/{data.slug}.md">View as Markdown</a>
		</div>
	</header>

	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions: delegation for the real <button>s inside -->
	<div class="body" onclick={onBodyClick}>
		{#each data.segments as segment, i (i)}
			{#if segment.kind === 'html'}
				<div class="prose">{@html segment.html}</div>
			{:else}
				<SpecExample spec={segment.spec} />
			{/if}
		{/each}
	</div>

	{#if data.prev || data.next}
		<nav class="pager" aria-label="Previous and next page" data-pagefind-ignore>
			{#if data.prev}
				<a class="prev" href="/docs/{data.prev.slug}"><span>Previous</span>{data.prev.title}</a>
			{/if}
			{#if data.next}
				<a class="next" href="/docs/{data.next.slug}"><span>Next</span>{data.next.title}</a>
			{/if}
		</nav>
	{/if}
</article>
<span class="sr-only" aria-live="polite">{copiedWhat ? 'Copied to clipboard' : ''}</span>

<style>
	.doc {
		min-width: 0;
		font-size: 16px;
		line-height: 1.6;
	}
	:global(.dark) .doc {
		line-height: 1.65;
	}
	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: 2rem;
		font-weight: 650;
		line-height: 1.15;
		letter-spacing: -0.02em;
	}
	.lede {
		margin: 10px 0 0;
		max-width: 70ch;
		font-size: 17px;
		color: var(--site-soft);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 18px;
		padding-bottom: 24px;
		border-bottom: 1px solid var(--site-line);
	}
	.actions button,
	.actions a {
		padding: 6px 11px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--site-soft);
		font: 500 13px/1.2 var(--font-sans);
		text-decoration: none;
		cursor: pointer;
		transition:
			color 0.15s,
			background 0.15s;
	}
	.actions button:hover,
	.actions a:hover {
		color: var(--site-ink);
		background: var(--site-hover);
	}
	.actions :focus-visible,
	.pager a:focus-visible,
	.prose :global(:is(a, button):focus-visible) {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}

	/* Prose styles stop at .prose, so they never reach a SpecExample render. */
	.prose :global {
		> * {
			max-width: 70ch;
		}
		> p,
		> ul,
		> ol {
			margin: 16px 0;
		}
		> ul,
		> ol {
			padding-left: 22px;
		}
		> ul {
			list-style: disc;
		}
		> ol {
			list-style: decimal;
		}
		li::marker {
			color: var(--site-soft);
		}
		li + li {
			margin-top: 6px;
		}
		> h2 {
			margin: 48px 0 12px;
			font-family: var(--font-display);
			font-size: 1.45rem;
			font-weight: 650;
			line-height: 1.25;
			letter-spacing: -0.01em;
		}
		> h3 {
			margin: 32px 0 8px;
			font-size: 1.1rem;
			font-weight: 600;
		}
		.anchor {
			margin-left: 8px;
			color: var(--site-faint);
			text-decoration: none;
			opacity: 0;
			transition: opacity 0.15s;
		}
		:is(h2, h3):hover .anchor,
		.anchor:focus-visible {
			opacity: 1;
		}
		a:not(.anchor) {
			color: var(--primary-ink);
			text-underline-offset: 3px;
		}
		:not(pre) > code {
			padding: 1px 5px;
			border: 1px solid var(--code-line);
			border-radius: 5px;
			background: var(--code-bg);
			font: 0.875em var(--font-mono);
			font-variant-ligatures: none;
		}
		> .code-block {
			position: relative;
			max-width: none;
			margin: 20px 0;
		}
		pre {
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
		/* Room for the Copy button, so it never covers a one-line block's tail. */
		.code-block pre {
			padding-right: 72px;
		}
		.copy {
			position: absolute;
			top: 8px;
			right: 8px;
			padding: 4px 9px;
			border: 1px solid var(--code-line);
			border-radius: 6px;
			background: var(--site-ground);
			color: var(--site-soft);
			font: 500 12px/1.3 var(--font-sans);
			cursor: pointer;
		}
		.copy:hover {
			color: var(--site-ink);
		}
		> table {
			display: block;
			max-width: none;
			overflow-x: auto;
			border-collapse: collapse;
			margin: 20px 0;
			font-size: 15px;
		}
		th,
		td {
			padding: 8px 12px;
			border-bottom: 1px solid var(--site-line);
			text-align: left;
			vertical-align: top;
		}
		th {
			font-weight: 600;
		}
	}

	.pager {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		margin-top: 56px;
		padding-top: 24px;
		border-top: 1px solid var(--site-line);
	}
	.pager a {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 10px 14px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		color: var(--site-ink);
		font-weight: 500;
		text-decoration: none;
		transition: background 0.15s;
	}
	.pager a:hover {
		background: var(--site-hover);
	}
	.pager span {
		font-size: 13px;
		font-weight: 400;
		color: var(--site-soft);
	}
	.next {
		margin-left: auto;
		text-align: right;
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
