<!--
  @file ModelViewer.svelte
  @description Declarative 3D model viewer. Wraps Google's `<model-viewer>`
    web component to render GLB/GLTF assets with orbit controls, AR, and
    environment lighting — all driven by spec props (no imperative camera
    API is exposed to the author).
  @created 2026-05-22 — Increment 5 (escape-hatch widgets). This is the
    "promote a hard case to a real widget" example: 3D rendering used to be
    impossible to express in a spec; now it is a first-class catalog entry.
  @changes
    - Initial creation. Lazy-loads `@google/model-viewer` (~300KB) on first
      mount so the core Ripple bundle stays thin — the dependency is only
      pulled in when a spec actually uses a `model-viewer` node.
-->
<script lang="ts">
  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** GLB / GLTF model URL. Required. */
    src: string;
    /** Poster image shown before the model loads / while interaction is dismissed. */
    poster?: string;
    /** Accessible description of the model. */
    alt?: string;
    /** Allow mouse / touch orbit + zoom. Default true. */
    cameraControls?: boolean;
    /** Slowly rotate the model when idle. */
    autoRotate?: boolean;
    /** Enable the "View in your space" AR affordance on supported devices. */
    ar?: boolean;
    /** URL of an HDR / image-based lighting environment. */
    environmentImage?: string;
    /** Exposure of the rendered scene (1 = neutral). */
    exposure?: number;
    /** Strength of the contact shadow under the model (0–1). */
    shadowIntensity?: number;
  }

  let {
    id,
    class: className,
    style,
    src,
    poster,
    alt = '3D model',
    cameraControls = true,
    autoRotate = false,
    ar = false,
    environmentImage,
    exposure,
    shadowIntensity
  }: Props = $props();

  // The custom element is registered globally once `@google/model-viewer`
  // is imported. We gate rendering on this flag so the ~300KB module is
  // only fetched the first time a `model-viewer` node actually mounts.
  let loaded = $state(false);
  let loadFailed = $state(false);

  $effect(() => {
    let cancelled = false;
    // Already defined by a previous mount — skip the dynamic import.
    if (typeof customElements !== 'undefined' && customElements.get('model-viewer')) {
      loaded = true;
      return;
    }
    import('@google/model-viewer')
      .then(() => {
        if (!cancelled) loaded = true;
      })
      .catch((err) => {
        console.error('[Ripple] Failed to load @google/model-viewer', err);
        if (!cancelled) loadFailed = true;
      });
    return () => {
      cancelled = true;
    };
  });

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
</script>

{#if loaded}
  <!-- svelte-ignore element_invalid_self_closing_tag -->
  <model-viewer
    {id}
    class={className}
    style={styleString}
    {src}
    {poster}
    {alt}
    camera-controls={cameraControls ? '' : undefined}
    auto-rotate={autoRotate ? '' : undefined}
    ar={ar ? '' : undefined}
    environment-image={environmentImage}
    exposure={exposure != null ? String(exposure) : undefined}
    shadow-intensity={shadowIntensity != null ? String(shadowIntensity) : undefined}
  ></model-viewer>
{:else if loadFailed}
  <div
    {id}
    class="ripple-model-viewer-error text-red-500 p-2 border border-red-300 rounded bg-red-50 text-sm"
  >
    Could not load the 3D viewer.
  </div>
{:else}
  <div
    {id}
    class="ripple-model-viewer-loading text-muted-foreground p-2 text-sm"
    aria-busy="true"
  >
    Loading 3D model…
  </div>
{/if}
