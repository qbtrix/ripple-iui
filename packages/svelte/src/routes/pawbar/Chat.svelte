<!--
  @file routes/pawbar/Chat.svelte
  @description The landing's chat: the conversation log, a composer that stays
    in reach while a long card is read, and the suggestion chips. Assistant text
    renders as markdown-lite (paragraphs, **bold**, `code`) built from Svelte
    nodes; model text never goes through {@html}. A card renders through
    <Ripple streaming> while it arrives and swaps to <Ripple spec> on final (a
    remount, so the validated spec is what the visitor keeps using). Host
    events go to session.hostEvent, which ignores them until the card is final.
    A notice that offers a replay gets a button that plays the closest
    recorded answer into the same turn (session.replayRecorded).
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { Ripple } from '$lib/index.js';
	import type { Card, ChatSession } from './session.svelte.js';

	interface Suggestion {
		id: string;
		title: string;
		prompt: string;
	}

	let { session, suggestions = [], note = '' }: { session: ChatSession; suggestions?: Suggestion[]; note?: string } = $props();

	let draft = $state('');
	let log = $state<HTMLOListElement>();

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
				<Ripple spec={card.spec} onEvent={(e) => session.hostEvent(card, e)} />
			{:else}
				<span class="building" aria-live="polite">Building</span>
				<Ripple streaming={card.store} skeleton="card" onEvent={(e) => session.hostEvent(card, e)} />
			{/if}
			{#if card.sent}<p class="sent" role="status">The card sent <code>{card.sent}</code> to this page.</p>{/if}
		</div>
	{/if}
{/snippet}

<div class="chat">
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
								{#if turn.notice.link}<a href={turn.notice.link.href}>{turn.notice.link.label}</a>{/if}
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
		background: color-mix(in oklch, var(--background) 82%, transparent);
		min-width: 0;
		/* A card can be wider than a phone: it scrolls inside itself, never clips. */
		overflow-x: auto;
		transition: border-color 0.4s;
	}
	.card[data-status='streaming'] {
		border-color: color-mix(in oklch, var(--primary) 55%, transparent);
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
	.notice {
		margin: 0;
		padding: 10px 14px;
		border-radius: 10px;
		font-size: 14px;
		line-height: 1.5;
		background: color-mix(in oklch, var(--site-ink) 6%, transparent);
		color: var(--site-ink);
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
	.chips {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.chip {
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
