<!-- src/lib/widgets/display/Qr.svelte
     Security (review): `color`/`background` are spec-controlled and flow
     straight into qrcode-svg, which string-concatenates them into a
     style="fill:…" attribute with NO escaping — so a value like
     `red" /><img src=x onerror=…>` breaks out of the attribute and injects an
     HTML element into the {@html} sink. Two defenses: validate the colors to a
     safe CSS-literal allowlist before they reach the generator (safeColor,
     applied at BOTH the onMount and $effect call sites), and sanitizeSvg the
     output (the HTML profile would strip <svg>, so this uses the SVG profile). -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils.js';
  import { sanitizeSvg } from '$lib/utils/sanitize-html.js';

  type ECL = 'L' | 'M' | 'Q' | 'H';

  // Only CSS color literals that can't terminate an attribute or a style
  // declaration: hex, rgb/rgba/hsl/hsla functional forms, and bare keywords
  // (named colors + transparent). Anything else falls back to the default.
  const COLOR_RE = /^(#[0-9a-f]{3,8}|[a-z]+|(rgb|rgba|hsl|hsla)\([0-9a-z%.,\s/]+\))$/i;
  const safeColor = (raw: string | undefined, fallback: string): string =>
    raw && COLOR_RE.test(raw.trim()) ? raw.trim() : fallback;

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
          color: safeColor(color, '#000000'),
          background: safeColor(background, '#ffffff'),
          ecl,
          padding,
          join: true,
          container: 'svg-viewbox'
        });
        svg = sanitizeSvg(qr.svg());
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
          color: safeColor(color, '#000000'),
          background: safeColor(background, '#ffffff'),
          ecl,
          padding,
          join: true,
          container: 'svg-viewbox'
        });
        svg = sanitizeSvg(qr.svg());
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
    <!-- svg is generated from validated colors (safeColor) and passed through
         sanitizeSvg — both guards, since a sanitizer can't fix a generator fed
         attacker text. See the security note at the top of this file. -->
    {@html svg}
  </div>
  {#if caption}
    <span class="text-xs text-muted-foreground">{caption}</span>
  {/if}
</div>
