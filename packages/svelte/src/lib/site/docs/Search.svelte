<!--
  @file site/docs/Search.svelte
  @description The top bar's site search: a button (and Cmd/Ctrl+K) that opens
    a modal <dialog> over Pagefind. The index covers every page that marks a
    data-pagefind-body (docs, widget reference, showcase); the root layout tags
    each with a `kind` filter, and results are grouped Docs / Widgets / Showcase
    in that order from one unfiltered search. /pagefind/pagefind.js is written
    into build/ by the post-build step in build:site and imported only on first
    open, so nothing loads until someone searches; there is no index under
    `vite dev`, and the modal says so. Pagefind's excerpts are escaped text
    with <mark> highlights, built from our own pages, so they render as HTML.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { safeUrl } from '@ripple-ui/core';

	interface Hit {
		url: string;
		title: string;
		excerpt: string;
	}
	interface PagefindData {
		url: string;
		excerpt: string;
		meta: { title?: string };
		filters: { kind?: string[] };
	}
	const KINDS = ['Docs', 'Widgets', 'Showcase'] as const;
	interface Pagefind {
		debouncedSearch(
			q: string,
			opts?: object,
			ms?: number
		): Promise<{ results: { data(): Promise<PagefindData> }[] } | null>;
	}

	let dialog: HTMLDialogElement | undefined = $state();
	let input: HTMLInputElement | undefined = $state();
	let query = $state('');
	let groups = $state.raw<{ kind: string; hits: Hit[] }[]>([]);
	let status = $state<'idle' | 'loading' | 'unavailable'>('idle');
	let shortcut = $state('Ctrl K');
	let pagefind: Promise<Pagefind> | null = null;

	onMount(() => {
		if (/Mac|iPhone|iPad/.test(navigator.platform)) shortcut = '⌘K';
	});

	function load(): Promise<Pagefind> {
		// A runtime path, so Vite leaves it alone: the file only exists in build/.
		const url = '/pagefind/pagefind.js';
		return (pagefind ??= import(/* @vite-ignore */ url) as Promise<Pagefind>);
	}

	function open() {
		dialog?.showModal();
		input?.select();
		load().catch(() => (status = 'unavailable'));
	}

	async function search(q: string) {
		if (!q.trim()) return void (groups = []);
		status = 'loading';
		try {
			const res = await (await load()).debouncedSearch(q, {}, 120);
			if (!res) return; // superseded by a newer keystroke
			// The top 24 by rank, at most 5 per kind, so one kind cannot crowd out the others.
			const data = await Promise.all(res.results.slice(0, 24).map((r) => r.data()));
			if (q !== query) return;
			groups = KINDS.map((kind) => ({
				kind,
				hits: data
					.filter((d) => (d.filters.kind?.[0] ?? 'Docs') === kind)
					.map((d) => ({
						url: d.url.replace(/\.html$/, '').replace(/\/index$/, '/'),
						title: d.meta.title ?? d.url,
						excerpt: d.excerpt
					}))
					.slice(0, 5)
			})).filter((g) => g.hits.length > 0);
			status = 'idle';
		} catch {
			status = 'unavailable';
		}
	}

	function onKey(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			if (dialog?.open) dialog.close();
			else open();
		}
	}
</script>

<svelte:window onkeydown={onKey} />

<button type="button" class="trigger" aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K" onclick={open}>
	<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"
		><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg
	>
	<span class="label">Search</span>
	<kbd aria-hidden="true">{shortcut}</kbd>
</button>

<dialog bind:this={dialog} class="modal" aria-label="Search" onclick={(e) => e.target === dialog && dialog.close()}>
	<div class="panel">
		<input
			bind:this={input}
			bind:value={query}
			oninput={() => search(query)}
			type="search"
			placeholder="Search docs, widgets and showcase"
			aria-label="Search docs, widgets and showcase"
			aria-controls="search-results"
			autocomplete="off"
			spellcheck="false"
		/>
		<div id="search-results" class="results" aria-live="polite">
			{#if status === 'unavailable'}
				<p class="note">Search runs on the built site. Run <code>bun run build:site</code> and preview it.</p>
			{:else if query.trim() && groups.length === 0 && status === 'idle'}
				<p class="note">Nothing matches "{query}".</p>
			{:else}
				{#each groups as group (group.kind)}
					<section aria-labelledby="search-group-{group.kind}">
						<h2 id="search-group-{group.kind}" class="group">{group.kind}</h2>
						<ul>
							{#each group.hits as hit (hit.url)}
								<li>
									<a href={safeUrl(hit.url)} onclick={() => dialog?.close()}>
										<span class="title">{hit.title}</span>
										<span class="excerpt">{@html hit.excerpt}</span>
									</a>
								</li>
							{/each}
						</ul>
					</section>
				{/each}
			{/if}
		</div>
	</div>
</dialog>

<style>
	.trigger {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 34px;
		padding: 0 8px 0 10px;
		margin-right: 4px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--site-soft);
		font: 400 13px var(--font-sans);
		cursor: pointer;
		transition:
			color 0.15s,
			background 0.15s;
	}
	.trigger:hover {
		color: var(--site-ink);
		background: var(--site-hover);
	}
	.trigger:focus-visible,
	a:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	kbd {
		padding: 1px 5px;
		border: 1px solid var(--site-line);
		border-radius: 4px;
		font: 11px var(--font-sans);
	}
	@media (max-width: 639.98px) {
		.trigger {
			width: 36px;
			padding: 0;
			justify-content: center;
			border: 0;
		}
		.label,
		kbd {
			display: none;
		}
	}
	.modal {
		z-index: var(--z-modal);
		box-sizing: border-box;
		width: min(600px, calc(100vw - 32px));
		margin: 12vh auto auto;
		padding: 0;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		background: var(--site-ground);
		color: var(--site-ink);
		box-shadow: var(--shadow-card);
	}
	.modal::backdrop {
		background: color-mix(in oklch, var(--site-ink-base) 30%, transparent);
	}
	.panel {
		display: flex;
		flex-direction: column;
		max-height: 70vh;
	}
	input {
		box-sizing: border-box;
		width: 100%;
		padding: 16px 18px;
		border: 0;
		border-bottom: 1px solid var(--site-line);
		border-radius: var(--radius-card) var(--radius-card) 0 0;
		background: transparent;
		color: var(--site-ink);
		font: 16px var(--font-sans);
	}
	/* The field is the modal's only control; its rule turns blue instead of a ring. */
	input:focus-visible {
		outline: none;
		border-bottom-color: var(--ring);
	}
	.results {
		overflow-y: auto;
		padding: 6px;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.group {
		margin: 0;
		padding: 10px 12px 4px;
		font: 600 12px var(--font-sans);
		color: var(--site-soft);
	}
	section + section {
		margin-top: 4px;
		border-top: 1px solid var(--site-line);
	}
	.results a {
		display: block;
		padding: 10px 12px;
		border-radius: var(--radius-control);
		color: var(--site-ink);
		text-decoration: none;
	}
	.results a:hover,
	.results a:focus-visible {
		background: var(--site-hover);
	}
	.title {
		display: block;
		font-weight: 600;
		font-size: 14px;
	}
	.excerpt {
		display: block;
		margin-top: 2px;
		font-size: 13px;
		line-height: 1.5;
		color: var(--site-soft);
	}
	.excerpt :global(mark) {
		background: none;
		color: var(--site-ink);
		font-weight: 600;
	}
	.note {
		margin: 0;
		padding: 14px 12px;
		font-size: 14px;
		color: var(--site-soft);
	}
</style>
