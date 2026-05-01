<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Ripple } from '$lib/index.js';
  import type { RippleEvent } from '$lib/types.js';

  type ChatMsg = {
    role: 'user' | 'assistant';
    text: string;
    spec?: any;
    pending?: boolean;
  };

  // ── State ──────────────────────────────────────────────────────────

  let messages = $state<ChatMsg[]>([]);
  let inputValue = $state('');
  let busy = $state(false);
  let apiKey = $state('');
  let showKeyDialog = $state(false);
  let usage = $state<{ input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number } | null>(null);
  let scrollEl = $state<HTMLElement | null>(null);
  let specVersion = $state(0);

  onMount(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('rk') : null;
    if (stored) apiKey = stored;
    messages = [
      {
        role: 'assistant',
        text: "Hi! I'm Claude (Opus 4.7). Ask me anything — I'll respond with a real chat reply, and when it makes sense I'll render an interactive UI you can click. Try \"show me some coffee gear\" or \"build me a settings panel\"."
      }
    ];
  });

  function saveKey() {
    if (typeof localStorage !== 'undefined') {
      if (apiKey) localStorage.setItem('rk', apiKey);
      else localStorage.removeItem('rk');
    }
    showKeyDialog = false;
  }

  // ── Send + stream ──────────────────────────────────────────────────

  async function send(text: string) {
    if (!text.trim() || busy) return;
    inputValue = '';
    messages = [...messages, { role: 'user', text }];
    messages = [...messages, { role: 'assistant', text: '', pending: true }];
    busy = true;
    await tick();
    scrollToBottom();

    const history: { role: 'user' | 'assistant'; content: string }[] = messages
      .filter((m) => !m.pending)
      .map((m) => ({
        role: m.role,
        content: m.role === 'assistant' && m.spec
          ? `${m.text}\n<ripple-spec>${JSON.stringify(m.spec)}</ripple-spec>`
          : m.text
      }));

    let buffer = '';
    let extracted = false;

    try {
      const res = await fetch('/showcase/agentic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, apiKey: apiKey || undefined })
      });

      if (!res.ok || !res.body) {
        const err = await res.text();
        throw new Error(`${res.status}: ${err.slice(0, 200)}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let pending = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = pending.indexOf('\n\n')) !== -1) {
          const frame = pending.slice(0, idx);
          pending = pending.slice(idx + 2);
          handleFrame(frame);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      patchLast({ text: `**Error:** ${msg}`, pending: false });
    } finally {
      busy = false;
    }

    function handleFrame(raw: string) {
      const lines = raw.split('\n');
      let event = 'message';
      let data = '';
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) return;
      let parsed: any;
      try { parsed = JSON.parse(data); } catch { return; }

      if (event === 'text') {
        buffer += parsed.delta;

        if (!extracted && buffer.includes('</ripple-spec>')) {
          extracted = true;
          const match = buffer.match(/<ripple-spec>([\s\S]*?)<\/ripple-spec>/);
          if (match && match.index !== undefined) {
            const before = buffer.slice(0, match.index).trim();
            const after = buffer.slice(match.index + match[0].length).trim();
            const text = (before + (after ? '\n' + after : '')).trim();
            try {
              const spec = JSON.parse(match[1].trim());
              patchLast({ text, spec, pending: true });
              specVersion++;
              return;
            } catch {
              // Fall through to plain-text update.
            }
          }
        }

        const visible = stripPartialSpec(buffer);
        patchLast({ text: visible, pending: true });
      } else if (event === 'done') {
        usage = parsed.usage ?? null;
        patchLast({ pending: false });
      } else if (event === 'error') {
        patchLast({ text: `**Error:** ${parsed.message}`, pending: false });
      }
    }
  }

  function stripPartialSpec(raw: string): string {
    const open = raw.indexOf('<ripple-spec>');
    if (open === -1) return raw.trim();
    const close = raw.indexOf('</ripple-spec>', open);
    if (close === -1) return raw.slice(0, open).trim();
    return (raw.slice(0, open) + raw.slice(close + '</ripple-spec>'.length)).trim();
  }

  function patchLast(patch: Partial<ChatMsg>) {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== 'assistant') return;
    messages = [...messages.slice(0, -1), { ...last, ...patch }];
    requestAnimationFrame(scrollToBottom);
  }

  function scrollToBottom() {
    if (!scrollEl) return;
    scrollEl.scrollTop = scrollEl.scrollHeight;
  }

  function handleRippleEvent(event: RippleEvent) {
    if (event.type === 'emit' && event.target === 'chat.send' && typeof event.payload === 'string') {
      send(event.payload);
    }
  }

  function onSubmit(e: Event) {
    e.preventDefault();
    send(inputValue);
  }

  function reset() {
    messages = [{ role: 'assistant', text: 'Cleared. What should we build?' }];
    usage = null;
    specVersion++;
  }

  const samplePrompts = [
    'Show me some coffee gear',
    'Build me a settings panel for notifications',
    "I'm planning a trip to Tokyo — pick a date",
    'Compare the Pro and Team plans'
  ];
</script>

<svelte:head>
  <title>Ripple — Agentic Chat (Claude Opus 4.7)</title>
</svelte:head>

<main class="agentic-shell">
  <header class="agentic-header">
    <div>
      <div class="eyebrow">@ripple-ui/svelte</div>
      <h1>Agentic Chat</h1>
      <p class="muted">
        Real Claude Opus 4.7 with adaptive thinking. Replies stream in; clicks on the rendered UI
        round-trip back as user messages. Same contract as <code>docs/agentic-ui.md</code>.
      </p>
    </div>
    <div class="header-actions">
      {#if usage}
        <div class="usage" title="Token usage from the last turn">
          <span>in {usage.input_tokens ?? 0}</span>
          {#if usage.cache_read_input_tokens}<span>· cache {usage.cache_read_input_tokens}</span>{/if}
          <span>· out {usage.output_tokens ?? 0}</span>
        </div>
      {/if}
      <button type="button" class="ghost" onclick={() => (showKeyDialog = true)}>
        {apiKey ? '🔑 Key set' : '🔑 Set API key'}
      </button>
      <button type="button" class="ghost" onclick={reset}>Reset</button>
    </div>
  </header>

  <section class="thread" bind:this={scrollEl}>
    {#each messages as m, i (i)}
      <article class={m.role === 'user' ? 'msg user' : 'msg assistant'}>
        {#if m.role === 'assistant'}
          <div class="avatar" aria-hidden="true"></div>
        {/if}
        <div class="bubble-stack">
          {#if m.text || m.pending}
            <div class="bubble" class:pending={m.pending && !m.text}>
              {#if m.pending && !m.text}
                <span class="dots"><span></span><span></span><span></span></span>
              {:else}
                {m.text}
              {/if}
            </div>
          {/if}
          {#if m.spec}
            <div class="spec-frame">
              {#key i + ':' + specVersion}
                <Ripple spec={m.spec} state={m.spec.state ?? {}} onEvent={handleRippleEvent} />
              {/key}
            </div>
          {/if}
        </div>
        {#if m.role === 'user'}
          <div class="avatar user" aria-hidden="true"></div>
        {/if}
      </article>
    {/each}

    {#if messages.length <= 1}
      <div class="suggestions">
        {#each samplePrompts as p (p)}
          <button type="button" onclick={() => send(p)} disabled={busy}>{p}</button>
        {/each}
      </div>
    {/if}
  </section>

  <form class="composer" onsubmit={onSubmit}>
    <input
      type="text"
      placeholder={busy ? 'Claude is thinking…' : 'Send a message — try "show me products" or "build a settings page"'}
      bind:value={inputValue}
      disabled={busy}
    />
    <button type="submit" disabled={busy || !inputValue.trim()}>Send</button>
  </form>

  {#if showKeyDialog}
    <div
      class="key-overlay"
      role="presentation"
      onclick={() => (showKeyDialog = false)}
    >
      <div
        class="key-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="key-dialog-title"
        tabindex="-1"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
      >
        <h2 id="key-dialog-title">Anthropic API key</h2>
        <p class="muted">
          Used only by your browser to call <code>/showcase/agentic</code>. Stored in
          <code>localStorage</code>; never leaves your machine except to the SvelteKit endpoint
          (which forwards directly to Anthropic). If <code>ANTHROPIC_API_KEY</code> is set in
          <code>.env</code>, you can leave this empty.
        </p>
        <input
          type="password"
          placeholder="sk-ant-..."
          bind:value={apiKey}
          autocomplete="off"
        />
        <div class="actions">
          <button type="button" class="ghost" onclick={() => (showKeyDialog = false)}>Cancel</button>
          <button type="button" onclick={saveKey}>Save</button>
        </div>
      </div>
    </div>
  {/if}
</main>

<style>
  .agentic-shell {
    display: grid;
    grid-template-rows: auto 1fr auto;
    gap: 0;
    height: calc(100vh - 60px);
    max-width: 980px;
    margin: 0 auto;
    padding: 1.25rem 1.25rem 0;
  }

  .agentic-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  :global(html:not(.dark)) .agentic-header { border-bottom-color: rgba(0, 0, 0, 0.08); }
  .agentic-header h1 {
    font-size: 1.4rem;
    font-weight: 700;
    margin: 0.25rem 0 0.35rem;
  }
  .agentic-header p {
    font-size: 0.85rem;
    line-height: 1.4;
    margin: 0;
    max-width: 56ch;
  }
  .eyebrow {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: hsl(var(--muted-foreground));
    font-weight: 600;
  }
  .muted { color: hsl(var(--muted-foreground)); }

  .header-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .usage {
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    font-size: 0.7rem;
    color: hsl(var(--muted-foreground));
    background: hsl(var(--muted) / 0.5);
    padding: 0.25rem 0.55rem;
    border-radius: 6px;
    font-variant-numeric: tabular-nums;
  }

  button {
    appearance: none;
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    border: none;
    border-radius: 8px;
    padding: 0.45rem 0.9rem;
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s ease, opacity 0.15s ease;
  }
  button:hover:not(:disabled) { background: hsl(var(--primary) / 0.9); }
  button:disabled { opacity: 0.45; cursor: not-allowed; }
  button.ghost {
    background: transparent;
    color: hsl(var(--foreground));
    border: 1px solid hsl(var(--border));
  }
  button.ghost:hover:not(:disabled) { background: hsl(var(--muted) / 0.6); }

  .thread {
    overflow-y: auto;
    padding: 1.25rem 0.25rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    scroll-behavior: smooth;
  }

  .msg {
    display: flex;
    gap: 0.6rem;
    align-items: flex-start;
    max-width: 100%;
  }
  .msg.user {
    flex-direction: row-reverse;
    align-self: flex-end;
    max-width: 80%;
  }
  .msg.assistant { align-self: flex-start; max-width: 100%; width: 100%; }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #ff8a5b 0%, #d33e7c 50%, #6e3aff 100%);
    display: grid;
    place-items: center;
    font-size: 0.75rem;
    font-weight: 700;
    color: white;
    flex-shrink: 0;
    margin-top: 0.15rem;
    box-shadow: 0 2px 6px rgba(110, 58, 255, 0.25);
  }
  .avatar::after {
    content: '✦';
    font-size: 0.9rem;
  }
  .avatar.user {
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    box-shadow: none;
  }
  .avatar.user::after {
    content: 'You';
    font-size: 0.6rem;
    font-weight: 600;
  }

  .bubble-stack {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
    flex: 1;
  }
  .bubble {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0.7rem 1rem;
    border-radius: 16px;
    border-top-left-radius: 4px;
    font-size: 0.92rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    width: fit-content;
    max-width: 100%;
  }
  :global(html.light) .bubble,
  :global(html:not(.dark)) .bubble {
    background: rgba(0, 0, 0, 0.03);
    border-color: rgba(0, 0, 0, 0.08);
  }
  .bubble.pending { padding: 0.85rem 1rem; }
  .msg.user .bubble {
    background: linear-gradient(135deg, #6e3aff 0%, #9355ff 100%);
    color: white;
    border-color: transparent;
    border-radius: 16px;
    border-top-right-radius: 4px;
    align-self: flex-end;
    box-shadow: 0 2px 8px rgba(110, 58, 255, 0.25);
  }

  .dots {
    display: inline-flex;
    gap: 4px;
    align-items: center;
  }
  .dots span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: hsl(var(--muted-foreground));
    animation: blink 1.2s infinite both;
  }
  .dots span:nth-child(2) { animation-delay: 0.18s; }
  .dots span:nth-child(3) { animation-delay: 0.36s; }
  @keyframes blink {
    0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
    40% { opacity: 1; transform: translateY(-2px); }
  }

  .suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.25rem 0;
    margin-top: 0.5rem;
  }
  .suggestions button {
    background: rgba(255, 255, 255, 0.03);
    color: hsl(var(--foreground));
    border: 1px dashed rgba(255, 255, 255, 0.18);
    border-radius: 999px;
    padding: 0.45rem 0.95rem;
    font-size: 0.8rem;
  }
  :global(html:not(.dark)) .suggestions button {
    background: rgba(0, 0, 0, 0.02);
    border-color: rgba(0, 0, 0, 0.18);
  }
  .suggestions button:hover:not(:disabled) {
    background: rgba(110, 58, 255, 0.08);
    border-color: rgba(110, 58, 255, 0.4);
    border-style: solid;
    color: hsl(var(--foreground));
  }
  .spec-frame {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 0.85rem 1rem;
    width: 100%;
    overflow-x: auto;
  }
  :global(html:not(.dark)) .spec-frame {
    background: rgba(0, 0, 0, 0.02);
    border-color: rgba(0, 0, 0, 0.08);
  }

  .composer {
    display: flex;
    gap: 0.5rem;
    padding: 0.85rem 0;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    align-items: center;
  }
  :global(html:not(.dark)) .composer { border-top-color: rgba(0, 0, 0, 0.08); }
  .composer input {
    flex: 1;
    height: 42px;
    padding: 0 0.95rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    font-size: 0.9rem;
    background: rgba(255, 255, 255, 0.04);
    color: hsl(var(--foreground));
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }
  :global(html:not(.dark)) .composer input {
    background: rgba(0, 0, 0, 0.02);
    border-color: rgba(0, 0, 0, 0.12);
  }
  .composer input:focus {
    border-color: rgba(110, 58, 255, 0.6);
    box-shadow: 0 0 0 3px rgba(110, 58, 255, 0.18);
  }

  .key-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: grid;
    place-items: center;
    z-index: 100;
    padding: 1rem;
  }
  .key-dialog {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 12px;
    padding: 1.25rem;
    width: 100%;
    max-width: 480px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .key-dialog h2 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
  }
  .key-dialog p {
    font-size: 0.78rem;
    line-height: 1.45;
    margin: 0;
  }
  .key-dialog input {
    height: 38px;
    padding: 0 0.75rem;
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    font-family: ui-monospace, monospace;
    font-size: 0.82rem;
    outline: none;
  }
  .key-dialog .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  code {
    font-family: ui-monospace, monospace;
    font-size: 0.82em;
    background: hsl(var(--muted) / 0.5);
    padding: 0.05em 0.3em;
    border-radius: 4px;
  }
</style>
