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
    Each card has a spec peek (its JSON, pretty-printed as it streams, soft
    wrapped with a hanging indent so deep lines never leave the pane; under
    1024px it shows 8 lines until Expand). Peeks start closed, except the
    first card the visitor triggers in a browser session (sessionStorage).
    Turns already in the session at mount (the prerendered exchange) neither
    animate in nor auto-open their peek. A card whose spec root is a `card`
    widget gets a bare frame (no border, shadow or fill), so the widget's own
    card is the surface. The composer is in the flow until the visitor
    engages (focus, a chip, a send), then sticks to the bottom; before that
    it would cover the prerendered card on a phone. The log is role="log"
    and aria-busy while a turn streams; one polite region says "Building"
    and "Done" per turn instead of reading tokens.
    DOM ids are positional, never Card.id: that counter can differ between the
    prerender and hydration. Reduced motion lives in CSS only.
    The playground hosts it with two optional props, both off on the landing:
    `chips` renders each card as a compact chip (title, status, size) that
    picks it into the playground's own preview, and `onspec` adds an Open
    button to the peek that hands the card to a fuller JSON view. `ask` and
    `focus` are exported for its prompt cards and the `/` shortcut.
-->
<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { Ripple } from '$lib/index.js';
	import { prettyPrefix } from '$lib/site/prettyPrefix.js';
	import JsonLines from '$lib/site/JsonLines.svelte';
	import type { Card, ChatSession, Notice } from './session.svelte.js';

	interface Suggestion {
		id: string;
		title: string;
		prompt: string;
	}

	interface Chips {
		/** The card the playground's panes are showing. */
		viewing: string | null;
		pick: (card: Card) => void;
	}

	let {
		session,
		suggestions = [],
		note = '',
		chips = null,
		onspec
	}: { session: ChatSession; suggestions?: Suggestion[]; note?: string; chips?: Chips | null; onspec?: (card: Card) => void } = $props();

	let draft = $state('');
	/** The visitor has engaged: from here on the composer is sticky. */
	let engaged = $state(false);
	let log = $state<HTMLOListElement>();

	const cardsIn = (s: ChatSession) => s.turns.flatMap((t) => t.parts.flatMap((p) => (p.kind === 'card' ? [p.card] : [])));
	// What is on screen at mount is the prerendered fold: no entry animation, peeks closed.
	const seeded = untrack(() => new Set(session.turns.map((t) => t.id)));
	const known = untrack(() => new Set(cardsIn(session)));

	let peek = $state<Record<string, boolean>>({});
	/** Under 1024px a peek shows 8 lines until expanded. */
	let peekFull = $state<Record<string, boolean>>({});
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

	export async function ask(text: string) {
		if (session.busy || !text.trim()) return;
		engaged = true;
		draft = '';
		const done = session.send(text);
		await tick();
		const mine = log?.children[log.children.length - 2];
		if (mine instanceof HTMLElement) toTop(mine);
		await done;
	}

	/** Puts the new request at the top of its own scroll box only: the page on the
	    landing, the chat column in the playground (which must not move the page). */
	function toTop(el: HTMLElement) {
		const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
		let box = el.parentElement;
		while (box && box !== document.body && !/auto|scroll/.test(getComputedStyle(box).overflowY)) box = box.parentElement;
		if (!box || box === document.body) return el.scrollIntoView?.({ block: 'start', behavior });
		box.scrollTo?.({ top: box.scrollTop + el.getBoundingClientRect().top - box.getBoundingClientRect().top - 12, behavior });
	}

	export function focus() {
		engaged = true;
		document.getElementById('ripple-ask')?.focus();
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

	/** The spec root is itself a card widget, so our frame would draw a card in a card. */
	const bare = (c: Card) =>
		c.spec ? (c.spec.ui as { type?: unknown } | undefined)?.type === 'card' : /"ui"\s*:\s*\{\s*"type"\s*:\s*"card"/.test(c.text);

	/** What the polite region says: per turn, never per token. */
	const announce = $derived.by(() => {
		const last = session.turns.at(-1);
		if (!last || last.role !== 'assistant' || seeded.has(last.id)) return '';
		if (!last.pending) return 'Done';
		return last.parts.some((p) => p.kind === 'card' && p.card.status === 'streaming') ? 'Building' : '';
	});

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

	const chipStatus = (c: Card) =>
		c.status === 'streaming'
			? `Building · ${bytes(c.text)}`
			: c.status === 'final'
				? `Ready · ${bytes(c.text)}`
				: c.reason === 'truncated'
					? 'Left out: cut off'
					: 'Left out: failed its checks';
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

{#snippet chip(card: Card, pick: Chips)}
	{@const viewing = pick.viewing === card.id}
	<button type="button" class="ui-chip" data-status={card.status} aria-pressed={viewing} onclick={() => pick.pick(card)}>
		<svg class="ui-chip-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
			<rect x="2" y="2.5" width="12" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.3" />
			<path d="M2 6h12M6 6v7.5" stroke="currentColor" stroke-width="1.3" />
		</svg>
		<span class="ui-chip-text">
			<span class="ui-chip-title">{card.title || 'Card'}</span>
			<span class="ui-chip-meta">{chipStatus(card)}</span>
		</span>
		{#if viewing}<span class="ui-chip-viewing">Viewing</span>{/if}
	</button>
{/snippet}

{#snippet cardView(card: Card, pid: string)}
	{#if card.status === 'rejected'}
		<p class="card-note">{rejectedNote(card)}</p>
	{:else}
		{@const open = peek[card.id] ?? false}
		<figure class="card" data-status={card.status} data-bare={bare(card) || undefined}>
			<figcaption class="card-head">
				<span class="card-title">{card.title || 'Card'}</span>
				{#if card.status === 'streaming'}<span class="building" aria-hidden="true">Building</span>{/if}
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
					<div class="peek-inner" data-full={peekFull[card.id] || undefined}>
						<p class="peek-meta">
							<span>JSON spec</span><span class="bytes">{bytes(card.text)}</span>
							{#if onspec}
								<button type="button" class="expand" aria-haspopup="dialog" onclick={() => onspec(card)}>Open</button>
							{:else}
								<button
									type="button"
									class="expand"
									aria-expanded={peekFull[card.id] ?? false}
									aria-controls="{pid}-code"
									onclick={() => (peekFull[card.id] = !peekFull[card.id])}>{peekFull[card.id] ? 'Collapse' : 'Expand'}</button
								>
							{/if}
						</p>
						<pre id="{pid}-code" {@attach follow(card)}><JsonLines text={card.text} /></pre>
					</div>
				</div>
			</div>
			{#if card.sent}<p class="sent" role="status">The card sent <code>{card.sent}</code> to this page.</p>{/if}
		</figure>
	{/if}
{/snippet}

<div class="chat" data-engaged={engaged || undefined}>
	<p class="sr-only" aria-live="polite">{announce}</p>
	{#if session.turns.length}
		<ol class="log" bind:this={log} role="log" aria-label="Conversation" aria-busy={session.busy}>
			{#each session.turns as turn, t (turn.id)}
				<li class="turn" data-role={turn.role} data-seeded={seeded.has(turn.id) || undefined}>
					{#if turn.role === 'user'}
						<p class="ask">{turn.parts[0]?.kind === 'text' ? turn.parts[0].text : ''}</p>
					{:else}
						{#each turn.parts as part, i (part.kind === 'card' ? part.card.id : `t${i}`)}
							{#if part.kind === 'text'}
								{@render prose(part.text, turn.pending && i === turn.parts.length - 1)}
							{:else if chips}
								{@render chip(part.card, chips)}
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
		onfocusin={() => (engaged = true)}
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
	/* The spec's root is a card widget: it is the surface, ours steps back. */
	.card[data-bare] {
		border: 0;
		border-radius: 0;
		background: none;
		box-shadow: none;
	}
	.card[data-bare] .card-head {
		padding-left: 0;
		border-bottom: 0;
	}
	.card[data-bare] .card-ui {
		padding: 2px 0 0;
	}
	.card[data-bare] .peek-inner {
		margin-top: 12px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		overflow: hidden;
	}
	.card-head {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 2px 2px 2px 16px;
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
		min-height: 44px;
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
	/* JsonLines soft wraps with a hanging indent, so a deep line stays in the
	   pane: no sideways scroll to read a 1900px line in a 340px pane. */
	.peek pre {
		margin: 0;
		padding: 0 16px 14px;
		/* 8 lines until Expand (under 1024px). */
		max-height: calc(8 * 1.55em);
		overflow: hidden;
		font-family: var(--font-mono);
		font-size: 12.5px;
		line-height: 1.55;
		color: var(--code-ink);
	}
	.peek-inner[data-full] pre {
		max-height: 60vh;
		overflow: auto;
	}
	.expand {
		margin-left: auto;
		min-height: 44px;
		margin-block: -12px;
		padding: 0 4px;
		border: 0;
		background: transparent;
		color: var(--primary-ink);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.expand:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: -4px;
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
		.peek pre,
		.peek-inner[data-full] pre {
			flex: 1;
			max-height: none;
			overflow: auto;
		}
		.expand {
			display: none;
		}
		.card[data-bare] .peek-inner {
			margin: 2px 0 0 12px;
		}
	}

	/* The playground's card chip: a quiet row, the accent only on the one being viewed. */
	.ui-chip {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		max-width: 360px;
		min-height: 56px;
		padding: 8px 12px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		background: var(--site-ground);
		color: var(--site-ink);
		font: inherit;
		text-align: left;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}
	.ui-chip:hover {
		background: var(--site-hover);
	}
	.ui-chip[aria-pressed='true'] {
		border-color: var(--primary);
	}
	.ui-chip:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	.ui-chip-icon {
		flex: none;
		color: var(--site-soft);
	}
	.ui-chip[aria-pressed='true'] .ui-chip-icon {
		color: var(--primary-ink);
	}
	.ui-chip-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}
	.ui-chip-title {
		font-size: 14px;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.ui-chip-meta {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 12.5px;
		color: var(--site-soft);
		font-variant-numeric: tabular-nums;
	}
	.ui-chip[data-status='streaming'] .ui-chip-meta::before {
		content: '';
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--primary);
		animation: pulse 1.4s ease-in-out infinite;
	}
	.ui-chip-viewing {
		flex: none;
		font-size: 12px;
		font-weight: 600;
		color: var(--primary-ink);
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
		min-height: 44px;
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

	/* In the flow until the visitor engages, then sticky above the safe area. */
	.composer {
		position: relative;
		z-index: var(--z-sticky);
		display: flex;
		align-items: flex-end;
		gap: 10px;
		padding: 8px 8px 8px 16px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-card);
		background: var(--site-ground);
	}
	.chat[data-engaged] .composer {
		position: sticky;
		bottom: calc(12px + env(safe-area-inset-bottom, 0px));
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
		min-height: 44px;
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
		.chat[data-engaged] .log {
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
		.ui-chip-meta::before,
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
