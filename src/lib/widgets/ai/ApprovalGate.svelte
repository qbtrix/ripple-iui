<!--
  @file widgets/ai/ApprovalGate.svelte
  @description NEW (AI-native tier, 2026-06-24). The human-in-the-loop approval /
    diff-review organism — the product's core thesis ("the human mans the gate").
    Renders a PROPOSED agent action and lets a human approve / deny / edit it.
    Composition (all body parts are optional + driven by props, so a spec author
    composes what the review shows):
      • Header  — title (the proposed action), an optional one-line summary, and a
                  RISK badge (low | medium | high) conveyed by TEXT + color, never
                  color alone; high carries a destructive tone.
      • Body    — any of: a Diff (REUSES display/Diff for before/after), one or more
                  ToolCall cards (REUSES ai/ToolCall for the proposed calls), and/or
                  plain summary markdown (REUSES display/Markdown).
      • Decision — Approve (primary), Deny (destructive-outline), optional Edit.
    On a decision the card (1) resolves LOCALLY: pending → approved | denied (controls
    dim, a status stamp announces the outcome), and (2) fires the matching callback
    (onapprove / ondeny / onedit) carrying the actionId so the host can wire it to
    emit / call_binding (Instinct records the decision). When the node is `bind`-bound,
    it ALSO fires `ondecision(next)` with the new decision string, so NodeRenderer
    persists it through stateManager.set → onStateChange (the Kanban/Table pattern) and
    a refresh remembers the outcome. Unbound usage stays purely local + callback-driven.
  @a11y Real <button>s with explicit labels; risk + resolved state are conveyed by
    text (not color); the resolved stamp is announced via aria-live; the controls are
    keyboard-operable. The resolve transition honors prefers-reduced-motion.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Diff from '$lib/widgets/display/Diff.svelte';
  import ToolCall from './ToolCall.svelte';
  import Markdown from '$lib/widgets/display/Markdown.svelte';
  import ShieldIcon from '@lucide/svelte/icons/shield';
  import CheckIcon from '@lucide/svelte/icons/check';
  import XIcon from '@lucide/svelte/icons/x';
  import PencilIcon from '@lucide/svelte/icons/pencil';

  type Risk = 'low' | 'medium' | 'high';
  type Decision = 'pending' | 'approved' | 'denied';

  /** Before/after payload handed straight to the Diff widget. */
  interface DiffPayload {
    before?: string;
    after?: string;
    mode?: 'lines' | 'words' | 'chars';
    layout?: 'unified' | 'split';
    title?: string;
  }

  /** A proposed tool call — shape mirrors ToolCall's props. */
  interface ProposedCall {
    name?: string;
    status?: 'pending' | 'running' | 'success' | 'error';
    args?: Record<string, unknown> | unknown;
    result?: unknown;
    durationMs?: number;
    time?: string;
    error?: string;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** The proposed action, e.g. "Update 3 customer records". */
    title?: string;
    /** Optional one-line summary under the title. */
    summary?: string;
    /** Risk level — drives the badge color + tone. Conveyed by TEXT too. */
    risk?: Risk;
    /**
     * The decision state. When bound (`bind: "{state.x}"`) NodeRenderer feeds the
     * persisted value here and the card renders resolved. Defaults to 'pending'.
     */
    decision?: Decision;
    /** Identifier for the proposed action, passed back to the host callbacks. */
    actionId?: string;
    /** Before/after payload — rendered with the Diff widget when present. */
    diff?: DiffPayload;
    /** Convenience alias for `diff` (a spec author may write either). */
    changes?: DiffPayload;
    /** Proposed tool calls — each rendered with the ToolCall widget. */
    toolCalls?: ProposedCall[];
    /** Plain markdown body shown above/below the structured parts. */
    body?: string;
    /** Alias for `body`. */
    markdown?: string;
    /** Approve button label. */
    approveLabel?: string;
    /** Deny button label. */
    denyLabel?: string;
    /** Edit button label. Edit is shown only when `onedit` is supplied. */
    editLabel?: string;
    /** Who decided — shown in the resolved stamp ("Approved by Ada"). */
    decidedBy?: string;
    /** Disable the controls entirely (e.g. while the host is persisting). */
    disabled?: boolean;
    /**
     * Fired when the node is bound — carries the NEW decision string so
     * NodeRenderer persists it (default bind contract for `approval-gate` is
     * `{ prop: 'decision', event: 'ondecision' }`).
     */
    ondecision?: (next: Decision) => void;
    /** Fired on approve — carries the actionId so the host records the decision. */
    onapprove?: (info: { actionId?: string }) => void;
    /** Fired on deny — carries the actionId. */
    ondeny?: (info: { actionId?: string }) => void;
    /** Fired on edit — carries the actionId. Shown only when supplied. */
    onedit?: (info: { actionId?: string }) => void;
  }

  let {
    id,
    class: className,
    style,
    title = 'Proposed action',
    summary,
    risk = 'medium',
    decision = 'pending',
    actionId,
    diff,
    changes,
    toolCalls = [],
    body,
    markdown,
    approveLabel = 'Approve',
    denyLabel = 'Deny',
    editLabel = 'Edit',
    decidedBy,
    disabled = false,
    ondecision,
    onapprove,
    ondeny,
    onedit,
  }: Props = $props();

  // Local decision state. Seeded from the (possibly bound) `decision` prop; a
  // click resolves it immediately for snappy UX, and the bound prop keeps it in
  // sync on the round-trip when persistence is wired.
  // svelte-ignore state_referenced_locally
  let localDecision = $state<Decision>(decision);
  // Keep the local state aligned with the bound prop (e.g. a refresh restores it,
  // or the host pushes a server decision). The user's own click also lands here
  // first; this just reconciles when the prop is the source of truth.
  $effect(() => {
    localDecision = decision;
  });
  const resolved = $derived(localDecision !== 'pending');

  const RISK: Record<Risk, { label: string; cls: string }> = {
    low: {
      label: 'Low risk',
      cls: 'bg-ripple-success/10 text-ripple-success border-ripple-success/20',
    },
    medium: {
      label: 'Medium risk',
      cls: 'bg-ripple-warning/10 text-ripple-warning border-ripple-warning/20',
    },
    high: {
      label: 'High risk',
      cls: 'bg-destructive/10 text-destructive border-destructive/20',
    },
  };
  const riskMeta = $derived(RISK[risk] ?? RISK.medium);

  const DECISION_STAMP: Record<Exclude<Decision, 'pending'>, { label: string; cls: string }> = {
    approved: {
      label: 'Approved',
      cls: 'bg-ripple-success/10 text-ripple-success border-ripple-success/20',
    },
    denied: {
      label: 'Denied',
      cls: 'bg-destructive/10 text-destructive border-destructive/20',
    },
  };
  const stampMeta = $derived(
    localDecision === 'pending' ? null : DECISION_STAMP[localDecision]
  );

  // Body composition — resolve the diff payload (either `diff` or `changes`) and
  // detect which parts are present so the body only renders what was supplied.
  const diffPayload = $derived(diff ?? changes);
  const hasDiff = $derived(
    !!diffPayload && (
      (typeof diffPayload.before === 'string' && diffPayload.before.length > 0) ||
      (typeof diffPayload.after === 'string' && diffPayload.after.length > 0)
    )
  );
  const calls = $derived(Array.isArray(toolCalls) ? toolCalls : []);
  const hasCalls = $derived(calls.length > 0);
  const bodyText = $derived(body ?? markdown ?? '');
  const hasBody = $derived(bodyText.length > 0);

  const showEdit = $derived(typeof onedit === 'function');

  const stampId = $derived(`${id ?? 'approval-gate'}-status`);

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function decide(next: Exclude<Decision, 'pending'>) {
    if (disabled || resolved) return;
    localDecision = next;
    // Bound-state persistence (Kanban/Table pattern) — only meaningful when the
    // node is bound; NodeRenderer supplies `ondecision` then.
    ondecision?.(next);
    // Host callback so Instinct can record the decision via emit / call_binding.
    if (next === 'approved') onapprove?.({ actionId });
    else ondeny?.({ actionId });
  }

  function edit() {
    if (disabled || resolved) return;
    onedit?.({ actionId });
  }
</script>

<div
  {id}
  data-variant="default"
  data-risk={risk}
  data-decision={localDecision}
  data-resolved={resolved}
  class={cn(
    'ripple-approval-gate rounded-lg border bg-card overflow-hidden text-sm',
    risk === 'high' && localDecision === 'pending' ? 'border-destructive/40' : 'border-border',
    className
  )}
  style={styleString}
>
  <!-- Header — title, summary, risk badge -->
  <div class="flex items-start gap-3 px-4 py-3 border-b border-border">
    <span class="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true">
      <ShieldIcon size={16} />
    </span>
    <div class="min-w-0 flex-1">
      <div class="font-medium leading-snug">{title}</div>
      {#if summary}
        <div class="mt-0.5 text-[13px] text-muted-foreground leading-snug">{summary}</div>
      {/if}
    </div>
    <span
      class={cn(
        'shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        riskMeta.cls
      )}
    >
      {riskMeta.label}
    </span>
  </div>

  <!-- Body — composed from the supplied parts (markdown / diff / tool calls) -->
  {#if hasBody || hasDiff || hasCalls}
    <div class="px-4 py-3 space-y-3">
      {#if hasBody}
        <Markdown content={bodyText} />
      {/if}

      {#if hasDiff && diffPayload}
        <Diff
          before={diffPayload.before ?? ''}
          after={diffPayload.after ?? ''}
          mode={diffPayload.mode ?? 'lines'}
          layout={diffPayload.layout ?? 'unified'}
          title={diffPayload.title}
        />
      {/if}

      {#if hasCalls}
        <div class="space-y-2">
          {#each calls as call, i (i)}
            <ToolCall
              name={call.name}
              status={call.status ?? 'pending'}
              args={call.args}
              result={call.result}
              durationMs={call.durationMs}
              time={call.time}
              error={call.error}
            />
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Decision controls / resolved stamp -->
  <div class="flex items-center gap-2 px-4 py-3 border-t border-border bg-muted/20">
    {#if resolved && stampMeta}
      <span
        class={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium',
          stampMeta.cls
        )}
      >
        {#if localDecision === 'approved'}
          <CheckIcon size={13} aria-hidden="true" />
        {:else}
          <XIcon size={13} aria-hidden="true" />
        {/if}
        {stampMeta.label}{#if decidedBy}<span class="font-normal text-muted-foreground"> by {decidedBy}</span>{/if}
      </span>
    {:else}
      <button
        type="button"
        onclick={() => decide('approved')}
        disabled={disabled || resolved}
        class={cn(
          'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium',
          'bg-primary text-primary-foreground hover:bg-primary/90 transition-colors',
          'disabled:opacity-50 disabled:pointer-events-none'
        )}
      >
        <CheckIcon size={14} aria-hidden="true" />
        {approveLabel}
      </button>
      <button
        type="button"
        onclick={() => decide('denied')}
        disabled={disabled || resolved}
        class={cn(
          'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[13px] font-medium',
          'border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors',
          'disabled:opacity-50 disabled:pointer-events-none'
        )}
      >
        <XIcon size={14} aria-hidden="true" />
        {denyLabel}
      </button>
      {#if showEdit}
        <button
          type="button"
          onclick={edit}
          disabled={disabled || resolved}
          class={cn(
            'ml-auto inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium',
            'text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
            'disabled:opacity-50 disabled:pointer-events-none'
          )}
        >
          <PencilIcon size={14} aria-hidden="true" />
          {editLabel}
        </button>
      {/if}
    {/if}
  </div>

  <!-- a11y: announce the resolved outcome to assistive tech. -->
  <div id={stampId} class="sr-only" aria-live="polite">
    {#if localDecision === 'approved'}
      You approved this action{decidedBy ? ` (by ${decidedBy})` : ''}.
    {:else if localDecision === 'denied'}
      You denied this action{decidedBy ? ` (by ${decidedBy})` : ''}.
    {/if}
  </div>
</div>
