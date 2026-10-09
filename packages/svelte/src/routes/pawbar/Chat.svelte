<!--
  @file routes/pawbar/Chat.svelte
  @description The landing's chat: the conversation log, a composer that stays
    in reach while a long card is read, and the suggestion chips. No frame: the
    thread sits on the page ground and only the composer and the rendered cards
    are surfaces. Assistant text renders as markdown-lite (paragraphs, **bold**,
    `code`) built from Svelte nodes; model text never goes through {@html}. A
    card renders through <Ripple streaming> while it arrives and swaps to
    <Ripple spec> on final (a remount, so the validated spec is what the visitor
    keeps using). Host events go to session.hostEvent, which ignores them until
    the card is final. A notice that offers a replay gets a button that plays
    the closest recorded answer into the same turn (session.replayRecorded).
    Each card has a spec peek (its JSON, pretty-printed as it streams). Peeks
    start closed, except the first card the visitor triggers in a browser
    session (sessionStorage). Turns already in the session at mount (the
    prerendered exchange) neither animate in nor auto-open their peek.
    DOM ids are positional, never Card.id: that counter can differ between the
    prerender and hydration. Reduced motion lives in CSS only.
-->
<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { Ripple } from '$lib/index.js';
	import { prettyPrefix } from '$lib/site/prettyPrefix.js';
	import type { Card, ChatSession, Notice } from './session.svelte.js';

	interface Suggestion {
		id: string;
		title: string;
		prompt: string;
	}

	let { session, suggestions = [], note = '' }: { session: ChatSession; suggestions?: Suggestion[]; note?: string } = $props();

	let draft = $state('');
	let log = $state<HTMLOListElement>();

	const cardsIn = (s: ChatSession) => s.turns.flatMap((t) => t.parts.flatMap((p) => (p.kind === 'card' ? [p.card] : [])));
	// What is on screen at mount is the prerendered fold: no entry animation, peeks closed.
	const seeded = untrack(() => new Set(session.turns.map((t) => t.id)));
	const known = untrack(() => new Set(cardsIn(session)));

	let peek = $state<Record<string, boolean>>({});
	let copied = $state<string | null>(null);
	const PEEK_KEY = 'ripple.chat.peeked';

	// The first card the visitor triggers opens its peek, once per browser session.
	$effect(() => {
		for (const card of cardsIn(session)) {
			if (known.has(card)) continue;
			known.add(card);
			try {
				if (sessionStorage.getItem(PEEK_KEY)) continue;
				sessionStorage.setItem(PEEK_KEY, '1');
			} catch {
				continue; /* storage blocked: leave it closed */
			}
			peek[card.id] = true;
		}
	});

	async function ask(text: string) {
		if (session.busy || !text.trim()) return;
		draft = '';
		const done = session.send(text);
		await tick();
		const mine = log?.children[log.children.length - 2];
		mine?.scrollIntoView?.({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
		await done;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
			e.preventDefault();
			void ask(draft);
		}
	}

	async function copySpec(card: Card) {
		try {
			await navigator.clipboard.writeText(card.spec ? JSON.stringify(card.spec, null, 2) : prettyPrefix(card.text));
			copied = card.id;
			setTimeout(() => copied === card.id && (copied = null), 1600);
		} catch {
			/* clipboard blocked: the spec peek shows it to select by hand */
		}
	}

	const bytes = (text: string) => {
		const n = new TextEncoder().encode(text).length;
		return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`;
	};

	/** Keeps a streaming spec scrolled to its newest line. */
	const follow = (card: Card) => (el: HTMLElement) => {
		void card.text;
		if (card.status === 'streaming') el.scrollTop = el.scrollHeight;
	};

	const paragraphs = (text: string) => text.trim().split(/\n{2,}/).filter(Boolean);
	const inline = (para: string) =>
		para
			.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/)
			.filter(Boolean)
			.map((v) =>
				v.startsWith('**') && v.endsWith('**') && v.length > 4
					? { kind: 'b', v: v.slice(2, -2) }
					: v.startsWith('`') && v.endsWith('`') && v.length > 2
						? { kind: 'c', v: v.slice(1, -1) }
						: { kind: 't', v }
			);

	const rejectedNote = (c: Card) =>
		c.reason === 'truncated'
			? 'The card was cut off before it finished, so it is left out.'
			: 'The card did not pass its checks, so it is left out.';
</script>

{#snippet prose(text: string, caret: boolean)}
	{@const paras = paragraphs(text)}
	{#each paras as para, i (i)}
		<p class="say">
			{#each inline(para) as tok, j (j)}{#if tok.kind === 'b'}<strong>{tok.v}</strong>{:else if tok.kind === 'c'}<code>{tok.v}</code>{:else}{tok.v}{/if}{/each}{#if caret && i === paras.length - 1}<span
					class="caret"
					aria-hidden="true"
				></span>{/if}
		</p>
	{/each}
{/snippet}

{#snippet icon(kind: Notice['kind'])}
	<svg class="glyph" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
		<circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.5" />
		{#if kind === 'error'}
			<path d="M8 4.75v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
			<circle cx="8" cy="11.1" r="0.9" fill="currentColor" />
		{:else}
			<path d="M8 7.25v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
			<circle cx="8" cy="4.9" r="0.9" fill="currentColor" />
		{/if}
	</svg>
{/snippet}

{#snippet cardView(card: Card, pid: string)}
	{#if card.status === 'rejected'}
		<p class="card-note">{rejectedNote(card)}</p>
	{:else}
		{@const open = peek[card.id] ?? false}
		<figure class="card" data-status={card.status}>
			<figcaption class="card-head">
				<span class="card-title">{card.title || 'Card'}</span>
				{#if card.status === 'streaming'}<span class="building" aria-live="polite">Building</span>{/if}
				<span class="tools">
					<button type="button" class="tool" aria-expanded={open} aria-controls={pid} onclick={() => (peek[card.id] = !open)}>Spec</button>
					<button type="button" class="tool" onclick={() => copySpec(card)}>{copied === card.id ? 'Copied' : 'Copy spec'}</button>
				</span>
			</figcaption>
			<div class="card-body" data-open={open}>
				<div class="card-ui">
					{#if card.status === 'final' && card.spec}
						<Ripple spec={card.spec} onEvent={(e) => session.hostEvent(card, e)} />
					{:else}
						<Ripple streaming={card.store} skeleton="card" onEvent={(e) => session.hostEvent(card, e)} />
					{/if}
				</div>
				<div class="peek" id={pid} inert={!open}>
					<div class="peek-inner">
						<p class="peek-meta"><span>JSON spec</span><span class="bytes">{bytes(card.text)}</span></p>
						<pre {@attach follow(card)}><code>{prettyPrefix(card.text)}</code></pre>
					</div>
				</div>
			</div>
			{#if card.sent}<p class="sent" role="status">The card sent <code>{card.sent}</code> to this page.</p>{/if}
		</figure>
	{/if}
{/snippet}

<div class="chat">
	{#if session.turns.length}
		<ol class="log" bind:this={log} aria-label="Conversation">
			{#each session.turns as turn, t (turn.id)}
				<li class="turn" data-role={turn.role} data-seeded={seeded.has(turn.id) || undefined}>
					{#if turn.role === 'user'}
						<p class="ask">{turn.parts[0]?.kind === 'text' ? turn.parts[0].text : ''}</p>
					{:else}
						{#each turn.parts as part, i (part.kind === 'card' ? part.card.id : `t${i}`)}
							{#if part.kind === 'text'}
								{@render prose(part.text, turn.pending && i === turn.parts.length - 1)}
							{:else}
								{@render cardView(part.card, `ripple-spec-${t}-${i}`)}
							{/if}
						{/each}
						{#if turn.pending && !turn.parts.length}<p class="thinking">Thinking</p>{/if}
						{#if turn.notice}
							<p class="notice" data-kind={turn.notice.kind} role="status">
								{@render icon(turn.notice.kind)}
								<span>
									{turn.notice.text}
									{#if turn.notice.link}<a href={turn.notice.link.href}>{turn.notice.link.label}</a>{/if}
								</span>
								{#if turn.notice.replay}
									<button type="button" class="replay" disabled={session.busy} onclick={() => session.replayRecorded(turn.id)}>
										Play the closest recorded answer here
									</button>
								{/if}
							</p>
						{/if}
					{/if}
				</li>
			{/each}
		</ol>
	{/if}

	<form
		class="composer"
		onsubmit={(e) => {
			e.preventDefault();
			void ask(draft);
		}}
	>
		<label class="sr-only" for="ripple-ask">Describe the tool you want</label>
		<textarea
			id="ripple-ask"
			rows="2"
			maxlength="2000"
			placeholder="Ask for a tool, like a tip splitter"
			bind:value={draft}
			onkeydown={onKey}
		></textarea>
		{#if session.busy}
			<button type="button" class="send stop" onclick={() => session.stop()}>Stop</button>
		{:else}
			<button type="submit" class="send" disabled={!draft.trim()}>Send</button>
		{/if}
	</form>

	{#if suggestions.length}
		<ul class="chips" aria-label="Try one of these">
			{#each suggestions as s (s.id)}
				<li>
					<button type="button" class="chip" disabled={session.busy} title={s.prompt} onclick={() => ask(s.prompt)}>{s.title}</button>
				</li>
			{/each}
		</ul>
	{/if}
	{#if note}<p class="chat-note">{note}</p>{/if}
</div>

<style>
	.chat {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.log {
		list-style: none;
		margin: 0 0 6px;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.turn {
		scroll-margin-top: calc(var(--site-topbar) + 24px);
	}
	.turn:not([data-seeded]) {
		animation: rise var(--dur-mount) var(--ease-out-quart);
	}
	.turn[data-role='user'] {
		display: flex;
		justify-content: flex-end;
	}
	.ask {
		margin: 0;
		max-width: min(560px, 88%);
		padding: 10px 14px;
		border-radius: var(--radius-card);
		background: var(--site-hover);
		color: var(--site-ink);
		line-height: 1.5;
		overflow-wrap: anywhere;
	}
	.turn[data-role='assistant'] {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.say {
		margin: 0;
		max-width: 68ch;
		line-height: 1.65;
		white-space: pre-line;
		overflow-wrap: anywhere;
	}
	.say code,
	.sent code {
		font-family: var(--font-mono);
		font-size: 0.88em;
		padding: 1px 5px;
		border-radius: 5px;
		background: var(--site-pressed);
	}
	.caret {
		display: inline-block;
		width: 2px;
		height: 1.1em;
		margin-left: 2px;
		vertical-align: -0.18em;
		background: var(--primary);
		animation: blink 1s steps(1) infinite;
	}
	.thinking,
	.building {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--site-soft);
	}
	.thinking {
		margin: 0;
	}
	.thinking::before,
	.building::before {
		content: '';
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--primary);
		animation: pulse 1.4s ease-in-out infinite;
	}

	/* The rendered card: the one elevated thing in the thread. */
	.card {
		margin: 0;
		min-width: 0;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		background: var(--card);
		box-shadow: var(--shadow-card);
		overflow: hidden;
	}
	.card-head {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 6px 6px 16px;
		border-bottom: 1px solid var(--site-line);
		font-size: 14px;
	}
	.card-title {
		font-weight: 600;
		color: var(--site-ink);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.tools {
		display: flex;
		gap: 2px;
		margin-left: auto;
		flex: none;
	}
	.tool {
		min-height: 36px;
		padding: 0 12px;
		border: 0;
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--site-soft);
		font: inherit;
		font-size: 13px;
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}
	.tool:hover {
		background: var(--site-hover);
		color: var(--site-ink);
	}
	.tool[aria-expanded='true'] {
		background: var(--site-pressed);
		color: var(--site-ink);
	}

	/* Card and its spec peek. Narrow: the peek opens under the card (rows
	   0fr to 1fr). Wide: side by side, 7/12 and 5/12 (columns 12fr 0fr to 7fr 5fr). */
	.card-body {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: auto 0fr;
		transition: grid-template-rows 200ms var(--ease-out-quart);
	}
	.card-body[data-open='true'] {
		grid-template-rows: auto 1fr;
	}
	.card-ui {
		min-width: 0;
		padding: 16px;
		/* A card can be wider than a phone: it scrolls inside itself, never clips. */
		overflow-x: auto;
	}
	.peek {
		min-height: 0;
		min-width: 0;
		overflow: hidden;
	}
	.peek-inner {
		display: flex;
		flex-direction: column;
		height: 100%;
		border-top: 1px solid var(--site-line);
		background: var(--code-bg);
	}
	.peek-meta {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		margin: 0;
		padding: 8px 16px;
		font-size: 12.5px;
		color: var(--site-soft);
	}
	.bytes {
		font-family: var(--font-mono);
		font-variant-numeric: tabular-nums;
	}
	.peek pre {
		margin: 0;
		padding: 0 16px 14px;
		max-height: 320px;
		overflow: auto;
		font-family: var(--font-mono);
		font-size: 12.5px;
		line-height: 1.55;
		color: var(--code-ink);
	}
	@media (min-width: 1024px) {
		.card-body,
		.card-body[data-open='true'] {
			grid-template-rows: auto;
			grid-template-columns: minmax(0, 12fr) minmax(0, 0fr);
			transition: grid-template-columns 200ms var(--ease-out-quart);
		}
		.card-body[data-open='true'] {
			grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
		}
		.peek {
			position: relative;
		}
		/* The peek takes the card's height and scrolls inside it. */
		.peek-inner {
			position: absolute;
			inset: 0;
			border-top: 0;
			border-left: 1px solid var(--site-line);
		}
		.peek pre {
			flex: 1;
			max-height: none;
		}
	}

	.card-note,
	.chat-note {
		margin: 0;
		font-size: 13.5px;
		color: var(--site-soft);
	}
	.sent {
		margin: 0;
		padding: 10px 16px;
		border-top: 1px solid var(--site-line);
		font-size: 13px;
		color: var(--site-soft);
	}

	/* Notices: one quiet line; the only colour is the glyph. */
	.notice {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 10px;
		margin: 0;
		padding: 9px 12px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
		font-size: 14px;
		line-height: 1.5;
		color: var(--site-ink);
	}
	.notice > span {
		flex: 1 1 16rem;
	}
	.glyph {
		flex: none;
		color: var(--primary-ink);
	}
	.notice a {
		color: inherit;
		font-weight: 600;
		margin-left: 4px;
		text-underline-offset: 3px;
	}
	.replay {
		min-height: 36px;
		padding: 0 12px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-control);
		background: transparent;
		color: var(--site-ink);
		font: inherit;
		font-size: 13.5px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}
	.replay:hover:not(:disabled) {
		background: var(--site-hover);
	}
	.replay:disabled {
		background: var(--site-pressed);
		color: var(--site-soft);
		cursor: default;
	}

	.composer {
		position: sticky;
		bottom: 12px;
		z-index: var(--z-sticky);
		display: flex;
		align-items: flex-end;
		gap: 10px;
		padding: 8px 8px 8px 16px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		background: var(--site-ground);
	}
	.composer:focus-within {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	textarea {
		flex: 1;
		min-width: 0;
		resize: none;
		border: 0;
		outline: 0;
		padding: 7px 0;
		background: transparent;
		color: var(--site-ink);
		font: inherit;
		font-size: 16px;
		line-height: 1.5;
	}
	textarea::placeholder {
		color: var(--site-soft);
	}
	.send {
		flex: none;
		min-height: 40px;
		padding: 0 18px;
		border: 0;
		border-radius: var(--radius-control);
		background: var(--primary);
		color: var(--site-on-primary);
		font: inherit;
		font-weight: 600;
		font-size: 14px;
		cursor: pointer;
		transition: background 0.15s;
	}
	.send:hover:not(:disabled) {
		background: color-mix(in oklch, var(--primary) 88%, black);
	}
	/* Disabled reads as ink on a 9% ink fill, not a faded blue. */
	.send:disabled {
		background: var(--site-pressed);
		color: var(--site-soft);
		cursor: default;
	}
	.send.stop {
		background: var(--site-pressed);
		color: var(--site-ink);
	}

	.chips {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.chip {
		min-height: 44px;
		padding: 0 14px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-chip);
		background: transparent;
		color: var(--site-ink);
		font: inherit;
		font-size: 14px;
		white-space: nowrap;
		cursor: pointer;
		transition:
			background 0.15s,
			transform 0.1s;
	}
	.chip:hover:not(:disabled) {
		background: var(--site-hover);
	}
	.chip:not(:disabled):active,
	.tool:active,
	.replay:not(:disabled):active,
	.send:not(:disabled):active {
		transform: scale(0.98);
	}
	.chip:disabled {
		color: var(--site-soft);
		cursor: default;
	}
	.send:focus-visible,
	.chip:focus-visible,
	.tool:focus-visible,
	.replay:focus-visible,
	.notice a:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	/* Phones: the chips are one row that scrolls sideways, snapping per chip. */
	@media (max-width: 639px) {
		.chips {
			flex-wrap: nowrap;
			overflow-x: auto;
			scroll-snap-type: x proximity;
			scroll-padding-inline: 4px;
			scrollbar-width: none;
			/* Room for the focus ring, which overflow would otherwise clip. */
			padding: 4px;
			margin: -4px;
		}
		.chips::-webkit-scrollbar {
			display: none;
		}
		.chips li {
			flex: none;
			scroll-snap-align: start;
		}
	}
	@media (max-width: 420px) {
		.card-ui {
			padding: 10px;
		}
		/* Room for the sticky composer, so the end of a card can scroll above it. */
		.log {
			padding-bottom: 72px;
		}
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}
	@keyframes pulse {
		50% {
			opacity: 0.35;
		}
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.turn:not([data-seeded]),
		.thinking::before,
		.building::before,
		.caret {
			animation: none;
		}
		.card-body,
		.card-body[data-open='true'] {
			transition: none !important;
		}
		.chip,
		.tool,
		.replay,
		.send {
			transform: none !important;
		}
	}
</style>
