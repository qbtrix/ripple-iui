<!--
  @file widgets/media/VideoPlayer.svelte
  @description Video player over a native HTMLVideoElement: play / pause, seek,
    volume / mute, auto-hiding controls, fullscreen, and picture-in-picture.
    Ported from the ocean-flow genesis composite widget into Ripple conventions
    — lucide named icons replace the genesis `IconWidget`.
  @created 2026-05-31 — composite consumer widgets migration. Lives in `media/`
    alongside AudioPlayer / ModelViewer / Embed. Fullscreen + PiP use the
    native browser APIs, so behaviour needs a real-browser check (not jsdom).
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { cn } from '$lib/utils.js';
  import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    Maximize,
    Minimize,
    PictureInPicture
  } from '@lucide/svelte';

  interface Props {
    id?: string;
    class?: string;
    /** Video source URL. Required. */
    src: string;
    /** Poster image shown before playback. */
    poster?: string;
    /** Title overlaid on the controls bar. */
    title?: string;
    /** Start playing on mount. */
    autoplay?: boolean;
    /** Start muted. */
    muted?: boolean;
    /** Loop playback. */
    loop?: boolean;
    /** Show the custom controls bar. */
    controls?: boolean;
  }

  let {
    id,
    class: className,
    src,
    poster,
    title,
    autoplay = false,
    muted = false,
    loop = false,
    controls = true
  }: Props = $props();

  let video: HTMLVideoElement;
  let container: HTMLDivElement;
  let isPlaying = $state(false);
  let currentTime = $state(0);
  let duration = $state(0);
  let volume = $state(1);
  // Seed once from the `muted` prop (initial value only — intentional).
  let isMuted = $state(untrack(() => muted));
  let isFullscreen = $state(false);
  let showControls = $state(true);
  let controlsTimeout: ReturnType<typeof setTimeout>;

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  function togglePlay() {
    if (isPlaying) video.pause();
    else video.play();
  }

  function toggleMute() {
    isMuted = !isMuted;
    video.muted = isMuted;
  }

  function handleSeek(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    video.currentTime = parseFloat(target.value);
  }

  function handleVolumeChange(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    volume = parseFloat(target.value);
    video.volume = volume;
    if (volume > 0) isMuted = false;
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else container.requestFullscreen();
  }

  async function togglePictureInPicture() {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      await video.requestPictureInPicture();
    }
  }

  function handleMouseMove() {
    showControls = true;
    clearTimeout(controlsTimeout);
    controlsTimeout = setTimeout(() => {
      if (isPlaying) showControls = false;
    }, 3000);
  }

  onMount(() => {
    const onFsChange = () => {
      isFullscreen = !!document.fullscreenElement;
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  });

  const progressPercent = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);
</script>

<div
  {id}
  bind:this={container}
  class={cn('video-widget relative bg-black rounded-2xl overflow-hidden group', className)}
  onmousemove={handleMouseMove}
  onmouseleave={() => {
    if (isPlaying) showControls = false;
  }}
  role="presentation"
>
  <!-- Video element -->
  <video
    bind:this={video}
    {src}
    {poster}
    {autoplay}
    {loop}
    muted={isMuted}
    class="w-full h-full object-contain"
    onclick={togglePlay}
    onloadedmetadata={() => {
      duration = video.duration;
    }}
    ontimeupdate={() => {
      currentTime = video.currentTime;
    }}
    onplay={() => {
      isPlaying = true;
    }}
    onpause={() => {
      isPlaying = false;
      showControls = true;
    }}
  >
    <track kind="captions" />
  </video>

  <!-- Play overlay -->
  {#if !isPlaying}
    <button
      onclick={togglePlay}
      class="absolute inset-0 flex items-center justify-center bg-black/30"
      aria-label="Play"
    >
      <div class="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
        <Play size={32} class="text-white ml-1" />
      </div>
    </button>
  {/if}

  <!-- Controls bar -->
  {#if controls}
    <div
      class={cn(
        'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300',
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      {#if title}
        <p class="text-white text-sm mb-2 truncate">{title}</p>
      {/if}

      <!-- Progress -->
      <div class="mb-3">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          oninput={handleSeek}
          aria-label="Seek"
          class="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          style="background: linear-gradient(to right, white {progressPercent}%, rgba(255,255,255,0.3) {progressPercent}%)"
        />
      </div>

      <!-- Buttons -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button onclick={togglePlay} class="text-white hover:text-white/80" aria-label={isPlaying ? 'Pause' : 'Play'}>
            {#if isPlaying}
              <Pause size={20} />
            {:else}
              <Play size={20} />
            {/if}
          </button>
          <button onclick={toggleMute} class="text-white hover:text-white/80" aria-label="Mute">
            {#if isMuted}
              <VolumeX size={20} />
            {:else}
              <Volume2 size={20} />
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
            class="w-16 h-1 bg-white/30 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          />
          <span class="text-white/80 text-sm">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button onclick={togglePictureInPicture} class="text-white hover:text-white/80" aria-label="Picture in picture">
            <PictureInPicture size={20} />
          </button>
          <button onclick={toggleFullscreen} class="text-white hover:text-white/80" aria-label="Fullscreen">
            {#if isFullscreen}
              <Minimize size={20} />
            {:else}
              <Maximize size={20} />
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
