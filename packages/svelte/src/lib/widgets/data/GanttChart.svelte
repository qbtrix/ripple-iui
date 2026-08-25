<!-- src/lib/widgets/data/GanttChart.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils.js';

  type Task = {
    id: string;
    name: string;
    /** ISO date string YYYY-MM-DD or full ISO. */
    start: string;
    /** ISO date string YYYY-MM-DD or full ISO. */
    end: string;
    /** Percent complete 0-100. */
    progress?: number;
    /** Comma-separated dependent task ids. */
    dependencies?: string;
    custom_class?: string;
  };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    tasks?: Task[];
    viewMode?: 'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month' | 'Year';
    height?: string;
    onclick?: (task: Task) => void;
  }

  let {
    id,
    class: className,
    style,
    tasks = [],
    viewMode = 'Day',
    height = '320px',
    onclick
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let containerEl = $state<HTMLDivElement | null>(null);
  let gantt: any = null;

  function clearContainer() {
    if (!containerEl) return;
    while (containerEl.firstChild) containerEl.removeChild(containerEl.firstChild);
  }

  onMount(() => {
    let cancelled = false;
    (async () => {
      const mod = await import('frappe-gantt');
      if (cancelled || !containerEl || tasks.length === 0) return;

      const Gantt = (mod as any).default;
      gantt = new Gantt(containerEl, tasks, {
        view_mode: viewMode,
        on_click: (task: Task) => onclick?.(task)
      });
    })();

    return () => {
      cancelled = true;
      gantt = null;
      clearContainer();
    };
  });

  $effect(() => {
    if (!gantt) return;
    void tasks;
    try {
      gantt.refresh(tasks);
    } catch {
      // refresh shape may differ across versions
    }
  });

  $effect(() => {
    if (!gantt) return;
    try {
      gantt.change_view_mode(viewMode);
    } catch {
      // ignore
    }
  });
</script>

<div class={cn('w-full', className)} style={styleString}>
  <div
    {id}
    bind:this={containerEl}
    class="overflow-auto rounded-md border border-border"
    style={`height: ${height}`}
  ></div>
</div>

<!--
  Vendored frappe-gantt CSS. The package's exports map omits the CSS path,
  so we inline it here rather than fight Vite's strict SSR resolver. Wrapped
  in :global() because the SVG-based gantt DOM is built imperatively outside
  Svelte's scoped-class mangling.
-->
<style>
  :global(.gantt-container) { line-height: 14.5px; position: relative; overflow: auto; font-size: 12px; height: var(--gv-grid-height); width: 100%; border-radius: 8px; isolation: isolate; }
  :global(.gantt-container .popup-wrapper) { position: absolute; top: 0; left: 0; background: var(--g-header-background, #fff); box-shadow: 0 10px 24px -3px rgba(0,0,0,0.2); padding: 10px; border-radius: 5px; width: max-content; z-index: 1000; }
  :global(.gantt-container .popup-wrapper .title) { margin-bottom: 2px; color: var(--g-text-dark, #171717); font-size: .85rem; font-weight: 650; line-height: 15px; }
  :global(.gantt-container .popup-wrapper .subtitle) { color: var(--g-text-dark, #171717); font-size: .8rem; margin-bottom: 5px; }
  :global(.gantt-container .popup-wrapper .details) { color: var(--g-text-muted, #7c7c7c); font-size: .7rem; }
  :global(.gantt-container .grid-header) { height: calc(var(--gv-lower-header-height) + var(--gv-upper-header-height) + 10px); background-color: var(--g-header-background, #fff); position: sticky; top: 0; left: 0; border-bottom: 1px solid var(--g-row-border-color, #c7c7c7); z-index: 1000; }
  :global(.gantt-container .lower-text), :global(.gantt-container .upper-text) { text-anchor: middle; }
  :global(.gantt-container .upper-header) { height: var(--gv-upper-header-height); }
  :global(.gantt-container .lower-header) { height: var(--gv-lower-header-height); }
  :global(.gantt-container .lower-text) { font-size: 12px; position: absolute; width: calc(var(--gv-column-width) * .8); height: calc(var(--gv-lower-header-height) * .8); margin: 0 calc(var(--gv-column-width) * .1); align-content: center; text-align: center; color: var(--g-text-muted, #7c7c7c); }
  :global(.gantt-container .upper-text) { position: absolute; width: fit-content; font-weight: 500; font-size: 14px; color: var(--g-text-dark, #171717); height: calc(var(--gv-lower-header-height) * .66); }
  :global(.gantt-container .current-upper) { position: sticky; left: 0 !important; padding-left: 17px; background: var(--g-header-background, #fff); }
  :global(.gantt-container .side-header) { position: sticky; top: 0; right: 0; float: right; z-index: 1000; line-height: 20px; font-weight: 400; width: max-content; margin-left: auto; padding-right: 10px; padding-top: 10px; background: var(--g-header-background, #fff); display: flex; }
  :global(.gantt-container .side-header *) { transition: background-color .15s cubic-bezier(.4,0,.2,1); background-color: var(--g-actions-background, #f3f3f3); border-radius: .5rem; border: none; padding: 5px 8px; color: var(--g-text-dark, #171717); font-size: 14px; letter-spacing: .02em; font-weight: 420; box-sizing: content-box; margin-right: 5px; }
  :global(.gantt-container .side-header *:last-child) { margin-right: 0; }
  :global(.gantt-container .side-header select) { width: 60px; padding-top: 2px; padding-bottom: 2px; }
  :global(.gantt-container .side-header select:focus) { outline: none; }
  :global(.gantt-container .date-range-highlight) { background-color: var(--g-progress-color, #dbdbdb); border-radius: 12px; height: calc(var(--gv-lower-header-height) - 6px); top: calc(var(--gv-upper-header-height) + 5px); position: absolute; }
  :global(.gantt-container .current-highlight) { position: absolute; background: var(--g-today-highlight, #37352f); width: 1px; z-index: 999; }
  :global(.gantt-container .current-ball-highlight) { position: absolute; background: var(--g-today-highlight, #37352f); z-index: 1001; border-radius: 50%; }
  :global(.gantt-container .current-date-highlight) { background: var(--g-today-highlight, #37352f); color: var(--g-text-light, #fff); border-radius: 5px; }
  :global(.gantt-container .holiday-label) { position: absolute; top: 0; left: 0; opacity: 0; z-index: 1000; background: var(--g-weekend-label-color, #dcdce4); border-radius: 5px; padding: 2px 5px; }
  :global(.gantt-container .holiday-label.show) { opacity: 100; }
  :global(.gantt-container .extras) { position: sticky; left: 0; }
  :global(.gantt-container .hide) { display: none; }
  :global(.gantt) { user-select: none; -webkit-user-select: none; position: absolute; }
  :global(.gantt .grid-background) { fill: none; }
  :global(.gantt .grid-row) { fill: var(--g-row-color, #fdfdfd); }
  :global(.gantt .row-line) { stroke: var(--g-border-color, #ebeff2); }
  :global(.gantt .tick) { stroke: var(--g-tick-color, #f3f3f3); stroke-width: .4; }
  :global(.gantt .tick.thick) { stroke: var(--g-tick-color-thick, #ededed); stroke-width: .7; }
  :global(.gantt .arrow) { fill: none; stroke: var(--g-arrow-color, #1f2937); stroke-width: 1.5; }
  :global(.gantt .bar-wrapper .bar) { fill: var(--g-bar-color, #fff); stroke: var(--g-bar-border, #fff); stroke-width: 0; transition: stroke-width .3s ease; }
  :global(.gantt .bar-progress) { fill: var(--g-progress-color, #dbdbdb); border-radius: 4px; }
  :global(.gantt .bar-expected-progress) { fill: var(--g-expected-progress, #c4c4e9); }
  :global(.gantt .bar-invalid) { fill: transparent; stroke: var(--g-bar-border, #fff); stroke-width: 1; stroke-dasharray: 5; }
  :global(.gantt .bar-label) { fill: var(--g-text-dark, #171717); dominant-baseline: central; font-family: Helvetica; font-size: 13px; font-weight: 400; }
  :global(.gantt .bar-label.big) { fill: var(--g-text-dark, #171717); text-anchor: start; }
  :global(.gantt .handle) { fill: var(--g-handle-color, #37352f); opacity: 0; transition: opacity .3s ease; }
  :global(.gantt .handle.active), :global(.gantt .handle.visible) { cursor: ew-resize; opacity: 1; }
  :global(.gantt .handle.progress) { fill: var(--g-text-muted, #7c7c7c); }
  :global(.gantt .bar-wrapper) { cursor: pointer; }
  :global(.gantt .bar-wrapper .bar) { outline: 1px solid var(--g-row-border-color, #c7c7c7); border-radius: 3px; }
  :global(.gantt .grid-column) { fill: transparent; pointer-events: all; }
  :global(.gantt .grid-column:hover) { fill: var(--g-weekend-highlight-color, #f7f7f7); transition: fill .1s ease; }
</style>
