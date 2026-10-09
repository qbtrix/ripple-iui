// manifest/entries/illustration.ts — the LLM-facing entry for `illustration`,
// model-written animated SVG (design doc 2026-10-09-ripple-illustration-svg.md).
// The model writes the markup; the widget rebuilds it from an allowlist. No
// bind, no events. staticSafe is false: the art is built client-side.
import type { WidgetManifestEntry } from '../index.js';

export const illustrationEntry: WidgetManifestEntry = {
  type: 'illustration',
  category: 'display',
  staticSafe: false,
  description:
    'A small animated SVG drawing you write: <svg viewBox> with shapes, gradients and animate/animateTransform. No scripts, styles, links, images or filters. Display only.',
  props: {
    svg: {
      type: 'string',
      required: true,
      description:
        "SVG markup, root <svg viewBox='...'>. Put attributes in single quotes so the JSON needs no escaping. Under 24,000 chars, 400 elements, 40 animations, 40 use (never a use of a use); every dur 0.5s or more. Elements: svg g defs title desc path rect circle ellipse line polyline polygon text tspan linearGradient radialGradient stop clipPath mask symbol use animate animateTransform animateMotion mpath set. Refs only as url(#id) and href='#id' (plain href, not xlink:href). No style attribute, no on* handlers.",
    },
    title: { type: 'string', required: true, description: 'Accessible name, e.g. "Sun rising over two hills".' },
    caption: { type: 'string', required: false, description: 'Optional line under the art.' },
    max_height: { type: 'number', required: false, description: 'Height cap in px, 80 to 640. Default 320.' },
  },
  example: {
    type: 'illustration',
    props: {
      title: 'Sun rising over two hills',
      caption: 'Morning, drawn in SVG.',
      max_height: 200,
      svg: "<svg viewBox='0 0 200 120'><defs><linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#bfe3ff'/><stop offset='1' stop-color='#fff4d6'/></linearGradient></defs><rect width='200' height='120' fill='url(#sky)'/><circle cx='100' cy='110' r='18' fill='#ffb703'><animate attributeName='cy' from='110' to='48' dur='3s' fill='freeze'/></circle><path d='M0 120 Q50 70 100 105 T200 95 V120 Z' fill='#7cb518'/><path d='M0 120 Q60 90 120 112 T200 108 V120 Z' fill='#4f772d'/></svg>",
    },
  },
};
