<!--
  QuizQuestion.svelte — RIPPLE-NATIVE organism (Wave 2: organisms).
  Created 2026-06-07.
  Adapted from ocean-flow's organisms/QuizQuestion.svelte, rewired off genesis
  IconWidget/shadcn onto ripple's display/Icon + the SelectionIndicator molecule
  and design tokens. Educational intent: a single-select question with
  correct/incorrect feedback after submission.

  Before submission it borrows OptionList semantics (radio rows + SelectionIndicator).
  After submission it can't delegate to OptionList — it must paint per-option
  correct/incorrect result chrome — so it renders the result state itself. The
  host owns nothing; selection + submitted are local UI state, and the verdict is
  surfaced via onAnswer(optionId, isCorrect). Pure presentation, no data fetching.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import SelectionIndicator from '$lib/molecules/SelectionIndicator.svelte';

  interface QuizOption {
    id: string;
    text: string;
    correct?: boolean;
  }

  interface Props {
    question: string;
    questionNumber?: number;
    totalQuestions?: number;
    options: QuizOption[];
    /** When true, reveal correct/incorrect chrome after submitting. */
    showFeedback?: boolean;
    submitLabel?: string;
    onAnswer?: (optionId: string, isCorrect: boolean) => void;
    class?: string;
  }

  let {
    question,
    questionNumber,
    totalQuestions,
    options,
    showFeedback = true,
    submitLabel = 'Submit answer',
    onAnswer,
    class: className,
  }: Props = $props();

  let selectedId = $state<string | null>(null);
  let submitted = $state(false);

  function selectOption(id: string) {
    if (submitted) return;
    selectedId = id;
  }

  function submitAnswer() {
    if (!selectedId || submitted) return;
    submitted = true;
    const option = options.find((o) => o.id === selectedId);
    onAnswer?.(selectedId, option?.correct ?? false);
  }

  function optionClass(option: QuizOption): string {
    const base =
      'flex w-full items-center gap-3 rounded-ripple border p-4 text-left transition-all duration-200';
    if (!submitted) {
      return cn(
        base,
        selectedId === option.id
          ? 'border-ripple-accent bg-ripple-accent/10 ring-1 ring-inset ring-ripple-accent/30'
          : 'border-ripple-border/70 bg-ripple-surface hover:border-ripple-accent/50 hover:bg-ripple-muted/40',
      );
    }
    if (option.correct) {
      return cn(base, 'border-ripple-success bg-ripple-success/10');
    }
    if (selectedId === option.id && !option.correct) {
      return cn(base, 'border-ripple-error bg-ripple-error/10');
    }
    return cn(base, 'border-ripple-border/70 opacity-50');
  }
</script>

<div class={cn('flex flex-col gap-6', className)}>
  <div class="flex flex-col gap-2">
    {#if questionNumber && totalQuestions}
      <p class="text-sm font-medium text-muted-foreground">
        Question {questionNumber} of {totalQuestions}
      </p>
    {/if}
    <h2 class="text-xl font-semibold tracking-tight text-ripple-surface-foreground">
      {question}
    </h2>
  </div>

  <div class="flex flex-col gap-3" role="radiogroup" aria-label={question}>
    {#each options as option (option.id)}
      <button
        type="button"
        role="radio"
        aria-checked={selectedId === option.id}
        class={optionClass(option)}
        onclick={() => selectOption(option.id)}
        disabled={submitted}
      >
        {#if submitted && showFeedback}
          {#if option.correct}
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ripple-success text-ripple-accent-foreground"
            >
              <Icon name="check" size={14} />
            </span>
          {:else if selectedId === option.id}
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ripple-error text-ripple-accent-foreground"
            >
              <Icon name="x" size={14} />
            </span>
          {:else}
            <span class="h-6 w-6 shrink-0 rounded-full border-2 border-muted-foreground/30"></span>
          {/if}
        {:else}
          <SelectionIndicator selected={selectedId === option.id} mode="single" />
        {/if}

        <span class="flex-1 text-ripple-surface-foreground">{option.text}</span>
      </button>
    {/each}
  </div>

  {#if !submitted}
    <button
      type="button"
      class={cn(
        'w-full rounded-ripple px-6 py-3 font-semibold transition-all duration-200',
        selectedId
          ? 'bg-ripple-accent text-ripple-accent-foreground hover:opacity-90'
          : 'cursor-not-allowed bg-ripple-muted text-muted-foreground',
      )}
      onclick={submitAnswer}
      disabled={!selectedId}
    >
      {submitLabel}
    </button>
  {/if}
</div>
