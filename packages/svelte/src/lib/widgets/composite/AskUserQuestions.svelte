<!--
  @file AskUserQuestions.svelte
  @description Stepped question flow with single/multi-select option rows, optional
    free-text "Other" field, and skip/back controls. Inspired by fluidfunctionalism's
    React component; ported to Svelte 5 runes with the polish layers (proximity hover,
    ResizeObserver-driven height morph, platform-specific shortcut hints) intentionally
    omitted — easy to layer in later.

    After the last question is answered the widget shows a read-only recap of every
    question and its selected answer. `completeActions` (with the human-readable
    summary as the event value, which `emit: chat.send` consumes verbatim) and
    `oncomplete` fire when the user confirms from that recap — not silently on the
    final pick. Also fires `changeActions` on every answer mutation and `skipActions`
    when the user skips a question.

    @changes 2026-06-06 — added the end-of-flow read-only recap + Confirm gate.
    @changes 2026-06-09 — a11y fix: moved onkeydown to <svelte:window> so the
      container div (tabindex="-1" focus-trap) carries no keyboard listener,
      fixing a11y_no_noninteractive_element_interactions. Reverted role to
      "region" (plain landmark, no interactions). Recipe 3.

  Spec example:
    {
      "type": "ask_user_questions",
      "props": {
        "questions": [
          { "title": "Pick a coffee", "options": [{"title":"Espresso"},{"title":"Latte"}] }
        ]
      },
      "completeActions": { "action": "emit", "target": "chat.send" }
    }
-->
<script lang="ts">
  import { getContext, onMount, tick } from 'svelte';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { cn } from '$lib/utils.js';
  import type { EventHandler, EventHandlerOrArray } from '@ripple-ui/core';
  import type { EventDispatcher } from '@ripple-ui/core';
  import type { StateManager } from '$lib/core/state-manager.svelte.js';

  interface Option {
    id?: string;
    title: string;
    description?: string;
  }

  interface Question {
    id?: string;
    title: string;
    options: Option[];
    multiSelect?: boolean;
    allowOther?: boolean;
    otherPlaceholder?: string;
    skippable?: boolean;
    nextLabel?: string;
    layout?: 'inline' | 'stacked';
  }

  interface Answer {
    questionId: string;
    selectedTitles: string[];
    otherText?: string;
    skipped?: boolean;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    questions: Question[];
    currentIndex?: number;
    answers?: Record<string, Answer>;
    skipLabel?: string;
    completeActions?: EventHandlerOrArray;
    skipActions?: EventHandlerOrArray;
    changeActions?: EventHandlerOrArray;
    oncomplete?: (answers: Record<string, Answer>) => void;
    onskip?: (questionId: string, idx: number) => void;
    onchange?: (answers: Record<string, Answer>) => void;
  }

  let {
    id,
    class: className,
    style,
    questions = [],
    currentIndex = $bindable(0),
    answers = $bindable({}),
    skipLabel = 'Skip',
    completeActions,
    skipActions,
    changeActions,
    oncomplete,
    onskip,
    onchange,
  }: Props = $props();

  const eventDispatcher = getContext<EventDispatcher | undefined>('ui-events');
  const stateManager = getContext<StateManager | undefined>('ui-state');

  const total = $derived(questions.length);
  const safeIndex = $derived(
    Math.max(0, Math.min(currentIndex ?? 0, Math.max(0, total - 1))),
  );
  const question = $derived(questions[safeIndex]);
  const qId = $derived(question?.id ?? `q-${safeIndex}`);
  const layout = $derived<'inline' | 'stacked'>(question?.layout ?? 'inline');
  const isMulti = $derived(!!question?.multiSelect);
  const isSkippable = $derived(question?.skippable !== false);
  const allowOther = $derived(!!question?.allowOther);
  const options = $derived(question?.options ?? []);
  const nextLabel = $derived(question?.nextLabel ?? 'Continue');

  const currentAnswer = $derived(answers[qId]);
  const selectedTitles = $derived(currentAnswer?.selectedTitles ?? []);
  const otherText = $derived(currentAnswer?.otherText ?? '');

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined,
  );

  let otherInputRef = $state<HTMLTextAreaElement | null>(null);
  let containerRef = $state<HTMLDivElement | null>(null);
  // Terminal read-only recap shown after the last question is answered.
  let reviewing = $state(false);

  function optionTitle(o: Option, i: number): string {
    return o.title || o.id || `Option ${i + 1}`;
  }

  function fire(handler: EventHandlerOrArray | undefined, value?: unknown) {
    if (!handler || !eventDispatcher) return;
    const handlers = Array.isArray(handler) ? handler : [handler];
    void eventDispatcher.dispatch(
      handlers as EventHandler[],
      { state: stateManager?.state ?? {} },
      value,
    );
  }

  function formatAnswer(q: Question, a: Answer | undefined): string {
    if (!a) return `${q.title}: (no answer)`;
    if (a.skipped) return `${q.title}: (skipped)`;
    const parts: string[] = [];
    if (a.selectedTitles.length) parts.push(a.selectedTitles.join(', '));
    if (a.otherText) parts.push(`Other: ${a.otherText}`);
    return `${q.title}: ${parts.join(' / ') || '(no answer)'}`;
  }

  function formatAllAnswers(snapshot: Record<string, Answer>): string {
    return questions
      .map((q, i) => formatAnswer(q, snapshot[q.id ?? `q-${i}`]))
      .join('\n');
  }

  // Just the answer portion (no question title) for the recap rows.
  function answerValue(a: Answer | undefined): string {
    if (!a) return '(no answer)';
    if (a.skipped) return '(skipped)';
    const parts: string[] = [];
    if (a.selectedTitles.length) parts.push(a.selectedTitles.join(', '));
    if (a.otherText) parts.push(`Other: ${a.otherText}`);
    return parts.join(' / ') || '(no answer)';
  }

  function writeAnswer(patch: (prev: Answer | undefined) => Answer) {
    const next = { ...answers, [qId]: patch(answers[qId]) };
    answers = next;
    onchange?.(next);
    fire(changeActions, next);
    return next;
  }

  function commitNext(snapshot: Record<string, Answer>) {
    if (safeIndex >= total - 1) {
      // Show the read-only recap; completion fires on Confirm, not here.
      reviewing = true;
      return;
    }
    currentIndex = safeIndex + 1;
  }

  function confirmAnswers() {
    oncomplete?.(answers);
    fire(completeActions, formatAllAnswers(answers));
  }

  function editFromRecap() {
    reviewing = false;
  }

  function pickSingle(title: string) {
    const snap = writeAnswer((prev) => ({
      questionId: qId,
      selectedTitles: [title],
      otherText: prev?.otherText,
      skipped: false,
    }));
    commitNext(snap);
  }

  function toggleMulti(title: string) {
    writeAnswer((prev) => {
      const set = new Set(prev?.selectedTitles ?? []);
      if (set.has(title)) set.delete(title);
      else set.add(title);
      return {
        questionId: qId,
        selectedTitles: Array.from(set),
        otherText: prev?.otherText,
        skipped: false,
      };
    });
  }

  function handleOtherInput(e: Event) {
    const v = (e.target as HTMLTextAreaElement).value;
    writeAnswer((prev) => ({
      questionId: qId,
      selectedTitles: prev?.selectedTitles ?? [],
      otherText: v,
      skipped: false,
    }));
  }

  function submitMulti() {
    commitNext(answers);
  }

  function handleSkip() {
    const snap = writeAnswer((prev) => ({
      questionId: qId,
      selectedTitles: prev?.selectedTitles ?? [],
      otherText: prev?.otherText,
      skipped: true,
    }));
    onskip?.(qId, safeIndex);
    fire(skipActions, qId);
    commitNext(snap);
  }

  function handleBack() {
    if (safeIndex > 0) currentIndex = safeIndex - 1;
  }

  function isSelected(title: string): boolean {
    return selectedTitles.includes(title);
  }

  function onKeydown(e: KeyboardEvent) {
    if (!question) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tgt = e.target as HTMLElement | null;
    if (!tgt) return;
    const tag = tgt.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tgt.isContentEditable) return;
    if (e.key >= '1' && e.key <= '9') {
      const idx = parseInt(e.key, 10) - 1;
      if (idx < options.length) {
        e.preventDefault();
        const title = optionTitle(options[idx], idx);
        if (isMulti) toggleMulti(title);
        else pickSingle(title);
      } else if (idx === options.length && allowOther) {
        e.preventDefault();
        otherInputRef?.focus();
      }
      return;
    }
    if (e.key === 'ArrowLeft' && safeIndex > 0) {
      e.preventDefault();
      handleBack();
    } else if (e.key === 'ArrowRight' && isSkippable) {
      e.preventDefault();
      handleSkip();
    }
  }

  onMount(() => {
    tick().then(() => containerRef?.focus());
  });
</script>

<svelte:window onkeydown={onKeydown} />
<div
  bind:this={containerRef}
  {id}
  class={cn('auq-root', className)}
  style={styleString}
  role="region"
  aria-label="Question flow"
  tabindex="-1"
>
  {#if reviewing}
    <div class="auq-header">
      <span class="auq-counter">Review</span>
      <h3 class="auq-title">Review your answers</h3>
    </div>
    <div class="auq-review">
      {#each questions as q, i (q.id ?? i)}
        {@const a = answers[q.id ?? `q-${i}`]}
        <div class={cn('auq-review-item', a?.skipped && 'auq-review-item-skipped')}>
          <span class="auq-review-q">{q.title}</span>
          <span class="auq-review-a">{answerValue(a)}</span>
        </div>
      {/each}
    </div>
    <div class="auq-footer">
      <button type="button" class="auq-btn auq-btn-ghost" onclick={editFromRecap}>← Back</button>
      <div class="auq-footer-spacer"></div>
      <button type="button" class="auq-btn auq-btn-primary" onclick={confirmAnswers}>Confirm</button>
    </div>
  {:else if !question}
    <div class="auq-empty">No questions provided.</div>
  {:else}
    <div class="auq-header">
      <span class="auq-counter">Question {safeIndex + 1} of {total}</span>
      <h3 class="auq-title">{question.title}</h3>
    </div>

    {#key safeIndex}
      <div
        class="auq-body"
        in:fly={{ y: 8, duration: 220, easing: cubicOut }}
      >
        <div
          class={cn('auq-options', layout === 'stacked' ? 'auq-options-stacked' : 'auq-options-inline')}
          role={isMulti ? 'group' : 'radiogroup'}
        >
          {#each options as opt, i (opt.id ?? i)}
            {@const title = optionTitle(opt, i)}
            {@const selected = isSelected(title)}
            <button
              type="button"
              class={cn('auq-row', selected && 'auq-row-selected')}
              role={isMulti ? 'checkbox' : 'radio'}
              aria-checked={selected}
              onclick={() => (isMulti ? toggleMulti(title) : pickSingle(title))}
            >
              <span class="auq-row-num" aria-hidden="true">{i + 1}</span>
              <span class="auq-row-content">
                <span class="auq-row-title">{title}</span>
                {#if opt.description}
                  <span class="auq-row-desc">{opt.description}</span>
                {/if}
              </span>
              {#if isMulti}
                <span
                  class={cn('auq-row-check', selected && 'auq-row-check-on')}
                  aria-hidden="true"
                >
                  {#if selected}✓{/if}
                </span>
              {/if}
            </button>
          {/each}

          {#if allowOther}
            <div class="auq-row auq-row-other">
              <span class="auq-row-num" aria-hidden="true">{options.length + 1}</span>
              <textarea
                bind:this={otherInputRef}
                class="auq-row-textarea"
                placeholder={question.otherPlaceholder ?? 'Other (type your own)'}
                value={otherText}
                oninput={handleOtherInput}
                rows="1"
              ></textarea>
            </div>
          {/if}
        </div>
      </div>
    {/key}

    <div class="auq-footer">
      <button
        type="button"
        class="auq-btn auq-btn-ghost"
        disabled={safeIndex === 0}
        onclick={handleBack}
      >← Back</button>

      <div class="auq-footer-spacer"></div>

      {#if isSkippable}
        <button type="button" class="auq-btn auq-btn-ghost" onclick={handleSkip}>
          {skipLabel} →
        </button>
      {/if}

      {#if isMulti}
        <button
          type="button"
          class="auq-btn auq-btn-primary"
          disabled={selectedTitles.length === 0 && !otherText.trim()}
          onclick={submitMulti}
        >{safeIndex === total - 1 ? 'Finish' : nextLabel}</button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .auq-root {
    display: flex; flex-direction: column;
    width: 100%;
    border-radius: 12px;
    border: 1px solid var(--border, rgba(255,255,255,0.08));
    background: var(--card, rgba(255,255,255,0.03));
    padding: 16px;
    gap: 12px;
    outline: none;
  }

  .auq-empty { color: var(--muted-foreground, rgba(255,255,255,0.5)); font-size: 13px; }

  .auq-review { display: flex; flex-direction: column; gap: 2px; }
  .auq-review-item {
    display: flex; flex-direction: column; gap: 2px;
    padding: 8px 12px; border-radius: 8px;
    border: 1px solid var(--border, rgba(255,255,255,0.06));
    background: rgba(255,255,255,0.02);
  }
  .auq-review-item-skipped { opacity: 0.6; }
  .auq-review-q {
    font-size: 11.5px; letter-spacing: 0.02em;
    color: var(--muted-foreground, rgba(255,255,255,0.5));
    font-variation-settings: 'wght' 550;
  }
  .auq-review-a {
    font-size: 13.5px; line-height: 1.4;
    color: var(--foreground, rgba(255,255,255,0.9));
    font-variation-settings: 'wght' 500;
  }

  .auq-header { display: flex; flex-direction: column; gap: 4px; }
  .auq-counter {
    font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--muted-foreground, rgba(255,255,255,0.45));
    font-variation-settings: 'wght' 600;
  }
  .auq-title {
    font-size: 16px; line-height: 1.35; margin: 0;
    color: var(--foreground, rgba(255,255,255,0.92));
    font-variation-settings: 'wght' 550;
  }

  .auq-body { display: flex; flex-direction: column; }
  .auq-options { display: flex; flex-direction: column; gap: 4px; }

  .auq-row {
    display: flex; align-items: flex-start; gap: 10px;
    width: 100%; padding: 10px 12px;
    border-radius: 8px; border: 1px solid transparent; background: transparent;
    color: inherit; text-align: left; font: inherit; cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }
  .auq-row:hover { background: rgba(255,255,255,0.04); }
  .auq-row:focus-visible {
    outline: none;
    border-color: var(--ring, rgba(120,160,255,0.5));
  }
  .auq-row-selected {
    background: rgba(120,160,255,0.10);
    border-color: rgba(120,160,255,0.35);
  }

  .auq-row-num {
    display: inline-flex; align-items: center; justify-content: center;
    width: 20px; height: 20px;
    border-radius: 4px;
    background: rgba(255,255,255,0.06);
    font-size: 11px; font-variation-settings: 'wght' 600;
    color: var(--muted-foreground, rgba(255,255,255,0.55));
    flex-shrink: 0; margin-top: 1px;
  }

  .auq-row-content { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
  .auq-options-inline .auq-row-content { flex-direction: row; align-items: baseline; gap: 8px; flex-wrap: wrap; }

  .auq-row-title {
    font-size: 13.5px; line-height: 1.4;
    color: var(--foreground, rgba(255,255,255,0.9));
    font-variation-settings: 'wght' 500;
  }
  .auq-row-desc {
    font-size: 12.5px; line-height: 1.4;
    color: var(--muted-foreground, rgba(255,255,255,0.55));
  }

  .auq-row-check {
    width: 18px; height: 18px; flex-shrink: 0;
    border-radius: 4px; border: 1px solid rgba(255,255,255,0.18);
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 12px; color: transparent;
  }
  .auq-row-check-on {
    background: rgba(120,160,255,0.85);
    border-color: rgba(120,160,255,0.85);
    color: white;
  }

  .auq-row-other { cursor: text; align-items: center; }
  .auq-row-textarea {
    flex: 1; resize: none; min-height: 22px; max-height: 120px;
    background: transparent; border: none; outline: none;
    color: inherit; font: inherit;
    font-size: 13.5px; line-height: 1.4;
    padding: 0;
  }
  .auq-row-textarea::placeholder { color: var(--muted-foreground, rgba(255,255,255,0.4)); }

  .auq-footer { display: flex; align-items: center; gap: 8px; padding-top: 4px; }
  .auq-footer-spacer { flex: 1; }

  .auq-btn {
    height: 32px; padding: 0 12px;
    border-radius: 6px; border: 1px solid transparent; background: transparent;
    color: inherit; font: inherit; font-size: 13px; cursor: pointer;
    font-variation-settings: 'wght' 500;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }
  .auq-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .auq-btn-ghost { color: var(--muted-foreground, rgba(255,255,255,0.55)); }
  .auq-btn-ghost:not(:disabled):hover { background: rgba(255,255,255,0.05); color: var(--foreground, rgba(255,255,255,0.9)); }
  .auq-btn-primary {
    background: rgba(120,160,255,0.85); color: white;
    border-color: rgba(120,160,255,0.85);
  }
  .auq-btn-primary:not(:disabled):hover { background: rgba(120,160,255,1); }
</style>
