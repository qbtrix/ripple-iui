<!--
  @file routes/+page.svelte
  @description Ripple's landing, chat-first. The hero IS a chat: a visitor types
    a request or taps one of the nine recorded scenarios, the answer streams in
    and its card renders through <Ripple> while it arrives. With the Paw Bar
    config set at build time (PUBLIC_PAWBAR_ENDPOINT / _WIDGET_ID / _SITE_KEY,
    defined in vite.config.ts like PUBLIC_STORE_URL) the chat calls the Paw Bar
    API; without it the same chat replays the recorded answers locally and says
    so. Below: how it works (spec, engine, UI, with a live card), install and
    the streaming code sample, the recorded examples linking /live, and the
    bring-your-own-key link. Prerendered; the chat only runs in the browser.

  Creative Direction Declaration
    Scene: a developer at night, comparing generative UI tools with a terminal
      open beside the browser. Dark default, Paw OS frosted glass on a deep
      blue-black ground lit by one electric-blue glow (the Paw OS wallpaper).
    Strategy: restrained neutrals + Paw blue as the single voice, crimson only
      on the one "keep going" action. Type: Bricolage display, Inter body,
      JetBrains Mono for code (identity, copied from Paw OS).
    Trap avoided: a feature-grid SaaS page. The first screen is the product
      working, not a description of it.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { Ripple } from '$lib/index.js';
	import Chat from './pawbar/Chat.svelte';
	import { BYOK_URL, ChatSession, pawbarTransport } from './pawbar/session.svelte.js';
	import { pickScenario, recordedEvents } from './pawbar/recorded.js';
	import { scenarios } from './live/scenarios.js';

	const ENDPOINT: string = import.meta.env.PUBLIC_PAWBAR_ENDPOINT ?? '';
	const WIDGET_ID: string = import.meta.env.PUBLIC_PAWBAR_WIDGET_ID ?? '';
	const SITE_KEY: string = import.meta.env.PUBLIC_PAWBAR_SITE_KEY ?? '';
	const LIVE = Boolean(ENDPOINT && WIDGET_ID && SITE_KEY);

	const GITHUB_URL = 'https://github.com/qbtrix/ripple-iui';
	const INSTALL = 'bun add @ripple-ui/svelte';

	// The order demo needs the test store's checkout (an `api` action), which the
	// chat's card policy refuses; it stays on /live and in the runs list below.
	const chatScenarios = scenarios.filter((s) => !s.needsStore);
	const session = new ChatSession(
		LIVE
			? pawbarTransport({ endpoint: ENDPOINT, widgetId: WIDGET_ID, siteKey: SITE_KEY }).send
			: (message, signal) =>
					recordedEvents(pickScenario(message, chatScenarios), {
						speed: 1.5,
						signal,
						intro: 'The live model is not connected on this build, so here is a recorded answer that fits.'
					})
	);
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
	const specSnippet = `{
  "state": { "name": "Ada" },
  "ui": { "type": "flex", "children": [
    { "type": "heading",
      "props": { "text": "Hello, {state.name}" } },
    { "type": "input", "bind": "{state.name}" },
    { "type": "button", "props": { "label": "Clear" },
      "on_click": { "action": "set",
                    "target": "name", "value": "" } }
  ] }
}`;

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

	let copied = $state(false);
	async function copyInstall() {
		try {
			await navigator.clipboard.writeText(INSTALL);
			copied = true;
			setTimeout(() => (copied = false), 1600);
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
			Ripple is the open-source generative UI engine from Paw OS by PocketPaw. A model writes a small JSON spec,
			and Ripple turns it into a working interface as the spec streams in. Ask for something below.
		</p>
		<div class="chat-frame">
			<Chat
				{session}
				{suggestions}
				note={LIVE ? '' : 'The live model is off in this build. Each request replays the closest recorded answer.'}
			/>
		</div>
		<p class="byok">
			The live demo has a daily limit. <a href={BYOK_URL}>Bring your own key for unlimited use</a>
		</p>
	</section>

	<section class="how" aria-labelledby="how-title">
		<h2 id="how-title">How it works</h2>
		<ol class="steps">
			<li class="step">
				<h3><span class="n">1</span> The model writes a spec</h3>
				<p>A tree of widgets, the starting state, and what each control does. Plain JSON, small enough to stream.</p>
				<pre class="snippet" aria-label="Example spec"><code>{specSnippet}</code></pre>
			</li>
			<li class="step">
				<h3><span class="n">2</span> The engine runs it</h3>
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
				<h3><span class="n">3</span> You get a working UI</h3>
				<p>That spec, rendered by <code>@ripple-ui/svelte</code>. Type in it.</p>
				<div class="demo"><Ripple spec={demoSpec} /></div>
			</li>
		</ol>
	</section>

	<section class="code" aria-labelledby="code-title">
		<div class="code-copy">
			<h2 id="code-title">Stream a spec in a dozen lines</h2>
			<p>
				<code>streamSpec</code> reads any stream or async iterable and parses the partial JSON as it lands. Hand
				the store to <code>&lt;Ripple&gt;</code> and the interface fills in, then stays interactive when the stream
				ends.
			</p>
			<div class="install">
				<code><span aria-hidden="true">$</span> {INSTALL}</code>
				<button type="button" onclick={copyInstall} aria-label="Copy install command">{copied ? 'Copied' : 'Copy'}</button>
			</div>
			<p class="small">
				Widgets are styled with Tailwind v4, so your app needs Tailwind set up.
				<a href="{GITHUB_URL}/tree/main/packages/svelte#styling">Styling setup</a>
			</p>
		</div>
		<pre class="sample"><code>{codeSample}</code></pre>
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
						<span class="run-cat">{s.category}</span>
						<span class="run-title">{s.title}</span>
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
			<a class="btn crimson" href={BYOK_URL}>Bring your own key</a>
			<a class="btn ghost" href={GITHUB_URL}>Read the source</a>
		</div>
	</section>
</main>

<style>
	.landing {
		position: relative;
		isolation: isolate;
		padding: 0 clamp(16px, 4vw, 32px);
	}
	/* The Paw OS wallpaper: one electric-blue light behind the chat, a faint warm edge. */
	.landing::before {
		content: '';
		position: absolute;
		inset: -80px 0 auto;
		height: 980px;
		z-index: -1;
		pointer-events: none;
		background:
			radial-gradient(60% 46% at 50% 18%, var(--glow), transparent 70%),
			radial-gradient(34% 30% at 88% 52%, var(--glow-warm), transparent 72%);
	}
	.landing > section {
		max-width: 1120px;
		margin-inline: auto;
	}
	h1,
	h2,
	h3 {
		font-family: var(--font-display);
		text-wrap: balance;
		margin: 0;
	}
	h2 {
		font-size: clamp(1.7rem, 3vw, 2.4rem);
		font-weight: 650;
		letter-spacing: -0.025em;
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
		background: color-mix(in oklch, var(--site-ink) 8%, transparent);
	}
	a {
		color: var(--primary-ink);
	}

	/* Hero: the chat. */
	.hero {
		max-width: 800px !important;
		padding: clamp(48px, 9vw, 104px) 0 72px;
	}
	h1 {
		font-size: clamp(2.3rem, 5.4vw, 4.1rem);
		font-weight: 700;
		line-height: 1.02;
		letter-spacing: -0.035em;
	}
	h1 span {
		display: block;
		margin-top: 0.12em;
		font-weight: 500;
		color: var(--site-soft);
	}
	.lede {
		margin: 22px 0 32px;
		max-width: 62ch;
		font-size: 17px;
		line-height: 1.65;
		color: var(--site-soft);
		text-wrap: pretty;
	}
	.chat-frame {
		padding: clamp(14px, 2.4vw, 22px);
		border: 1px solid var(--glass-line);
		border-radius: 16px;
		background: color-mix(in oklch, var(--glass) 55%, transparent);
		backdrop-filter: blur(12px) saturate(1.4);
		-webkit-backdrop-filter: blur(12px) saturate(1.4);
	}
	.byok {
		margin: 14px 2px 0;
		font-size: 13.5px;
		color: var(--site-soft);
	}
	.byok a {
		font-weight: 600;
		text-underline-offset: 3px;
	}

	/* How it works: a real three-step sequence, so it is numbered. */
	.how {
		padding: 72px 0;
		border-top: 1px solid var(--site-line);
	}
	.steps {
		list-style: none;
		margin: 36px 0 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
		gap: 36px 28px;
	}
	.step {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}
	.step h3 {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 1.2rem;
		font-weight: 650;
		letter-spacing: -0.015em;
	}
	.n {
		display: grid;
		place-items: center;
		width: 26px;
		height: 26px;
		flex: none;
		border-radius: 8px;
		background: var(--primary);
		color: var(--primary-foreground);
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: 600;
	}
	.step p {
		margin: 0;
		line-height: 1.6;
		color: var(--site-soft);
	}
	.snippet,
	.sample {
		margin: 0;
		padding: 16px 18px;
		overflow-x: auto;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-paw);
		background: color-mix(in oklch, var(--site-ink) 4%, var(--site-ground));
		font-size: 12.5px;
		line-height: 1.6;
		color: var(--site-ink);
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
	.demo {
		padding: 16px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-paw);
		background: var(--card);
	}

	/* Install + streaming sample. */
	.code {
		display: grid;
		grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
		gap: 40px;
		align-items: start;
		padding: 72px 0;
		border-top: 1px solid var(--site-line);
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
	.install {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 8px 8px 8px 16px;
		border: 1px solid var(--site-line);
		border-radius: 10px;
		background: color-mix(in oklch, var(--site-ink) 4%, var(--site-ground));
		font-size: 14px;
	}
	.install code {
		overflow-x: auto;
		white-space: nowrap;
	}
	.install code span {
		color: var(--site-soft);
		margin-right: 6px;
	}
	.install button {
		flex: none;
		padding: 6px 12px;
		border: 1px solid var(--site-line);
		border-radius: 7px;
		background: transparent;
		color: var(--site-ink);
		font: inherit;
		font-size: 13px;
		cursor: pointer;
	}
	.small {
		font-size: 13.5px;
	}

	/* Recorded runs. */
	.examples {
		padding: 72px 0;
		border-top: 1px solid var(--site-line);
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
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
		border-top: 1px solid var(--site-line);
	}
	.run {
		display: grid;
		grid-template-columns: 1fr;
		gap: 4px;
		height: 100%;
		box-sizing: border-box;
		padding: 18px 16px 18px 0;
		border-bottom: 1px solid var(--site-line);
		color: var(--site-ink);
		text-decoration: none;
	}
	.run:hover .run-title {
		color: var(--primary-ink);
	}
	.run:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: -2px;
	}
	.run-cat {
		font-family: var(--font-mono);
		font-size: 11.5px;
		color: var(--site-soft);
	}
	.run-title {
		font-weight: 600;
		transition: color 0.15s;
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

	/* Closer. */
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
		gap: 12px;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		height: 44px;
		padding: 0 20px;
		border-radius: 10px;
		font-weight: 600;
		font-size: 15px;
		text-decoration: none;
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	.btn.crimson {
		background: var(--paw-crimson);
		color: oklch(1 0 0);
	}
	.btn.crimson:hover {
		background: var(--paw-crimson-hover);
	}
	.btn.ghost {
		border: 1px solid var(--site-line);
		color: var(--site-ink);
	}
	.btn.ghost:hover {
		border-color: color-mix(in oklch, var(--site-ink) 35%, transparent);
	}
	.btn:focus-visible,
	.install button:focus-visible,
	.byok a:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}

	@media (max-width: 860px) {
		.code {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (max-width: 420px) {
		.chat-frame {
			padding: 8px;
			border-radius: 14px;
		}
	}
</style>
