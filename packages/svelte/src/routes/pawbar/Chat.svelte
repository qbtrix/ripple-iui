<!--
  @file routes/pawbar/Chat.svelte
  @description The landing's chat: the conversation log, a composer that stays
    in reach while a long card is read, and the suggestion chips in labelled
    groups (wrapping rows; one sideways-scrolling row per group on a phone). A chip runs
    here (session.send); text the visitor types goes to Paw OS
    (session.handoff, opened from the send gesture) unless `typedLocal` keeps
    it on the Paw Bar (mock and dev only); the hint under the composer says so. Assistant text
    renders as markdown-lite (paragraphs, **bold**, `code`) built from Svelte
    nodes; model text never goes through {@html}. A card renders through
    <Ripple streaming> while it arrives and swaps to <Ripple spec> on final (a
    remount, so the validated spec is what the visitor keeps using). Host
    events go to session.hostEvent, which ignores them until the card is final;
    a checkout's progress or failure shows as the card's note, an opened one as
    a PayCard under the card (keyed by session, so a retry starts fresh; a
    second checkout while it is open scrolls it into view), and a confirmed
    booking as a BookingReceipt under the card. An order resumed from
    sessionStorage (session.resumed) shows its PayCard above the log. A finished flow card hands its
    result to session.flowComplete; it and a card's `ask` arrive as the visitor's
    next message, and each new visitor message scrolls into view, however it was
    sent. A notice that offers a replay gets a button that plays the closest
    recorded answer into the same turn (session.replayRecorded).
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { Ripple } from '$lib/index.js';
	import BookingReceipt from './BookingReceipt.svelte';
	import PayCard from './PayCard.svelte';
	import { PAWOS_URL, type Card, type ChatSession } from './session.svelte.js';

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
	let log = $state<HTMLOListElement>();

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

{#snippet prose(text: string)}
	{#each paragraphs(text) as para, i (i)}
		<p class="say">
			{#each inline(para) as tok, j (j)}{#if tok.kind === 'b'}<strong>{tok.v}</strong>{:else if tok.kind === 'c'}<code>{tok.v}</code>{:else}{tok.v}{/if}{/each}
		</p>
	{/each}
{/snippet}

{#snippet cardView(card: Card)}
	{#if card.status === 'rejected'}
		<p class="card-note">{rejectedNote(card)}</p>
	{:else}
		<div class="card" data-status={card.status}>
			{#if card.status === 'final' && card.spec}
				<Ripple spec={card.spec} onEvent={(e) => session.hostEvent(card, e)} onComplete={(r) => session.flowComplete(card, r)} />
			{:else}
				<span class="building" aria-live="polite">Building</span>
				<Ripple streaming={card.store} skeleton="card" onEvent={(e) => session.hostEvent(card, e)} onComplete={(r) => session.flowComplete(card, r)} />
			{/if}
			{#if card.sent}<p class="sent" role="status">The card sent <code>{card.sent}</code> to this page.</p>{/if}
			{#if card.note}<p class="host-note" data-kind={card.note.kind} role="status">{card.note.text}</p>{/if}
		</div>
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
	{#if session.resumed && session.store}
		{@const pay = session.resumed}
		<section class="resumed" aria-label="Your order">
			<p class="say">Your order from before:</p>
			<PayCard {pay} storeUrl={session.store.storeUrl} fetch={session.store.fetch} onphase={(p) => session.notePhase(null, pay, p)} />
		</section>
	{/if}
	{#if session.turns.length}
		<ol class="log" bind:this={log} aria-label="Conversation">
			{#each session.turns as turn (turn.id)}
				<li class="turn" data-role={turn.role}>
					{#if turn.role === 'user'}
						<p class="ask">{turn.parts[0]?.kind === 'text' ? turn.parts[0].text : ''}</p>
					{:else}
						{#each turn.parts as part, i (part.kind === 'card' ? part.card.id : `t${i}`)}
							{#if part.kind === 'text'}{@render prose(part.text)}{:else}{@render cardView(part.card)}{/if}
						{/each}
						{#if turn.pending && !turn.parts.length}<p class="thinking">Thinking</p>{/if}
						{#if turn.notice}
							<p class="notice" data-kind={turn.notice.kind} role="status">
								{turn.notice.text}
								{#if turn.notice.link && turn.notice.kind === 'handoff'}
									<a class:prominent={turn.notice.link.prominent} href={turn.notice.link.href} target="_blank" rel="noopener">{turn.notice.link.label}</a>
								{:else if turn.notice.link}<a href={turn.notice.link.href}>{turn.notice.link.label}</a>{/if}
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
		onsubmit={(e) => {
			e.preventDefault();
			submit();
		}}
	>
		<label class="sr-only" for="ripple-ask">{typedLocal ? 'Describe the tool you want' : 'Type a request to continue in Paw OS'}</label>
		<textarea
			id="ripple-ask"
			rows="2"
			maxlength="2000"
			aria-describedby={typedLocal ? undefined : 'ripple-ask-hint'}
			placeholder={typedLocal ? 'Ask for a tool, like a tip splitter' : 'Type your own request to continue in Paw OS'}
			bind:value={draft}
			onkeydown={onKey}
		></textarea>
		{#if session.busy}
			<button type="button" class="send stop" onclick={() => session.stop()}>Stop</button>
		{:else}
			<button type="submit" class="send" disabled={!draft.trim()}>Send</button>
		{/if}
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
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 18px;
	}
	.turn {
		scroll-margin-top: 84px;
		animation: rise 0.32s cubic-bezier(0.25, 1, 0.5, 1);
	}
	.turn[data-role='user'] {
		display: flex;
		justify-content: flex-end;
	}
	.ask {
		margin: 0;
		max-width: min(560px, 88%);
		padding: 10px 14px;
		border-radius: 14px 14px 4px 14px;
		background: var(--primary);
		color: var(--primary-foreground);
		line-height: 1.5;
		overflow-wrap: anywhere;
		white-space: pre-line;
	}
	.turn[data-role='assistant'] {
		display: flex;
		flex-direction: column;
		gap: 12px;
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
		background: color-mix(in oklch, var(--site-ink) 9%, transparent);
	}
	.thinking,
	.building {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--site-soft);
	}
	.thinking {
		margin: 0;
	}
	.thinking::before,
	.building::before {
		content: '';
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--primary);
		box-shadow: 0 0 0 0 var(--glow);
		animation: pulse 1.4s ease-out infinite;
	}
	.card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 14px;
		border: 1px solid var(--site-line);
		border-radius: var(--radius-paw);
		background: var(--site-panel, color-mix(in oklch, var(--background) 82%, transparent));
		min-width: 0;
		/* A card can be wider than a phone: it scrolls inside itself, never clips. */
		overflow-x: auto;
		transition: border-color 0.4s;
	}
	.card[data-status='streaming'] {
		border-color: color-mix(in oklch, var(--primary) 55%, transparent);
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
		font-size: 13px;
		color: var(--site-soft);
	}
	.host-note {
		margin: 0;
		font-size: 14px;
		color: var(--site-ink);
	}
	.host-note[data-kind='error'] {
		padding: 8px 12px;
		border-radius: 10px;
		background: color-mix(in oklch, var(--paw-crimson) 14%, transparent);
	}
	.notice {
		margin: 0;
		padding: 10px 14px;
		border-radius: 10px;
		font-size: 14px;
		line-height: 1.5;
		background: color-mix(in oklch, var(--site-ink) 6%, transparent);
		color: var(--site-ink);
	}
	.notice[data-kind='handoff'] {
		border: 1px solid color-mix(in oklch, var(--primary) 35%, transparent);
		background: var(--site-panel, var(--card));
	}
	.notice a.prominent {
		display: block;
		width: fit-content;
		margin: 10px 0 0;
		padding: 7px 14px;
		border-radius: 9px;
		background: var(--primary);
		color: var(--primary-foreground);
		text-decoration: none;
	}
	.notice[data-kind='limit'] {
		background: color-mix(in oklch, var(--paw-crimson) 14%, transparent);
	}
	.notice a {
		color: var(--primary-ink);
		font-weight: 600;
		margin-left: 4px;
	}
	.replay {
		display: block;
		margin-top: 10px;
		padding: 7px 13px;
		border: 1px solid color-mix(in oklch, var(--primary) 55%, transparent);
		border-radius: 999px;
		background: color-mix(in oklch, var(--primary) 12%, transparent);
		color: var(--site-ink);
		font: inherit;
		font-size: 13.5px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s;
	}
	.replay:hover:not(:disabled) {
		background: color-mix(in oklch, var(--primary) 22%, transparent);
	}
	.replay:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.composer {
		position: sticky;
		bottom: 12px;
		z-index: 10;
		display: flex;
		align-items: flex-end;
		gap: 10px;
		padding: 10px 10px 10px 16px;
		border: 1px solid var(--glass-line);
		border-radius: var(--radius-paw);
		background: var(--glass);
		backdrop-filter: blur(12px) saturate(1.4);
		-webkit-backdrop-filter: blur(12px) saturate(1.4);
		box-shadow: 0 18px 50px -24px rgb(0 0 0 / 0.5);
		transition: border-color 0.2s;
	}
	.composer:focus-within {
		border-color: color-mix(in oklch, var(--primary) 70%, transparent);
	}
	textarea {
		flex: 1;
		min-width: 0;
		resize: none;
		border: 0;
		outline: 0;
		padding: 6px 0;
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
		height: 38px;
		padding: 0 18px;
		border: 0;
		border-radius: 9px;
		background: var(--primary);
		color: var(--primary-foreground);
		font: inherit;
		font-weight: 600;
		font-size: 14px;
		cursor: pointer;
		transition:
			opacity 0.15s,
			transform 0.15s;
	}
	.send:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.send:not(:disabled):active {
		transform: scale(0.97);
	}
	.send.stop {
		background: color-mix(in oklch, var(--site-ink) 14%, transparent);
		color: var(--site-ink);
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
		white-space: nowrap;
		padding: 7px 13px;
		border: 1px solid var(--site-line);
		border-radius: 999px;
		background: color-mix(in oklch, var(--site-ground) 60%, transparent);
		color: var(--site-ink);
		font: inherit;
		font-size: 13.5px;
		cursor: pointer;
		transition:
			border-color 0.15s,
			background 0.15s;
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
		border-color: color-mix(in oklch, var(--primary) 60%, transparent);
		background: color-mix(in oklch, var(--primary) 10%, transparent);
	}
	.chip:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.send:focus-visible,
	.chip:focus-visible,
	.replay:focus-visible,
	.notice a:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 2px;
	}
	/* On a phone each group is one row that scrolls sideways, faded at the edge. */
	@media (max-width: 560px) {
		.chip-group {
			align-items: center;
		}
		.chips {
			flex-wrap: nowrap;
			overflow-x: auto;
			scrollbar-width: none;
			padding: 2px 24px 2px 2px;
			mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent);
		}
		.chips::-webkit-scrollbar {
			display: none;
		}
		.chips li {
			flex: none;
		}
	}
	@media (max-width: 420px) {
		.card {
			padding: 8px;
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
		70% {
			box-shadow: 0 0 0 7px transparent;
		}
		100% {
			box-shadow: 0 0 0 0 transparent;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.turn,
		.thinking::before,
		.building::before {
			animation: none;
		}
	}
</style>
