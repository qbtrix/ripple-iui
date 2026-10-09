<!--
  @file lib/site/landing/CodeTabs.svelte
  @description The landing's "Integrate tonight" panel: one tab per way in
    (SvelteKit, any framework), each a set of files whose code is lifted from
    the docs at build time (site/landing/data.ts), so it can't drift from the
    pages it links. Wide: the last file (the page) on the right, the rest
    stacked on the left. With JavaScript off the first tab shows and the others
    stay hidden. Arrow keys move between tabs.
-->
<script lang="ts">
	import type { CodeFile } from './data.js';

	interface Tab {
		id: string;
		label: string;
		docs: { href: string; title: string }[];
		files: CodeFile[];
	}
	let { tabs }: { tabs: Tab[] } = $props();

	let current = $state(0);
	let copied = $state<string | null>(null);

	function onkeydown(e: KeyboardEvent) {
		const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
		if (!step) return;
		e.preventDefault();
		current = (current + step + tabs.length) % tabs.length;
		document.getElementById(`tab-${tabs[current].id}`)?.focus();
	}

	async function copy(file: CodeFile, key: string) {
		try {
			await navigator.clipboard.writeText(file.code);
			copied = key;
			setTimeout(() => (copied = copied === key ? null : copied), 1600);
		} catch {
			/* clipboard blocked: the code is on screen to copy by hand */
		}
	}
</script>

<div class="tabs">
	<div class="list" role="tablist" aria-label="Framework">
		{#each tabs as tab, i (tab.id)}
			<button
				type="button"
				role="tab"
				id="tab-{tab.id}"
				aria-selected={i === current}
				aria-controls="panel-{tab.id}"
				tabindex={i === current ? 0 : -1}
				onclick={() => (current = i)}
				{onkeydown}>{tab.label}</button
			>
		{/each}
	</div>

	{#each tabs as tab, i (tab.id)}
		<div class="panel" role="tabpanel" id="panel-{tab.id}" aria-labelledby="tab-{tab.id}" hidden={i !== current}>
			<div class="files">
				{#each [tab.files.slice(0, -1), tab.files.slice(-1)] as column, c (c)}
					<div class="column">
						{#each column as file (file.name)}
							{@const key = `${tab.id}/${file.name}`}
							<div class="file">
								<div class="name">
									<span>{file.name}</span>
									<button type="button" onclick={() => copy(file, key)} aria-label="Copy {file.name}">
										{copied === key ? 'Copied' : 'Copy'}
									</button>
								</div>
								<pre><code>{file.code}</code></pre>
							</div>
						{/each}
					</div>
				{/each}
			</div>
			<p class="docs">
				From the docs:
				{#each tab.docs as d, j (d.href)}{j ? ', ' : ''}<a href={d.href}>{d.title}</a>{/each}
			</p>
		</div>
	{/each}
</div>

<style>
	.tabs {
		container-type: inline-size;
	}
	.list {
		display: flex;
		gap: 4px;
		margin-bottom: 12px;
	}
	[role='tab'] {
		min-height: 36px;
		padding: 0 14px;
		border: 1px solid transparent;
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--site-soft);
		font: 500 14px/1 var(--font-sans);
		cursor: pointer;
	}
	[role='tab']:hover {
		color: var(--site-ink);
		background: var(--site-hover);
	}
	[role='tab'][aria-selected='true'] {
		color: var(--site-ink);
		background: var(--site-pressed);
	}
	[role='tab']:focus-visible,
	.name button:focus-visible,
	.docs a:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}

	.files {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 12px;
	}
	.column {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}
	@container (min-width: 880px) {
		.files {
			grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
			align-items: start;
		}
	}

	.file {
		border: 1px solid var(--code-line);
		border-radius: var(--radius-card);
		background: var(--code-bg);
		overflow: hidden;
	}
	.name {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 40px;
		padding: 0 6px 0 14px;
		border-bottom: 1px solid var(--code-line);
		font: 12px/1 var(--font-mono);
		color: var(--site-soft);
	}
	.name span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.name button {
		flex: none;
		min-height: 30px;
		padding: 0 10px;
		border: 0;
		border-radius: calc(var(--radius-control) - 2px);
		background: transparent;
		color: var(--site-soft);
		font: 12px/1 var(--font-sans);
		cursor: pointer;
	}
	.name button:hover {
		background: var(--site-hover);
		color: var(--site-ink);
	}
	pre {
		margin: 0;
		padding: 14px 16px;
		overflow-x: auto;
		font: 12.5px/1.6 var(--font-mono);
		color: var(--code-ink);
		tab-size: 2;
	}

	.docs {
		margin: 16px 0 0;
		font-size: 15px;
		color: var(--site-soft);
	}
	.docs a {
		color: var(--primary-ink);
		text-underline-offset: 3px;
	}
</style>
