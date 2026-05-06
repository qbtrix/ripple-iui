<!--
  @file Map.svelte
  @description Leaflet-backed map widget. Renders markers, paths (polylines),
  polygons (geofences), live trackers (smoothly interpolated moving markers
  with optional trails), and popups. Click events route through the ripple
  EventDispatcher so chat-spec authors can wire `chat.send` round-trips.

  Tile providers default to OpenStreetMap-derived presets (no API key). All
  Leaflet imports are dynamic so the widget is SSR-safe and only pulls the
  ~42 KB library in when the widget actually mounts.
-->
<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import { cn } from '$lib/utils.js';
  import type { EventHandler, EventHandlerOrArray } from '$lib/schema/event-handler.js';
  import type { EventDispatcher } from '$lib/core/event-dispatcher.js';
  import type { StateManager } from '$lib/core/state-manager.svelte.js';

  type LatLng = [number, number];

  interface Marker {
    id: string;
    lat: number;
    lng: number;
    label?: string;
    popup?: string;
    icon?: string;
    color?: string;
    actions?: EventHandlerOrArray;
  }

  interface Path {
    id: string;
    points: LatLng[];
    color?: string;
    weight?: number;
    dashed?: boolean;
    animate?: boolean;
    label?: string;
  }

  interface Polygon {
    id: string;
    points: LatLng[];
    color?: string;
    fillColor?: string;
    fillOpacity?: number;
    weight?: number;
    label?: string;
  }

  interface Tracker {
    id: string;
    lat: number;
    lng: number;
    heading?: number;
    label?: string;
    color?: string;
    icon?: string;
    trail?: LatLng[];
    follow?: boolean;
  }

  type TilePreset = 'osm' | 'carto-voyager' | 'carto-light' | 'carto-dark' | 'osm-hot' | 'custom';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    center?: LatLng;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    bounds?: [LatLng, LatLng];
    tiles?: TilePreset;
    tileUrl?: string;
    tileAttribution?: string;
    markers?: Marker[];
    paths?: Path[];
    polygons?: Polygon[];
    trackers?: Tracker[];
    interactive?: boolean;
    showControls?: boolean;
    showAttribution?: boolean;
    height?: string | number;
    onmarkerclick?: (id: string) => void;
    onmapclick?: (lat: number, lng: number) => void;
  }

  let {
    id,
    class: className,
    style,
    center = [0, 0],
    zoom = 2,
    minZoom,
    maxZoom,
    bounds,
    tiles = 'carto-voyager',
    tileUrl,
    tileAttribution,
    markers = [],
    paths = [],
    polygons = [],
    trackers = [],
    interactive = true,
    showControls = true,
    showAttribution = true,
    height = '400px',
    onmarkerclick,
    onmapclick
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );
  const heightStr = $derived(typeof height === 'number' ? `${height}px` : height);

  const eventDispatcher = getContext<EventDispatcher | undefined>('ui-events');
  const stateManager = getContext<StateManager | undefined>('ui-state');

  let mapEl: HTMLDivElement | undefined = $state();
  let mapInstance: any = null;
  let LRef: any = null;
  let markerLayer: any = null;
  let pathLayer: any = null;
  let polygonLayer: any = null;
  let trackerLayer: any = null;
  let trackerTrailLayer: any = null;
  let trackerMarkers = new Map<string, any>();
  let trackerTrails = new Map<string, any>();

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

  function dispatch(handler: EventHandlerOrArray | undefined, payload: unknown) {
    if (!handler || !eventDispatcher) return false;
    const handlers = Array.isArray(handler) ? handler : [handler];
    void eventDispatcher.dispatch(
      handlers as EventHandler[],
      { state: stateManager?.state ?? {}, marker: payload },
      payload
    );
    return true;
  }

  function makeDivIcon(L: any, opts: { color?: string; icon?: string; label?: string; size?: number }) {
    const size = opts.size ?? 32;
    const color = opts.color ?? 'oklch(0.55 0.18 250)';
    const inner = opts.icon
      ? `<span class="rmap-pin-icon" data-icon="${opts.icon}" style="background:${color};"></span>`
      : `<span class="rmap-pin-dot" style="background:${color};"></span>`;
    const labelHtml = opts.label
      ? `<span class="rmap-pin-label">${escapeHtml(opts.label)}</span>`
      : '';
    return L.divIcon({
      className: 'rmap-pin',
      html: `<div class="rmap-pin-wrap">${inner}${labelHtml}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  }

  function makeTrackerIcon(L: any, t: Tracker) {
    const color = t.color ?? 'oklch(0.65 0.22 25)';
    const heading = t.heading ?? 0;
    const html = `
      <div class="rmap-tracker-wrap" style="--rmap-tracker-color:${color}; --rmap-tracker-rot:${heading}deg;">
        <div class="rmap-tracker-pulse"></div>
        <div class="rmap-tracker-arrow"></div>
        ${t.label ? `<span class="rmap-tracker-label">${escapeHtml(t.label)}</span>` : ''}
      </div>
    `;
    return L.divIcon({
      className: 'rmap-tracker',
      html,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }

  function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) =>
      c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;'
    );
  }

  function tileSource() {
    if (tiles === 'custom') {
      return {
        url: tileUrl ?? TILE_PRESETS['carto-voyager'].url,
        attribution: tileAttribution ?? TILE_PRESETS['carto-voyager'].attribution,
        maxZoom: maxZoom ?? 20
      };
    }
    const preset = TILE_PRESETS[tiles];
    return {
      url: preset.url,
      attribution: preset.attribution,
      maxZoom: maxZoom ?? preset.maxZoom
    };
  }

  onMount(() => {
    let cleanup = () => {};
    (async () => {
      const L = (await import('leaflet')).default ?? (await import('leaflet'));
      await import('leaflet/dist/leaflet.css');
      LRef = L;
      if (!mapEl) return;

      const map = L.map(mapEl, {
        zoomControl: showControls && interactive,
        attributionControl: showAttribution,
        dragging: interactive,
        touchZoom: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
        minZoom,
        maxZoom
      });
      mapInstance = map;

      const src = tileSource();
      L.tileLayer(src.url, { attribution: src.attribution, maxZoom: src.maxZoom }).addTo(map);

      if (bounds) {
        map.fitBounds(bounds);
      } else {
        map.setView(center, zoom);
      }

      markerLayer = L.layerGroup().addTo(map);
      pathLayer = L.layerGroup().addTo(map);
      polygonLayer = L.layerGroup().addTo(map);
      trackerTrailLayer = L.layerGroup().addTo(map);
      trackerLayer = L.layerGroup().addTo(map);

      if (onmapclick) {
        map.on('click', (e: any) => onmapclick(e.latlng.lat, e.latlng.lng));
      }

      // Trigger initial draws.
      drawMarkers();
      drawPaths();
      drawPolygons();
      drawTrackers();

      cleanup = () => {
        map.remove();
        mapInstance = null;
        markerLayer = pathLayer = polygonLayer = trackerLayer = trackerTrailLayer = null;
        trackerMarkers.clear();
        trackerTrails.clear();
      };
    })();
    return () => cleanup();
  });

  // Reactive re-draws — run only after the map is mounted.
  $effect(() => {
    void markers;
    if (mapInstance) drawMarkers();
  });
  $effect(() => {
    void paths;
    if (mapInstance) drawPaths();
  });
  $effect(() => {
    void polygons;
    if (mapInstance) drawPolygons();
  });
  $effect(() => {
    void trackers;
    if (mapInstance) drawTrackers();
  });

  function drawMarkers() {
    if (!LRef || !markerLayer) return;
    markerLayer.clearLayers();
    for (const m of markers) {
      const lm = LRef.marker([m.lat, m.lng], { icon: makeDivIcon(LRef, { color: m.color, icon: m.icon, label: m.label }) });
      if (m.popup) lm.bindPopup(m.popup);
      lm.on('click', () => {
        const dispatched = dispatch(m.actions, m);
        if (!dispatched) onmarkerclick?.(m.id);
      });
      markerLayer.addLayer(lm);
    }
  }

  function drawPaths() {
    if (!LRef || !pathLayer) return;
    pathLayer.clearLayers();
    for (const p of paths) {
      const opts: any = {
        color: p.color ?? 'oklch(0.55 0.18 250)',
        weight: p.weight ?? 4,
        opacity: 0.85
      };
      if (p.dashed || p.animate) opts.dashArray = '8, 8';
      if (p.animate) opts.className = 'rmap-path-animated';
      const line = LRef.polyline(p.points, opts);
      if (p.label) line.bindTooltip(p.label, { sticky: true });
      pathLayer.addLayer(line);
    }
  }

  function drawPolygons() {
    if (!LRef || !polygonLayer) return;
    polygonLayer.clearLayers();
    for (const g of polygons) {
      const poly = LRef.polygon(g.points, {
        color: g.color ?? 'oklch(0.55 0.18 250)',
        weight: g.weight ?? 2,
        fillColor: g.fillColor ?? g.color ?? 'oklch(0.55 0.18 250)',
        fillOpacity: g.fillOpacity ?? 0.15
      });
      if (g.label) poly.bindTooltip(g.label, { sticky: true });
      polygonLayer.addLayer(poly);
    }
  }

  function drawTrackers() {
    if (!LRef || !trackerLayer || !trackerTrailLayer) return;
    const seen = new Set<string>();
    for (const t of trackers) {
      seen.add(t.id);
      let m = trackerMarkers.get(t.id);
      if (!m) {
        m = LRef.marker([t.lat, t.lng], { icon: makeTrackerIcon(LRef, t), keyboard: false });
        trackerLayer.addLayer(m);
        trackerMarkers.set(t.id, m);
      } else {
        // Update position with smooth CSS-driven interpolation (transform transition).
        m.setLatLng([t.lat, t.lng]);
        m.setIcon(makeTrackerIcon(LRef, t));
      }

      if (t.trail && t.trail.length > 1) {
        let line = trackerTrails.get(t.id);
        const trailOpts = {
          color: t.color ?? 'oklch(0.65 0.22 25)',
          weight: 3,
          opacity: 0.45,
          dashArray: '4, 6'
        };
        if (!line) {
          line = LRef.polyline(t.trail, trailOpts);
          trackerTrailLayer.addLayer(line);
          trackerTrails.set(t.id, line);
        } else {
          line.setLatLngs(t.trail);
          line.setStyle(trailOpts);
        }
      } else {
        const line = trackerTrails.get(t.id);
        if (line) {
          trackerTrailLayer.removeLayer(line);
          trackerTrails.delete(t.id);
        }
      }

      if (t.follow && mapInstance) mapInstance.panTo([t.lat, t.lng], { animate: true, duration: 0.5 });
    }
    // Drop trackers that disappeared.
    for (const [tid, m] of trackerMarkers) {
      if (!seen.has(tid)) {
        trackerLayer.removeLayer(m);
        trackerMarkers.delete(tid);
        const line = trackerTrails.get(tid);
        if (line) {
          trackerTrailLayer.removeLayer(line);
          trackerTrails.delete(tid);
        }
      }
    }
  }
</script>

<div
  {id}
  class={cn('rmap', className)}
  style={`height:${heightStr};${styleString ?? ''}`}
  bind:this={mapEl}
></div>

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

  /* Markers — divIcon-based to avoid Leaflet's default-icon path issues */
  :global(.rmap-pin) {
    background: transparent !important;
    border: 0 !important;
  }
  :global(.rmap-pin-wrap) {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    pointer-events: auto;
  }
  :global(.rmap-pin-dot) {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  }
  :global(.rmap-pin-icon) {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
    display: inline-block;
  }
  :global(.rmap-pin-label) {
    margin-top: 4px;
    padding: 1px 6px;
    background: var(--background);
    color: var(--foreground);
    font-size: 11px;
    font-weight: 500;
    border-radius: 4px;
    border: 1px solid var(--border);
    white-space: nowrap;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  }

  /* Trackers — pulsing arrow + smooth movement */
  :global(.rmap-tracker) {
    background: transparent !important;
    border: 0 !important;
  }
  :global(.leaflet-marker-icon.rmap-tracker) {
    transition: transform 0.6s linear;
  }
  :global(.rmap-tracker-wrap) {
    position: relative;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  :global(.rmap-tracker-pulse) {
    position: absolute;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--rmap-tracker-color);
    opacity: 0.3;
    animation: rmap-pulse 2s ease-out infinite;
  }
  :global(.rmap-tracker-arrow) {
    position: relative;
    width: 0;
    height: 0;
    border-left: 9px solid transparent;
    border-right: 9px solid transparent;
    border-bottom: 16px solid var(--rmap-tracker-color);
    transform: rotate(var(--rmap-tracker-rot));
    filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.4));
  }
  :global(.rmap-tracker-label) {
    position: absolute;
    bottom: -22px;
    padding: 1px 6px;
    background: var(--background);
    color: var(--foreground);
    font-size: 11px;
    font-weight: 500;
    border-radius: 4px;
    border: 1px solid var(--border);
    white-space: nowrap;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  }
  @keyframes rmap-pulse {
    0% { transform: scale(0.5); opacity: 0.5; }
    100% { transform: scale(1.6); opacity: 0; }
  }

  /* Animated route flow */
  :global(.rmap-path-animated) {
    animation: rmap-flow 1.2s linear infinite;
  }
  @keyframes rmap-flow {
    to { stroke-dashoffset: -32; }
  }
</style>
