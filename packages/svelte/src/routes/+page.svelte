<!--
  @file routes/+page.svelte
  @description The public Ripple landing page (ripple.pocketpaw.xyz). Pitch,
    install line, a streaming code sample, and a live demo that replays a spec
    streaming into the real <Ripple> renderer through streamSpec. The page is
    prerendered: the demo's resting state (full spec text + rendered form) is
    in the markup, and onMount only replays the stream on top of it.
    Keep labs routes unlinked here. /live is a reserved slot built elsewhere.

  Creative Direction Declaration
    Archetype: Technology. Richness: Premium minimal.
    Design read: an open engine for developers, Clean-Tech family on the repo's
      shadcn tokens, one cool blue accent, the system UI and mono stacks (no third-party
      requests at runtime).
    Trap avoided: the dark hero + three feature cards + logo strip template.
      The fold shows the product doing its one job instead: JSON arriving on
      the left, a working UI growing on the right.
    Dials: variance 7, motion 5, density 3.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { Ripple } from '$lib/index.js';
	import { streamSpec, type StreamSpecStore } from '$lib/streaming/index.js';

	const BUILD_URL = 'https://os.pocketpaw.xyz/?ref=ripple';
	const GITHUB_URL = 'https://github.com/qbtrix/ripple-iui';
	const INSTALL = 'bun add @ripple-ui/svelte';

	// The demo spec: one bound input and two lines that read it back.
	const demoSpec = {
		version: '1.0',
		state: { name: 'Ada' },
		ui: {
			type: 'flex',
			props: { direction: 'column', gap: '12px' },
			children: [
				{ type: 'heading', props: { text: 'Hello, {state.name}', level: 3 } },
				{
					type: 'input',
					props: { label: 'Your name', placeholder: 'Type a name' },
					bind: '{state.name}'
				},
				{
					type: 'text',
					props: {
						text: "{state.name ? 'The heading updates on every keystroke.' : 'Type a name above.'}",
						size: 'sm'
					}
				},
				{
					type: 'button',
					props: { label: 'Clear', variant: 'outline', size: 'sm' },
					on_click: { action: 'set', target: 'name', value: '' }
				}
			]
		}
	};
	const specText = JSON.stringify(demoSpec, null, 2);

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
</scr` + `ipt>

{#if store}<Ripple streaming={store} skeleton="card" />{/if}`;

	let typed = $state(specText);
	let store = $state<StreamSpecStore | null>(null);
	let streaming = $state(false);
	let controller: AbortController | null = null;

	async function* typeOut(text: string, signal: AbortSignal) {
		// ponytail: fixed chunk size and delay; a real model's cadence is uneven.
		for (let i = 0; i < text.length && !signal.aborted; i += 7) {
			await new Promise((r) => setTimeout(r, 24));
			const chunk = text.slice(i, i + 7);
			typed += chunk;
			yield chunk;
		}
		streaming = false;
	}

	function replay() {
		controller?.abort();
		controller = new AbortController();
		typed = '';
		streaming = true;
		store = streamSpec(typeOut(specText, controller.signal), {
			signal: controller.signal,
			throttleMs: 40
		});
	}

	onMount(() => {
		if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) replay();
		return () => controller?.abort();
	});

	let copied = $state(false);
	async function copyInstall() {
		try {
			await navigator.clipboard.writeText(INSTALL);
			copied = true;
			setTimeout(() => (copied = false), 1600);
		} catch {
			// Clipboard blocked (insecure context or denied): the text stays selectable.
		}
	}
</script>

<svelte:head>
	<title>Ripple: generative UI from a JSON spec</title>
	<meta
		name="description"
		content="Ripple is an open, embeddable generative UI engine. Your model writes a small JSON spec; Ripple renders a working interface with state, binds, expressions and events, and streams it in as the model types."
	/>
</svelte:head>

<main class="landing">
	<section class="hero">
		<div class="hero-copy">
			<h1>
				Your model writes a spec.
				<span>Ripple turns it into a working UI.</span>
			</h1>
			<p class="lede">
				An open, embeddable generative UI engine for any model. The model emits a small JSON spec;
				Ripple handles state, two-way binds, expressions and events, and renders it while the model is
				still typing.
			</p>

			<div class="install">
				<code><span class="prompt" aria-hidden="true">$</span> {INSTALL}</code>
				<button type="button" class="copy" onclick={copyInstall} aria-label="Copy install command">
					{copied ? 'Copied' : 'Copy'}
				</button>
			</div>

			<div class="actions">
				<a class="btn primary" href={BUILD_URL}>Build your own</a>
				<a class="btn ghost" href="/playground">Open the playground</a>
			</div>
		</div>

		<figure class="demo" aria-label="A spec streaming into a live Ripple UI">
			<div class="demo-bar">
				<span class="demo-label">model output</span>
				<span class="demo-status" aria-live="polite">
					{streaming ? `streaming ${typed.length} / ${specText.length} bytes` : 'done, try the input'}
				</span>
				<button type="button" class="replay" onclick={replay} disabled={streaming}>Replay</button>
			</div>
			<div class="demo-panes">
				<pre class="spec" aria-label="Spec JSON"><code>{typed}</code></pre>
				<div class="render">
					<span class="demo-label">ripple render</span>
					<div class="render-frame">
						{#if store}
							<Ripple streaming={store} skeleton="card" />
						{:else}
							<Ripple spec={demoSpec} />
						{/if}
					</div>
				</div>
			</div>
		</figure>
	</section>

	<section class="code-section">
		<div class="code-copy">
			<h2>Stream a spec in a dozen lines</h2>
			<p>
				<code>streamSpec</code> takes any readable stream or async iterable and parses partial JSON as it
				arrives. Hand the store to <code>&lt;Ripple&gt;</code> and the UI grows token by token, then stays
				interactive when the stream ends.
			</p>
			<dl class="facts">
				<div>
					<dt>The model writes</dt>
					<dd>A tree of widgets, initial state, and actions like <code>set</code>, <code>toggle</code> and <code>push</code>.</dd>
				</div>
				<div>
					<dt>Ripple handles</dt>
					<dd>Reactivity, <code>{'{state.path}'}</code> expressions, two-way <code>bind</code>, and events.</dd>
				</div>
				<div>
					<dt>Ships with</dt>
					<dd>189 widgets in <code>@ripple-ui/svelte</code>, on a framework-agnostic engine in <code>@ripple-ui/core</code>.</dd>
				</div>
			</dl>
		</div>
		<div class="code-block">
			<pre class="code"><code>{codeSample}</code></pre>
			<p class="code-note">
				Widgets are styled with Tailwind v4, so your app needs Tailwind set up.
				<a href="https://github.com/qbtrix/ripple-iui/tree/main/packages/svelte#styling">Styling setup</a>
			</p>
		</div>
	</section>

	<section class="explore" aria-labelledby="explore-title">
		<h2 id="explore-title">See more of it</h2>
		<ul class="rows">
			<li>
				<a href="/live" class="row">
					<span class="row-title">Live <em class="soon">Coming soon</em></span>
					<span class="row-desc">Watch specs stream in from a model in real time.</span>
				</a>
			</li>
			<li>
				<a href="/playground" class="row">
					<span class="row-title">Playground</span>
					<span class="row-desc">Edit a spec and see the render update next to it.</span>
				</a>
			</li>
			<li>
				<a href="/showcase" class="row">
					<span class="row-title">Showcase</span>
					<span class="row-desc">Widgets, layouts and full pages, each one a spec.</span>
				</a>
			</li>
			<li>
				<a href={GITHUB_URL} class="row">
					<span class="row-title">GitHub</span>
					<span class="row-desc">Source, docs and releases. MIT licensed.</span>
				</a>
			</li>
		</ul>
	</section>

	<section class="closer">
		<h2>Try it with your own prompts</h2>
		<p>Describe the interface you want and watch a model build it with Ripple.</p>
		<a class="btn primary" href={BUILD_URL}>Build your own</a>
	</section>

	<footer class="foot">
		<span>Ripple, MIT licensed.</span>
		<a href={GITHUB_URL}>github.com/qbtrix/ripple-iui</a>
	</footer>
</main>

<style>
	.landing {
		--accent: hsl(216 74% 50%);
		--accent-ink: hsl(0 0% 100%);
		--ground: hsl(220 20% 98.4%);
		--panel: var(--card);
		--ink-soft: color-mix(in srgb, var(--foreground) 62%, var(--ground));
		--line: var(--border);
		--mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		--radius: 12px;
		font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
		background: var(--ground);
		color: var(--foreground);
		padding: 0 24px;
		overflow-x: clip;
	}
	:global(.dark) .landing {
		--accent: hsl(214 80% 62%);
		--accent-ink: hsl(222 30% 8%);
		--ground: hsl(222 14% 6%);
		--panel: hsl(222 12% 9%);
	}
	.landing > * {
		max-width: 1160px;
		margin-inline: auto;
	}
	code,
	pre {
		font-family: var(--mono);
	}
	h1,
	h2 {
		letter-spacing: -0.03em;
		font-weight: 600;
		margin: 0;
	}

	/* Hero */
	.hero {
		display: grid;
		grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
		gap: 56px;
		align-items: center;
		padding: 96px 0 112px;
	}
	h1 {
		font-size: clamp(2.4rem, 4.6vw, 4rem);
		line-height: 1.04;
	}
	h1 span {
		display: block;
		color: var(--ink-soft);
	}
	.lede {
		margin: 24px 0 0;
		max-width: 52ch;
		font-size: 1.075rem;
		line-height: 1.6;
		color: var(--ink-soft);
	}
	.install {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 32px;
		max-width: 420px;
		padding: 8px 8px 8px 16px;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--panel);
		font-size: 14px;
	}
	.install code {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.prompt {
		color: var(--accent);
		margin-right: 4px;
	}
	.copy,
	.replay {
		flex: none;
		font: inherit;
		font-size: 12px;
		font-weight: 500;
		padding: 6px 12px;
		border-radius: 8px;
		border: 1px solid var(--line);
		background: transparent;
		color: var(--foreground);
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}
	.copy:hover,
	.replay:hover:not(:disabled) {
		border-color: color-mix(in srgb, var(--foreground) 35%, transparent);
	}
	.replay:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 20px;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		height: 44px;
		padding: 0 20px;
		border-radius: 999px;
		font-weight: 500;
		font-size: 15px;
		text-decoration: none;
		transition: transform 0.15s, background 0.15s, border-color 0.15s;
	}
	.btn:active {
		transform: scale(0.98);
	}
	.btn.primary {
		background: var(--accent);
		color: var(--accent-ink);
	}
	.btn.primary:hover {
		background: color-mix(in srgb, var(--accent) 88%, var(--foreground));
	}
	.btn.ghost {
		color: var(--foreground);
		border: 1px solid var(--line);
	}
	.btn.ghost:hover {
		border-color: color-mix(in srgb, var(--foreground) 35%, transparent);
	}

	/* Demo */
	.demo {
		margin: 0;
		border: 1px solid var(--line);
		border-radius: 16px;
		background: var(--panel);
		box-shadow: 0 30px 60px -36px color-mix(in srgb, var(--foreground) 28%, transparent);
		overflow: hidden;
	}
	.demo-bar {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px 10px 16px;
		border-bottom: 1px solid var(--line);
	}
	.demo-label {
		font-family: var(--mono);
		font-size: 11px;
		letter-spacing: 0.04em;
		color: var(--ink-soft);
	}
	.demo-status {
		margin-left: auto;
		font-family: var(--mono);
		font-size: 11px;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}
	.demo-panes {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		height: 400px;
	}
	.spec {
		margin: 0;
		padding: 16px;
		font-size: 11.5px;
		line-height: 1.55;
		color: var(--ink-soft);
		background: color-mix(in srgb, var(--ground) 70%, var(--panel));
		border-right: 1px solid var(--line);
		overflow: auto;
		white-space: pre;
	}
	.render {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 16px;
		min-width: 0;
		overflow: auto;
	}

	/* Code section */
	.code-section {
		display: grid;
		grid-template-columns: minmax(0, 4fr) minmax(0, 6fr);
		gap: 56px;
		align-items: start;
		padding: 96px 0;
		border-top: 1px solid var(--line);
	}
	h2 {
		font-size: clamp(1.75rem, 3vw, 2.4rem);
		line-height: 1.1;
	}
	.code-copy p {
		margin: 16px 0 0;
		max-width: 50ch;
		line-height: 1.6;
		color: var(--ink-soft);
	}
	.code-copy code,
	.facts code {
		font-size: 0.88em;
		color: var(--foreground);
	}
	.facts {
		margin: 32px 0 0;
	}
	.facts > div {
		padding: 14px 0;
		border-top: 1px solid var(--line);
	}
	.facts dt {
		font-size: 13px;
		font-weight: 600;
	}
	.facts dd {
		margin: 4px 0 0;
		line-height: 1.55;
		color: var(--ink-soft);
	}
	.code {
		margin: 0;
		padding: 24px;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--panel);
		font-size: 13px;
		line-height: 1.65;
		overflow-x: auto;
	}

	.code-block {
		min-width: 0;
	}
	.code-note {
		margin: 12px 0 0;
		font-size: 13px;
		color: var(--ink-soft);
	}
	.code-note a {
		color: var(--accent);
	}

	/* Explore */
	.explore {
		padding: 96px 0;
		border-top: 1px solid var(--line);
	}
	.rows {
		list-style: none;
		margin: 32px 0 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0 48px;
	}
	.row {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 20px 0;
		border-top: 1px solid var(--line);
		color: inherit;
		text-decoration: none;
	}
	.row-title {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 1.15rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		transition: color 0.15s;
	}
	.row-title::after {
		content: '→';
		margin-left: auto;
		color: var(--ink-soft);
		transition: transform 0.2s;
	}
	.row:hover .row-title {
		color: var(--accent);
	}
	.row:hover .row-title::after {
		transform: translateX(4px);
	}
	.soon {
		font-style: normal;
		font-family: var(--mono);
		font-size: 11px;
		font-weight: 500;
		color: var(--accent);
		border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
		border-radius: 999px;
		padding: 2px 8px;
	}
	.row-desc {
		color: var(--ink-soft);
		line-height: 1.5;
	}

	/* Closer + footer */
	.closer {
		padding: 96px 0;
		border-top: 1px solid var(--line);
		text-align: center;
	}
	.closer p {
		margin: 12px auto 28px;
		color: var(--ink-soft);
	}
	.foot {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 8px;
		padding: 24px 0 32px;
		border-top: 1px solid var(--line);
		font-size: 13px;
		color: var(--ink-soft);
	}
	.foot a {
		color: inherit;
	}

	/* Arrival: the hero rises in once, CSS only, so prerendered HTML is final. */
	@media (prefers-reduced-motion: no-preference) {
		.hero-copy,
		.demo {
			animation: rise 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both;
		}
		.demo {
			animation-delay: 0.12s;
		}
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
	}

	@media (max-width: 900px) {
		.hero,
		.code-section {
			grid-template-columns: minmax(0, 1fr);
			gap: 40px;
		}
		.hero {
			padding: 56px 0 72px;
		}
		.code-section,
		.explore,
		.closer {
			padding: 64px 0;
		}
		.rows {
			grid-template-columns: minmax(0, 1fr);
		}
	}
	@media (max-width: 600px) {
		.landing {
			padding: 0 16px;
		}
		.demo-panes {
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: 150px minmax(0, 1fr);
			height: 470px;
		}
		.spec {
			border-right: 0;
			border-bottom: 1px solid var(--line);
		}
		.code {
			padding: 16px;
			font-size: 12px;
		}
	}
</style>
