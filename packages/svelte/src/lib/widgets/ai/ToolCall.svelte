<!--
  @file widgets/ai/ToolCall.svelte
  @description NEW (AI-native tier, 2026-06-24). An agent tool-invocation card —
    the unit a generative-UI engine renders for each tool an agent calls. Shows
    the tool name + an icon, a status badge (pending | running | success |
    error), a collapsible args block (formatted JSON / kv), a collapsible
    result/output (markdown or code), and optional durationMs + relative time.
    Default collapsed on success; auto-expanded on error so failures are never
    hidden behind a click.
  @a11y A real <button> disclosure carries aria-expanded and controls the body
    via aria-controls. Status is conveyed by TEXT + icon, never color alone.
  Modified: 2026-06-28 — forward node id (data-ripple-node) for visual-editor selection.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Markdown from '$lib/widgets/display/Markdown.svelte';
  import CodeBlock from '$lib/widgets/display/CodeBlock.svelte';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import WrenchIcon from '@lucide/svelte/icons/wrench';
  import LoaderIcon from '@lucide/svelte/icons/loader-circle';
  import CheckIcon from '@lucide/svelte/icons/check';
  import XIcon from '@lucide/svelte/icons/x';
  import ClockIcon from '@lucide/svelte/icons/clock';

  type ToolStatus = 'pending' | 'running' | 'success' | 'error';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Tool name, e.g. "search_web". */
    name?: string;
    status?: ToolStatus;
    /** Invocation arguments — rendered as formatted JSON. */
    args?: Record<string, unknown> | unknown;
    /** Tool output. String → markdown/code; object → JSON. */
    result?: unknown;
    /** Render the result as markdown rather than a code block. */
    resultMarkdown?: boolean;
    durationMs?: number;
    /** Relative time label, e.g. "2s ago". Display-only. */
    time?: string;
    /** Error message — shown when status is "error". */
    error?: string;
    /** Force the body open/closed. Omit to use the status-derived default. */
    open?: boolean;
  }

  let {
    id,
    class: className,
    style,
    name = 'tool',
    status = 'pending',
    args,
    result,
    resultMarkdown = false,
    durationMs,
    time,
    error,
    open,
  }: Props = $props();

  // Default: collapsed on success, auto-expanded on error. pending/running
  // expand so the user can watch the call. svelte-ignore: one-time seed.
  function defaultOpen(s: ToolStatus): boolean {
    return s !== 'success';
  }
  // svelte-ignore state_referenced_locally
  let internalOpen = $state(defaultOpen(status));
  const isOpen = $derived(open !== undefined ? !!open : internalOpen);

  function toggle() {
    if (open === undefined) internalOpen = !internalOpen;
  }

  const STATUS: Record<ToolStatus, { label: string; cls: string }> = {
    pending: { label: 'Pending', cls: 'bg-muted text-muted-foreground border-border' },
    running: { label: 'Running', cls: 'bg-ripple-info/10 text-ripple-info border-ripple-info/20' },
    success: { label: 'Success', cls: 'bg-ripple-success/10 text-ripple-success border-ripple-success/20' },
    error: { label: 'Error', cls: 'bg-destructive/10 text-destructive border-destructive/20' },
  };
  const statusMeta = $derived(STATUS[status] ?? STATUS.pending);

  const argsText = $derived.by(() => {
    if (args === undefined || args === null) return '';
    if (typeof args === 'string') return args;
    try {
      return JSON.stringify(args, null, 2);
    } catch {
      return String(args);
    }
  });

  const resultText = $derived.by(() => {
    if (result === undefined || result === null) return '';
    if (typeof result === 'string') return result;
    try {
      return JSON.stringify(result, null, 2);
    } catch {
      return String(result);
    }
  });

  const hasArgs = $derived(argsText.length > 0);
  const hasResult = $derived(resultText.length > 0);
  const hasError = $derived(status === 'error' && !!error);

  const duration = $derived.by(() => {
    if (durationMs === undefined) return '';
    if (durationMs < 1000) return `${Math.round(durationMs)}ms`;
    return `${(durationMs / 1000).toFixed(durationMs < 10000 ? 1 : 0)}s`;
  });

  const bodyId = $derived(`${id ?? 'tool-call'}-body`);

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<div
  {id}
  data-ripple-node={id}
  data-variant="default"
  data-state={status}
  class={cn('ripple-tool-call rounded-md border border-border bg-card overflow-hidden text-sm', className)}
  style={styleString}
>
  <button
    type="button"
    aria-expanded={isOpen}
    aria-controls={bodyId}
    onclick={toggle}
    class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/40 transition-colors"
  >
    <span class="shrink-0 text-muted-foreground" aria-hidden="true">
      {#if status === 'running'}
        <LoaderIcon size={14} class="ripple-tool-spin" />
      {:else if status === 'success'}
        <CheckIcon size={14} class="text-ripple-success" />
      {:else if status === 'error'}
        <XIcon size={14} class="text-destructive" />
      {:else}
        <WrenchIcon size={14} />
      {/if}
    </span>
    <span class="flex-1 truncate font-medium font-mono text-[13px]">{name}</span>

    {#if duration}
      <span class="shrink-0 inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
        <ClockIcon size={11} aria-hidden="true" />{duration}
      </span>
    {/if}
    {#if time}
      <span class="shrink-0 text-[11px] text-muted-foreground">{time}</span>
    {/if}

    <span
      class={cn(
        'shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        statusMeta.cls
      )}
    >
      {statusMeta.label}
    </span>
    <span
      class={cn('shrink-0 text-muted-foreground/60 transition-transform', isOpen && 'rotate-90')}
      aria-hidden="true"
    >
      <ChevronRightIcon size={14} />
    </span>
  </button>

  {#if isOpen}
    <div id={bodyId} class="border-t border-border px-3 py-2.5 space-y-3">
      {#if hasError}
        <div class="rounded-md border border-destructive/20 bg-destructive/5 px-2.5 py-2">
          <div class="text-[11px] font-semibold uppercase tracking-wide text-destructive mb-1">Error</div>
          <div class="text-[12.5px] text-destructive whitespace-pre-wrap">{error}</div>
        </div>
      {/if}

      {#if hasArgs}
        <div>
          <div class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Arguments</div>
          <CodeBlock code={argsText} language="json" hideCopy />
        </div>
      {/if}

      {#if hasResult}
        <div>
          <div class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Result</div>
          {#if resultMarkdown && typeof result === 'string'}
            <Markdown content={resultText} />
          {:else}
            <CodeBlock code={resultText} language={typeof result === 'string' ? '' : 'json'} hideCopy />
          {/if}
        </div>
      {/if}

      {#if !hasError && !hasArgs && !hasResult}
        <div class="text-[12.5px] text-muted-foreground italic">No arguments or output to show.</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  :global(.ripple-tool-call .ripple-tool-spin) {
    animation: ripple-tool-spin 0.9s linear infinite;
  }
  @keyframes ripple-tool-spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(.ripple-tool-call .ripple-tool-spin) {
      animation: none;
    }
  }
</style>
