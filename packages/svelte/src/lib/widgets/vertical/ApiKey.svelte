<!-- src/lib/widgets/vertical/ApiKey.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { asText } from '$lib/widgets/text-coerce';
  import EyeIcon from '@lucide/svelte/icons/eye';
  import EyeOffIcon from '@lucide/svelte/icons/eye-off';
  import CopyIcon from '@lucide/svelte/icons/copy';
  import CheckIcon from '@lucide/svelte/icons/check';
  import RefreshIcon from '@lucide/svelte/icons/refresh-cw';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    /** The secret value. */
    value?: string;
    /** Hide rotate button. */
    hideRotate?: boolean;
    /** Hide reveal toggle. */
    hideReveal?: boolean;
    /** Optional description shown under the label. */
    description?: string;
    /** Number of trailing characters to show even when masked. */
    revealLast?: number;
    onrotate?: () => void;
    oncopy?: () => void;
  }

  let {
    id,
    class: className,
    style,
    label = 'API key',
    value = '',
    hideRotate = false,
    hideReveal = false,
    description,
    revealLast = 4,
    onrotate,
    oncopy
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let visible = $state(false);
  let copied = $state(false);

  // `value` is string-typed but a binding can deliver a number — coerce once so
  // .length/.slice (string-only) never crash the canvas.
  const secret = $derived(asText(value));

  const masked = $derived.by(() => {
    if (!secret) return '';
    if (visible) return secret;
    if (secret.length <= revealLast) return '•'.repeat(secret.length);
    return '•'.repeat(Math.min(secret.length - revealLast, 24)) + secret.slice(-revealLast);
  });

  async function copy() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
    } catch {
      // ignore — environment may not allow clipboard
    }
    copied = true;
    oncopy?.();
    setTimeout(() => (copied = false), 1200);
  }
</script>

<div
  {id}
  class={cn('flex flex-col gap-1.5', className)}
  style={styleString}
>
  {#if label}
    <div class="flex items-baseline justify-between">
      <span class="text-sm font-medium">{label}</span>
      {#if description}
        <span class="text-xs text-muted-foreground">{description}</span>
      {/if}
    </div>
  {/if}

  <div class="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 h-9 shadow-xs font-mono text-sm">
    <span class="flex-1 min-w-0 truncate tabular-nums">{masked || '—'}</span>

    {#if !hideReveal}
      <button
        type="button"
        class="rounded p-1.5 hover:bg-muted transition-colors"
        aria-label={visible ? 'Hide secret' : 'Reveal secret'}
        onclick={() => (visible = !visible)}
      >
        {#if visible}
          <EyeOffIcon size={14} />
        {:else}
          <EyeIcon size={14} />
        {/if}
      </button>
    {/if}

    <button
      type="button"
      class="rounded p-1.5 hover:bg-muted transition-colors"
      aria-label="Copy secret"
      onclick={copy}
    >
      {#if copied}
        <CheckIcon size={14} class="text-emerald-500" />
      {:else}
        <CopyIcon size={14} />
      {/if}
    </button>

    {#if !hideRotate}
      <button
        type="button"
        class="rounded p-1.5 hover:bg-muted transition-colors"
        aria-label="Rotate secret"
        onclick={() => onrotate?.()}
      >
        <RefreshIcon size={14} />
      </button>
    {/if}
  </div>
</div>
