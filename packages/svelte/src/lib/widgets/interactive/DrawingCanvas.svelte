<!--
  @file widgets/interactive/DrawingCanvas.svelte
  @description Pure Canvas 2D drawing pad: brush / eraser / color / size /
    undo / redo / clear / export, with mouse + touch input. Ported from the
    ocean-flow genesis composite widget into Ripple conventions — the genesis
    `IconWidget` is replaced with direct `@lucide/svelte` named imports (the
    established pattern in Button.svelte / Stat.svelte), and Tailwind shadcn
    semantic tokens are used throughout.
  @created 2026-05-31 — composite consumer widgets migration. Canvas state is
    purely local; the widget surfaces an `onSave` callback returning a PNG data
    URL rather than a two-way bind (raster bytes don't belong in spec state).
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { Pencil, Eraser, Undo, Redo, Trash2, Download } from '@lucide/svelte';

  interface Props {
    id?: string;
    class?: string;
    width?: number;
    height?: number;
    backgroundColor?: string;
    /** Data URL of an image to pre-load onto the canvas. */
    initialImage?: string;
    /** Fires with a PNG data URL when the user exports. */
    onSave?: (dataUrl: string) => void;
  }

  let {
    id,
    class: className,
    width = 400,
    height = 300,
    backgroundColor = '#ffffff',
    initialImage,
    onSave
  }: Props = $props();

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let isDrawing = $state(false);
  let lastX = 0;
  let lastY = 0;

  let currentTool = $state<'brush' | 'eraser'>('brush');
  let brushSize = $state(4);
  let brushColor = $state('#000000');
  // `$state` so the undo/redo disabled flags react to history.length changes.
  let history = $state<ImageData[]>([]);
  let historyIndex = $state(-1);

  const colors = ['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

  function getCanvasCoords(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function startDrawing(e: MouseEvent | TouchEvent) {
    isDrawing = true;
    const coords = getCanvasCoords(e);
    lastX = coords.x;
    lastY = coords.y;
  }

  function draw(e: MouseEvent | TouchEvent) {
    if (!isDrawing || !ctx) return;
    e.preventDefault();

    const coords = getCanvasCoords(e);

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = currentTool === 'eraser' ? backgroundColor : brushColor;
    ctx.lineWidth = currentTool === 'eraser' ? brushSize * 3 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastX = coords.x;
    lastY = coords.y;
  }

  function stopDrawing() {
    if (isDrawing && ctx) {
      isDrawing = false;
      saveToHistory();
    }
  }

  function saveToHistory() {
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    history = history.slice(0, historyIndex + 1);
    history.push(imageData);
    historyIndex = history.length - 1;
  }

  function undo() {
    if (historyIndex > 0 && ctx) {
      historyIndex--;
      ctx.putImageData(history[historyIndex], 0, 0);
    }
  }

  function redo() {
    if (historyIndex < history.length - 1 && ctx) {
      historyIndex++;
      ctx.putImageData(history[historyIndex], 0, 0);
    }
  }

  function clear() {
    if (!ctx) return;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  }

  function downloadImage() {
    const dataUrl = canvas.toDataURL('image/png');
    onSave?.(dataUrl);
    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = dataUrl;
    link.click();
  }

  onMount(() => {
    ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (initialImage) {
      const img = new Image();
      img.onload = () => {
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        saveToHistory();
      };
      img.src = initialImage;
    } else {
      saveToHistory();
    }
  });
</script>

<div {id} class={cn('drawing-canvas bg-card rounded-2xl border overflow-hidden', className)}>
  <!-- Toolbar -->
  <div class="flex items-center gap-2 p-3 border-b bg-muted/30">
    <!-- Tools -->
    <div class="flex items-center gap-1 border-r pr-2">
      <button
        onclick={() => (currentTool = 'brush')}
        class={cn(
          'p-2 rounded-lg transition-colors',
          currentTool === 'brush' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
        )}
        title="Brush"
        aria-label="Brush"
      >
        <Pencil size={18} />
      </button>
      <button
        onclick={() => (currentTool = 'eraser')}
        class={cn(
          'p-2 rounded-lg transition-colors',
          currentTool === 'eraser' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
        )}
        title="Eraser"
        aria-label="Eraser"
      >
        <Eraser size={18} />
      </button>
    </div>

    <!-- Colors -->
    <div class="flex items-center gap-1 border-r pr-2">
      {#each colors as color}
        <button
          onclick={() => {
            brushColor = color;
            currentTool = 'brush';
          }}
          class={cn(
            'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
            brushColor === color && currentTool === 'brush'
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-transparent'
          )}
          style="background-color: {color}"
          title={color}
          aria-label="Color {color}"
        ></button>
      {/each}
    </div>

    <!-- Brush size -->
    <div class="flex items-center gap-2 border-r pr-2">
      <input
        type="range"
        min="1"
        max="20"
        bind:value={brushSize}
        aria-label="Brush size"
        class="w-16 h-1 bg-muted rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
      />
      <span class="text-xs text-muted-foreground w-4">{brushSize}</span>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1 ml-auto">
      <button
        onclick={undo}
        disabled={historyIndex <= 0}
        class="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
        title="Undo"
        aria-label="Undo"
      >
        <Undo size={18} />
      </button>
      <button
        onclick={redo}
        disabled={historyIndex >= history.length - 1}
        class="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
        title="Redo"
        aria-label="Redo"
      >
        <Redo size={18} />
      </button>
      <button
        onclick={clear}
        class="p-2 rounded-lg hover:bg-muted transition-colors"
        title="Clear"
        aria-label="Clear"
      >
        <Trash2 size={18} />
      </button>
      <button
        onclick={downloadImage}
        class="p-2 rounded-lg hover:bg-muted transition-colors"
        title="Download"
        aria-label="Download"
      >
        <Download size={18} />
      </button>
    </div>
  </div>

  <!-- Canvas -->
  <div class="p-4">
    <canvas
      bind:this={canvas}
      {width}
      {height}
      class="w-full rounded-lg border cursor-crosshair touch-none"
      style="aspect-ratio: {width}/{height}; background: {backgroundColor}"
      onmousedown={startDrawing}
      onmousemove={draw}
      onmouseup={stopDrawing}
      onmouseleave={stopDrawing}
      ontouchstart={startDrawing}
      ontouchmove={draw}
      ontouchend={stopDrawing}
    ></canvas>
  </div>
</div>
