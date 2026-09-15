<script lang="ts">
  import { cn } from '$lib/utils.js';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import CheckIcon from '@lucide/svelte/icons/check';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    code?: string;
    /** Alias for `code`. */
    text?: string;
    language?: string;
    /** Hide the language label even if provided. */
    hideLanguage?: boolean;
    /** Hide the copy button. */
    hideCopy?: boolean;
  }

  let {
    id, class: className, style, code, text,
    language, hideLanguage = false, hideCopy = false
  }: Props = $props();

  const source = $derived(code ?? text ?? '');

  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | null = null;

  async function copy() {
    if (!source) return;
    try {
      await navigator.clipboard.writeText(source);
      copied = true;
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => (copied = false), 1500);
    } catch (e) {
      console.warn('[ripple/code-block] clipboard write failed:', e);
    }
  }

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<div
  {id}
  class={cn('relative group rounded-md border border-border bg-muted/40 overflow-hidden', className)}
  style={styleString}
>
  {#if (language && !hideLanguage) || !hideCopy}
    <div class="flex items-center justify-between border-b border-border bg-muted/60 px-3 py-1 text-[11px] text-muted-foreground">
      {#if language && !hideLanguage}
        <span class="font-medium uppercase tracking-wide">{language}</span>
      {:else}
        <span></span>
      {/if}
      {#if !hideCopy}
        <button
          type="button"
          onclick={copy}
          class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] hover:bg-muted transition-colors"
          aria-label="Copy code"
        >
          {#if copied}
            <CheckIcon size={12} />
            <span>Copied</span>
          {:else}
            <CopyIcon size={12} />
            <span>Copy</span>
          {/if}
        </button>
      {/if}
    </div>
  {/if}
  <pre class="m-0 p-3 overflow-x-auto text-[12.5px] leading-relaxed font-mono"><code>{source}</code></pre>
</div>
