<!--
  @file routes/pawbar/Chat.svelte
  @description The landing's chat: the conversation log, a composer that stays
    in reach while a long card is read, and the suggestion chips in labelled
    groups (one sideways-scrolling row with inline group labels). A chip runs
    here (session.send); text the visitor types goes to Paw OS
    (session.handoff, opened from the send gesture) unless `typedLocal` keeps
    it on the Paw Bar (mock and dev only); the hint under the composer says so.
    The look follows Paw OS (paw-enterprise): no frame, the composer is
    ChatPill's liquid-glass pill (autosizing, a round send that turns into a
    stop while a turn streams), the visitor's message a blue-tint bubble, the
    assistant bubble-less, cards on --site-card with a hairline. A waiting turn
    shows typing dots and a rotating shimmer label; a streaming card shows
    shimmer bars, then a spinner status line.
    Assistant text is markdown-lite (paragraphs, **bold**, `code`) built from
    Svelte nodes, never {@html}, and never a card's raw spec (hideSpecText;
    "Card hidden." when no card shows). A card renders through <Ripple
    streaming> while it arrives and swaps to <Ripple spec> on final (a remount, so the validated
    spec is what the visitor keeps using). Host events go to session.hostEvent,
    which ignores them until the card is final; a checkout's progress or
    failure shows as the card's note, an opened one as a PayCard under the card
    (keyed by session, so a retry starts fresh; a second checkout while it is
    open scrolls it into view inside the chat), and a confirmed booking as a
    BookingReceipt under the card. An order resumed from sessionStorage
    (session.resumed) shows its PayCard above the log. A finished flow card
    hands its result to session.flowComplete; it and a card's `ask` arrive as
    the visitor's next message. A notice that offers a replay gets a button
    that plays the closest recorded answer into the same turn
    (session.replayRecorded).
    Each card has a spec peek (its JSON, pretty-printed as it streams, soft
    wrapped; under 1024px 8 lines until Expand), closed except on the first
    card the visitor triggers per browser session. Turns already there at
    mount (the prerendered exchange) neither animate in nor open a peek. A
    card whose spec root is a `card` widget gets a bare frame.
    Scrolling: the log (with the optional `top` snippet above it, the
    landing's hero) is the chat's own scroll container; the chat never
    scrolls the page (no scrollIntoView anywhere). It follows new content only
    while the visitor is at its bottom; a visitor's own message (chip, typed
    or sent by a card) always jumps there; scrolled up, growth while a turn
    streams shows a "New" pill instead. At mount it stays at its top. The
    container keeps the default overscroll, so a touch scroll that hits its
    bottom carries on into the page. Below it the dock: chips, the composer
    with the optional `more` snippet to its right, and a foot row with the
    optional `foot` snippet then the hint (hidden when the row is narrow; it
    stays in the DOM as the textarea's description). The log is role="log"
    and aria-busy while a turn streams; one polite region says "Building"
    and "Done" per turn instead of reading tokens.
    DOM ids are positional, never Card.id: that counter can differ between the
    prerender and hydration. Reduced motion lives in CSS, plus the label
    rotation, which stays on "Thinking".
-->
<script lang="ts">
	import { tick, untrack, type Snippet } from 'svelte';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import X from '@lucide/svelte/icons/x';
	import { Ripple } from '$lib/index.js';
	import { prettyPrefix } from '$lib/site/prettyPrefix.js';
	import JsonLines from '$lib/site/JsonLines.svelte';
	import BookingReceipt from './BookingReceipt.svelte';
	import PayCard from './PayCard.svelte';
	import { PAWOS_URL, type Card, type ChatSession, type Notice } from './session.svelte.js';
	import { hideSpecText } from './sse.js';

	interface Suggestion {
		id: string;
		title: string;
		prompt: string;
		/** The answer walks the visitor through steps: the chip says so. */
		steps?: boolean;
		/** The labelled row the chip sits in; chips with none share one unlabelled row. */
		group?: string;
	}

	let {
		session,
		suggestions = [],
		note = '',
		pawosUrl = PAWOS_URL,
		typedLocal = false,
		open,
		top,
		more,
		foot
	}: {
		session: ChatSession;
		suggestions?: Suggestion[];
		note?: string;
		/** Where typed text continues. */
		pawosUrl?: string;
		/** Typed text goes to the Paw Bar like a chip (mock and dev only). */
		typedLocal?: boolean;
		/** window.open stand-in for tests. */
		open?: (url: string) => unknown;
		/** Rendered at the top of the scroll container, above the log (the landing's hero). */
		top?: Snippet;
		/** Rendered to the right of the composer (the landing's "More"). */
		more?: Snippet;
		/** Rendered at the left of the dock's foot row, before the hint (the landing's install strip). */
		foot?: Snippet;
	} = $props();

	// Chip rows in the order their groups first appear.
	const groups = $derived.by(() => {
		const rows = new Map<string, Suggestion[]>();
		for (const s of suggestions) rows.set(s.group ?? '', [...(rows.get(s.group ?? '') ?? []), s]);
		return [...rows];
	});

	let draft = $state('');
	let field = $state<HTMLTextAreaElement>();
	/** The draft wraps past one line: the pill rounds out to 20px. */
	let multiline = $state(false);

	// PE's composer autosizes 38px to 180px, then scrolls.
	$effect(() => {
		void draft;
		if (!field) return;
		field.style.height = 'auto';
		const h = field.scrollHeight;
		field.style.height = `${Math.min(Math.max(h, 38), 180)}px`;
		multiline = h > 44;
	});

	const THINKING = ['Thinking', 'Planning the card', 'Drawing it'];
	let thinkingAt = $state(0);
	const waiting = $derived.by(() => {
		const last = session.turns.at(-1);
		return Boolean(last?.pending && !last.parts.length);
	});
	// The label rotates while a turn waits for its first token; reduced motion keeps "Thinking".
	$effect(() => {
		if (!waiting) return;
		thinkingAt = 0;
		if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
		const timer = setInterval(() => (thinkingAt = (thinkingAt + 1) % THINKING.length), 2400);
		return () => clearInterval(timer);
	});
	let scroller = $state<HTMLDivElement>();
	let inner = $state<HTMLDivElement>();
	/** The visitor is at the scroller's bottom, so new content is followed. */
	let stuck = false;
	/** Content arrived while the visitor was scrolled up: the "New" pill shows. */
	let unseen = $state(false);
	const motion = (): ScrollBehavior => (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');
	const nearBottom = (el: HTMLElement) => el.scrollHeight - el.scrollTop - el.clientHeight < 16;

	/** Scrolls only the chat's own container, never the page. */
	function toBottom(behavior: ScrollBehavior = 'auto') {
		if (!scroller) return;
		stuck = true;
		unseen = false;
		scroller.scrollTo?.({ top: scroller.scrollHeight, behavior });
	}

	// Only a move up lets go: a scroll event can land after content grew past
	// a programmatic jump to the bottom, and that must not count as leaving it.
	let lastTop = 0;
	function onScroll() {
		if (!scroller) return;
		const top = scroller.scrollTop;
		if (nearBottom(scroller)) stuck = true;
		else if (top < lastTop - 1) stuck = false;
		lastTop = top;
		if (stuck) unseen = false;
	}

	// Growth (a turn arriving, a card streaming and drawing) follows only while stuck.
	$effect(() => {
		if (!scroller || !inner || typeof ResizeObserver === 'undefined') return;
		stuck = nearBottom(scroller);
		const ro = new ResizeObserver(() => {
			if (stuck) toBottom();
			else if (session.busy) unseen = true;
		});
		ro.observe(inner);
		return () => ro.disconnect();
	});

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

	async function ask(text: string) {
		if (session.busy || !text.trim()) return;
		await session.send(text);
	}

	/** The composer: Paw OS opens synchronously in this gesture, or the popup is blocked. */
	function submit() {
		const text = draft;
		if (session.busy || !text.trim()) return;
		draft = '';
		if (typedLocal) void session.send(text);
		else session.handoff(text, pawosUrl, open);
	}

	// The visitor's own new message (typed, a chip, or sent by a card) jumps the chat to its bottom.
	let shownAsk = 0;
	$effect(() => {
		const i = session.turns.findLastIndex((t) => t.role === 'user');
		const id = session.turns[i]?.id;
		if (!id || id === shownAsk) return;
		shownAsk = id;
		// A turn already there at mount stays put: the chat opens at its top.
		if (seeded.has(id)) return;
		void tick().then(() => toBottom());
	});

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
			e.preventDefault();
			submit();
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

	/** Scrolls the pay card into view inside the chat and focuses its first control each time `nudge` grows. */
	function reveal(node: HTMLElement, nudge: number) {
		return {
			update(next: number) {
				if (next <= nudge) return;
				nudge = next;
				if (scroller) {
					const r = node.getBoundingClientRect();
					const box = scroller.getBoundingClientRect();
					if (r.top < box.top || r.bottom > box.bottom) scroller.scrollTo?.({ top: scroller.scrollTop + r.top - box.top - 12, behavior: motion() });
				}
				node.querySelector<HTMLElement>('a, button')?.focus({ preventScroll: true });
			}
		};
	}

	/** The cart's store name, when it carries one (the PayCard falls back to its own). */
	const storeName = (cart: unknown) => {
		const v = cart && typeof cart === 'object' ? (cart as { store?: unknown }).store : undefined;
		return typeof v === 'string' && v.trim() ? v.trim().slice(0, 60) : undefined;
	};

	const rejectedNote = (c: Card) =>
		c.reason === 'truncated' || c.reason === 'server:truncated'
			? 'The card was cut off before it finished, so it is left out.'
			: c.reason?.startsWith('server:')
				? 'The model wrote a card that did not come out right, so it is left out. Asking again usually works.'
				: 'The card did not pass this page\'s checks, so it is left out.';
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
		<figure class="card" data-status={card.status} data-bare={bare(card) || undefined}>
			<figcaption class="card-head">
				<span class="card-title">{card.title || 'Card'}</span>
				<span class="tools">
					<button type="button" class="tool" aria-expanded={open} aria-controls={pid} onclick={() => (peek[card.id] = !open)}>Spec</button>
					<button type="button" class="tool" onclick={() => copySpec(card)}>{copied === card.id ? 'Copied' : 'Copy spec'}</button>
				</span>
			</figcaption>
			<div class="card-body" data-open={open}>
				<div class="card-ui">
					{#if card.status === 'final' && card.spec}
						<Ripple spec={card.spec} onEvent={(e) => session.hostEvent(card, e)} onComplete={(r) => session.flowComplete(card, r)} />
					{:else}
						<div class="placeholder" aria-hidden="true"><span></span><span></span><span></span></div>
						<Ripple streaming={card.store} skeleton="none" onEvent={(e) => session.hostEvent(card, e)} onComplete={(r) => session.flowComplete(card, r)} />
					{/if}
				</div>
				<div class="peek" id={pid} inert={!open}>
					<div class="peek-inner" data-full={peekFull[card.id] || undefined}>
						<p class="peek-meta">
							<span>JSON spec</span><span class="bytes">{bytes(card.text)}</span>
							<button
								type="button"
								class="expand"
								aria-expanded={peekFull[card.id] ?? false}
								aria-controls="{pid}-code"
								onclick={() => (peekFull[card.id] = !peekFull[card.id])}>{peekFull[card.id] ? 'Collapse' : 'Expand'}</button
							>
						</p>
						<pre id="{pid}-code" {@attach follow(card)}><JsonLines text={card.text} /></pre>
					</div>
				</div>
			</div>
			{#if card.status === 'streaming'}
				<p class="status-line" aria-hidden="true"><span class="spinner"></span>Building the card…</p>
			{/if}
			{#if card.sent}<p class="sent" role="status">The card sent <code>{card.sent}</code> to this page.</p>{/if}
			{#if card.note}<p class="host-note" data-kind={card.note.kind} role="status">{card.note.text}</p>{/if}
		</figure>
		{#if card.receipt}<BookingReceipt {...card.receipt} />{/if}
		{#if card.pay && session.store}
			{@const pay = card.pay}
			<div class="pay-slot" use:reveal={card.payNudge}>
				{#key pay.sessionId}
					<PayCard
						{pay}
						store={storeName(card.cart)}
						storeUrl={session.store.storeUrl}
						fetch={session.store.fetch}
						onretry={() => session.retryCheckout(card)}
						onphase={(p) => session.notePhase(card, pay, p)}
					/>
				{/key}
			</div>
		{/if}
	{/if}
{/snippet}

<div class="chat">
	<p class="sr-only" aria-live="polite">{announce}</p>
	<div class="scroll-wrap">
		<div class="scroller" bind:this={scroller} onscroll={onScroll}>
			<div class="scroll-inner" bind:this={inner}>
				{@render top?.()}
				{#if session.resumed && session.store}
					{@const pay = session.resumed}
					<section class="resumed" aria-label="Your order">
						<p class="say">Your order from before:</p>
						<PayCard {pay} storeUrl={session.store.storeUrl} fetch={session.store.fetch} onphase={(p) => session.notePhase(null, pay, p)} />
					</section>
				{/if}
				{#if session.turns.length}
					<ol class="log" role="log" aria-label="Conversation" aria-busy={session.busy}>
						{#each session.turns as turn, t (turn.id)}
							<li class="turn" data-role={turn.role} data-seeded={seeded.has(turn.id) || undefined}>
								{#if turn.role === 'user'}
									<p class="ask">{turn.parts[0]?.kind === 'text' ? turn.parts[0].text : ''}</p>
								{:else}
									{#each turn.parts as part, i (part.kind === 'card' ? part.card.id : `t${i}`)}
										{#if part.kind === 'text'}
											{@const caret = turn.pending && i === turn.parts.length - 1}
											{@const shown = hideSpecText(part.text, caret)}
											{@render prose(shown.text, caret)}
											{#if shown.hidden && !turn.parts.some((p) => p.kind === 'card' && p.card.status !== 'rejected')}
												<p class="card-note">Card hidden.</p>
											{/if}
										{:else}
											{@render cardView(part.card, `ripple-spec-${t}-${i}`)}
										{/if}
									{/each}
									{#if turn.pending && !turn.parts.length}
										<p class="thinking">
											<span class="dots" aria-hidden="true"><span></span><span></span><span></span></span>
											<span class="label">
												<span class="sizer" aria-hidden="true">Planning the card</span>
												{#key thinkingAt}<span class="shimmer">{THINKING[thinkingAt]}</span>{/key}
											</span>
										</p>
									{/if}
									{#if turn.notice}
										<p class="notice" data-kind={turn.notice.kind} role="status">
											{@render icon(turn.notice.kind)}
											<span>
												{turn.notice.text}
												{#if turn.notice.link && turn.notice.kind === 'handoff'}
													<a class:prominent={turn.notice.link.prominent} href={turn.notice.link.href} target="_blank" rel="noopener">{turn.notice.link.label}</a>
												{:else if turn.notice.link}<a href={turn.notice.link.href}>{turn.notice.link.label}</a>{/if}
											</span>
											{#if turn.notice.replay}
												<button type="button" class="replay" disabled={session.busy} onclick={() => session.replayRecorded(turn.id)}>
													Play the closest saved answer here
												</button>
											{/if}
										</p>
									{/if}
								{/if}
							</li>
						{/each}
					</ol>
				{/if}
			</div>
		</div>
		{#if unseen}
			<button type="button" class="new-pill" onclick={() => toBottom(motion())}>New <span aria-hidden="true">↓</span></button>
		{/if}
	</div>

	<div class="dock">
		{#if suggestions.length}
			<div class="chip-groups">
				{#each groups as [name, chips] (name)}
					<div class="chip-group">
						{#if name}<span class="chip-label" aria-hidden="true">{name}</span>{/if}
						<ul class="chips" aria-label={name || 'Try one of these'}>
							{#each chips as s (s.id)}
								<li>
									<button type="button" class="chip" disabled={session.busy} title={s.prompt} onclick={() => ask(s.prompt)}>{s.title}{#if s.steps}{' '}<span class="chip-steps">step by step</span>{/if}</button>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</div>
		{/if}
		<div class="composer-row">
			<form
				class="composer"
				data-multiline={multiline || undefined}
				onsubmit={(e) => {
					e.preventDefault();
					submit();
				}}
			>
				<label class="sr-only" for="ripple-ask">{typedLocal ? 'Describe the tool you want' : 'Type a request to continue in Paw OS'}</label>
				<textarea
					id="ripple-ask"
					rows="1"
					maxlength="2000"
					aria-describedby={typedLocal ? undefined : 'ripple-ask-hint'}
					placeholder={typedLocal ? 'Ask for a tool, like a tip splitter' : 'Type a request for Paw OS'}
					bind:value={draft}
					bind:this={field}
					onkeydown={onKey}
				></textarea>
				<div class="controls">
					{#if session.busy}
						<button type="button" class="send stop" aria-label="Stop" title="Stop" onclick={() => session.stop()}><span class="disc"><X size={14} strokeWidth={2.25} aria-hidden="true" /></span></button>
					{:else}
						<button type="submit" class="send" aria-label="Send" title="Send" disabled={!draft.trim()}><span class="disc"><ArrowUp size={15} strokeWidth={2.25} aria-hidden="true" /></span></button>
					{/if}
				</div>
			</form>
			{@render more?.()}
		</div>
		<div class="dock-foot">
			{@render foot?.()}
			{#if !typedLocal}<p class="hint" id="ripple-ask-hint">Typed requests open in Paw OS.</p>{/if}
			{#if note}<p class="chat-note">{note}</p>{/if}
		</div>
	</div>
</div>

<style>
	.chat {
		--ease-pill: cubic-bezier(0.16, 1, 0.3, 1);
		display: flex;
		flex-direction: column;
		min-height: 0;
		font-size: 15px;
	}
	/* The chat's own scroll container. min-height 0 lets it shrink inside a
	   fixed-height parent instead of growing the page. Default overscroll, so
	   a scroll that hits its bottom chains on into the page. */
	.scroll-wrap {
		position: relative;
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
	.scroller {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		scrollbar-width: thin;
	}
	.scroll-inner {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding-bottom: 12px;
	}
	/* Content arrived below while the visitor was scrolled up. */
	.new-pill {
		position: absolute;
		bottom: 10px;
		left: 50%;
		transform: translateX(-50%);
		display: inline-flex;
		align-items: center;
		gap: 4px;
		min-height: 32px;
		padding: 0 14px;
		border: 1px solid var(--site-line);
		border-radius: 999px;
		background: var(--site-panel);
		color: var(--site-ink);
		font: inherit;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
	}
	.new-pill:hover {
		background: var(--site-hover);
	}
	.new-pill:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
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
		gap: 14px;
	}
	.turn:not([data-seeded]) {
		animation: rise 180ms var(--ease-out-quart);
	}
	.turn[data-role='user'] {
		display: flex;
		justify-content: flex-end;
	}
	/* PE's UserMessage: a blue-tint bubble, the corner by the edge tucked in. */
	.ask {
		margin: 0;
		max-width: 85%;
		padding: 10px 16px;
		border-radius: 16px 16px 6px 16px;
		background: color-mix(in oklch, var(--primary) 10%, transparent);
		color: var(--site-ink);
		line-height: 1.5;
		overflow-wrap: anywhere;
		white-space: pre-line;
	}
	.turn[data-role='assistant'] {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	/* PE's AssistantMessage: no bubble, text-sm leading-relaxed. */
	.say {
		margin: 0;
		max-width: 68ch;
		line-height: 1.625;
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
	/* PE's typing dots, then thinking-indicator's shimmering label. */
	.thinking {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		margin: 0;
		padding: 4px 0;
		font-size: 13px;
		font-weight: 500;
		line-height: 1.4;
	}
	.dots {
		display: inline-flex;
		gap: 4px;
	}
	.dots > span {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: color-mix(in oklch, var(--site-ink-base) 35%, transparent);
		animation: dot-bounce 1.2s ease-in-out infinite;
	}
	.dots > span:nth-child(2) {
		animation-delay: 0.15s;
	}
	.dots > span:nth-child(3) {
		animation-delay: 0.3s;
	}
	.label {
		display: inline-grid;
		overflow: hidden;
	}
	.sizer,
	.shimmer {
		grid-area: 1 / 1;
	}
	.sizer {
		visibility: hidden;
	}
	.shimmer {
		color: transparent;
		background: linear-gradient(
			90deg,
			color-mix(in oklch, var(--site-ink-base) 38%, transparent) 0%,
			color-mix(in oklch, var(--site-ink-base) 38%, transparent) 35%,
			color-mix(in oklch, var(--site-ink-base) 88%, transparent) 50%,
			color-mix(in oklch, var(--site-ink-base) 38%, transparent) 65%,
			color-mix(in oklch, var(--site-ink-base) 38%, transparent) 100%
		);
		background-size: 300% 100%;
		background-clip: text;
		-webkit-background-clip: text;
		animation:
			ti-shimmer 1.6s ease-in-out infinite,
			label-in 240ms cubic-bezier(0.33, 1, 0.68, 1);
	}

	/* A streaming card: shimmer bars until its first frame, a status line under it. */
	/* Until the first widget renders: a partial spec can parse yet draw nothing. */
	.card-ui:has(:global(.ripple-root [data-widget])) .placeholder {
		display: none;
	}
	.placeholder {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 4px 0;
	}
	.placeholder > span {
		height: 12px;
		border-radius: 6px;
		background: linear-gradient(
			90deg,
			color-mix(in oklch, var(--site-ink-base) 7%, transparent) 0%,
			color-mix(in oklch, var(--site-ink-base) 15%, transparent) 50%,
			color-mix(in oklch, var(--site-ink-base) 7%, transparent) 100%
		);
		background-size: 200% 100%;
		animation: bar-shimmer 1.5s ease-in-out infinite;
	}
	.placeholder > span:nth-child(1) {
		width: 42%;
	}
	.placeholder > span:nth-child(2) {
		width: 86%;
	}
	.placeholder > span:nth-child(3) {
		width: 64%;
	}
	.status-line {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		padding: 8px 16px 10px;
		border-top: 1px solid var(--site-line);
		font-size: 12px;
		color: var(--site-soft);
	}
	.spinner {
		flex: none;
		width: 14px;
		height: 14px;
		box-sizing: border-box;
		border: 1.75px solid color-mix(in oklch, var(--site-ink-base) 22%, transparent);
		border-top-color: var(--site-soft);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	/* The rendered card: a darker shade of the ground, a hairline, no shadow. */
	.card {
		margin: 0;
		min-width: 0;
		border: 1px solid var(--site-line);
		border-radius: 12px;
		background: var(--site-card, var(--card));
		overflow: hidden;
	}
	/* The spec's root is a card widget: it is the surface, ours steps back. */
	.card[data-bare] {
		border: 0;
		border-radius: 0;
		background: none;
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
	.resumed {
		display: flex;
		flex-direction: column;
		gap: 10px;
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
	.host-note {
		margin: 0;
		padding: 10px 16px;
		border-top: 1px solid var(--site-line);
		font-size: 14px;
		color: var(--site-ink);
	}
	.host-note[data-kind='error'] {
		background: color-mix(in oklch, var(--paw-crimson) 14%, transparent);
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
	.notice[data-kind='handoff'] {
		border-color: color-mix(in oklch, var(--primary) 35%, transparent);
		background: var(--site-panel, var(--card));
	}
	.notice a.prominent {
		display: block;
		width: fit-content;
		margin: 10px 0 0;
		padding: 7px 14px;
		border-radius: var(--radius-control);
		background: var(--primary);
		color: var(--primary-foreground);
		text-decoration: none;
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

	/* The dock: chips, the composer row and the foot row, pinned under the
	   scroll container above the safe area. */
	.dock {
		flex: none;
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 10px 0 calc(8px + env(safe-area-inset-bottom, 0px));
	}
	.composer-row {
		display: flex;
		align-items: flex-end;
		gap: 8px;
	}
	.composer-row > .composer {
		flex: 1;
		min-width: 0;
	}
	/* One line: the foot snippet, then the hint while it fits. */
	.dock-foot {
		container-type: inline-size;
		display: flex;
		flex-wrap: nowrap;
		align-items: center;
		gap: 4px 12px;
		min-height: 28px;
		min-width: 0;
	}
	@container (max-width: 640px) {
		.hint {
			display: none;
		}
	}

	/* PE's ChatPill: a liquid-glass pill. */
	.composer {
		position: relative;
		z-index: var(--z-sticky);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: 100%;
		padding: 6px 8px 8px 14px;
		border: 1px solid var(--composer-line);
		border-radius: 16px;
		background: var(--composer-glass);
		backdrop-filter: blur(8px) saturate(150%);
		-webkit-backdrop-filter: blur(8px) saturate(150%);
		box-shadow: inset 0 1px 0 0 var(--composer-reflex);
		transition: all 250ms var(--ease-pill);
	}
	.composer[data-multiline] {
		border-radius: 20px;
	}
	.composer:focus-within {
		box-shadow:
			inset 0 1px 0 0 var(--composer-reflex),
			0 0 0 3px color-mix(in srgb, var(--primary) 50%, transparent);
	}
	@media (prefers-reduced-transparency: reduce) {
		.composer {
			background: var(--site-panel);
			backdrop-filter: none;
			-webkit-backdrop-filter: none;
		}
	}
	textarea {
		box-sizing: border-box;
		width: 100%;
		min-height: 38px;
		max-height: 180px;
		resize: none;
		border: 0;
		outline: 0;
		padding: 7px 0;
		background: transparent;
		color: color-mix(in oklch, var(--site-ink-base) 88%, transparent);
		caret-color: var(--primary);
		font: inherit;
		/* 16px, or iOS zooms the page on focus. */
		font-size: 16px;
		line-height: 1.5;
		overflow-y: auto;
	}
	textarea::placeholder {
		color: color-mix(in oklch, var(--site-ink-base) 45%, transparent);
	}
	.controls {
		display: flex;
		justify-content: flex-end;
	}
	/* A 28px round disc inside a 44px hit area. */
	.send {
		flex: none;
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		margin: -8px;
		padding: 0;
		border: 0;
		background: none;
		color: #fff;
		cursor: pointer;
	}
	.disc {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		box-sizing: border-box;
		border-radius: 50%;
		background: var(--primary);
		transition: all 250ms var(--ease-pill);
	}
	.send:hover:not(:disabled) .disc {
		background: color-mix(in srgb, var(--primary) 90%, transparent);
	}
	.send:disabled {
		cursor: default;
	}
	.send:disabled .disc {
		background: var(--site-pressed);
		color: var(--site-soft);
	}
	/* Streaming: an outline stop. */
	.send.stop {
		color: var(--site-ink);
	}
	.send.stop .disc {
		border: 1px solid var(--composer-line);
		background: none;
	}
	.send.stop:hover .disc {
		background: var(--site-hover);
	}
	.hint {
		flex: 1;
		min-width: 0;
		margin: 0;
		padding: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 13px;
		color: var(--site-soft);
	}

	/* In the dock every chip sits on ONE row that scrolls sideways at every
	   width, snapping per chip, no scrollbar, faded at both edges. The 24px
	   fades sit just outside the chat column (negative margin, equal padding),
	   so the first chip lines up with the composer. Group labels are small
	   inline dividers (the group and list boxes drop out of layout). */
	.chip-groups {
		display: flex;
		flex-wrap: nowrap;
		align-items: center;
		gap: 8px;
		overflow-x: auto;
		scroll-snap-type: x proximity;
		scroll-padding-inline: 24px;
		scrollbar-width: none;
		margin: -4px -24px;
		padding: 4px 24px;
		mask-image: linear-gradient(to right, transparent, #000 24px, #000 calc(100% - 24px), transparent);
	}
	.chip-groups::-webkit-scrollbar {
		display: none;
	}
	.chip-group,
	.chips {
		display: contents;
	}
	.chip-label {
		flex: none;
		scroll-snap-align: start;
		padding-left: 10px;
		border-left: 1px solid var(--site-line);
		line-height: 20px;
		font-family: var(--font-mono);
		font-size: 10.5px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--site-soft);
	}
	.chips {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.chips li {
		flex: none;
		scroll-snap-align: start;
	}
	.chip-group:first-child .chip-label {
		padding-left: 0;
		border-left: 0;
	}
	.chip-group:not(:first-child) .chip-label {
		margin-left: 4px;
	}
	.chip {
		min-height: 34px;
		padding: 0 12px;
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
	.chip-steps {
		margin-left: 3px;
		padding: 1px 7px;
		border-radius: 999px;
		background: color-mix(in oklch, var(--primary) 14%, transparent);
		color: var(--primary-ink);
		font-size: 11px;
		font-weight: 500;
		letter-spacing: 0.01em;
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
	.chip:focus-visible,
	.tool:focus-visible,
	.replay:focus-visible,
	.notice a:focus-visible {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	.send:focus-visible {
		outline: none;
	}
	.send:focus-visible .disc {
		outline: 2px solid var(--ring);
		outline-offset: 2px;
	}
	/* Touch: the 44px target. */
	@media (pointer: coarse) {
		.chip {
			min-height: 44px;
		}
	}
	@media (max-width: 420px) {
		.card-ui {
			padding: 10px;
		}
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(2px);
		}
	}
	@keyframes dot-bounce {
		0%,
		60%,
		100% {
			transform: translateY(0);
			opacity: 0.35;
		}
		40% {
			transform: translateY(-3px);
			opacity: 0.8;
		}
	}
	@keyframes ti-shimmer {
		0% {
			background-position: 100% 0;
		}
		100% {
			background-position: -100% 0;
		}
	}
	@keyframes label-in {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
	}
	@keyframes bar-shimmer {
		0% {
			background-position: 100% 0;
		}
		100% {
			background-position: -100% 0;
		}
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.turn:not([data-seeded]),
		.dots > span,
		.shimmer,
		.placeholder > span,
		.spinner,
		.caret {
			animation: none;
		}
		.shimmer {
			color: var(--site-soft);
			background: none;
		}
		.composer,
		.disc {
			transition: none;
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
