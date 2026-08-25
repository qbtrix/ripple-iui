<!--
  @file Embed.svelte
  @description Sandboxed iframe escape-hatch widget. Renders third-party
    content (a URL or an inline `srcdoc` document) inside a hardened iframe.
  @created 2026-05-22 — Increment 5 (escape-hatch widgets). This is the
    "sandboxed escape hatch" half of the increment: when no real widget
    fits, a spec can embed arbitrary content here without the renderer
    surrendering control of the security boundary.

  SECURITY — read before changing anything in this file:

    * The `sandbox` attribute is RENDERER-CONTROLLED. It is hard-coded to
      exactly `allow-scripts allow-popups allow-popups-to-escape-sandbox
      allow-forms`. It is NOT author-settable: no spec prop flows into the
      sandbox string. A spec MUST NOT be able to widen, alter, or remove
      it. `allow-same-origin` is deliberately ABSENT — its absence is the
      load-bearing guarantee. Without it the iframe runs at an opaque
      origin and cannot read the pocket's cookies / localStorage or reach
      the pocket backend. `allow-top-navigation` is also absent so the
      frame cannot hijack the host page.
    * `referrerpolicy="no-referrer"` and `loading="lazy"` are always set.
    * The `allow` permissions-policy passes through a CLOSED enum — only
      fullscreen / autoplay / encrypted-media / picture-in-picture survive.
      camera / microphone / geolocation / usb / payment / display-capture
      can never be granted, regardless of spec input.
    * `mode=url` accepts `https://` URLs only. javascript: / data: / blob:
      / file:// / http:// / protocol-relative `//` are rejected here as a
      belt-and-braces client check. The authoritative host-allowlist gate
      lives pocketpaw-side.
    * `mode=srcdoc` content is bound through Svelte (attribute-encoded) and
      capped at ~64KB. It runs in the same opaque-origin sandbox, so it
      injects into a quarantined DOM — never the pocket's.
    * The capability bridge (2026-08-25) prepends a renderer-built shim
      script to `mode=srcdoc` content when — and only when — a HOST has
      published a bridge on Svelte context. It changes NOTHING about the
      security posture: `postMessage` crosses an opaque origin by design,
      so EMBED_SANDBOX, EMBED_ALLOW_ENUM and EMBED_SRCDOC_MAX are all
      byte-identical to before. The 64KB cap still measures AUTHOR content
      only, so the shim can never eat an author's budget. The token is
      minted by the host per widget INSTANCE, never by the spec (context
      cannot be set from JSON), and is revoked on destroy.
  @changes
    - Initial creation.
    - 2026-08-25 (widget capability bridge T1): srcdoc composition prepends
      the `invoke_tool/v1` shim when a host bridge is present, and attaches
      the frame's contentWindow to the token so the host can check
      `event.source`. Sandbox / permissions enum / size cap untouched.
-->
<script lang="ts" module>
  /**
   * The one and only sandbox token set. Renderer-controlled — never derived
   * from spec input. Exported so tests can assert the exact string and so
   * the contract is auditable from one place.
   */
  export const EMBED_SANDBOX =
    'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms';

  /**
   * Closed allowlist for the iframe `allow=` permissions-policy attribute.
   * Anything not in this set is dropped. Sensitive capabilities
   * (camera, microphone, geolocation, usb, payment, display-capture) are
   * intentionally NOT here and cannot be granted.
   */
  export const EMBED_ALLOW_ENUM = [
    'fullscreen',
    'autoplay',
    'encrypted-media',
    'picture-in-picture'
  ] as const;

  /** Max byte length accepted for inline `srcdoc` content. */
  export const EMBED_SRCDOC_MAX = 64 * 1024;

  /** True only for absolute `https://` URLs. Rejects every other scheme. */
  export function isSafeEmbedUrl(raw: unknown): raw is string {
    if (typeof raw !== 'string') return false;
    const value = raw.trim();
    if (value === '') return false;
    // Reject protocol-relative `//host` — it inherits the page scheme.
    if (value.startsWith('//')) return false;
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      return false;
    }
    // Only https. Blocks javascript:, data:, blob:, file:, http:, etc.
    return parsed.protocol === 'https:';
  }

  /** Filter an `allow` list down to the closed enum. */
  export function sanitizeEmbedAllow(input: unknown): string {
    if (!Array.isArray(input)) return '';
    const permitted = new Set<string>(EMBED_ALLOW_ENUM);
    const seen = new Set<string>();
    for (const item of input) {
      if (typeof item !== 'string') continue;
      const token = item.trim().toLowerCase();
      if (permitted.has(token)) seen.add(token);
    }
    return [...seen].join('; ');
  }
</script>

<script lang="ts">
  import { getContext, onDestroy } from 'svelte';
  import {
    WIDGET_BRIDGE_CONTEXT_KEY,
    type WidgetBridgeHost,
    type WidgetBridgeHandle
  } from '../../core/widget-bridge-protocol.js';
  import { buildWidgetBridgeShimScript } from '../../core/widget-bridge-shim.js';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** `url` embeds a remote page; `srcdoc` embeds an inline document. */
    mode: 'url' | 'srcdoc';
    /** Remote page URL — used when mode=url. Must be https://. */
    url?: string;
    /** Inline HTML document — used when mode=srcdoc. Capped at 64KB. */
    srcdoc?: string;
    /** Accessible title for the iframe. Required for a11y. */
    title: string;
    /** Fixed height in px. Ignored when `aspectRatio` is set. */
    height?: number;
    /** Aspect ratio, e.g. "16 / 9". Wins over `height` when present. */
    aspectRatio?: string;
    /** Optional permissions-policy tokens — filtered through a closed enum. */
    allow?: string[];
  }

  let {
    id,
    class: className,
    style,
    mode,
    url,
    srcdoc,
    title,
    height,
    aspectRatio,
    allow
  }: Props = $props();

  // `allow` is run through the closed enum — disallowed tokens are dropped.
  const allowAttr = $derived(sanitizeEmbedAllow(allow));

  // mode=url: only https:// survives. Everything else renders an error.
  const safeUrl = $derived(mode === 'url' && isSafeEmbedUrl(url) ? url : undefined);

  // mode=srcdoc: cap the payload. Svelte attribute-binds it, so the value is
  // HTML-attribute-encoded and cannot break out of the `srcdoc=` attribute.
  const safeSrcdoc = $derived.by(() => {
    if (mode !== 'srcdoc') return undefined;
    if (typeof srcdoc !== 'string') return undefined;
    if (srcdoc.length > EMBED_SRCDOC_MAX) {
      console.warn(
        `[Ripple] embed srcdoc exceeds ${EMBED_SRCDOC_MAX} bytes — truncated.`
      );
      return srcdoc.slice(0, EMBED_SRCDOC_MAX);
    }
    return srcdoc;
  });

  const invalid = $derived(
    (mode === 'url' && safeUrl === undefined) ||
      (mode === 'srcdoc' && safeSrcdoc === undefined)
  );

  // -- capability bridge (mode=srcdoc only) ---------------------------------
  // A host publishes this on context; a spec cannot, because a spec is JSON
  // and JSON carries no functions. No host, no bridge, no shim — the widget
  // then renders exactly as it did before this feature existed.
  const bridgeHost = getContext<WidgetBridgeHost | undefined>(WIDGET_BRIDGE_CONTEXT_KEY);
  // Capturing `mode` / `id` once at init is deliberate: a token belongs to
  // one widget INSTANCE for its whole life. It is minted here and revoked in
  // onDestroy — it must not be re-minted when a prop changes.
  // svelte-ignore state_referenced_locally
  const bridge: WidgetBridgeHandle | undefined =
    mode === 'srcdoc' && bridgeHost ? bridgeHost.connect({ widgetId: id }) : undefined;

  let frameEl = $state<HTMLIFrameElement | null>(null);

  // Bind the token to THIS frame's window, so the host can answer "which
  // widget sent this?" by comparing `event.source` before trusting a token.
  $effect(() => {
    if (!bridge) return;
    bridge.attach(frameEl?.contentWindow ?? null);
  });

  // Revocation is synchronous with teardown: a torn-down widget's token
  // stops working immediately, and in-flight calls can never be delivered
  // to a later instance.
  onDestroy(() => bridge?.revoke());

  // The shim is PREPENDED after the cap has already been applied to author
  // content, so the 64KB budget still measures author bytes only.
  const frameSrcdoc = $derived.by(() => {
    if (safeSrcdoc === undefined) return undefined;
    if (!bridge) return safeSrcdoc;
    return buildWidgetBridgeShimScript({ token: bridge.token }) + safeSrcdoc;
  });

  const frameStyle = $derived.by(() => {
    const s: string[] = ['width:100%', 'border:0', 'display:block'];
    if (aspectRatio) {
      s.push(`aspect-ratio:${aspectRatio}`);
    } else if (typeof height === 'number') {
      s.push(`height:${height}px`);
    } else {
      s.push('height:360px');
    }
    if (style) s.push(...Object.entries(style).map(([k, v]) => `${k}:${v}`));
    return s.join(';');
  });
</script>

{#if invalid}
  <div
    {id}
    class="ripple-embed-error text-red-500 p-2 border border-red-300 rounded bg-red-50 text-sm {className ?? ''}"
  >
    {#if mode === 'url'}
      Embed blocked: only <code>https://</code> URLs are allowed.
    {:else}
      Embed blocked: no <code>srcdoc</code> content provided.
    {/if}
  </div>
{:else if mode === 'url'}
  <!--
    sandbox is the hard-coded EMBED_SANDBOX constant — NOT bound to any
    spec prop. referrerpolicy + loading are always pinned.
  -->
  <iframe
    {id}
    class={className}
    style={frameStyle}
    {title}
    src={safeUrl}
    sandbox={EMBED_SANDBOX}
    allow={allowAttr || undefined}
    referrerpolicy="no-referrer"
    loading="lazy"
  ></iframe>
{:else}
  <!--
    srcdoc = shim (when a host bridge exists) + the capped author content.
    sandbox / allow / referrerpolicy below are unchanged and unchangeable.
  -->
  <iframe
    bind:this={frameEl}
    {id}
    class={className}
    style={frameStyle}
    {title}
    srcdoc={frameSrcdoc}
    sandbox={EMBED_SANDBOX}
    allow={allowAttr || undefined}
    referrerpolicy="no-referrer"
    loading="lazy"
  ></iframe>
{/if}
