<!--
  @file widgets/ai/ToolCall.svelte
  @description NEW (AI-native tier, 2026-06-24). An agent tool-invocation card —
    the unit a generative-UI engine renders for each tool an agent calls. Shows
    the tool name + an icon, a status badge (pending | running | success |
    error), a collapsible args block (formatted JSON / kv), a collapsible
    result/output (markdown or code), and optional durationMs + relative time.
    Default collapsed on success; auto-expanded on error so failures are never
    hidden behind a click.
  @a11y A real button disclosure carries aria-expanded and controls the body
    via aria-controls. Status is conveyed by TEXT + icon, never color alone.
    The collapsed body is `inert` so its content leaves the accessibility tree.
    The header chip's hover preview is a convenience only — the same arguments
    are reachable by expanding the disclosure from the keyboard.
  Modified: 2026-06-28 — forward node id (data-ripple-node) for visual-editor selection.
  Modified: 2026-09-14 — re-skinned on beautiful-ui. The header gains the source's
    inline argument CHIP, whose overflow opens a HoverCard from ./ui (the source
    hand-rolled a createPortal for this; ripple has an overlay canonical). The
    status glyph swaps to a chevron on hover, the way the source's tool rows do.
    The body height-animates via grid-template-rows instead of snapping, and the
    frame moves onto ripple surface/border tokens. Props and events are untouched.
  origin: slev12397/beautiful-ui@ff0f74d components/primitives/ToolChips.tsx
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Markdown from '$lib/widgets/display/Markdown.svelte';
  import CodeBlock from '$lib/widgets/display/CodeBlock.svelte';
  import * as HoverCard from '$lib/components/ui/hover-card/index.js';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
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
    pending: { label: 'Pending', cls: 'bg-ripple-muted text-ripple-muted-foreground ring-ripple-border' },
    running: { label: 'Running', cls: 'bg-ripple-info/10 text-ripple-info ring-ripple-info/20' },
    success: { label: 'Success', cls: 'bg-ripple-success/10 text-ripple-success ring-ripple-success/20' },
    error: { label: 'Error', cls: 'bg-ripple-error/10 text-ripple-error ring-ripple-error/20' },
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

  // The header chip — the source shows a tool's headline argument inline
  // ("ChurnSchedule.tsx", "npm run freeze") and reveals the rest on hover.
  // ponytail: first scalar argument, truncated. Not a formatter — the HoverCard
  // carries the full payload, so this only has to be recognisable.
  const chipText = $derived.by(() => {
    if (args === undefined || args === null) return '';
    let raw: unknown = args;
    if (typeof args === 'object') {
      raw = Object.values(args as Record<string, unknown>).find(
        (v) => typeof v === 'string' || typeof v === 'number'
      );
    }
    if (raw === undefined || raw === null || typeof raw === 'object') return '';
    const s = String(raw);
    return s.length > 80 ? `${s.slice(0, 80)}…` : s;
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

  // Per-instance fallback: ApprovalGate renders a LIST of ToolCalls and passes
  // no `id`, so a literal fallback gave every body the same DOM id and pointed
  // every aria-controls at the first one.
  const uid = $props.id();
  const bodyId = $derived(`${id ?? uid}-body`);

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

<div
  {id}
  data-ripple-node={id}
  data-variant="default"
  data-state={status}
  class={cn(
    'ripple-tool-call overflow-hidden rounded-ripple bg-ripple-surface text-sm ring-1 ring-ripple-border',
    className
  )}
  style={styleString}
>
  <div class="flex items-center gap-2 px-2.5 py-1.5">
    <button
      type="button"
      aria-expanded={isOpen}
      aria-controls={bodyId}
      onclick={toggle}
      class={cn(
        'group -mx-1 flex min-w-0 shrink items-center gap-2 rounded-md px-1 py-0.5 text-left transition-colors duration-100 hover:bg-ripple-accent/10',
        // With no chip there is nothing else competing for the row, so the
        // disclosure keeps the full-width hit area it had before the re-skin.
        !chipText && 'flex-1'
      )}
    >
      <!-- The source's trick: the glyph gives way to a chevron on hover/open. -->
      <span class="relative flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
        <span
          class={cn(
            'flex text-ripple-muted-foreground transition-opacity duration-100 group-hover:opacity-0',
            isOpen && 'opacity-0'
          )}
        >
          {#if status === 'running'}
            <LoaderIcon size={14} class="ripple-tool-spin" />
          {:else if status === 'success'}
            <CheckIcon size={14} class="text-ripple-success" />
          {:else if status === 'error'}
            <XIcon size={14} class="text-ripple-error" />
          {:else}
            <WrenchIcon size={14} />
          {/if}
        </span>
        <span
          class={cn(
            'absolute flex text-ripple-muted-foreground transition-[opacity,transform] duration-150 group-hover:opacity-100',
            isOpen ? 'opacity-100' : '-rotate-90 opacity-0'
          )}
        >
          <ChevronDownIcon size={12} />
        </span>
      </span>
      <span class="truncate font-mono text-[12.5px] font-medium">{name}</span>
    </button>

    {#if chipText}
      <div class="min-w-0 flex-1">
        <HoverCard.Root openDelay={120} closeDelay={80}>
          <!-- tabindex: the trigger renders an <a> with no href, which bits-ui
               stamps role="button" + aria-expanded and wires onfocus/onblur to.
               Without a tab stop that role is unreachable from the keyboard. -->
          <HoverCard.Trigger
            tabindex={0}
            class="inline-flex h-[22px] max-w-full cursor-default items-center rounded-md bg-ripple-muted px-1.5 font-mono text-[11.5px] text-ripple-muted-foreground transition-colors duration-100 hover:bg-ripple-accent/10 hover:text-ripple-surface-foreground focus-visible:ring-1 focus-visible:ring-ripple-ring focus-visible:outline-none"
          >
            <span class="min-w-0 truncate">{chipText}</span>
          </HoverCard.Trigger>
          <HoverCard.Content align="start" class="w-72 overflow-hidden p-0">
            <div
              class="border-b border-ripple-border px-2.5 py-1.5 font-mono text-[11px] text-ripple-muted-foreground"
            >
              {name}
            </div>
            <pre
              class="max-h-56 overflow-auto px-2.5 py-1.5 font-mono text-[11px] leading-[1.6] whitespace-pre-wrap">{argsText}</pre>
          </HoverCard.Content>
        </HoverCard.Root>
      </div>
    {/if}

    {#if duration}
      <span
        class="inline-flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-ripple-muted-foreground"
      >
        <ClockIcon size={11} aria-hidden="true" />{duration}
      </span>
    {/if}
    {#if time}
      <span class="shrink-0 text-[11px] text-ripple-muted-foreground">{time}</span>
    {/if}

    <span
      class={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1',
        statusMeta.cls
      )}
    >
      {statusMeta.label}
    </span>
  </div>

  <!-- The height animation: body stays mounted, the grid row goes 0fr → 1fr. -->
  <div
    id={bodyId}
    inert={!isOpen}
    class="ripple-tool-body grid transition-[grid-template-rows,opacity] duration-300 ease-ripple-out"
    style:grid-template-rows={isOpen ? '1fr' : '0fr'}
    style:opacity={isOpen ? 1 : 0}
  >
    <div class="min-h-0 overflow-hidden">
      <div class="space-y-3 border-t border-ripple-border px-3 py-2.5">
        {#if hasError}
          <div class="rounded-md bg-ripple-error/5 px-2.5 py-2 ring-1 ring-ripple-error/20">
            <div class="mb-1 text-[11px] font-semibold tracking-wide text-ripple-error uppercase">
              Error
            </div>
            <div class="text-[12.5px] whitespace-pre-wrap text-ripple-error">{error}</div>
          </div>
        {/if}

        {#if hasArgs}
          <div>
            <div
              class="mb-1 text-[11px] font-semibold tracking-wide text-ripple-muted-foreground uppercase"
            >
              Arguments
            </div>
            <CodeBlock code={argsText} language="json" hideCopy />
          </div>
        {/if}

        {#if hasResult}
          <div>
            <div
              class="mb-1 text-[11px] font-semibold tracking-wide text-ripple-muted-foreground uppercase"
            >
              Result
            </div>
            {#if resultMarkdown && typeof result === 'string'}
              <Markdown content={resultText} />
            {:else}
              <CodeBlock code={resultText} language={typeof result === 'string' ? '' : 'json'} hideCopy />
            {/if}
          </div>
        {/if}

        {#if !hasError && !hasArgs && !hasResult}
          <div class="text-[12.5px] text-ripple-muted-foreground italic">
            No arguments or output to show.
          </div>
        {/if}
      </div>
    </div>
  </div>
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
    .ripple-tool-body {
      transition: none;
    }
  }
</style>
