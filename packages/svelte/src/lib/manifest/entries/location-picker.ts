import type { WidgetManifestEntry } from '../index.js';

export const locationPickerEntry: WidgetManifestEntry = {
  type: 'location-picker',
  category: 'input',
  description:
    'Click-or-drag to pick a single { lat, lng } point on a map. Two-way bindable. Uses the same key-free tile presets as the `map` widget.',
  props: {
    value: { type: '{ lat: number; lng: number } | null', required: false, description: 'Current pick. Use top-level `bind` to two-way bind to a state path.' },
    center: { type: '[number, number]', required: false, description: 'Initial map center [lat, lng] when `value` is null. Default [0, 0].' },
    zoom: { type: 'number', required: false, description: 'Initial zoom. Default 2 when value is null, otherwise max(zoom, 13).' },
    tiles: { type: '"osm" | "carto-voyager" | "carto-light" | "carto-dark" | "osm-hot" | "custom"', required: false, description: 'Tile provider preset. Default "carto-voyager".' },
    tileUrl: { type: 'string', required: false, description: 'Custom XYZ tile URL template when `tiles` is "custom".' },
    tileAttribution: { type: 'string', required: false, description: 'Attribution HTML for custom tiles.' },
    height: { type: 'string | number', required: false, description: 'Map height. Default "320px".' },
    color: { type: 'string', required: false, description: 'Marker color (any CSS color, oklch encouraged).' },
    label: { type: 'string', required: false, description: 'Help text shown above the map.' },
    showReadout: { type: 'boolean', required: false, description: 'Show formatted lat/lng text below the map. Default true.' },
  },
  example: {
    type: 'location-picker',
    bind: 'pickedLocation',
    props: {
      label: 'Pin the meeting point',
      center: [40.7128, -74.006],
      zoom: 12,
      height: '320px',
      tiles: 'carto-light',
    },
  },
};
