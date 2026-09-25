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
  Modified: 2026-06-28 — forward node id (data-ripple-node) for visual-editor selection.
  Modified: 2026-09-14 — re-skinned on beautiful-ui. The card fades up on mount and
    the resolved stamp pops in; the decision controls become the source's footer
    pills (a filled accent Continue, a quiet outlined Deny, a ghost Edit); the
    frame moves onto ripple surface/border tokens with a ring instead of a border,
    and every "destructive" tone becomes ripple-error so red matches the
    success/warning tones in a ripple-rethemed host. Props, events, the bind
    contract and the a11y live region are untouched.
  Modified: 2026-09-16 — number the proposed tool calls. Each ToolCall now gets
    its index as an `--i` custom property through the `style` prop it already
    had, which is what ToolCall's own entry animation reads to stagger a list
    80ms apart instead of landing the whole run at once. No prop added anywhere.
  origin: slev12397/beautiful-ui@ff0f74d components/primitives/ApprovalCard.tsx
  2026-09-17 (fix/port-gaps): status-coloured text moved onto the readable
  text tokens (text-ripple-{error,success,warning,info}-text; red text that
  read text-destructive now reads text-ripple-error-text, the same hue since
  --ripple-error aliases --destructive). The raw tones are fill colours and
  measured 1.7-3.3:1 as text in light mode. Fills and tints are unchanged.
  Modified: 2026-09-25 (chat new-look slice 1) — optional reason on deny, opt-in
    through `askDenyReason` (default false, so every existing caller still
    denies in one click). When on, Deny swaps the footer for a labelled
    textarea with Confirm deny / Cancel; the card stays pending until
    confirmed. Confirm fires `ondeny({ actionId, reason })` with the trimmed
    reason, and leaves the `reason` key out when it is empty so the payload
    keeps its old shape. `ondecision(next)` is untouched: it is the bind
    contract NodeRenderer persists, and it carries the decision string only.
    Escape in the field backs out. The reason is not shown in the resolved
    stamp; a host that wants it there owns it.
  Modified: 2026-09-25 (fix/taskrows-approvalgate-labels) — the confirm button
    in the deny-reason flow was hard-coded "Confirm deny", so a host with
    denyLabel="Reject" still read "Confirm deny". New optional
    `confirmDenyLabel`; its default is `Confirm ${denyLabel.toLowerCase()}`,
    so the default output is still "Confirm deny".
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
    /** Confirm button label in the deny-reason flow. Defaults to `Confirm ${denyLabel.toLowerCase()}`. */
    confirmDenyLabel?: string;
    /** Edit button label. Edit is shown only when `onedit` is supplied. */
    editLabel?: string;
    /** Who decided — shown in the resolved stamp ("Approved by Ada"). */
    decidedBy?: string;
    /** Disable the controls entirely (e.g. while the host is persisting). */
    disabled?: boolean;
    /**
     * Ask for an optional reason before denying. Deny then opens a text field
     * with Confirm / Cancel, and the reason rides on `ondeny`. Default false.
     */
    askDenyReason?: boolean;
    /**
     * Fired when the node is bound — carries the NEW decision string so
     * NodeRenderer persists it (default bind contract for `approval-gate` is
     * `{ prop: 'decision', event: 'ondecision' }`).
     */
    ondecision?: (next: Decision) => void;
    /** Fired on approve — carries the actionId so the host records the decision. */
    onapprove?: (info: { actionId?: string }) => void;
    /** Fired on deny — carries the actionId, plus `reason` when one was given. */
    ondeny?: (info: { actionId?: string; reason?: string }) => void;
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
    confirmDenyLabel,
    editLabel = 'Edit',
    decidedBy,
    disabled = false,
    askDenyReason = false,
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
      cls: 'bg-ripple-success/10 text-ripple-success-text ring-ripple-success/20',
    },
    medium: {
      label: 'Medium risk',
      cls: 'bg-ripple-warning/10 text-ripple-warning-text ring-ripple-warning/20',
    },
    high: {
      label: 'High risk',
      cls: 'bg-ripple-error/10 text-ripple-error-text ring-ripple-error/20',
    },
  };
  const riskMeta = $derived(RISK[risk] ?? RISK.medium);

  const DECISION_STAMP: Record<Exclude<Decision, 'pending'>, { label: string; cls: string }> = {
    approved: {
      label: 'Approved',
      cls: 'bg-ripple-success/10 text-ripple-success-text ring-ripple-success/20',
    },
    denied: {
      label: 'Denied',
      cls: 'bg-ripple-error/10 text-ripple-error-text ring-ripple-error/20',
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

  function decide(next: Exclude<Decision, 'pending'>, reason?: string) {
    if (disabled || resolved) return;
    localDecision = next;
    // Bound-state persistence (Kanban/Table pattern) — only meaningful when the
    // node is bound; NodeRenderer supplies `ondecision` then.
    ondecision?.(next);
    // Host callback so Instinct can record the decision via emit / call_binding.
    if (next === 'approved') onapprove?.({ actionId });
    else ondeny?.(reason ? { actionId, reason } : { actionId });
  }

  // The opt-in deny-reason step. `askingReason` swaps the footer for the field.
  let askingReason = $state(false);
  let reasonText = $state('');
  let reasonField = $state<HTMLTextAreaElement>();
  $effect(() => {
    if (askingReason) reasonField?.focus();
  });

  function deny() {
    if (disabled || resolved) return;
    if (askDenyReason) askingReason = true;
    else decide('denied');
  }

  function confirmDeny(e: SubmitEvent) {
    e.preventDefault();
    decide('denied', reasonText.trim() || undefined);
    if (localDecision === 'denied') askingReason = false;
  }

  function backOut() {
    askingReason = false;
    reasonText = '';
  }

  function edit() {
    if (disabled || resolved) return;
    onedit?.({ actionId });
  }
</script>

<div
  {id}
  data-ripple-node={id}
  data-variant="default"
  data-risk={risk}
  data-decision={localDecision}
  data-resolved={resolved}
  class={cn(
    'ripple-approval-gate ripple-approval-fade-up overflow-hidden rounded-ripple bg-ripple-surface text-sm ring-1',
    risk === 'high' && localDecision === 'pending' ? 'ring-ripple-error/40' : 'ring-ripple-border',
    className
  )}
  style={styleString}
>
  <!-- Header — title, summary, risk badge -->
  <div class="flex items-start gap-3 border-b border-ripple-border px-4 py-3">
    <span class="mt-0.5 shrink-0 text-ripple-muted-foreground" aria-hidden="true">
      <ShieldIcon size={16} />
    </span>
    <div class="min-w-0 flex-1">
      <div class="text-[14px] font-medium leading-snug">{title}</div>
      {#if summary}
        <div class="mt-0.5 text-[12.5px] leading-snug text-ripple-muted-foreground">{summary}</div>
      {/if}
    </div>
    <span
      class={cn(
        'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1',
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
              style={{ '--i': String(i) }}
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
  <div class="flex items-center gap-2 border-t border-ripple-border bg-ripple-muted/20 px-4 py-3">
    {#if resolved && stampMeta}
      <span
        class={cn(
          'ripple-approval-pop-in inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ring-1',
          stampMeta.cls
        )}
      >
        {#if localDecision === 'approved'}
          <CheckIcon size={13} aria-hidden="true" />
        {:else}
          <XIcon size={13} aria-hidden="true" />
        {/if}
        {stampMeta.label}{#if decidedBy}<span class="font-normal text-ripple-muted-foreground"> by {decidedBy}</span>{/if}
      </span>
    {:else if askingReason}
      <form class="flex w-full flex-col gap-2" onsubmit={confirmDeny}>
        <textarea
          bind:this={reasonField}
          bind:value={reasonText}
          aria-label="Reason for denying (optional)"
          placeholder="Why not? (optional)"
          rows="2"
          onkeydown={(e) => e.key === 'Escape' && backOut()}
          class="w-full resize-none rounded-ripple bg-ripple-surface px-2.5 py-1.5 text-[12.5px] ring-1 ring-ripple-border placeholder:text-ripple-muted-foreground focus:outline-none focus-visible:ring-ripple-error/40"
        ></textarea>
        <div class="flex items-center gap-2">
          <button
            type="submit"
            {disabled}
            class={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium ring-1',
              'text-ripple-error-text ring-ripple-error/40 transition-colors duration-150 hover:bg-ripple-error/10',
              'disabled:pointer-events-none disabled:opacity-50'
            )}
          >
            <XIcon size={14} aria-hidden="true" />
            {confirmDenyLabel ?? `Confirm ${denyLabel.toLowerCase()}`}
          </button>
          <button
            type="button"
            onclick={backOut}
            class={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium',
              'text-ripple-muted-foreground transition-colors duration-150 hover:bg-ripple-accent/10 hover:text-ripple-surface-foreground'
            )}
          >
            Cancel
          </button>
        </div>
      </form>
    {:else}
      <button
        type="button"
        onclick={() => decide('approved')}
        disabled={disabled || resolved}
        class={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium',
          'bg-ripple-accent text-ripple-accent-foreground transition-colors duration-150 hover:bg-ripple-accent/90',
          'disabled:pointer-events-none disabled:opacity-50'
        )}
      >
        <CheckIcon size={14} aria-hidden="true" />
        {approveLabel}
      </button>
      <button
        type="button"
        onclick={deny}
        disabled={disabled || resolved}
        class={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium ring-1',
          'text-ripple-error-text ring-ripple-error/40 transition-colors duration-150 hover:bg-ripple-error/10',
          'disabled:pointer-events-none disabled:opacity-50'
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
            'ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium',
            'text-ripple-muted-foreground transition-colors duration-150 hover:bg-ripple-accent/10 hover:text-ripple-surface-foreground',
            'disabled:pointer-events-none disabled:opacity-50'
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

<style>
  .ripple-approval-fade-up {
    animation: ripple-approval-fade-up 380ms var(--ripple-ease-out) both;
  }
  .ripple-approval-pop-in {
    animation: ripple-approval-pop-in 260ms var(--ripple-ease-out) both;
  }
  @keyframes ripple-approval-fade-up {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @keyframes ripple-approval-pop-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .ripple-approval-fade-up,
    .ripple-approval-pop-in {
      animation: none;
    }
  }
</style>
