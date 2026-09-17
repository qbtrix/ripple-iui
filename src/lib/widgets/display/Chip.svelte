<!--
  src/lib/widgets/display/Chip.svelte
  origin: slev12397/beautiful-ui@ff0f74d components/atoms/Chip.tsx

  Updated 2026-09-14 (beautiful-ui re-skin, lane A): the chip takes the
  source's geometry and its borderless tint — rounded-md (the source's 6px
  chip radius, not the pill it was), tight px/py, 12px leading-none, and the
  border dropped so the tint alone carries the tone. Colour follows the
  translation doc: the neutral default is now bg-inset/text-ink-2 translated
  to ripple-muted + ripple-muted-foreground, i.e. a quieter chip than the
  full-strength foreground it had. Transitions ride var(--ripple-ease-out).
  Deliberately NOT taken: the source chip is a monospace CODE token
  ("for code values like `updated_at`") and is `display:inline` with an
  optical align-[-1px]. Ripple already ships display/Code.svelte and Kbd for
  that; this widget is registered as both `chip` and `tag`, and setting
  font-mono would render every existing spec's tags as code. Geometry and
  tint in, the code-token identity out.
  Props, variant names, sizes, events unchanged.

  Updated 2026-09-12: the children branch gates on `children` alone, not
  `hasChildren && children`, so a hand-written Svelte caller that passes
  children renders them. Gating on `hasChildren` here would drop the
  fallback branch below; NodeRenderer now only passes `children` when the
  spec node actually has default kids, which makes the snippet truthful.
  Also 2026-09-12: success/warning/destructive now use the semantic
  --ripple-success / --ripple-warning / --ripple-error tokens instead of
  hardcoded emerald/amber/rose, so the chip follows a host's --paw-* remap.
  2026-09-17 (fix/port-gaps): status-coloured text moved onto the readable
  text tokens (text-ripple-{error,success,warning,info}-text; red text that
  read text-destructive now reads text-ripple-error-text, the same hue since
  --ripple-error aliases --destructive). The raw tones are fill colours and
  measured 1.7-3.3:1 as text in light mode. Fills and tints are unchanged.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '$lib/utils.js';
  import XIcon from '@lucide/svelte/icons/x';

  type Variant = 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  type Size = 'sm' | 'md';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    variant?: Variant;
    size?: Size;
    closable?: boolean;
    onclose?: () => void;
    /** Body click — wired by NodeRenderer when spec uses `on_click`. */
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
    hasChildren?: boolean;
  }

  let {
    id, class: className, style, label,
    variant = 'default', size = 'md', closable = false, onclose, onclick,
    children, hasChildren = false
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  // Borderless tints, per the source. The accent tint takes text-ripple-accent,
  // NOT text-ripple-accent-foreground: the translation table's
  // `text-accent-ink → text-ripple-accent-foreground` row is written for a
  // FILLED accent, and --ripple-accent-foreground resolves to
  // --primary-foreground, which on a 10% tint is white on near-white.
  const variantClass = $derived(
    variant === 'primary' ? 'bg-ripple-accent/10 text-ripple-accent'
    : variant === 'success' ? 'bg-ripple-success/10 text-ripple-success-text'
    : variant === 'warning' ? 'bg-ripple-warning/10 text-ripple-warning-text'
    : variant === 'destructive' ? 'bg-ripple-error/10 text-ripple-error-text'
    : 'bg-ripple-muted text-ripple-muted-foreground'
  );

  const sizeClass = $derived(
    size === 'sm' ? 'text-[11px] px-1.5 py-0.5 gap-1' : 'text-[12px] px-2 py-0.5 gap-1.5'
  );

  const iconSize = $derived(size === 'sm' ? 10 : 12);
</script>

{#if onclick}
  <button
    type="button"
    {id}
    onclick={(e) => {
      // Don't fire body click when the close X is clicked.
      if ((e.target as HTMLElement).closest('[data-chip-close]')) return;
      onclick?.(e);
    }}
    class={cn(
      'inline-flex items-center rounded-md font-medium leading-none cursor-pointer transition-colors duration-150 ease-ripple-out hover:brightness-95',
      variantClass, sizeClass, className
    )}
    style={styleString}
  >
    {#if children}
      {@render children()}
    {:else if label}
      {label}
    {/if}
    {#if closable}
      <span
        role="button"
        tabindex="-1"
        data-chip-close
        class="hover:opacity-70 transition-opacity"
        aria-label="Remove"
        onclick={(e) => { e.stopPropagation(); onclose?.(); }}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onclose?.(); } }}
      >
        <XIcon size={iconSize} />
      </span>
    {/if}
  </button>
{:else}
  <span
    {id}
    class={cn('inline-flex items-center rounded-md font-medium leading-none', variantClass, sizeClass, className)}
    style={styleString}
  >
    {#if children}
      {@render children()}
    {:else if label}
      {label}
    {/if}
    {#if closable}
      <button
        type="button"
        class="hover:opacity-70 transition-opacity"
        aria-label="Remove"
        onclick={() => onclose?.()}
      >
        <XIcon size={iconSize} />
      </button>
    {/if}
  </span>
{/if}
