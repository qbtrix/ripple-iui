<!-- src/lib/widgets/display/Qr.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils.js';

  type ECL = 'L' | 'M' | 'Q' | 'H';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Payload to encode (URL, text, vCard, etc.). */
    value: string;
    size?: number;
    /** Foreground (dark module) color. */
    color?: string;
    /** Background color. Use 'transparent' to layer the QR over a parent. */
    background?: string;
    /** Error correction level (more = more redundancy, larger code). */
    ecl?: ECL;
    /** Margin (quiet zone) in modules. */
    padding?: number;
    /** Optional caption shown below the code. */
    caption?: string;
  }

  let {
    id,
    class: className,
    style,
    value,
    size = 160,
    color = '#000000',
    background = '#ffffff',
    ecl = 'M',
    padding = 2,
    caption
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let svg = $state<string>('');

  onMount(() => {
    let cancelled = false;
    (async () => {
      const mod = await import('qrcode-svg');
      if (cancelled) return;
      const QRCode = (mod as any).default ?? mod;
      try {
        const qr = new QRCode({
          content: value,
          width: size,
          height: size,
          color,
          background,
          ecl,
          padding,
          join: true,
          container: 'svg-viewbox'
        });
        svg = qr.svg();
      } catch (e) {
        console.warn('[qr] encode failed:', e);
        svg = '';
      }
    })();
    return () => { cancelled = true; };
  });

  $effect(() => {
    void value;
    void size;
    void color;
    void background;
    void ecl;
    void padding;
    if (typeof window === 'undefined') return;
    (async () => {
      try {
        const mod = await import('qrcode-svg');
        const QRCode = (mod as any).default ?? mod;
        const qr = new QRCode({
          content: value,
          width: size,
          height: size,
          color,
          background,
          ecl,
          padding,
          join: true,
          container: 'svg-viewbox'
        });
        svg = qr.svg();
      } catch {
        // ignore — initial render will surface failure via onMount
      }
    })();
  });
</script>

<div
  {id}
  class={cn('inline-flex flex-col items-center gap-1.5', className)}
  style={styleString}
>
  <div
    role="img"
    aria-label={`QR code for ${value}`}
    style={`width:${size}px; height:${size}px;`}
    class="rounded bg-white p-1"
  >
    <!-- qrcode-svg returns trusted, deterministic SVG markup. {@html} is safe here. -->
    {@html svg}
  </div>
  {#if caption}
    <span class="text-xs text-muted-foreground">{caption}</span>
  {/if}
</div>
