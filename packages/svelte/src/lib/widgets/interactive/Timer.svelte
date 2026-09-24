<!--
  @file widgets/interactive/Timer.svelte
  @description Pomodoro-style focus timer with start / pause / reset and
    duration presets. Ported from the ocean-flow genesis composite widget into
    Ripple conventions: shadcn `Button` + `Progress`, lucide named icons. The
    genesis shadcn `ToggleGroup` (absent from this repo's shadcn set) is
    replaced with inline preset pills styled with Tailwind semantic tokens.
  @created 2026-05-31 — composite consumer widgets migration. Timer state is
    local (counts down on an interval); `onComplete` fires when it reaches zero.
-->
<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { Play, Pause, RotateCcw } from '@lucide/svelte';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Progress } from '$lib/components/ui/progress/index.js';

  interface Props {
    id?: string;
    class?: string;
    /** Timer duration in minutes. */
    duration?: number;
    /** Label shown above the countdown. */
    label?: string;
    /** Preset durations in minutes shown as quick-pick pills. */
    presets?: number[];
    /** Fires when the countdown reaches zero. */
    onComplete?: () => void;
  }

  let {
    id,
    class: className,
    duration = 25,
    label = 'Focus Timer',
    presets = [5, 15, 25, 45],
    onComplete
  }: Props = $props();

  // Local source of truth — seeded once from the `duration` prop, then mutated
  // by the preset pills without reassigning the prop (which would warn).
  let activeDuration = $state(untrack(() => duration));
  let timeRemaining = $state(untrack(() => duration * 60));
  let isRunning = $state(false);
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const minutes = $derived(Math.floor(timeRemaining / 60));
  const seconds = $derived(timeRemaining % 60);
  const progress = $derived(
    ((activeDuration * 60 - timeRemaining) / (activeDuration * 60)) * 100
  );
  const displayTime = $derived(
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  );

  function start() {
    if (isRunning) return;
    isRunning = true;
    intervalId = setInterval(() => {
      if (timeRemaining > 0) {
        timeRemaining--;
      } else {
        pause();
        onComplete?.();
      }
    }, 1000);
  }

  function pause() {
    isRunning = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function reset() {
    pause();
    timeRemaining = activeDuration * 60;
  }

  function setDuration(mins: number) {
    pause();
    activeDuration = mins;
    timeRemaining = mins * 60;
  }

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });
</script>

<div {id} class={cn('timer-widget flex flex-col items-center p-6 bg-card rounded-xl border', className)}>
  {#if label}
    <p class="text-sm text-muted-foreground font-medium mb-4">{label}</p>
  {/if}

  <!-- Time display -->
  <div class="text-5xl font-bold tabular-nums tracking-tight mb-2">
    {displayTime}
  </div>

  <p class="text-xs text-muted-foreground mb-4">
    {#if isRunning}
      <span class="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse mr-1"></span>
      Running
    {:else if timeRemaining === 0}
      <span class="text-green-600 font-medium">Complete</span>
    {:else}
      Paused
    {/if}
  </p>

  <!-- Progress bar -->
  <div class="w-full max-w-[200px] mb-6">
    <Progress value={progress} class="h-2" />
  </div>

  <!-- Controls -->
  <div class="flex items-center gap-3 mb-4">
    {#if isRunning}
      <Button onclick={pause} variant="outline" size="lg">
        <Pause size={20} class="mr-2" />
        Pause
      </Button>
    {:else}
      <Button onclick={start} size="lg">
        <Play size={20} class="mr-2" />
        Start
      </Button>
    {/if}

    <Button onclick={reset} variant="ghost" size="icon" aria-label="Reset">
      <RotateCcw size={18} />
    </Button>
  </div>

  <!-- Presets -->
  {#if presets.length > 0}
    <div class="flex items-center gap-1">
      {#each presets as mins}
        <button
          onclick={() => setDuration(mins)}
          class={cn(
            'px-3 py-1.5 text-xs rounded-full transition-colors',
            activeDuration === mins
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          )}
        >
          {mins}m
        </button>
      {/each}
    </div>
  {/if}
</div>
