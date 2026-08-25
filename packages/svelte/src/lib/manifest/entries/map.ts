import type { WidgetManifestEntry } from '../index.js';

export const mapEntry: WidgetManifestEntry = {
  type: 'map',
  category: 'data',
  description:
    'Leaflet-backed interactive map. Renders markers, polyline paths, polygon geofences, and live trackers (smoothly interpolated moving markers with optional trails). No API key needed for default tiles.',
  props: {
    center: { type: '[number, number]', required: false, description: 'Initial map center as [lat, lng]. Default [0, 0].' },
    zoom: { type: 'number', required: false, description: 'Initial zoom level (0–20). Default 2.' },
    minZoom: { type: 'number', required: false, description: 'Minimum allowed zoom.' },
    maxZoom: { type: 'number', required: false, description: 'Maximum allowed zoom.' },
    bounds: { type: '[[number, number], [number, number]]', required: false, description: 'Fit-to-bounds rectangle [[swLat, swLng], [neLat, neLng]]. Overrides center+zoom when supplied.' },
    tiles: { type: '"osm" | "carto-voyager" | "carto-light" | "carto-dark" | "osm-hot" | "custom"', required: false, description: 'Tile provider preset. Default "carto-voyager". All presets are key-free OpenStreetMap-derived tiles. Use "custom" with `tileUrl`.' },
    tileUrl: { type: 'string', required: false, description: 'Custom XYZ tile URL template (used when `tiles` is "custom"). Supports {z}/{x}/{y} and {s} subdomain placeholders.' },
    tileAttribution: { type: 'string', required: false, description: 'Attribution HTML for custom tiles. Required by most tile providers.' },
    markers: {
      type: 'Array<{ id: string; lat: number; lng: number; label?: string; popup?: string; icon?: string; color?: string; actions?: EventAction | EventAction[] }>',
      required: false,
      description: 'Static markers. `actions` runs on click (route through ripple emit/api/navigate).',
    },
    paths: {
      type: 'Array<{ id: string; points: [number, number][]; color?: string; weight?: number; dashed?: boolean; animate?: boolean; label?: string }>',
      required: false,
      description: 'Polyline paths. Set `animate: true` for a flowing dashed-route effect (great for itineraries).',
    },
    polygons: {
      type: 'Array<{ id: string; points: [number, number][]; color?: string; fillColor?: string; fillOpacity?: number; weight?: number; label?: string }>',
      required: false,
      description: 'Filled polygons / geofences / coverage regions.',
    },
    trackers: {
      type: 'Array<{ id: string; lat: number; lng: number; heading?: number; label?: string; color?: string; icon?: string; trail?: [number, number][]; follow?: boolean }>',
      required: false,
      description: 'Live moving targets — vehicle, courier, ship, person. Position changes interpolate smoothly. `heading` rotates the directional arrow. `trail` draws recent positions. `follow: true` keeps the camera on the target.',
    },
    interactive: { type: 'boolean', required: false, description: 'Allow zoom/pan/scroll. Default true.' },
    showControls: { type: 'boolean', required: false, description: 'Show zoom +/− controls. Default true.' },
    showAttribution: { type: 'boolean', required: false, description: 'Show tile attribution. Default true. Most tile providers require this.' },
    height: { type: 'string | number', required: false, description: 'Map height (e.g. "400px", 320). Default "400px".' },
  },
  example: {
    type: 'map',
    props: {
      tiles: 'carto-voyager',
      center: [37.7749, -122.4194],
      zoom: 12,
      height: '420px',
      markers: [
        { id: 'hq', lat: 37.7749, lng: -122.4194, label: 'HQ', icon: 'building', color: 'oklch(0.55 0.18 250)' },
        { id: 'warehouse', lat: 37.79, lng: -122.41, label: 'Warehouse', color: 'oklch(0.65 0.16 150)', popup: 'Order fulfillment center' },
      ],
      paths: [
        { id: 'route', points: [[37.7749, -122.4194], [37.78, -122.412], [37.79, -122.41]], color: 'oklch(0.55 0.18 250)', weight: 4, dashed: true, animate: true, label: 'Delivery route' },
      ],
      polygons: [
        { id: 'zone', points: [[37.77, -122.43], [37.80, -122.43], [37.80, -122.39], [37.77, -122.39]], color: 'oklch(0.65 0.16 150)', fillOpacity: 0.12, label: 'Service area' },
      ],
      trackers: [
        { id: 'truck-1', lat: 37.785, lng: -122.415, heading: 45, label: 'Truck 1', color: 'oklch(0.65 0.22 25)', trail: [[37.7749, -122.4194], [37.78, -122.418], [37.785, -122.415]], follow: false },
      ],
    },
  },
};
