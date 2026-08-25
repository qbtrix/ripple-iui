<!--
  @file LocationPicker.svelte
  @description Click-to-pick a single { lat, lng } point on a Leaflet map.
  Reuses the same tile presets as Map.svelte. Two-way `value` for ripple's
  `bind` field, plus `onchange` callback for plain-Svelte hosts.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { cn } from '$lib/utils.js';

  type LatLng = [number, number];
  type TilePreset = 'osm' | 'carto-voyager' | 'carto-light' | 'carto-dark' | 'osm-hot' | 'custom';

  interface Value {
    lat: number;
    lng: number;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    value?: Value | null;
    center?: LatLng;
    zoom?: number;
    tiles?: TilePreset;
    tileUrl?: string;
    tileAttribution?: string;
    height?: string | number;
    /** Marker color for the selected point. */
    color?: string;
    /** Help text shown above the map. */
    label?: string;
    /** Show formatted lat/lng readout below the map. Default true. */
    showReadout?: boolean;
    onchange?: (value: Value) => void;
  }

  let {
    id,
    class: className,
    style,
    value = $bindable(null),
    center = [0, 0],
    zoom = 2,
    tiles = 'carto-voyager',
    tileUrl,
    tileAttribution,
    height = '320px',
    color = 'oklch(0.55 0.18 250)',
    label,
    showReadout = true,
    onchange
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
  const heightStr = $derived(typeof height === 'number' ? `${height}px` : height);

  let mapEl: HTMLDivElement | undefined = $state();
  let mapInstance: any = null;
  let LRef: any = null;
  let pickMarker: any = null;

  const TILE_PRESETS: Record<Exclude<TilePreset, 'custom'>, { url: string; attribution: string; maxZoom: number }> = {
    osm: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    },
    'carto-voyager': {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20
    },
    'carto-light': {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20
    },
    'carto-dark': {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20
    },
    'osm-hot': {
      url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors. Tiles courtesy of <a href="https://www.hotosm.org/">Humanitarian OSM Team</a>',
      maxZoom: 19
    }
  };

  function tileSource() {
    if (tiles === 'custom') {
      return {
        url: tileUrl ?? TILE_PRESETS['carto-voyager'].url,
        attribution: tileAttribution ?? TILE_PRESETS['carto-voyager'].attribution,
        maxZoom: 20
      };
    }
    const preset = TILE_PRESETS[tiles];
    return preset;
  }

  function makePickIcon(L: any) {
    return L.divIcon({
      className: 'rmap-pick',
      html: `<div class="rmap-pick-wrap" style="--rmap-pick-color:${color};">
        <div class="rmap-pick-pulse"></div>
        <div class="rmap-pick-dot"></div>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  }

  function placePick(lat: number, lng: number) {
    if (!LRef || !mapInstance) return;
    if (!pickMarker) {
      pickMarker = LRef.marker([lat, lng], { icon: makePickIcon(LRef), draggable: true }).addTo(mapInstance);
      pickMarker.on('dragend', () => {
        const ll = pickMarker.getLatLng();
        commit(ll.lat, ll.lng);
      });
    } else {
      pickMarker.setLatLng([lat, lng]);
    }
  }

  function commit(lat: number, lng: number) {
    const next = { lat, lng };
    value = next;
    onchange?.(next);
  }

  onMount(() => {
    let cleanup = () => {};
    (async () => {
      const L = (await import('leaflet')).default ?? (await import('leaflet'));
      await import('leaflet/dist/leaflet.css');
      LRef = L;
      if (!mapEl) return;

      const initialCenter: LatLng = value ? [value.lat, value.lng] : center;
      const map = L.map(mapEl, { zoomControl: true, attributionControl: true });
      mapInstance = map;

      const src = tileSource();
      L.tileLayer(src.url, { attribution: src.attribution, maxZoom: src.maxZoom }).addTo(map);

      map.setView(initialCenter, value ? Math.max(zoom, 13) : zoom);

      if (value) placePick(value.lat, value.lng);

      map.on('click', (e: any) => {
        placePick(e.latlng.lat, e.latlng.lng);
        commit(e.latlng.lat, e.latlng.lng);
      });

      cleanup = () => {
        map.remove();
        mapInstance = null;
        pickMarker = null;
      };
    })();
    return () => cleanup();
  });

  // External `value` updates (e.g. via state binding) → reposition the marker.
  $effect(() => {
    if (!mapInstance || !LRef) return;
    if (value) placePick(value.lat, value.lng);
  });
</script>

<div {id} class={cn('flex flex-col gap-2 w-full', className)} style={styleString}>
  {#if label}
    <span class="text-sm font-medium leading-none">{label}</span>
  {/if}
  <div class="rmap" style={`height:${heightStr};`} bind:this={mapEl}></div>
  {#if showReadout}
    <div class="text-xs text-muted-foreground tabular-nums">
      {#if value}
        {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
      {:else}
        Click the map to pick a location
      {/if}
    </div>
  {/if}
</div>

<style>
  .rmap {
    position: relative;
    width: 100%;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--border);
    background: var(--muted);
    z-index: 0;
  }

  :global(.rmap-pick) {
    background: transparent !important;
    border: 0 !important;
  }
  :global(.rmap-pick-wrap) {
    position: relative;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  :global(.rmap-pick-pulse) {
    position: absolute;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--rmap-pick-color);
    opacity: 0.3;
    animation: rmap-pick-pulse 1.8s ease-out infinite;
  }
  :global(.rmap-pick-dot) {
    position: relative;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--rmap-pick-color);
    border: 2px solid white;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  }
  @keyframes rmap-pick-pulse {
    0% { transform: scale(0.4); opacity: 0.55; }
    100% { transform: scale(1.6); opacity: 0; }
  }
</style>
