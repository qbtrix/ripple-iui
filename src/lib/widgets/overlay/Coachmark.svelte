<!-- src/lib/widgets/overlay/Coachmark.svelte -->
<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import { cn } from '$lib/utils.js';
  import type { WidgetRegistry } from '$lib/core/widget-registry.js';

  type Step = {
    /** CSS selector pointing at the element to highlight. */
    target?: string;
    title?: string;
    description?: string;
    /** Position of the popover relative to the target. */
    side?: 'top' | 'right' | 'bottom' | 'left' | 'over';
  };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Tour steps. */
    steps?: Step[];
    /** Show the tour now. Bind via bind: "state.path". */
    value?: boolean;
    /** Auto-show on first mount. */
    autoStart?: boolean;
    /** Show prev/next chevrons + counter. */
    showButtons?: boolean;
    onchange?: (active: boolean) => void;
    onfinish?: () => void;
  }

  let {
    id,
    class: className,
    style,
    steps = [],
    value = false,
    autoStart = false,
    showButtons = true,
    onchange,
    onfinish
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let driverInstance: any = null;

  // Driver.js side for Ripple's side names.
  function mapSide(s?: Step['side']): string | undefined {
    if (s === 'over') return 'over';
    return s;
  }

  async function run() {
    if (steps.length === 0) return;
    const mod = await import('driver.js');
    // Driver.js ships its CSS too — same pattern as gantt: skip since SSR-strict
    // doesn't expose the path. Vendor a minimal core in the style block below.
    const { driver } = mod as any;
    if (driverInstance) {
      try { driverInstance.destroy(); } catch {}
    }
    driverInstance = driver({
      animate: true,
      showProgress: showButtons,
      allowClose: true,
      onDestroyed: () => {
        onchange?.(false);
        onfinish?.();
      },
      steps: steps.map((s) => ({
        element: s.target,
        popover: {
          title: s.title,
          description: s.description ?? '',
          side: mapSide(s.side),
          align: 'center'
        }
      }))
    });
    driverInstance.drive();
    onchange?.(true);
  }

  function stop() {
    try { driverInstance?.destroy(); } catch {}
    driverInstance = null;
  }

  // Register start/stop on widget registry so flows can `invoke` from a button.
  const widgetRegistry = getContext<WidgetRegistry | undefined>('ui-widget-registry');
  $effect(() => {
    if (!id || !widgetRegistry) return;
    const offStart = widgetRegistry.register(id, 'start', () => { run(); });
    const offStop = widgetRegistry.register(id, 'stop', () => { stop(); });
    return () => { offStart(); offStop(); };
  });

  // Sync external value: true → start, false → stop.
  $effect(() => {
    void value;
    if (value && !driverInstance) run();
    else if (!value && driverInstance) stop();
  });

  onMount(() => {
    if (autoStart) run();
    return () => stop();
  });
</script>

<!-- This widget renders nothing in flow — it controls a global overlay. -->
{#if className || styleString}
  <span {id} class={cn('hidden', className)} style={styleString} aria-hidden="true"></span>
{/if}

<!--
  Vendored driver.js core styles. Same trick as GanttChart: the package's
  exports don't list the CSS deep-path, so we inline the minimum needed
  for the popover + overlay rather than fight Vite SSR resolution.
-->
<style>
  :global(.driver-popover) { position: absolute; background: var(--popover, #fff); color: var(--popover-foreground, #171717); border-radius: 8px; min-width: 280px; max-width: 320px; padding: 16px; box-shadow: 0 10px 24px -3px rgba(0,0,0,0.18); border: 1px solid var(--border, hsl(240 5% 88%)); z-index: 100000; font-family: inherit; }
  :global(.driver-popover-title) { font-size: 14px; font-weight: 600; margin: 0 0 4px; }
  :global(.driver-popover-description) { font-size: 13px; line-height: 1.4; margin: 0; color: var(--muted-foreground, hsl(240 5% 45%)); }
  :global(.driver-popover-footer) { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; gap: 8px; }
  :global(.driver-popover-progress-text) { font-size: 11px; color: var(--muted-foreground, hsl(240 5% 45%)); }
  :global(.driver-popover-navigation-btns) { display: flex; gap: 6px; }
  :global(.driver-popover-prev-btn), :global(.driver-popover-next-btn), :global(.driver-popover-close-btn) {
    appearance: none; cursor: pointer; border: 1px solid var(--border, hsl(240 5% 88%)); background: transparent;
    color: inherit; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 6px;
    transition: background 0.15s ease;
  }
  :global(.driver-popover-prev-btn:hover), :global(.driver-popover-next-btn:hover) { background: var(--muted, hsl(240 5% 96%)); }
  :global(.driver-popover-next-btn) { background: var(--primary, hsl(240 5% 10%)); color: var(--primary-foreground, hsl(0 0% 98%)); border-color: transparent; }
  :global(.driver-popover-close-btn) { position: absolute; top: 8px; right: 8px; padding: 2px 6px; line-height: 1; border: none; }
  :global(.driver-popover-arrow) { content: ''; position: absolute; width: 0; height: 0; border: 7px solid transparent; }
  :global(.driver-popover-arrow-side-left) { right: -14px; border-left-color: var(--popover, #fff); }
  :global(.driver-popover-arrow-side-right) { left: -14px; border-right-color: var(--popover, #fff); }
  :global(.driver-popover-arrow-side-top) { bottom: -14px; border-top-color: var(--popover, #fff); }
  :global(.driver-popover-arrow-side-bottom) { top: -14px; border-bottom-color: var(--popover, #fff); }
  :global(.driver-overlay) { position: fixed; inset: 0; pointer-events: auto; }
  :global(.driver-active-element) { z-index: 99998; position: relative; }
</style>
