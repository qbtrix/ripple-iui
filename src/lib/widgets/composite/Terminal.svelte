<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { onMount } from 'svelte';

  interface TermLine {
    text: string;
    type?: 'stdout' | 'stderr' | 'info' | 'command';
    timestamp?: string;
  }

  interface Props {
    lines?: TermLine[];
    /** Show command input at bottom */
    interactive?: boolean;
    /** Max height before scroll */
    maxHeight?: string;
    /** Terminal title */
    title?: string;
    class?: string;
    /** Called when command submitted */
    oncommand?: (command: string) => void;
  }

  let {
    lines = [], interactive = false, maxHeight = '300px',
    title, class: className, oncommand
  }: Props = $props();

  let scrollEl: HTMLDivElement;
  let inputValue = $state('');

  function submit() {
    if (!inputValue.trim()) return;
    oncommand?.(inputValue.trim());
    inputValue = '';
  }

  // Auto-scroll to bottom when new lines arrive
  $effect(() => {
    if (lines.length && scrollEl) {
      scrollEl.scrollTop = scrollEl.scrollHeight;
    }
  });
</script>

<div class={cn('rterm', className)}>
  {#if title}
    <div class="rterm-bar">
      <div class="rterm-dots"><span></span><span></span><span></span></div>
      <span class="rterm-title">{title}</span>
    </div>
  {/if}
  <div bind:this={scrollEl} class="rterm-output" style="max-height:{maxHeight}">
    {#each lines as line}
      <div class="rterm-line rterm-line--{line.type ?? 'stdout'}">
        {#if line.timestamp}<span class="rterm-ts">{line.timestamp}</span>{/if}
        {#if line.type === 'command'}<span class="rterm-prompt">$</span>{/if}
        <span>{line.text}</span>
      </div>
    {/each}
  </div>
  {#if interactive}
    <form class="rterm-input" onsubmit={(e) => { e.preventDefault(); submit(); }}>
      <span class="rterm-prompt">$</span>
      <input
        type="text"
        bind:value={inputValue}
        placeholder="Type a command..."
        class="rterm-input-field"
      />
    </form>
  {/if}
</div>

<style>
  .rterm {
    border-radius: 8px;
    border: 1px solid hsl(var(--border));
    background: hsl(var(--card));
    overflow: hidden;
    font-family: "JetBrains Mono Variable", "SF Mono", ui-monospace, monospace;
    font-size: 12px;
  }

  .rterm-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: hsl(var(--muted));
    border-bottom: 1px solid hsl(var(--border));
  }
  .rterm-dots {
    display: flex;
    gap: 5px;
  }
  .rterm-dots span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: hsl(var(--muted-foreground) / 0.3);
  }
  .rterm-title {
    font-size: 11px;
    color: hsl(var(--muted-foreground));
    font-weight: 500;
  }

  .rterm-output {
    padding: 10px 12px;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  .rterm-line {
    display: flex;
    gap: 8px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
  }
  .rterm-line--stdout { color: hsl(var(--foreground)); }
  .rterm-line--stderr { color: hsl(var(--destructive)); }
  .rterm-line--info { color: hsl(var(--muted-foreground)); }
  .rterm-line--command { color: hsl(var(--primary)); }

  .rterm-ts {
    color: hsl(var(--muted-foreground));
    flex-shrink: 0;
    font-size: 10px;
    min-width: 50px;
  }
  .rterm-prompt {
    color: hsl(var(--primary));
    flex-shrink: 0;
    user-select: none;
  }

  .rterm-input {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px solid hsl(var(--border));
    background: hsl(var(--muted) / 0.5);
  }
  .rterm-input-field {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: hsl(var(--foreground));
    font-family: inherit;
    font-size: inherit;
  }
  .rterm-input-field::placeholder {
    color: hsl(var(--muted-foreground));
  }
</style>
