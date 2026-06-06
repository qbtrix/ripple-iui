<!--
  @file ChecklistLayout.svelte
  @description Gated checklist with owners, due dates, attachments and blocked
  dependencies. Used for onboarding, compliance audits, QA gates, change
  management, daily ops. Distinct from `steps` (which is a visual indicator)
  because each item carries owner / due / blocked / attachments and supports
  per-item event actions.
  @changes 2026-06-06 — make the checklist reactive. Added the default
  `value` + `onchange` bind surface (mirrors TodoList) so a spec can
  `bind: "state.checklist"` and have toggles persist through StateManager.
  Toggling now optimistically emits a NEW items array with the flipped item's
  state, gates blocked items (cannot be marked done), and still fires
  `toggleActions` as an enterprise side-effect hook (API / audit / emit).
-->
<script lang="ts">
  import { getContext } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { safeArray } from '$lib/utils/safe-props.js';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import type { EventHandler, EventHandlerOrArray } from '$lib/schema/event-handler.js';
  import type { EventDispatcher } from '$lib/core/event-dispatcher.js';
  import type { StateManager } from '$lib/core/state-manager.svelte.js';

  type State = 'pending' | 'in-progress' | 'done' | 'blocked' | 'skipped';

  interface Owner {
    id?: string;
    name: string;
    avatar?: string;
  }

  interface Attachment {
    name: string;
    url?: string;
  }

  interface ChecklistItem {
    id: string;
    label: string;
    description?: string;
    state?: State;
    owner?: Owner;
    due?: string;
    overdue?: boolean;
    blockedBy?: string[];
    attachments?: Attachment[];
    /** Click anywhere on the row (other than the checkbox). */
    actions?: EventHandlerOrArray;
    /** Click the checkbox / toggle. */
    toggleActions?: EventHandlerOrArray;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title?: string;
    description?: string;
    /** Items when not bound (static spec). */
    items?: ChecklistItem[];
    /** Bound value from NodeRenderer (`bind` resolves here). Wins over `items`. */
    value?: ChecklistItem[];
    groupBy?: 'none' | 'state' | 'owner';
    showProgress?: boolean;
    /** When provided, overrides the auto-computed value. */
    progress?: number;
    emptyText?: string;
    onitemclick?: (id: string) => void;
    ontoggle?: (id: string, nextDone: boolean) => void;
    /** Fires with the full new array whenever an item's state changes. */
    onchange?: (items: ChecklistItem[]) => void;
  }

  let {
    id,
    class: className,
    style,
    title,
    description,
    items: rawItems = [],
    value,
    groupBy = 'none',
    showProgress = true,
    progress,
    emptyText = 'No items yet.',
    onitemclick,
    ontoggle,
    onchange
  }: Props = $props();

  // Bound value wins; fall back to the static `items` prop.
  const items = $derived(
    safeArray<ChecklistItem>(value ?? rawItems, { widget: 'checklist-layout', key: 'items' })
  );

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const eventDispatcher = getContext<EventDispatcher | undefined>('ui-events');
  const stateManager = getContext<StateManager | undefined>('ui-state');

  const STATE_META: Record<State, { label: string; color: string; bg: string; icon: string }> = {
    pending: { label: 'Pending', color: 'var(--muted-foreground)', bg: 'var(--muted)', icon: 'circle' },
    'in-progress': { label: 'In progress', color: 'oklch(0.55 0.18 250)', bg: 'color-mix(in oklab, oklch(0.55 0.18 250) 12%, transparent)', icon: 'loader' },
    done: { label: 'Done', color: 'oklch(0.55 0.18 150)', bg: 'color-mix(in oklab, oklch(0.55 0.18 150) 14%, transparent)', icon: 'check' },
    blocked: { label: 'Blocked', color: 'oklch(0.55 0.22 25)', bg: 'color-mix(in oklab, oklch(0.55 0.22 25) 12%, transparent)', icon: 'ban' },
    skipped: { label: 'Skipped', color: 'var(--muted-foreground)', bg: 'var(--muted)', icon: 'minus' }
  };

  const computedProgress = $derived.by(() => {
    if (progress !== undefined) return progress;
    if (items.length === 0) return 0;
    const done = items.filter((i) => i.state === 'done' || i.state === 'skipped').length;
    return Math.round((done / items.length) * 100);
  });

  const counts = $derived.by(() => {
    const out: Record<State, number> = { pending: 0, 'in-progress': 0, done: 0, blocked: 0, skipped: 0 };
    for (const i of items) {
      const s = i.state ?? 'pending';
      out[s] = (out[s] ?? 0) + 1;
    }
    return out;
  });

  const groups = $derived.by<{ key: string; label: string; items: ChecklistItem[] }[]>(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: '', items }];
    }
    const map = new Map<string, { label: string; items: ChecklistItem[] }>();
    for (const i of items) {
      let key: string;
      let label: string;
      if (groupBy === 'state') {
        const s = i.state ?? 'pending';
        key = s;
        label = STATE_META[s].label;
      } else {
        key = i.owner?.id ?? i.owner?.name ?? '__unassigned';
        label = i.owner?.name ?? 'Unassigned';
      }
      if (!map.has(key)) map.set(key, { label, items: [] });
      map.get(key)!.items.push(i);
    }
    if (groupBy === 'state') {
      const order: State[] = ['blocked', 'in-progress', 'pending', 'done', 'skipped'];
      return order.filter((s) => map.has(s)).map((s) => ({ key: s, label: map.get(s)!.label, items: map.get(s)!.items }));
    }
    return Array.from(map.entries()).map(([key, v]) => ({ key, label: v.label, items: v.items }));
  });

  function fire(handler: EventHandlerOrArray | undefined, payload: ChecklistItem) {
    if (!handler || !eventDispatcher) return false;
    const handlers = Array.isArray(handler) ? handler : [handler];
    void eventDispatcher.dispatch(
      handlers as EventHandler[],
      { state: stateManager?.state ?? {}, item: payload },
      payload
    );
    return true;
  }

  function handleRowClick(it: ChecklistItem) {
    const fired = fire(it.actions, it);
    if (!fired) onitemclick?.(it.id);
  }
  function handleToggle(it: ChecklistItem, e: MouseEvent) {
    e.stopPropagation();
    const goingDone = it.state !== 'done';
    const isBlocked = it.state === 'blocked' || (it.blockedBy?.length ?? 0) > 0;

    // Enterprise side-effect hook: fire toggleActions regardless (API call,
    // audit log, emit) so a spec can react to the intent even when gated.
    fire(it.toggleActions, it);
    ontoggle?.(it.id, goingDone);

    // Gate: a blocked item cannot be optimistically marked done. Un-doning a
    // completed item is always allowed.
    if (goingDone && isBlocked) return;

    // Optimistic local update: emit a NEW array with this item's state flipped.
    // When the checklist is value-bound, NodeRenderer writes it back through
    // StateManager and the widget re-renders reactively.
    const nextState: State = goingDone ? 'done' : 'pending';
    onchange?.(items.map((row) => (row.id === it.id ? { ...row, state: nextState } : row)));
  }
  function initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join('');
  }
</script>

<div {id} class={cn('rcheck', className)} style={styleString}>
  {#if title || description || showProgress}
    <header class="rcheck-header">
      <div class="rcheck-header-main">
        {#if title}<h2 class="rcheck-title">{title}</h2>{/if}
        {#if description}<p class="rcheck-description">{description}</p>{/if}
      </div>
      {#if showProgress && items.length > 0}
        <div class="rcheck-progress">
          <div class="rcheck-progress-track">
            <div class="rcheck-progress-fill" style={`width:${Math.max(0, Math.min(100, computedProgress))}%`}></div>
          </div>
          <span class="rcheck-progress-label">{computedProgress}% · {counts.done + counts.skipped}/{items.length} done</span>
        </div>
      {/if}
    </header>

    {#if items.length > 0}
      <div class="rcheck-counts">
        {#if counts.blocked}<span class="rcheck-count rcheck-count-blocked">{counts.blocked} blocked</span>{/if}
        {#if counts['in-progress']}<span class="rcheck-count rcheck-count-progress">{counts['in-progress']} in progress</span>{/if}
        {#if counts.pending}<span class="rcheck-count">{counts.pending} pending</span>{/if}
        {#if counts.done}<span class="rcheck-count rcheck-count-done">{counts.done} done</span>{/if}
        {#if counts.skipped}<span class="rcheck-count">{counts.skipped} skipped</span>{/if}
      </div>
    {/if}
  {/if}

  {#if items.length === 0}
    <div class="rcheck-empty">{emptyText}</div>
  {:else}
    <div class="rcheck-groups">
      {#each groups as g (g.key)}
        {#if g.label}
          <div class="rcheck-group-label">{g.label} <span class="rcheck-group-count">{g.items.length}</span></div>
        {/if}
        <ul class="rcheck-list">
          {#each g.items as it (it.id)}
            {@const s = it.state ?? 'pending'}
            {@const meta = STATE_META[s]}
            {@const blocked = it.blockedBy && it.blockedBy.length > 0}
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
            <li
              class={cn('rcheck-item', `rcheck-item-${s}`, blocked && 'rcheck-item-blocked')}
              onclick={() => handleRowClick(it)}
            >
              <button
                type="button"
                class={cn('rcheck-toggle', s === 'done' && 'rcheck-toggle-done')}
                onclick={(e) => handleToggle(it, e)}
                aria-label={s === 'done' ? 'Mark as not done' : 'Mark as done'}
              >
                {#if s === 'done'}
                  <Icon name="check" size={14} color="white" />
                {:else if s === 'in-progress'}
                  <span class="rcheck-toggle-spin"></span>
                {:else if s === 'blocked'}
                  <Icon name="ban" size={14} color="oklch(0.55 0.22 25)" />
                {:else if s === 'skipped'}
                  <Icon name="minus" size={14} />
                {/if}
              </button>
              <div class="rcheck-body">
                <div class="rcheck-row">
                  <div class="rcheck-label">{it.label}</div>
                  <div class="rcheck-meta">
                    {#if it.due}
                      <span class={cn('rcheck-due', it.overdue && 'rcheck-due-overdue')}>
                        <Icon name="calendar" size={11} />
                        {it.due}
                      </span>
                    {/if}
                    {#if it.attachments && it.attachments.length > 0}
                      <span class="rcheck-attach">
                        <Icon name="paperclip" size={11} />
                        {it.attachments.length}
                      </span>
                    {/if}
                    {#if it.owner}
                      <span class="rcheck-owner" title={it.owner.name}>
                        {#if it.owner.avatar}
                          <img src={it.owner.avatar} alt={it.owner.name} />
                        {:else}
                          <span class="rcheck-owner-initials">{initials(it.owner.name)}</span>
                        {/if}
                      </span>
                    {/if}
                  </div>
                </div>
                {#if it.description}
                  <p class="rcheck-desc">{it.description}</p>
                {/if}
                {#if blocked}
                  <div class="rcheck-blocked-by">
                    <Icon name="link-2" size={11} />
                    Blocked by: {it.blockedBy!.join(', ')}
                  </div>
                {/if}
              </div>
              <span
                class="rcheck-state-pill"
                style={`color:${meta.color}; background:${meta.bg};`}
              >
                {meta.label}
              </span>
            </li>
          {/each}
        </ul>
      {/each}
    </div>
  {/if}
</div>

<style>
  .rcheck {
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 100%;
  }
  .rcheck-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .rcheck-header-main { flex: 1; min-width: 0; }
  .rcheck-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
  }
  .rcheck-description {
    font-size: 13px;
    color: var(--muted-foreground);
    margin: 4px 0 0;
  }
  .rcheck-progress {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    min-width: 180px;
  }
  .rcheck-progress-track {
    width: 180px;
    height: 6px;
    background: var(--muted);
    border-radius: 999px;
    overflow: hidden;
  }
  .rcheck-progress-fill {
    height: 100%;
    background: oklch(0.55 0.18 150);
    transition: width 0.3s ease;
  }
  .rcheck-progress-label {
    font-size: 11px;
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums;
  }
  .rcheck-counts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .rcheck-count {
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 500;
    background: var(--muted);
    color: var(--muted-foreground);
  }
  .rcheck-count-blocked {
    background: color-mix(in oklab, oklch(0.55 0.22 25) 12%, transparent);
    color: oklch(0.55 0.22 25);
  }
  .rcheck-count-progress {
    background: color-mix(in oklab, oklch(0.55 0.18 250) 12%, transparent);
    color: oklch(0.55 0.18 250);
  }
  .rcheck-count-done {
    background: color-mix(in oklab, oklch(0.55 0.18 150) 14%, transparent);
    color: oklch(0.55 0.18 150);
  }

  .rcheck-empty {
    padding: 24px;
    border: 1px dashed var(--border);
    border-radius: 12px;
    text-align: center;
    color: var(--muted-foreground);
    font-size: 13px;
  }

  .rcheck-groups {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .rcheck-group-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted-foreground);
    padding-left: 4px;
  }
  .rcheck-group-count {
    margin-left: 4px;
    color: var(--muted-foreground);
    font-weight: 500;
  }
  .rcheck-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .rcheck-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--card);
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }
  .rcheck-item:hover {
    background: color-mix(in oklab, var(--muted) 35%, transparent);
  }
  .rcheck-item-done {
    opacity: 0.85;
  }
  .rcheck-item-done .rcheck-label {
    color: var(--muted-foreground);
    text-decoration: line-through;
  }
  .rcheck-item-blocked {
    border-color: color-mix(in oklab, oklch(0.55 0.22 25) 30%, var(--border));
  }
  .rcheck-toggle {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    border: 1.5px solid var(--border);
    background: transparent;
    cursor: pointer;
    flex-shrink: 0;
    margin-top: 2px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: background 0.12s, border-color 0.12s;
  }
  .rcheck-toggle:hover {
    border-color: oklch(0.55 0.18 250);
  }
  .rcheck-toggle-done {
    background: oklch(0.55 0.18 150);
    border-color: oklch(0.55 0.18 150);
  }
  .rcheck-toggle-spin {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid color-mix(in oklab, oklch(0.55 0.18 250) 50%, transparent);
    border-top-color: oklch(0.55 0.18 250);
    animation: rcheck-spin 0.9s linear infinite;
  }
  @keyframes rcheck-spin {
    to { transform: rotate(360deg); }
  }
  .rcheck-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .rcheck-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    justify-content: space-between;
  }
  .rcheck-label {
    font-size: 13.5px;
    font-weight: 500;
    color: var(--foreground);
    line-height: 1.4;
  }
  .rcheck-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }
  .rcheck-due {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    color: var(--muted-foreground);
  }
  .rcheck-due-overdue {
    color: oklch(0.55 0.22 25);
    font-weight: 500;
  }
  .rcheck-attach {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    color: var(--muted-foreground);
  }
  .rcheck-owner img,
  .rcheck-owner-initials {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    background: var(--muted);
    color: var(--foreground);
    border: 1px solid var(--border);
    object-fit: cover;
  }
  .rcheck-desc {
    font-size: 12px;
    color: var(--muted-foreground);
    margin: 0;
    line-height: 1.5;
  }
  .rcheck-blocked-by {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: oklch(0.55 0.22 25);
    margin-top: 2px;
  }
  .rcheck-state-pill {
    align-self: flex-start;
    margin-top: 2px;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 500;
    flex-shrink: 0;
  }
</style>
