<!--
  @file widgets/interactive/Flashcard.svelte
  @description Study flashcard with a CSS 3D flip between a question (front) and
    answer (back), plus "Got it" / "Needs review" actions. Ported from the
    ocean-flow genesis composite widget into Ripple conventions: shadcn `Card`
    + `Button` and lucide named icons replace the genesis `IconWidget`.
  @created 2026-05-31 — composite consumer widgets migration. Flip state is
    local; `onFlip` / `onCorrect` / `onIncorrect` callbacks let a host drive a
    deck. The 3D-flip transform lives in a scoped <style> block (unchanged).
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { HelpCircle, Lightbulb, Check, X } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Card from '$lib/components/ui/card/index.js';

  interface Props {
    id?: string;
    class?: string;
    /** Question / front text. */
    front: string;
    /** Answer / back text. */
    back: string;
    /** Optional category or topic label. */
    category?: string;
    /** Position label, e.g. "3 of 10". */
    index?: string;
    /** Fires with the new flip state when the card is flipped. */
    onFlip?: (isFlipped: boolean) => void;
    /** Fires when the user marks the card correct. */
    onCorrect?: () => void;
    /** Fires when the user marks the card for review. */
    onIncorrect?: () => void;
  }

  let {
    id,
    class: className,
    front,
    back,
    category,
    index,
    onFlip,
    onCorrect,
    onIncorrect
  }: Props = $props();

  let isFlipped = $state(false);

  function flip() {
    isFlipped = !isFlipped;
    onFlip?.(isFlipped);
  }

  function handleCorrect() {
    onCorrect?.();
    isFlipped = false;
  }

  function handleIncorrect() {
    onIncorrect?.();
    isFlipped = false;
  }
</script>

<div {id} class={cn('flashcard-container w-full max-w-md mx-auto', className)}>
  <!-- Header -->
  {#if category || index}
    <div class="flex items-center justify-between mb-3 px-1">
      {#if category}
        <span class="text-xs text-muted-foreground font-medium uppercase tracking-wide">{category}</span>
      {/if}
      {#if index}
        <span class="text-xs text-muted-foreground">{index}</span>
      {/if}
    </div>
  {/if}

  <!-- Flipping card -->
  <button
    onclick={flip}
    class={cn('flashcard relative w-full min-h-[220px] cursor-pointer', isFlipped && 'is-flipped')}
    aria-label={isFlipped
      ? 'Showing answer, click to see question'
      : 'Showing question, click to reveal answer'}
  >
    <!-- Front (question) -->
    <Card.Root class="flashcard-face absolute inset-0">
      <Card.Content class="flex flex-col items-center justify-center h-full p-6 text-center min-h-[200px]">
        <HelpCircle size={28} class="text-muted-foreground mb-4 opacity-50" />
        <p class="text-xl font-medium leading-relaxed max-w-[280px]">{front}</p>
        <p class="text-xs text-muted-foreground mt-6">Tap to reveal answer</p>
      </Card.Content>
    </Card.Root>

    <!-- Back (answer) -->
    <Card.Root class="flashcard-face flashcard-back absolute inset-0 bg-primary/5 border-primary/20">
      <Card.Content class="flex flex-col items-center justify-center h-full p-6 text-center min-h-[200px]">
        <Lightbulb size={24} class="text-primary mb-3" />
        <p class="text-lg font-medium leading-relaxed text-foreground">{back}</p>
      </Card.Content>
    </Card.Root>
  </button>

  <!-- Actions (shown when flipped) -->
  {#if isFlipped}
    <div class="flex items-center justify-center gap-4 mt-4">
      <Button onclick={handleIncorrect} variant="outline" class="text-red-600 border-red-200 hover:bg-red-50">
        <X size={16} class="mr-2" />
        Needs Review
      </Button>
      <Button onclick={handleCorrect} variant="outline" class="text-green-600 border-green-200 hover:bg-green-50">
        <Check size={16} class="mr-2" />
        Got It
      </Button>
    </div>
  {/if}
</div>

<style>
  .flashcard {
    transform-style: preserve-3d;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    perspective: 1000px;
  }

  .flashcard.is-flipped {
    transform: rotateY(180deg);
  }

  .flashcard :global(.flashcard-face) {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  .flashcard :global(.flashcard-back) {
    transform: rotateY(180deg);
  }
</style>
