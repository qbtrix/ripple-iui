import type { WidgetManifestEntry } from '../index.js';

export const orderStatusEntry: WidgetManifestEntry = {
  type: 'order-status',
  category: 'composite',
  description:
    'Multi-step shipment status with stepper, ETA, tracking number, optional embedded live map, and an event timeline. Composes the `map` widget when geo data is supplied.',
  props: {
    title: { type: 'string', required: false, description: 'Heading. Defaults to "Tracking your order" / "Delivered" / "Order paused" based on status.' },
    orderId: { type: 'string', required: true, description: 'Order / shipment / job number shown in the eyebrow.' },
    status: { type: '"placed" | "confirmed" | "preparing" | "in-transit" | "out-for-delivery" | "delivered" | "failed" | "cancelled"', required: false, description: 'Default-pipeline status. Used to compute the active stepper position when `steps` is not supplied.' },
    steps: { type: 'Array<{ id: string; label: string; description?: string; completedAt?: string; current?: boolean; failed?: boolean }>', required: false, description: 'Custom step list. Overrides the default placed→delivered pipeline.' },
    currentStep: { type: 'string', required: false, description: 'Active step id when using a custom `steps` list.' },
    eta: { type: 'string', required: false, description: 'ETA string (e.g. "Today, 4 – 6 PM").' },
    tracking: { type: '{ carrier: string; number: string; url?: string }', required: false, description: 'Carrier and tracking number; renders as a link if `url` is provided.' },
    origin: { type: '{ name?: string; address?: string; lat?: number; lng?: number }', required: false, description: 'Origin place. lat/lng are used to plot a marker on the map.' },
    destination: { type: '{ name?: string; address?: string; lat?: number; lng?: number }', required: false, description: 'Destination place. lat/lng are used to plot a marker on the map.' },
    tracker: { type: '{ lat: number; lng: number; heading?: number; label?: string; color?: string }', required: false, description: 'Live courier position. Heading rotates the directional arrow.' },
    route: { type: '[number, number][]', required: false, description: 'Polyline points for the route. If omitted but origin+destination are set, a dashed line connects them.' },
    showMap: { type: 'boolean', required: false, description: 'Force-show or hide the embedded map. Defaults to true when any geographic data is supplied.' },
    mapHeight: { type: 'string | number', required: false, description: 'Map height. Default "320px".' },
    mapTiles: { type: '"osm" | "carto-voyager" | "carto-light" | "carto-dark" | "osm-hot" | "custom"', required: false, description: 'Map tile preset. Default "carto-voyager".' },
    followTracker: { type: 'boolean', required: false, description: 'Auto-pan the map to follow the courier. Default false.' },
    events: { type: 'Array<{ time: string; label: string; location?: string; icon?: string }>', required: false, description: 'Activity timeline beneath the map.' },
    actions: { type: 'Array<{ id?: string; label: string; icon?: string; variant?: "default" | "outline" | "ghost"; actions?: EventAction | EventAction[] }>', required: false, description: 'Actions row at the bottom.' },
  },
  example: {
    type: 'order-status',
    props: {
      orderId: 'AC-1042',
      status: 'out-for-delivery',
      eta: 'Today, 4 – 6 PM',
      tracking: { carrier: 'UPS', number: '1Z999AA10123456784', url: 'https://www.ups.com/track?tracknum=1Z999AA10123456784' },
      origin: { name: 'Acme Warehouse', address: 'Oakland, CA', lat: 37.79, lng: -122.41 },
      destination: { name: 'Customer', address: '500 Howard St, San Francisco, CA', lat: 37.7884, lng: -122.4 },
      tracker: { lat: 37.785, lng: -122.405, heading: 45, label: 'Driver' },
      events: [
        { time: '11:42 AM', label: 'Out for delivery', location: 'San Francisco, CA', icon: 'truck' },
        { time: '07:18 AM', label: 'Departed sorting facility', location: 'Oakland, CA' },
        { time: 'Yesterday 9:02 PM', label: 'Arrived at sorting facility', location: 'Oakland, CA' },
        { time: 'Yesterday 11:14 AM', label: 'Order placed' },
      ],
      actions: [
        { id: 'contact', label: 'Contact courier', icon: 'phone', variant: 'outline' },
        { id: 'issue', label: 'Report issue', icon: 'alert-triangle', variant: 'ghost' },
      ],
    },
  },
};
