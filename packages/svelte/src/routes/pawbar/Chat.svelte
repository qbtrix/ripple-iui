<!--
  @file routes/pawbar/Chat.svelte
  @description The landing's chat: the conversation log, a composer that stays
    in reach while a long card is read, and the suggestion chips in labelled
    groups (wrapping rows; one sideways-scrolling row per group on a phone). A chip runs
    here (session.send); text the visitor types goes to Paw OS
    (session.handoff, opened from the send gesture) unless `typedLocal` keeps
    it on the Paw Bar (mock and dev only); the hint under the composer says so.
    No frame: the thread sits on the page ground and only the composer and the
    rendered cards are surfaces. The look follows Paw OS (paw-enterprise):
    the composer is ChatPill's liquid-glass pill (autosizing textarea, a round
    send that turns into a round stop while a turn streams, a 3px ring on
    focus), the visitor's message a right-aligned blue-tint bubble, and the
    assistant has no bubble. Cards sit on --site-card, a darker shade of the
    warm ground, with a hairline and no shadow. While a turn waits for its
    first token it shows PE's typing dots and the thinking-indicator's
    shimmering label, rotating; a card that is streaming shows shimmer bars
    until its first widget draws and a spinner status line under it. Assistant text renders as markdown-lite
    (paragraphs, **bold**, `code`) built from Svelte nodes; model text never
    goes through {@html}. Text never shows a card's raw spec: hideSpecText
    drops it (a small "Card hidden." note when the turn has no card to show). A card renders through <Ripple streaming> while it
    arrives and swaps to <Ripple spec> on final (a remount, so the validated
    spec is what the visitor keeps using). Host events go to session.hostEvent,
    which ignores them until the card is final; a checkout's progress or
    failure shows as the card's note, an opened one as a PayCard under the card
    (keyed by session, so a retry starts fresh; a second checkout while it is
    open scrolls it into view), and a confirmed booking as a BookingReceipt
    under the card. An order resumed from sessionStorage (session.resumed)
    shows its PayCard above the log. A finished flow card hands its result to
    session.flowComplete; it and a card's `ask` arrive as the visitor's next
    message, and each new visitor message scrolls into view, however it was
    sent. A notice that offers a replay gets a button that plays the closest
    recorded answer into the same turn (session.replayRecorded).
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
    prerender and hydration. Reduced motion lives in CSS, plus the label
    rotation, which stays on "Thinking".
-->
<script lang="ts">
	import { tick, untrack } from 'svelte';
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
		open
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

	async function ask(text: string) {
		if (session.busy || !text.trim()) return;
		engaged = true;
		await session.send(text);
	}

	/** The composer: Paw OS opens synchronously in this gesture, or the popup is blocked. */
	function submit() {
		const text = draft;
		if (session.busy || !text.trim()) return;
		engaged = true;
		draft = '';
		if (typedLocal) void session.send(text);
		else session.handoff(text, pawosUrl, open);
	}

	// The newest visitor message scrolls to the top: typed, a chip, or sent by a card.
	let shownAsk = 0;
	$effect(() => {
		const i = session.turns.findLastIndex((t) => t.role === 'user');
		const id = session.turns[i]?.id;
		if (!id || id === shownAsk) return;
		shownAsk = id;
		void tick().then(() =>
			log?.children[i]?.scrollIntoView?.({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
		);
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

	/** Scrolls the pay card into view and focuses its first control each time `nudge` grows. */
	function reveal(node: HTMLElement, nudge: number) {
		return {
			update(next: number) {
				if (next <= nudge) return;
				nudge = next;
				node.scrollIntoView?.({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
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

<div class="chat" data-engaged={engaged || undefined}>
	<p class="sr-only" aria-live="polite">{announce}</p>
	{#if session.resumed && session.store}
		{@const pay = session.resumed}
		<section class="resumed" aria-label="Your order">
			<p class="say">Your order from before:</p>
			<PayCard {pay} storeUrl={session.store.storeUrl} fetch={session.store.fetch} onphase={(p) => session.notePhase(null, pay, p)} />
		</section>
	{/if}
	{#if session.turns.length}
		<ol class="log" bind:this={log} role="log" aria-label="Conversation" aria-busy={session.busy}>
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

	<form
		class="composer"
		data-multiline={multiline || undefined}
		onfocusin={() => (engaged = true)}
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
			placeholder={typedLocal ? 'Ask for a tool, like a tip splitter' : 'Type your own request to continue in Paw OS'}
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
	{#if !typedLocal}<p class="hint" id="ripple-ask-hint">Try a suggestion here, or type your own and continue in Paw OS.</p>{/if}

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
	{#if note}<p class="chat-note">{note}</p>{/if}
</div>

<style>
	.chat {
		--ease-pill: cubic-bezier(0.16, 1, 0.3, 1);
		display: flex;
		flex-direction: column;
		gap: 14px;
		font-size: 15px;
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
	.turn {
		scroll-margin-top: calc(var(--site-topbar) + 24px);
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

	/* PE's ChatPill: a liquid-glass pill, in the flow until the visitor
	   engages, then sticky above the safe area. */
	.composer {
		position: relative;
		z-index: var(--z-sticky);
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: min(720px, 100%);
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
	.chat[data-engaged] .composer {
		position: sticky;
		bottom: calc(12px + env(safe-area-inset-bottom, 0px));
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
		margin: -6px 0 0;
		padding: 0 4px;
		font-size: 13px;
		color: var(--site-soft);
	}

	.chip-groups {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.chip-group {
		display: flex;
		align-items: baseline;
		gap: 10px;
		min-width: 0;
	}
	.chip-label {
		flex: none;
		width: 44px;
		font-family: var(--font-mono);
		font-size: 11.5px;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--site-soft);
	}
	.chips {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		min-width: 0;
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
	/* Phones: each group is one row that scrolls sideways, snapping per chip
	   and faded at the edge. */
	@media (max-width: 639px) {
		.chip-group {
			align-items: center;
		}
		.chips {
			flex-wrap: nowrap;
			overflow-x: auto;
			scroll-snap-type: x proximity;
			scroll-padding-inline: 4px;
			scrollbar-width: none;
			/* Room for the focus ring, which overflow would otherwise clip. */
			padding: 4px 24px 4px 4px;
			margin: -4px;
			mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent);
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
