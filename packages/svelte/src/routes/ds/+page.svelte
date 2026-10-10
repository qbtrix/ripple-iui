<!--
  @file routes/ds/+page.svelte
  @description /ds, the design system: Ripple's building blocks, as opposed to
    the gen UI in the /live gallery. Three parts: tokens (colour swatches with their
    light and dark values parsed from site.css, the type scale, spacing and
    radius), the atoms by manifest category, each rendered LIVE from the spec
    its /docs/widgets/<type> page previews, and a search box over the names.
    The atom list is generated (+page.server.ts), so a new widget shows up on
    its own. A live render mounts only once its card nears the viewport and
    sits in its own boundary, so 170 renders stay cheap and one bad example
    can't take the page down; search hides cards (`hidden`) instead of
    unmounting them. The focused primitive pages (motion, button, card, ...)
    live under /ds/<name> and are linked at the end.
-->
<script lang="ts">
	import { Ripple } from '$lib/index.js';

	let { data } = $props();

	let query = $state('');
	const q = $derived(query.trim().toLowerCase());
	const matches = (type: string) => !q || type.includes(q);
	const inCategory = (id: string) => data.atoms.filter((a) => a.category === id);
	const shownCount = $derived(data.atoms.filter((a) => matches(a.type)).length);

	/** Mounts a card's live render once it is within a screen of the viewport. */
	let visible = $state<Record<string, boolean>>({});
	function nearView(node: HTMLElement, type: string) {
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					visible[type] = true;
					io.disconnect();
				}
			},
			{ rootMargin: '600px 0px' }
		);
		io.observe(node);
		return { destroy: () => io.disconnect() };
	}

	const TYPE = [
		{ name: 'Display', sample: 'Ask for a tool', css: 'font-family: var(--font-display); font-size: 44px; font-weight: 650; letter-spacing: -0.03em; line-height: 1.05', spec: 'Bricolage Grotesque 650, 44px, h1 and h2 only' },
		{ name: 'Title', sample: 'Trip itinerary', css: 'font-family: var(--font-display); font-size: 28px; font-weight: 650; letter-spacing: -0.02em', spec: 'Bricolage Grotesque 650, 28px' },
		{ name: 'Body', sample: 'Ripple turns a spec into a working interface.', css: 'font-size: 16px; line-height: 1.55', spec: 'Inter, 16px / 1.55' },
		{ name: 'Small', sample: 'Pick a party size, a day and a time.', css: 'font-size: 14px; line-height: 1.45', spec: 'Inter, 14px / 1.45' },
		{ name: 'Mono', sample: '{ "type": "button" }', css: 'font-family: var(--font-mono); font-size: 13px', spec: 'JetBrains Mono, 13px, code and specs only' }
	];
	const SPACE = [4, 8, 12, 16, 24, 32, 48];

	const PAGES = [
		{ href: '/ds/button', title: 'Button', caption: 'Every variant, size and state.' },
		{ href: '/ds/card', title: 'Card', caption: 'Card variants and composition.' },
		{ href: '/ds/stat', title: 'Stat', caption: 'The metric display widget.' },
		{ href: '/ds/checkbox-group', title: 'Checkbox group', caption: 'The gliding hover highlight.' },
		{ href: '/ds/moving-indicator', title: 'Moving indicator', caption: 'One primitive behind segmented controls and lists.' },
		{ href: '/ds/motion', title: 'Motion', caption: 'The node-level motion field and the animate action.' },
		{ href: '/ds/premium', title: 'Effects', caption: 'Marquee, beams, shimmer, aurora, spotlight.' },
		{ href: '/ds/marketing', title: 'Marketing blocks', caption: 'Navbar to footer, composed into one page.' },
		{ href: '/ds/ai', title: 'Agent display', caption: 'Streamed text, tool calls, reasoning, approval gates.' },
		{ href: '/ds/spec', title: 'Spec composition', caption: 'Cards, charts and stats from one JSON spec.' },
		{ href: '/ds/data-kit', title: 'Data kit', caption: 'Status pills, stat chips, photo tiles, formatters.' },
		{ href: '/ds/shell', title: 'Shell', caption: 'Sidebar rows, panel headers, key hints.' },
		{ href: '/ds/feature', title: 'Feature page parts', caption: 'Page header, empty state, inline alerts.' },
		{ href: '/ds/call', title: 'Call parts', caption: 'Control bar, tiles, dock and incoming call card.' }
	];
</script>

<svelte:head>
	<title>Design system · Ripple</title>
	<meta
		name="description"
		content="Ripple's tokens and atoms: colours for both themes, the type scale, spacing and radius, and every building-block widget rendered live from its spec."
	/>
</svelte:head>

<main class="ds">
	<header class="head">
		<h1>Design system</h1>
		<p class="lede">Tokens and every atom, rendered live from a small spec.</p>
		<nav class="toc" aria-label="On this page">
			<a href="#tokens">Tokens</a>
			<a href="#atoms">Atoms</a>
			<a href="#pages">Primitive pages</a>
		</nav>
	</header>

	<section id="tokens" aria-labelledby="tokens-title">
		<h2 id="tokens-title">Tokens</h2>

		<h3>Colour</h3>
		<ul class="swatches">
			{#each data.tokens as t (t.name)}
				<li class="swatch">
					<div class="chips" aria-hidden="true">
						<span class="chip" style:background={t.lightPaint}></span>
						<span class="chip" style:background={t.dark ?? 'transparent'}></span>
					</div>
					<div class="swatch-text">
						<code class="name">{t.name}</code>
						<span class="use">{t.use}</span>
						<dl>
							<div><dt>Light</dt><dd><code>{t.light ?? 'not set, uses --card'}</code></dd></div>
							<div><dt>Dark</dt><dd><code>{t.dark ?? 'not set'}</code></dd></div>
						</dl>
					</div>
				</li>
			{/each}
		</ul>

		<h3>Type</h3>
		<ul class="type">
			{#each TYPE as t (t.name)}
				<li>
					<span class="type-name">{t.name}<small>{t.spec}</small></span>
					<span class="type-sample" style={t.css}>{t.sample}</span>
				</li>
			{/each}
		</ul>

		<div class="pair">
			<div>
				<h3>Spacing</h3>
				<p class="note">Widget <code>gap</code> numbers are multiples of 4px.</p>
				<ul class="space">
					{#each SPACE as px (px)}
						<li><span class="bar" style:width="{px}px"></span><code>{px}px</code></li>
					{/each}
				</ul>
				<ul class="kv">
					{#each data.layout as l (l.name)}<li><code>{l.name}</code><span>{l.value}</span></li>{/each}
				</ul>
			</div>
			<div>
				<h3>Radius</h3>
				<ul class="radii">
					{#each data.radii as r (r.name)}
						<li><span class="box" style:border-radius="var({r.name})"></span><code>{r.name}</code><span>{r.value}</span></li>
					{/each}
				</ul>
			</div>
		</div>
	</section>

	<section id="atoms" aria-labelledby="atoms-title">
		<div class="atoms-head">
			<h2 id="atoms-title">Atoms</h2>
			<label class="search">
				<span class="sr-only">Search atoms by name</span>
				<input type="search" placeholder="Search {data.atoms.length} atoms" bind:value={query} autocomplete="off" spellcheck="false" />
			</label>
		</div>
		<p class="note" aria-live="polite">
			{q ? `${shownCount} of ${data.atoms.length} match "${query.trim()}".` : 'Each one is rendered from the spec on its docs page.'}
		</p>

		{#each data.categories as c (c.id)}
			{@const list = inCategory(c.id)}
			<section class="cat" aria-labelledby="cat-{c.id}" hidden={!list.some((a) => matches(a.type))}>
				<h3 id="cat-{c.id}">{c.title} <span class="count">{list.length}</span></h3>
				<ul class="atoms">
					{#each list as a (a.type)}
						<li class="atom" hidden={!matches(a.type)} use:nearView={a.type}>
							<div class="atom-head">
								<a href="/docs/widgets/{a.type}"><code>{a.type}</code></a>
								<p>{a.description}</p>
							</div>
							<div class="preview" data-pagefind-ignore="all">
								{#if visible[a.type]}
									<svelte:boundary>
										<Ripple spec={a.spec} />
										{#snippet failed()}<p class="note">This example did not render.</p>{/snippet}
									</svelte:boundary>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</section>

	<section id="pages" aria-labelledby="pages-title">
		<h2 id="pages-title">Primitive pages</h2>
		<p class="note">Focused pages for the primitives with more states than one example can show.</p>
		<ul class="pages">
			{#each PAGES as p (p.href)}
				<li><a href={p.href}><span class="page-title">{p.title}</span><span class="page-cap">{p.caption}</span></a></li>
			{/each}
		</ul>
	</section>
</main>

<style>
	.ds {
		box-sizing: border-box;
		width: 100%;
		max-width: var(--site-max);
		margin: 0 auto;
		padding: 0 var(--site-gutter) 72px;
		font-family: var(--font-sans);
		color: var(--site-ink);
	}
	.head {
		padding: clamp(28px, 5vw, 48px) 0 8px;
	}
	h1 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(2rem, 4vw, 2.75rem);
		font-weight: 650;
		line-height: 1.05;
		letter-spacing: -0.03em;
	}
	h2 {
		margin: 48px 0 16px;
		font-family: var(--font-display);
		font-size: 1.6rem;
		font-weight: 650;
		letter-spacing: -0.02em;
	}
	h3 {
		margin: 28px 0 12px;
		font-size: 15px;
		font-weight: 600;
	}
	.lede {
		margin: 12px 0 0;
		max-width: 64ch;
		font-size: 16px;
		line-height: 1.55;
		color: var(--site-soft);
	}
	a {
		color: var(--primary-ink);
		text-underline-offset: 3px;
	}
	a:focus-visible,
	input:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	code {
		font-family: var(--font-mono);
		font-size: 12.5px;
	}
	.note {
		margin: 0 0 12px;
		font-size: 14px;
		color: var(--site-soft);
	}
	.toc {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 16px;
		margin-top: 16px;
		font-size: 14px;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	/* Colour: two chips (light, dark) and the values. */
	.swatches {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
		gap: 12px;
	}
	.swatch {
		display: flex;
		gap: 12px;
		padding: 12px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		background: var(--site-panel, var(--card));
		min-width: 0;
	}
	.chips {
		flex: none;
		display: flex;
		flex-direction: column;
		width: 44px;
		border-radius: var(--radius-control);
		overflow: hidden;
		border: 1px solid var(--site-line);
	}
	.chip {
		flex: 1;
		min-height: 36px;
	}
	.swatch-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.name {
		font-size: 13px;
		font-weight: 600;
	}
	.use {
		font-size: 13px;
		color: var(--site-soft);
	}
	dl {
		margin: 6px 0 0;
		display: grid;
		gap: 2px;
	}
	dl div {
		display: flex;
		gap: 6px;
		min-width: 0;
	}
	dt {
		flex: none;
		width: 34px;
		font-size: 12px;
		color: var(--site-soft);
	}
	dd {
		margin: 0;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	dd code {
		font-size: 11.5px;
	}

	/* Type scale. */
	.type li {
		display: grid;
		grid-template-columns: minmax(0, 200px) minmax(0, 1fr);
		gap: 8px 24px;
		align-items: baseline;
		padding: 14px 0;
		border-top: 1px solid var(--site-line);
	}
	.type-name {
		display: flex;
		flex-direction: column;
		font-weight: 600;
		font-size: 14px;
	}
	.type-name small {
		font-weight: 400;
		font-size: 12.5px;
		color: var(--site-soft);
	}
	.type-sample {
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.pair {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
		gap: 0 32px;
	}
	.space li,
	.radii li,
	.kv li {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 32px;
		font-size: 13px;
	}
	.bar {
		height: 12px;
		border-radius: 2px;
		background: var(--primary);
	}
	.kv {
		margin-top: 12px;
	}
	.kv span,
	.radii span {
		color: var(--site-soft);
	}
	.box {
		width: 48px;
		height: 36px;
		border: 1.5px solid var(--primary);
		background: var(--site-hover);
	}
	.radii li {
		min-height: 48px;
	}

	/* Atoms. */
	.atoms-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin: 48px 0 8px;
	}
	.atoms-head h2 {
		margin: 0;
	}
	.search input {
		box-sizing: border-box;
		width: min(320px, 100%);
		min-height: 44px;
		padding: 0 14px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
		background: var(--site-panel, var(--card));
		color: var(--site-ink);
		font: inherit;
		font-size: 15px;
	}
	.search {
		flex: 1 1 240px;
		display: flex;
		justify-content: flex-end;
	}
	.cat h3 {
		margin-top: 32px;
	}
	.count {
		margin-left: 4px;
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 400;
		color: var(--site-soft);
	}
	.atoms {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
		gap: 12px;
	}
	.atom {
		display: flex;
		flex-direction: column;
		min-width: 0;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		background: var(--site-panel, var(--card));
		overflow: hidden;
	}
	.atom[hidden],
	.cat[hidden] {
		display: none;
	}
	.atom-head {
		padding: 12px 14px 10px;
		border-bottom: 1px solid var(--site-line);
	}
	.atom-head a {
		display: inline-block;
		font-weight: 600;
	}
	.atom-head code {
		font-size: 13.5px;
	}
	.atom-head p {
		margin: 4px 0 0;
		font-size: 13px;
		line-height: 1.45;
		color: var(--site-soft);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	/* Fixed-position children (toasts, overlays) stay inside the card. */
	.preview {
		position: relative;
		transform: translateZ(0);
		min-height: 120px;
		max-height: 300px;
		padding: 14px;
		overflow: auto;
		background: var(--background);
	}

	.pages {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
		gap: 12px;
	}
	.pages a {
		display: flex;
		flex-direction: column;
		gap: 2px;
		height: 100%;
		box-sizing: border-box;
		padding: 12px 14px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		background: var(--site-panel, var(--card));
		text-decoration: none;
		color: var(--site-ink);
		transition: border-color 0.15s;
	}
	.pages a:hover {
		border-color: color-mix(in oklch, var(--site-ink) 28%, transparent);
	}
	.page-title {
		font-weight: 600;
		font-size: 15px;
	}
	.page-cap {
		font-size: 13px;
		color: var(--site-soft);
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}
	@media (max-width: 639px) {
		.ds {
			padding-inline: 16px;
		}
		.type li {
			grid-template-columns: minmax(0, 1fr);
		}
		.search {
			justify-content: stretch;
		}
		.search input {
			width: 100%;
		}
	}
</style>
