<script lang="ts">
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { linkifySegments } from './linkify.js';
  import type { EventDispatcher } from '../../core/event-dispatcher.js';
  import type { StateManager } from '../../core/state-manager.svelte.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    text?: string;
    size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
    weight?: 'normal' | 'medium' | 'semibold' | 'bold';
    color?: string;
    inline?: boolean;
  }

  let {
    id, class: className, style, text = '', size = 'base',
    weight = 'normal', color, inline = false
  }: Props = $props();

  // Host wiring — present when rendered inside a Ripple tree, absent for
  // standalone widget usage. When present, URL clicks route through the
  // `navigate` action so the host decides how to open them (in paw the host
  // opens external URLs in the system browser). With no host, the plain
  // `<a target="_blank">` fallback takes over.
  const events = getContext<EventDispatcher | undefined>('ui-events');
  const stateManager = getContext<StateManager | undefined>('ui-state');

  // Bare URLs in the text become clickable links; plain text is unchanged.
  const segments = $derived(linkifySegments(text));

  function handleLinkClick(e: MouseEvent, url: string): void {
    // Leave modified / non-primary clicks to the browser so open-in-new-tab,
    // middle-click, and the right-click menu keep working via the `<a href>`.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!events) return; // no host — native <a target="_blank"> handles it
    e.preventDefault();
    void events.dispatch({ action: 'navigate', url }, { state: stateManager?.state ?? {} });
  }

  const sizeClasses: Record<string, string> = {
    xs: 'text-xs text-muted-foreground',
    sm: 'text-sm text-muted-foreground',
    base: 'text-sm text-foreground',
    lg: 'text-base text-foreground font-mono',
    xl: 'text-lg text-foreground font-mono',
    '2xl': 'text-xl text-foreground font-mono',
    '3xl': 'text-2xl text-foreground font-mono',
  };

  const weightClasses: Record<string, string> = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  const styleString = $derived.by(() => {
    const styles: string[] = [];
    // Use optional chaining per clause (not `color && (a || b)`): the Svelte
    // compiler can drop the grouping parens around the `||`, leaving
    // `color && a || b` which calls .startsWith on an undefined `color` and
    // crashes SSR/prerender. `color?.startsWith(...)` short-circuits safely
    // regardless of how the expression is flattened — matches Metric/Highlight.
    if (color?.startsWith('#') || color?.startsWith('rgb')) {
      styles.push(`color:${color}`);
    }
    if (style) {
      styles.push(...Object.entries(style).map(([k, v]) => `${k}:${v}`));
    }
    return styles.length > 0 ? styles.join(';') : undefined;
  });

  const linkClass = 'text-primary underline underline-offset-2 hover:text-primary/80 break-words';
</script>

{#snippet body()}{#each segments as seg}{#if seg.url}{@const url = seg.url}<a href={url} target="_blank" rel="noopener noreferrer" class={linkClass} onclick={(e) => handleLinkClick(e, url)}>{seg.text}</a>{:else}{seg.text}{/if}{/each}{/snippet}

{#if inline}
  <span {id} class={cn('m-0', sizeClasses[size], weightClasses[weight], className)} style={styleString}>{@render body()}</span>
{:else}
  <p {id} class={cn('m-0', sizeClasses[size], weightClasses[weight], className)} style={styleString}>{@render body()}</p>
{/if}
