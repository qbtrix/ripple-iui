<!--
  @file widgets/media/AudioPlayer.svelte
  @description Audio player over a native HTMLAudioElement: play / pause, seek,
    volume / mute, skip ±10s, with cover art and title. Ported from the
    ocean-flow genesis composite widget into Ripple conventions — lucide named
    icons replace the genesis `IconWidget`, Tailwind shadcn semantic tokens
    throughout.
  @created 2026-05-31 — composite consumer widgets migration. The genesis fake
    `Math.random` waveform is removed; `showWaveform` now renders a simple
    static bar strip (a real PCM analyser is out of scope and not needed for the
    spec-driven use case). Lives in `media/` alongside ModelViewer / Embed.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import {
    Music,
    Play,
    Pause,
    Volume2,
    VolumeX,
    RotateCcw,
    RotateCw
  } from '@lucide/svelte';

  interface Props {
    id?: string;
    class?: string;
    /** Audio source URL. Required. */
    src: string;
    /** Track title. */
    title?: string;
    /** Artist / author line. */
    artist?: string;
    /** Cover art image URL. */
    cover?: string;
    /** Start playing on mount. */
    autoplay?: boolean;
    /** Render a static decorative bar strip above the controls. */
    showWaveform?: boolean;
  }

  let {
    id,
    class: className,
    src,
    title = 'Audio Track',
    artist,
    cover,
    autoplay = false,
    showWaveform = false
  }: Props = $props();

  let audio: HTMLAudioElement;
  let isPlaying = $state(false);
  let currentTime = $state(0);
  let duration = $state(0);
  let volume = $state(1);
  let isMuted = $state(false);
  let isLoading = $state(true);

  // Static decorative bar heights (no fake audio analysis — see file header).
  const bars = [
    0.4, 0.7, 0.5, 0.9, 0.6, 0.3, 0.8, 0.55, 0.65, 0.45, 0.75, 0.5, 0.85, 0.4,
    0.6, 0.7, 0.35, 0.9, 0.5, 0.65, 0.45, 0.8, 0.55, 0.7, 0.4
  ];

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function togglePlay() {
    if (isPlaying) audio.pause();
    else audio.play();
  }

  function toggleMute() {
    isMuted = !isMuted;
    audio.muted = isMuted;
  }

  function handleVolumeChange(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    volume = parseFloat(target.value);
    audio.volume = volume;
    if (volume > 0) isMuted = false;
  }

  function handleSeek(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const time = parseFloat(target.value);
    audio.currentTime = time;
    currentTime = time;
  }

  function skip(seconds: number) {
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
  }

  const progressPercent = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);
  const playedBars = $derived(
    duration > 0 ? Math.round((currentTime / duration) * bars.length) : 0
  );
</script>

<div {id} class={cn('audio-widget bg-card rounded-2xl border overflow-hidden', className)}>
  <!-- Cover art and info -->
  <div class="flex items-center gap-4 p-4">
    {#if cover}
      <div class="w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
        <img src={cover} alt={title} class="w-full h-full object-cover" />
      </div>
    {:else}
      <div class="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Music size={24} class="text-primary" />
      </div>
    {/if}

    <div class="flex-1 min-w-0">
      <h3 class="font-semibold truncate">{title}</h3>
      {#if artist}
        <p class="text-sm text-muted-foreground truncate">{artist}</p>
      {/if}
    </div>
  </div>

  <!-- Static decorative bars -->
  {#if showWaveform}
    <div class="flex items-end gap-0.5 px-4 h-12">
      {#each bars as h, i}
        <div
          class={cn('flex-1 rounded-sm', i < playedBars ? 'bg-primary' : 'bg-muted')}
          style="height: {h * 100}%"
        ></div>
      {/each}
    </div>
  {/if}

  <!-- Progress bar -->
  <div class="px-4 py-2">
    <input
      type="range"
      min="0"
      max={duration || 100}
      value={currentTime}
      oninput={handleSeek}
      aria-label="Seek"
      class="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
      style="background: linear-gradient(to right, var(--primary) {progressPercent}%, var(--muted) {progressPercent}%)"
    />
    <div class="flex justify-between text-xs text-muted-foreground mt-1">
      <span>{formatTime(currentTime)}</span>
      <span>{formatTime(duration)}</span>
    </div>
  </div>

  <!-- Controls -->
  <div class="flex items-center justify-between px-4 pb-4">
    <div class="flex items-center gap-2">
      <button onclick={toggleMute} class="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Mute">
        {#if isMuted || volume === 0}
          <VolumeX size={18} class="text-muted-foreground" />
        {:else}
          <Volume2 size={18} class="text-muted-foreground" />
        {/if}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={volume}
        oninput={handleVolumeChange}
        aria-label="Volume"
        class="w-20 h-1 bg-muted rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
      />
    </div>

    <div class="flex items-center gap-2">
      <button onclick={() => skip(-10)} class="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Back 10 seconds">
        <RotateCcw size={18} class="text-muted-foreground" />
      </button>
      <button
        onclick={togglePlay}
        class="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {#if isLoading}
          <div class="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        {:else if isPlaying}
          <Pause size={20} />
        {:else}
          <Play size={20} class="ml-0.5" />
        {/if}
      </button>
      <button onclick={() => skip(10)} class="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Forward 10 seconds">
        <RotateCw size={18} class="text-muted-foreground" />
      </button>
    </div>

    <div class="w-[76px]"></div>
  </div>

  <!-- Native audio element -->
  <audio
    bind:this={audio}
    {src}
    {autoplay}
    onloadedmetadata={() => {
      duration = audio.duration;
      isLoading = false;
    }}
    ontimeupdate={() => {
      currentTime = audio.currentTime;
    }}
    onplay={() => {
      isPlaying = true;
    }}
    onpause={() => {
      isPlaying = false;
    }}
    onended={() => {
      isPlaying = false;
      currentTime = 0;
    }}
  ></audio>
</div>
