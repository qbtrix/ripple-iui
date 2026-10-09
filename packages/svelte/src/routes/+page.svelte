<!--
  @file routes/+page.svelte
  @description Ripple's landing, chat-first. The hero IS a chat: a visitor types
    a request or taps one of the recorded scenarios, the answer streams in and
    its card renders through <Ripple> while it arrives. The chat opens on one
    finished recorded exchange (the bill splitter, seeded synchronously so it is
    in the prerendered HTML and hydrates without a re-render), so the fold shows
    a working card before any tap and with JavaScript off. The chat calls the
    Paw Bar API only when PUBLIC_PAWBAR_LIVE=1 (lib/site/pawbar-env.ts, read in
    vite.config.ts); otherwise it replays the recorded answers locally and says
    so. Below: how it works (spec, engine, UI, with a live card), install and
    the streaming code sample, the recorded examples linking /live, and the
    bring-your-own-key link.

  Creative Direction Declaration
    Scene: a developer at night, comparing generative UI tools with a terminal
      open beside the browser. The theme follows the OS; a flat blue-black or
      near-white ground, 1px lines for depth, no glow and no glass below the bar.
    Strategy: restrained neutrals + Paw blue as the single voice, and only on
      what is interactive or live. Type: Bricolage display, Inter body,
      JetBrains Mono for code (identity, copied from Paw OS).
    Trap avoided: a feature-grid SaaS page. The first screen is the product
      working, not a description of it.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { Ripple } from '$lib/index.js';
	import JsonLines from '$lib/site/JsonLines.svelte';
	import Chat from './pawbar/Chat.svelte';
	import { BYOK_URL, ChatSession, pawbarTransport, type Transport } from './pawbar/session.svelte.js';
	import { findScenario, pickScenario, recordedEvents, recordedExchange } from './pawbar/recorded.js';
	import { scenarios } from './live/scenarios.js';

	// Opt-in: vite.config.ts defines these only when PUBLIC_PAWBAR_LIVE=1.
	const ENDPOINT: string = import.meta.env.PUBLIC_PAWBAR_ENDPOINT ?? '';
	const WIDGET_ID: string = import.meta.env.PUBLIC_PAWBAR_WIDGET_ID ?? '';
	const SITE_KEY: string = import.meta.env.PUBLIC_PAWBAR_SITE_KEY ?? '';
	const LIVE = import.meta.env.PUBLIC_PAWBAR_LIVE === '1' && Boolean(ENDPOINT && WIDGET_ID && SITE_KEY);

	const GITHUB_URL = 'https://github.com/qbtrix/ripple-iui';
	const INSTALL = 'bun add @ripple-ui/svelte';

	// The order demo needs the test store's checkout (an `api` action), which the
	// chat's card policy refuses; it stays on /live and in the runs list below.
	const chatScenarios = scenarios.filter((s) => !s.needsStore);
	// The intro says what is replaying: a matching recording, or (when no
	// recording overlaps the request) the bill splitter, said plainly.
	const intro = (message: string) =>
		findScenario(message, chatScenarios)
			? 'Replaying a recorded answer that matches.'
			: 'No recording matches that yet, so here is the bill splitter.';
	const recorded: Transport = (message, signal) =>
		recordedEvents(pickScenario(message, chatScenarios), { speed: 1.5, signal, intro: intro(message) });
	// Live: the Paw Bar API, with the recordings as the in-place fallback when it
	// is unavailable. Default build: the recordings answer directly.
	const session = LIVE
		? new ChatSession(pawbarTransport({ endpoint: ENDPOINT, widgetId: WIDGET_ID, siteKey: SITE_KEY }).send, recorded)
		: new ChatSession(recorded);
	const bill = chatScenarios.find((s) => s.id === 'bill-splitter');
	if (bill) session.seed(bill.fixture.prompt, recordedExchange(bill, intro(bill.fixture.prompt)));
	const suggestions = chatScenarios.map((s) => ({ id: s.id, title: s.title, prompt: s.fixture.prompt }));

	// Step 3 of "how it works": a small spec, rendered for real.
	const demoSpec = {
		version: '1.0',
		state: { name: 'Ada' },
		ui: {
			type: 'flex',
			props: { direction: 'column', gap: '12px' },
			children: [
				{ type: 'heading', props: { text: 'Hello, {state.name}', level: 3 } },
				{ type: 'input', props: { label: 'Your name', placeholder: 'Type a name' }, bind: '{state.name}' },
				{
					type: 'button',
					props: { label: 'Clear', variant: 'outline', size: 'sm' },
					on_click: { action: 'set', target: 'name', value: '' }
				}
			]
		}
	};
	// Pretty-printed the way the spec peek shows a card (JsonLines).
	const specSnippet = JSON.stringify({ state: demoSpec.state, ui: demoSpec.ui });

	const codeSample = `<script>
  import { Ripple } from '@ripple-ui/svelte';
  import { streamSpec } from '@ripple-ui/svelte/streaming';
  import '@ripple-ui/svelte/theme.css';

  let store = $state(null);

  async function generate(prompt) {
    // your endpoint asks the model for a spec and streams the JSON back
    const res = await fetch('/api/ui', { method: 'POST', body: prompt });
    store = streamSpec(res.body);
  }
\u003C/script>

{#if store}<Ripple streaming={store} skeleton="card" />{/if}`;

	let copied = $state<'hero' | 'code' | null>(null);
	async function copyInstall(where: 'hero' | 'code') {
		try {
			await navigator.clipboard.writeText(INSTALL);
			copied = where;
			setTimeout(() => (copied = null), 1600);
		} catch {
			/* clipboard blocked: the command is on screen to copy by hand */
		}
	}

	onMount(() => () => session.stop());
</script>

<svelte:head>
	<title>Ripple: ask for a tool, watch it build</title>
	<meta
		name="description"
		content="Ripple is the open-source generative UI engine from Paw OS by PocketPaw. A model writes a small JSON spec and Ripple renders it as a working interface while the spec streams in."
	/>
</svelte:head>

<main class="landing">
	<section class="hero" aria-labelledby="hero-title">
		<h1 id="hero-title">Ask for a tool. <span>Ripple builds it while the model is still typing.</span></h1>
		<p class="lede">
			Ripple is the open-source generative UI engine. A model writes a small JSON spec, and Ripple turns it into a
			working interface as the spec streams in. Ask for something below.
		</p>
		<p class="get">
			<code><span aria-hidden="true">$</span> {INSTALL}</code>
			<button type="button" onclick={() => copyInstall('hero')} aria-label="Copy install command">
				{copied === 'hero' ? 'Copied' : 'Copy'}
			</button>
		</p>
		<Chat
			{session}
			{suggestions}
			note={LIVE ? '' : 'This demo replays recorded model answers. Each request plays the closest match.'}
		/>
		<p class="byok">
			{#if LIVE}
				The live demo has a daily limit. <a href={BYOK_URL}>Bring your own key for unlimited use</a>
			{:else}
				Want answers to your own requests? <a href={BYOK_URL}>Build your own in PocketPaw</a>
			{/if}
		</p>
	</section>

	<section class="how" aria-labelledby="how-title">
		<h2 id="how-title">How it works</h2>
		<ol class="steps">
			<li class="step">
				<h3>The model writes a spec</h3>
				<p>A tree of widgets, the starting state, and what each control does. Plain JSON, small enough to stream.</p>
				<pre class="snippet" aria-label="Example spec"><JsonLines text={specSnippet} /></pre>
			</li>
			<li class="step">
				<h3>The engine runs it</h3>
				<p>
					<code>@ripple-ui/core</code> holds the state, resolves <code>{'{state.name}'}</code> expressions, keeps
					two-way binds in sync and dispatches events. It has no framework dependency.
				</p>
				<ul class="facts">
					<li>Local actions: <code>set</code>, <code>toggle</code>, <code>push</code>, <code>remove</code></li>
					<li>Host actions your app handles: <code>emit</code>, <code>navigate</code>, <code>api</code></li>
					<li>Partial JSON parses as it arrives, so the UI grows token by token</li>
				</ul>
			</li>
			<li class="step">
				<h3>You get a working UI</h3>
				<p>That spec, rendered by <code>@ripple-ui/svelte</code>. Type in it.</p>
				<div class="demo"><Ripple spec={demoSpec} /></div>
			</li>
		</ol>
	</section>

	<section class="code" aria-labelledby="code-title">
		<div class="code-grid">
			<div class="code-copy">
				<h2 id="code-title">Stream a spec in a dozen lines</h2>
				<p>
					<code>streamSpec</code> reads any stream or async iterable and parses the partial JSON as it lands. Hand
					the store to <code>&lt;Ripple&gt;</code> and the interface fills in, then stays interactive when the stream
					ends.
				</p>
			</div>
			<pre class="sample"><code>{codeSample}</code></pre>
		</div>
		<!-- The site's one Paw-blue band. -->
		<div class="band">
			<div class="band-inner">
				<div class="install">
					<code><span aria-hidden="true">$</span> {INSTALL}</code>
					<button type="button" onclick={() => copyInstall('code')} aria-label="Copy install command">{copied === 'code' ? 'Copied' : 'Copy'}</button>
				</div>
				<p class="small">
					Widgets are styled with Tailwind v4, so your app needs Tailwind set up.
					<a href="{GITHUB_URL}/tree/main/packages/svelte#styling">Styling setup</a>
				</p>
			</div>
		</div>
	</section>

	<section class="examples" aria-labelledby="examples-title">
		<div class="examples-head">
			<h2 id="examples-title">Recorded runs</h2>
			<p>Real model output, replayed on its original timing. Open one to watch the spec and the UI side by side.</p>
		</div>
		<ul class="runs">
			{#each scenarios as s (s.id)}
				<li>
					<a href="/live?s={s.id}" class="run">
						<span class="run-line"><span class="run-title">{s.title}</span><span class="run-cat">{s.category}</span></span>
						<span class="run-prompt">{s.fixture.prompt}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>

	<section class="closer" aria-labelledby="closer-title">
		<h2 id="closer-title">Keep asking in Paw OS</h2>
		<p>Add your own model key in Paw OS and ask for as many tools as you like.</p>
		<div class="closer-actions">
			<a class="btn primary" href={BYOK_URL}>Bring your own key</a>
			<a class="link" href={GITHUB_URL}>Read the source</a>
		</div>
	</section>
</main>

<style>
	/* Sections sit on the site grid: --site-max wide, --site-gutter each side
	   (16px on phones). overflow-x clip lets the blue band run full bleed. */
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
		max-width: var(--site-max);
		margin-inline: auto;
	}
	h1,
	h2,
	h3 {
		font-family: var(--font-display);
		text-wrap: balance;
		margin: 0;
	}
	h1,
	h2 {
		font-weight: 650;
		letter-spacing: -0.03em;
	}
	h2 {
		font-size: clamp(1.6rem, 2.6vw, 2.1rem);
		line-height: 1.1;
	}
	code,
	pre {
		font-family: var(--font-mono);
	}
	p code,
	li code {
		font-size: 0.86em;
		padding: 1px 5px;
		border-radius: 5px;
		background: var(--site-hover);
	}
	a {
		color: var(--primary-ink);
	}

	/* Hero: the chat. */
	.hero {
		max-width: 880px !important;
		padding: clamp(48px, 9vw, 104px) 0 72px;
	}
	h1 {
		font-size: clamp(2.2rem, 4.2vw, 3.4rem);
		line-height: 1.04;
	}
	h1 span {
		display: block;
		margin-top: 0.12em;
	}
	.lede {
		margin: 22px 0 18px;
		max-width: 62ch;
		color: var(--site-soft);
		text-wrap: pretty;
	}
	/* The install line, as a quiet mono chip. */
	.get {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		max-width: 100%;
		margin: 0 0 36px;
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
	.byok {
		margin: 14px 0 0;
		font-size: 13.5px;
		color: var(--site-soft);
	}
	.byok a {
		font-weight: 600;
		text-underline-offset: 3px;
	}

	/* How it works: spec, engine, UI joined by one 1px line (across the three
	   columns from 768px, down the left edge below). Each step sits on it at
	   a small open node; no numbers, the line gives the order. */
	.how {
		padding: 72px 0;
		border-top: 1px solid var(--site-line);
	}
	.steps {
		list-style: none;
		margin: 40px 0 0;
		padding: 0 0 0 24px;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 40px;
		border-left: 1px solid var(--site-line);
	}
	.step {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}
	.step::before {
		content: '';
		position: absolute;
		top: 0.5em;
		left: -29px;
		width: 9px;
		height: 9px;
		box-sizing: border-box;
		border: 1px solid var(--site-faint);
		border-radius: 50%;
		background: var(--site-ground);
	}
	@media (min-width: 768px) {
		.steps {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 32px;
			padding: 28px 0 0;
			border-left: 0;
			border-top: 1px solid var(--site-line);
		}
		.step::before {
			top: -33px;
			left: 0;
		}
	}
	.step h3 {
		font-size: 1.2rem;
		font-weight: 650;
		letter-spacing: -0.015em;
	}
	.step p {
		margin: 0;
		line-height: 1.6;
		color: var(--site-soft);
	}
	/* The shared code style: code tokens, 12px radius, 1px line. */
	.snippet,
	.sample {
		margin: 0;
		padding: 16px 18px;
		overflow-x: auto;
		border: 1px solid var(--code-line);
		border-radius: var(--radius-card);
		background: var(--code-bg);
		font-size: 13px;
		line-height: 1.6;
		color: var(--code-ink);
	}
	/* The full spec is ~40 lines; it scrolls inside so step 1 stays the
	   height of its neighbours. */
	.snippet {
		max-height: 340px;
		overflow-y: auto;
		padding-inline: 14px;
		font-size: 12.5px;
		line-height: 1.55;
	}
	.facts {
		margin: 4px 0 0;
		padding: 0 0 0 18px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		line-height: 1.5;
		color: var(--site-soft);
	}
	/* A rendered card: the one tinted shadow. */
	.demo {
		padding: 16px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		background: var(--card);
		box-shadow: var(--shadow-card);
	}

	/* Install + streaming sample, then the blue band. */
	.code {
		padding: 72px 0 0;
		border-top: 1px solid var(--site-line);
	}
	.code-grid {
		display: grid;
		grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
		gap: 40px;
		align-items: start;
	}
	.code-copy {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.code-copy p {
		margin: 0;
		line-height: 1.65;
		color: var(--site-soft);
	}
	/* The one Paw-blue band on the site: full bleed, white ink only (no blue
	   ink, no faded white). Every text on it is --site-on-primary on --primary. */
	.band {
		margin: 72px calc(50% - 50vw) 0;
		background: var(--primary);
		color: var(--site-on-primary);
	}
	.band-inner {
		max-width: var(--site-max);
		margin-inline: auto;
		padding: 28px var(--site-gutter);
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 16px 40px;
	}
	.install {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		max-width: 100%;
		font-size: 15px;
	}
	.install code {
		overflow-x: auto;
		white-space: nowrap;
		color: inherit;
	}
	.install code span {
		margin-right: 6px;
	}
	.install button {
		flex: none;
		min-height: 44px;
		padding: 0 16px;
		border: 1px solid var(--site-on-primary);
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--site-on-primary);
		font: inherit;
		font-family: var(--font-sans);
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
	}
	.install button:hover {
		background: color-mix(in oklch, var(--primary) 82%, black);
	}
	.small {
		margin: 0;
		max-width: 52ch;
		font-size: 15px;
		line-height: 1.55;
	}
	.band a {
		color: inherit;
		font-weight: 600;
		text-underline-offset: 3px;
	}

	/* Recorded runs: a divided list; title and category on one line, the
	   prompt under them in muted ink, two lines at most. */
	.examples {
		padding: 72px 0;
	}
	.examples-head {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		justify-content: space-between;
		gap: 12px 40px;
	}
	.examples-head p {
		margin: 0;
		max-width: 46ch;
		line-height: 1.6;
		color: var(--site-soft);
	}
	.runs {
		list-style: none;
		margin: 32px 0 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
		column-gap: 32px;
		border-top: 1px solid var(--site-line);
	}
	.run {
		display: flex;
		flex-direction: column;
		gap: 6px;
		height: 100%;
		box-sizing: border-box;
		padding: 18px 0;
		border-bottom: 1px solid var(--site-line);
		color: var(--site-ink);
		text-decoration: none;
	}
	.run-line {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
	}
	.run:hover .run-title {
		color: var(--primary-ink);
	}
	.run:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	.run-title {
		font-weight: 600;
		transition: color 0.15s;
	}
	.run-cat {
		flex: none;
		font-size: 13px;
		color: var(--site-soft);
	}
	.run-prompt {
		font-size: 14px;
		line-height: 1.5;
		color: var(--site-soft);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	/* Closer: one primary button, the secondary is a link. */
	.closer {
		padding: 80px 0 96px;
		border-top: 1px solid var(--site-line);
	}
	.closer p {
		margin: 14px 0 26px;
		font-size: 17px;
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
	.byok a:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	/* --ring is the band's own blue, so focus on the band is white. */
	.band .install button:focus-visible,
	.band a:focus-visible {
		outline: 2px solid var(--site-on-primary);
		outline-offset: 2px;
	}

	@media (max-width: 860px) {
		.code-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	/* Phones: a tighter hero, so the prerendered card's header and the top of
	   its UI are in the first screen. */
	@media (max-width: 639px) {
		.landing {
			padding-inline: 16px;
		}
		.band-inner {
			padding-inline: 16px;
		}
		.hero {
			padding: 24px 0 56px;
		}
		h1 {
			font-size: 1.95rem;
		}
		.lede {
			margin: 12px 0;
			font-size: 16px;
			line-height: 1.5;
		}
		.get {
			margin-bottom: 20px;
		}
	}
</style>
