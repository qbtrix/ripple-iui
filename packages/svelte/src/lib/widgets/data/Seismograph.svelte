<!--
  src/lib/widgets/data/Seismograph.svelte
  Created 2026-06-13 (feat/console-telemetry-widgets): nullframe-style scrolling
  live trace. An internal rAF ring-buffer pushes a new sample each frame and
  shifts the oldest out, drawn on a <canvas>. Two variants: 'line' (oscilloscope
  trace with a bright leading-edge tip) and 'bars' (histogram). Client-only motion
  (no continuous channel exists on the motion field), paused on document.hidden;
  SSR + prefers-reduced-motion paint a static composed frame and never animate.
  Includes an optional ● REC/LIVE indicator and an evt/min readout.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** 'line' = oscilloscope trace, 'bars' = histogram. Default 'line'. */
    variant?: 'line' | 'bars';
    /** Animate live. When false, paints a single static frame. Default true. */
    live?: boolean;
    /** Trace color. Default the primary/blue token. */
    color?: string;
    /** Caption label (e.g. "GATE EVENTS · CH 01"). */
    label?: string;
    /** Right-side readout (e.g. "12 evt/min"). */
    readout?: string;
    /** Show the ● REC/LIVE pill. Default true when live. */
    indicator?: boolean;
    /** Indicator text. Default 'LIVE'. */
    indicatorLabel?: string;
    /** Canvas height in px. Default 96. */
    height?: number;
    /** Number of samples held in the ring buffer. Default 160. */
    samples?: number;
    /** Optional seed values (oldest → newest) to pre-fill the buffer. */
    seed?: number[];
  }

  let {
    id,
    class: className,
    style,
    variant = 'line',
    live = true,
    color = 'var(--primary)',
    label,
    readout,
    indicator,
    indicatorLabel = 'LIVE',
    height = 96,
    samples = 160,
    seed,
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const showIndicator = $derived(indicator ?? live);

  let canvas: HTMLCanvasElement | undefined = $state();
  let wrap: HTMLDivElement | undefined = $state();

  // Resolve a CSS custom-property color to a real rgb so canvas can use it.
  function resolveColor(c: string): string {
    if (typeof window === 'undefined' || !wrap) return '#2E6BFF';
    if (c.startsWith('var(')) {
      const name = c.slice(4, -1).trim();
      const v = getComputedStyle(wrap).getPropertyValue(name).trim();
      return v || '#2E6BFF';
    }
    return c;
  }

  // Ring buffer of normalized samples 0..1.
  function makeBuffer(): number[] {
    if (seed && seed.length) {
      const min = Math.min(...seed);
      const max = Math.max(...seed);
      const span = max - min || 1;
      const norm = seed.map((v) => (v - min) / span);
      return Array.from({ length: samples }, (_, i) => norm[i % norm.length]);
    }
    // No seed: synthesize a believable resting waveform so the STATIC frame
    // (live=false or reduced-motion) reads as a real trace, not a flat line.
    const buf = new Array(samples);
    for (let i = 0; i < samples; i++) {
      const wobble = Math.sin(i * 0.18) * 0.1 + Math.sin(i * 0.41) * 0.05;
      // A couple of deterministic "events" so the line has character at rest.
      const spike = i % 37 === 0 ? 0.28 : i % 53 === 0 ? -0.2 : 0;
      buf[i] = Math.max(0.08, Math.min(0.92, 0.5 + wobble + spike));
    }
    return buf;
  }

  // A plausible "seismic" generator: low baseline with occasional spikes.
  let phase = 0;
  function nextSample(prev: number): number {
    phase += 0.18;
    const wobble = Math.sin(phase) * 0.06 + Math.sin(phase * 2.3) * 0.035;
    const spike = Math.random() < 0.06 ? (Math.random() - 0.5) * 0.85 : 0;
    let v = 0.5 + wobble + spike + (Math.random() - 0.5) * 0.04;
    // Mean-revert toward baseline so spikes decay.
    v = prev * 0.45 + v * 0.55;
    return Math.max(0.04, Math.min(0.96, v));
  }

  function draw(ctx: CanvasRenderingContext2D, buf: number[], w: number, h: number, traceColor: string) {
    ctx.clearRect(0, 0, w, h);
    const n = buf.length;

    if (variant === 'bars') {
      const slot = w / n;
      const bw = Math.max(1, slot * 0.55);
      for (let i = 0; i < n; i++) {
        const v = buf[i];
        const barH = Math.max(1, v * (h - 2));
        const x = i * slot + (slot - bw) / 2;
        const y = h - barH;
        // Leading edge brightens.
        const edge = i / n;
        ctx.globalAlpha = 0.25 + edge * 0.75;
        ctx.fillStyle = traceColor;
        ctx.fillRect(x, y, bw, barH);
      }
      ctx.globalAlpha = 1;
      return;
    }

    // line variant — oscilloscope trace
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = traceColor;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * w;
      const y = (1 - buf[i]) * (h - 4) + 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    // Fade the tail so older samples dim out (drawn as a left-edge gradient).
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.12, traceColor);
    grad.addColorStop(1, traceColor);
    ctx.strokeStyle = grad;
    ctx.globalAlpha = 0.85;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Bright leading-edge tip + vertical scan line at the newest sample.
    const lastY = (1 - buf[n - 1]) * (h - 4) + 2;
    ctx.strokeStyle = traceColor;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w - 0.5, 0);
    ctx.lineTo(w - 0.5, h);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = traceColor;
    ctx.beginPath();
    ctx.arc(w - 1.5, lastY, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function sizeCanvas(c: HTMLCanvasElement): { ctx: CanvasRenderingContext2D | null; w: number; h: number } {
    const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    const rect = c.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = height;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    c.style.height = `${h}px`;
    const ctx = c.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  onMount(() => {
    if (typeof window === 'undefined' || !canvas) return;
    const c = canvas;
    const buf = makeBuffer();
    const traceColor = resolveColor(color);

    let raf = 0;
    let dims = sizeCanvas(c);

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    function paint() {
      if (dims.ctx) draw(dims.ctx, buf, dims.w, dims.h, traceColor);
    }

    // Static frame for reduced-motion or live=false.
    if (reduce || !live) {
      paint();
      const ro = new ResizeObserver(() => {
        dims = sizeCanvas(c);
        paint();
      });
      ro.observe(c);
      return () => ro.disconnect();
    }

    let frame = 0;
    function tick() {
      if (!(typeof document !== 'undefined' && document.hidden)) {
        // Push roughly every other frame so the scroll speed reads calm.
        if (frame % 2 === 0) {
          buf.push(nextSample(buf[buf.length - 1]));
          buf.shift();
        }
        paint();
      }
      frame++;
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      dims = sizeCanvas(c);
    });
    ro.observe(c);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  });
</script>

<div {id} class={cn('flex w-full flex-col gap-3', className)} style={styleString}>
  {#if label || readout || showIndicator}
    <div class="flex items-center justify-between">
      <span class="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label ?? ''}
      </span>
      <div class="flex items-center gap-3">
        {#if readout}
          <span class="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground tabular-nums">
            {readout}
          </span>
        {/if}
        {#if showIndicator}
          <span class="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em]" style="color:{color}">
            <span
              class={cn('inline-block h-1.5 w-1.5 rounded-full', live && 'motion-safe:animate-pulse')}
              style="background:{color}"
            ></span>
            {indicatorLabel}
          </span>
        {/if}
      </div>
    </div>
  {/if}
  <div
    bind:this={wrap}
    class="relative w-full"
    style="height:{height}px"
    role="img"
    aria-label={label ? `${label} live trace` : 'Live signal trace'}
  >
    <canvas bind:this={canvas} class="block w-full" style="height:{height}px" aria-hidden="true"></canvas>
  </div>
</div>
