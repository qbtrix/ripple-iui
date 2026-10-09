<!--
  @file routes/+page.svelte
  @description Ripple's landing. The hero is a figure: a recorded model stream
    on the shared ScrubPlayer (lib/site/scrub), the spec JSON beside the real
    <Ripple> render of that prefix. It prerenders the bill splitter at its
    midpoint (half the JSON, half a working app), so the fold is complete with
    JavaScript off; after hydration it plays forward, and the visitor can drag
    it anywhere. Pills swap in the other recordings (remounting the player, so
    each starts from zero and plays). The order demo is not among them: its
    checkout needs /live's store wiring. The page makes no network call of its
    own (routes/landing-no-fetch.test.ts). Below the hero, each section opens
    with its title left and one muted paragraph right: a spec you can edit
    live, the integration code (lifted from the docs at build), the widget
    catalog (four renders that mount in view, then every widget), numbers
    measured at build, the changelog from git tags, and the agent setup prompt
    with the Paw OS closer. That data comes from +page.server.ts; a number or
    the changelog that can't be computed is left out, never estimated.

  Creative Direction Declaration
    Scene: a developer comparing generative UI tools with a terminal open
      beside the browser. The theme follows the OS; a flat blue-black or
      near-white ground, 1px lines for depth, no glow and no glass below the bar.
    Strategy: restrained neutrals + Paw blue as the single voice, and in the
      hero only on the scrub head, the caret and the primary link. Type:
      Bricolage on the hero h1 only, Inter for section titles and body,
      JetBrains Mono for code, widget names and the figure caption (a
      technical paper's "fig. 1").
    Trap avoided: a chat box or a typed-out prompt as the hero. The first
      screen is a model's output you can scrub, not a description of it.
-->
<script lang="ts">
	import ScrubPlayer from '$lib/site/scrub/ScrubPlayer.svelte';
	import { modelName } from '$lib/site/scrub/model-name.js';
	import { BYOK_URL } from './pawbar/session.svelte.js';
	import { AUDIENCES, scenarios, type Scenario } from './live/scenarios.js';
	import { SITE_URL, SLIM_MANIFEST_URL } from '$lib/site/docs/model.js';
	import SpecEditor from '$lib/site/landing/SpecEditor.svelte';
	import CodeTabs from '$lib/site/landing/CodeTabs.svelte';
	import LazyRipple from '$lib/site/landing/LazyRipple.svelte';

	const GITHUB_URL = 'https://github.com/qbtrix/ripple-iui';
	const INSTALL = 'bun add @ripple-ui/svelte';

	// One recording per audience, the agent-in-the-loop one first. The order
	// demo stays on /live: its checkout posts to /api/checkout unless /live's
	// store handler catches it.
	const HERO = ['refund-approval', 'book-appointment', 'quote-builder', 'bill-splitter'];
	const figures = HERO.map((id) => scenarios.find((s) => s.id === id)!);
	const audienceLabel = (s: Scenario) => AUDIENCES.find((a) => a.id === s.audience)!.label;

	let figureId = $state(figures[0].id);
	let swapped = $state(false);
	const figure = $derived(figures.find((s) => s.id === figureId) ?? figures[0]);
	const caption = $derived.by(() => {
		const n = figures.indexOf(figure) + 1;
		const chars = figure.fixture.chunks.reduce((sum, c) => sum + c.text.length, 0).toLocaleString('en-US');
		return `fig. ${n}, ${figure.id.replaceAll('-', ' ')}, ${chars} chars, recorded from ${modelName(figure.fixture.model)}`;
	});

	function show(id: string) {
		if (id === figureId) return;
		figureId = id;
		swapped = true;
	}

	// Below the hero: built at prerender by +page.server.ts.
	let { data } = $props();

	const SETUP_PROMPT = `Add Ripple (@ripple-ui/svelte) to this project so a model can render UI from a JSON spec.
Docs, written for agents: ${SITE_URL}/llms.txt
Widget catalog to put in the model's system prompt: ${SLIM_MANIFEST_URL}
Follow the Install and Stream a spec pages, then render one spec to check that Tailwind picks up the widget styles.`;

	let copied = $state<'install' | 'prompt' | null>(null);
	async function copy(text: string, what: 'install' | 'prompt') {
		try {
			await navigator.clipboard.writeText(text);
			copied = what;
			setTimeout(() => (copied = null), 1600);
		} catch {
			/* clipboard blocked: the text is on screen to copy by hand */
		}
	}

	const seconds = (ms: number) => (ms / 1000).toFixed(1);
	const kb = (bytes: number) => (bytes / 1000).toFixed(1);
</script>

<svelte:head>
	<title>Ripple: half a spec is already half an app</title>
	<meta
		name="description"
		content="Ripple is the open-source generative UI engine from Paw OS by PocketPaw. A model writes a small JSON spec and Ripple renders it as a working interface while the spec streams in."
	/>
</svelte:head>

<main class="landing">
	<section class="hero" aria-labelledby="hero-title">
		<div class="hero-head">
			<h1 id="hero-title">Half a spec is already half an app.</h1>
			<p class="lede">
				Ripple is an open-source engine that renders a model's JSON spec as a real, working interface while the
				spec is still streaming.
			</p>
		</div>

		{#key figure.id}
			<ScrubPlayer fixture={figure.fixture} start={swapped ? 0 : 0.5} autoplay holdSkeleton {caption} />
		{/key}

		<div class="figures" role="group" aria-label="Recorded streams">
			{#each figures as s (s.id)}
				<button type="button" aria-pressed={s.id === figureId} onclick={() => show(s.id)} title={s.title}>{audienceLabel(s)}</button>
			{/each}
		</div>

		<div class="next">
			<p class="get">
				<code><span aria-hidden="true">$</span> {INSTALL}</code>
				<button type="button" onclick={() => copy(INSTALL, 'install')} aria-label="Copy install command">
					{copied === 'install' ? 'Copied' : 'Copy'}
				</button>
			</p>
			<a class="go primary" href="/playground">Playground</a>
			<a class="go" href="/docs">Read the docs</a>
		</div>
	</section>

	<section aria-labelledby="edit-title">
		<div class="head">
			<h2 id="edit-title">One spec, edited live</h2>
			<p>
				The card is this JSON: its starting state, three widgets and what the button does. Change the goal to 6 or rename
				the button and it re-renders. Click it a few times first: the count you reached survives the edit.
			</p>
		</div>
		<SpecEditor />
	</section>

	<section aria-labelledby="integrate-title">
		<div class="head">
			<h2 id="integrate-title">Integrate tonight</h2>
			<p>
				One package, one endpoint that streams the model's text, and a page that hands the stream to
				<code>&lt;Ripple&gt;</code>. The code below is lifted from the docs when the site builds.
			</p>
		</div>
		<CodeTabs tabs={data.integration} />
	</section>

	<section aria-labelledby="catalog-title">
		<div class="head">
			<h2 id="catalog-title">{data.widgetCount} widgets a model can ask for</h2>
			<p>
				From a single badge to a searchable data grid. Each one has a docs page with its props, events and an example spec, from the same
				manifest the model reads.
			</p>
		</div>
		<ul class="minis">
			{#each data.minis as m (m.type)}
				<li>
					<div class="mini-frame"><LazyRipple spec={m.spec} label={m.type} /></div>
					<a class="mini-name" href="/docs/widgets/{m.type}">{m.type}</a>
					<p class="mini-desc">{m.description}</p>
				</li>
			{/each}
		</ul>
		<dl class="catalog">
			{#each data.categories as c (c.id)}
				<div class="row">
					<dt>{c.title} <span>{c.types.length}</span></dt>
					<dd>
						<ul>
							{#each c.types as type (type)}<li><a href="/docs/widgets/{type}">{type}</a></li>{/each}
						</ul>
					</dd>
				</div>
			{/each}
		</dl>
	</section>

	<section aria-labelledby="numbers-title">
		<div class="head">
			<h2 id="numbers-title">The numbers</h2>
			<p>Every number here is computed when the site builds, from the code and recordings in the repo.</p>
		</div>
		<dl class="numbers">
			<div>
				<dt>Widgets in the catalog</dt>
				<dd class="figure">{data.widgetCount}</dd>
				<dd class="method">Counted from the widget manifest that drives the docs and the model's catalog.</dd>
			</div>
			{#if data.firstWidget}
				<div>
					<dt>First widget on screen</dt>
					<dd class="figure">{seconds(data.firstWidget.medianMs)} s</dd>
					<dd class="method">
						Median across {data.firstWidget.n} recorded {data.firstWidget.models.map((m) => modelName(m)).join(' and ')} streams, from the first byte to the first widget the partial spec can draw. The whole spec took a median {seconds(data.firstWidget.medianDoneMs)} s. The wait for the model's first token is not counted.
						<a href="/live">Nine recordings of real model streams, scrubbable.</a>
					</dd>
				</div>
			{/if}
			{#if data.sizes}
				<div>
					<dt>Headless runtime</dt>
					<dd class="figure">{kb(data.sizes.headless)} kB</dd>
					<dd class="method">
						<code>@ripple-ui/core/headless</code>, bundled by esbuild, minified and gzipped. The slim runtime is
						{kb(data.sizes.slim)} kB.
					</dd>
				</div>
			{/if}
		</dl>
	</section>

	{#if data.releases.length}
		<section aria-labelledby="changes-title">
			<div class="head">
				<h2 id="changes-title">Changelog</h2>
				<p>The latest tagged releases, read from the repo's git tags when the site builds.</p>
			</div>
			<ol class="changes">
				{#each data.releases as r (r.tag)}
					<li>
						<a href={r.url}>{r.tag}</a>
						<time datetime={r.date}>{r.date}</time>
						<p>{r.note}</p>
					</li>
				{/each}
			</ol>
		</section>
	{/if}

	<section class="closer" aria-labelledby="closer-title">
		<div class="setup">
			<div class="setup-copy">
				<h2 id="closer-title">Copy the setup prompt for your agent</h2>
				<p>It points a coding agent at the docs written for models and at the widget catalog, then has it check the install.</p>
			</div>
			<div class="prompt">
				<pre>{SETUP_PROMPT}</pre>
				<button type="button" onclick={() => copy(SETUP_PROMPT, 'prompt')}>{copied === 'prompt' ? 'Copied' : 'Copy prompt'}</button>
			</div>
		</div>
		<div class="paw">
			<p>Or skip the setup and ask for your own tools in Paw OS, with your own model key.</p>
			<div class="closer-actions">
				<a class="btn primary" href={BYOK_URL}>Bring your own key</a>
				<a class="link" href={GITHUB_URL}>Read the source</a>
			</div>
		</div>
	</section>
</main>

<style>
	/* Sections sit on the site grid, edge-aligned with the top bar's content
	   (--site-max less a gutter each side; 16px gutters on phones). */
	.landing {
		position: relative;
		isolation: isolate;
		padding: 0 var(--site-gutter);
		overflow-x: clip;
		font-size: 17px;
		line-height: 1.6;
	}
	:global(.dark) .landing {
		line-height: 1.65;
	}
	.landing > section {
		max-width: calc(var(--site-max) - 2 * var(--site-gutter));
		margin-inline: auto;
	}
	h1,
	h2 {
		text-wrap: balance;
		margin: 0;
	}
	/* The display face is the hero's alone; section titles are the body face. */
	h1 {
		font-family: var(--font-display);
		font-weight: 650;
	}
	h2 {
		font-size: clamp(1.6rem, 2.6vw, 2.1rem);
		font-weight: 600;
		line-height: 1.15;
		letter-spacing: -0.025em;
		color: var(--site-ink);
	}
	code,
	pre {
		font-family: var(--font-mono);
	}
	p code,
	.method code {
		font-size: 0.86em;
		padding: 1px 5px;
		border-radius: 5px;
		background: var(--site-hover);
	}
	a {
		color: var(--primary-ink);
	}

	/* Hero: headline and lede on one row (lede bottom-aligned at the right),
	   then the figure at full width. At 1440x900 the headline, both panes and
	   the scrub track sit above the fold. */
	.hero {
		padding: clamp(40px, 5vw, 64px) 0 72px;
	}
	.hero-head {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 16px;
		margin-bottom: 36px;
	}
	@media (min-width: 1024px) {
		.hero-head {
			grid-template-columns: minmax(0, 7fr) minmax(0, 4fr);
			align-items: end;
			gap: 48px;
		}
	}
	h1 {
		font-size: clamp(2.2rem, 5vw, 4.25rem);
		line-height: 1;
		letter-spacing: -0.035em;
		color: var(--site-ink);
	}
	.lede {
		margin: 0;
		max-width: 46ch;
		color: var(--site-soft);
		text-wrap: pretty;
	}
	@media (min-width: 1024px) {
		.lede {
			padding-bottom: 0.3em;
		}
	}

	/* The recordings: quiet pills, the playing one filled. */
	.figures {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 20px;
	}
	.figures button {
		min-height: 32px;
		padding: 0 12px;
		border: 1px solid var(--site-line);
		border-radius: 999px;
		background: transparent;
		color: var(--site-soft);
		font: 13px/1 var(--font-sans);
		cursor: pointer;
	}
	.figures button:hover {
		background: var(--site-hover);
		color: var(--site-ink);
	}
	.figures button[aria-pressed='true'] {
		background: var(--site-pressed);
		border-color: transparent;
		color: var(--site-ink);
	}

	/* Install, then two plain links: Playground in the accent, docs in ink. */
	.next {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 28px;
		margin-top: 36px;
	}
	/* The install line, as a quiet mono chip. */
	.get {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		max-width: 100%;
		margin: 0;
		padding: 0 0 0 12px;
		border: 1px solid var(--code-line);
		border-radius: var(--radius-control);
		background: var(--code-bg);
		font-size: 14px;
	}
	.get code {
		overflow-x: auto;
		white-space: nowrap;
		padding: 0;
		background: none;
		font-size: inherit;
		color: var(--code-ink);
	}
	.get code span {
		color: var(--site-soft);
		margin-right: 6px;
	}
	.get button {
		flex: none;
		min-height: 44px;
		padding: 0 12px;
		border: 0;
		border-radius: calc(var(--radius-control) - 1px);
		background: transparent;
		color: var(--site-soft);
		font: inherit;
		font-size: 13px;
		cursor: pointer;
	}
	.get button:hover {
		background: var(--site-hover);
		color: var(--site-ink);
	}
	.go {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		font-weight: 600;
		font-size: 15px;
		color: var(--site-ink);
		text-decoration-line: underline;
		text-underline-offset: 5px;
		text-decoration-thickness: 1px;
		text-decoration-color: color-mix(in oklch, currentColor 35%, transparent);
	}
	.go:hover {
		text-decoration-color: currentColor;
	}
	.go.primary {
		color: var(--primary-ink);
	}

	/* Below the hero. Every section opens the same way (Linear's grammar): the
	   title on the left, one muted paragraph on the right, then the real thing
	   at full width. Sections are separated by space and one hairline. */
	.landing > section:not(.hero) {
		padding: 88px 0;
		border-top: 1px solid var(--site-line);
	}
	.head {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 12px;
		margin-bottom: 36px;
	}
	@media (min-width: 900px) {
		.head {
			grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
			align-items: end;
			gap: 48px;
		}
	}
	.head p {
		margin: 0;
		max-width: 58ch;
		color: var(--site-soft);
		text-wrap: pretty;
	}

	/* The catalog: four live renders, then every widget as a dense index. */
	.minis {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 440px), 1fr));
		gap: 36px 24px;
	}
	.minis li {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.mini-frame {
		height: 340px;
		padding: 20px;
		box-sizing: border-box;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		background: var(--background);
		overflow: hidden;
	}
	.mini-name {
		align-self: start;
		margin-top: 14px;
		font: 500 14px/1.4 var(--font-mono);
		color: var(--site-ink);
		text-underline-offset: 3px;
		text-decoration-color: var(--site-line);
	}
	.mini-name:hover {
		color: var(--primary-ink);
		text-decoration-color: currentColor;
	}
	.mini-desc {
		margin: 4px 0 0;
		font-size: 14px;
		line-height: 1.5;
		color: var(--site-soft);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.catalog {
		margin: 56px 0 0;
	}
	.row {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 6px;
		padding: 16px 0;
		border-top: 1px solid var(--site-line);
	}
	@media (min-width: 720px) {
		.row {
			grid-template-columns: 180px minmax(0, 1fr);
			gap: 24px;
		}
	}
	.row dt {
		font-weight: 600;
		font-size: 15px;
		color: var(--site-ink);
	}
	.row dt span {
		margin-left: 4px;
		font-weight: 400;
		font-variant-numeric: tabular-nums;
		color: var(--site-faint);
	}
	.row dd {
		margin: 0;
	}
	.row ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 2px 18px;
	}
	.row a {
		display: inline-block;
		padding: 2px 0;
		font: 13.5px/1.6 var(--font-mono);
		color: var(--site-soft);
		text-decoration: none;
	}
	.row a:hover {
		color: var(--primary-ink);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	/* Numbers: big figure, then exactly how it was measured. */
	.numbers {
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
		border-top: 1px solid var(--site-line);
	}
	.numbers > div {
		display: flex;
		flex-direction: column;
		padding: 24px 32px 8px 0;
	}
	@media (min-width: 900px) {
		.numbers > div + div {
			padding-left: 32px;
			border-left: 1px solid var(--site-line);
		}
	}
	.numbers dt {
		order: 1;
		font-weight: 600;
		font-size: 15px;
		color: var(--site-ink);
	}
	.numbers dd {
		margin: 0;
	}
	.numbers .figure {
		order: 0;
		margin-bottom: 10px;
		font-size: clamp(2.4rem, 4vw, 3.2rem);
		font-weight: 600;
		line-height: 1;
		letter-spacing: -0.03em;
		font-variant-numeric: tabular-nums;
		color: var(--site-ink);
	}
	.numbers .method {
		order: 2;
		margin-top: 6px;
		font-size: 14px;
		line-height: 1.55;
		color: var(--site-soft);
	}
	.method a {
		display: block;
		margin-top: 8px;
		text-underline-offset: 3px;
	}

	/* Changelog: version, date, note on one row; stacked on phones. */
	.changes {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.changes li {
		display: grid;
		grid-template-columns: 88px minmax(0, 1fr);
		gap: 2px 24px;
		padding: 16px 0;
		border-top: 1px solid var(--site-line);
	}
	@media (min-width: 720px) {
		.changes li {
			grid-template-columns: 88px 120px minmax(0, 1fr);
		}
	}
	.changes a {
		font: 500 14px/1.6 var(--font-mono);
		text-underline-offset: 3px;
	}
	.changes time {
		font-size: 14px;
		line-height: 1.6;
		font-variant-numeric: tabular-nums;
		color: var(--site-soft);
	}
	.changes p {
		grid-column: 1 / -1;
		margin: 0;
		font-size: 15px;
		line-height: 1.55;
		color: var(--site-ink);
	}
	@media (min-width: 720px) {
		.changes p {
			grid-column: auto;
		}
	}

	/* Closer: the setup prompt in one framed box, then Paw OS below. */
	.landing > section.closer {
		padding-bottom: 96px;
	}
	.setup {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 24px 48px;
		padding: 32px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		background: var(--card);
	}
	@media (min-width: 900px) {
		.setup {
			grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
			align-items: center;
		}
	}
	.setup-copy p {
		margin: 12px 0 0;
		max-width: 46ch;
		color: var(--site-soft);
	}
	.prompt {
		display: flex;
		flex-direction: column;
		align-items: start;
		gap: 12px;
		min-width: 0;
	}
	.prompt pre {
		align-self: stretch;
		margin: 0;
		padding: 14px 16px;
		border: 1px solid var(--code-line);
		border-radius: var(--radius-control);
		background: var(--code-bg);
		font-size: 12.5px;
		line-height: 1.6;
		color: var(--code-ink);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.prompt button {
		min-height: 44px;
		padding: 0 18px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--site-ink);
		font: 600 15px/1 var(--font-sans);
		cursor: pointer;
	}
	.prompt button:hover {
		background: var(--site-hover);
	}
	.paw {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 16px 32px;
		margin-top: 40px;
	}
	.paw p {
		margin: 0;
		color: var(--site-soft);
	}
	.closer-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 24px;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		height: 44px;
		padding: 0 20px;
		border-radius: var(--radius-control);
		font-weight: 600;
		font-size: 15px;
		text-decoration: none;
		transition: background 0.15s;
	}
	.btn.primary {
		background: var(--primary);
		color: var(--site-on-primary);
	}
	.btn.primary:hover {
		background: color-mix(in oklch, var(--primary) 88%, black);
	}
	.link {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		font-weight: 600;
		font-size: 15px;
		text-underline-offset: 3px;
	}
	.btn:focus-visible,
	.link:focus-visible,
	.get button:focus-visible,
	.go:focus-visible,
	.figures button:focus-visible,
	.prompt button:focus-visible,
	.landing section a:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}

	/* Phones: a tighter hero, so the top of the player is in the first screen. */
	@media (max-width: 639px) {
		.landing {
			padding-inline: 16px;
		}
		.landing > section:not(.hero) {
			padding: 56px 0;
		}
		.setup {
			padding: 20px;
		}
		.hero {
			padding: 24px 0 56px;
		}
		.hero-head {
			gap: 12px;
			margin-bottom: 24px;
		}
		h1 {
			font-size: 2.1rem;
			line-height: 1.04;
		}
		.lede {
			font-size: 16px;
			line-height: 1.5;
		}
	}
</style>
