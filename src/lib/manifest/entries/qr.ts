import type { WidgetManifestEntry } from '../index.js';

export const qrEntry: WidgetManifestEntry = {
  type: 'qr',
  category: 'display',
  description: 'QR code for any text payload (URL, vCard, etc.) with error correction and color control.',
  props: {
    value: { type: 'string', required: true, description: 'Payload to encode.' },
    size: { type: 'number', required: false, description: 'Code size in px. Default 160.' },
    color: { type: 'string', required: false, description: 'Foreground color. Default black.' },
    background: { type: 'string', required: false, description: 'Background color. Default white.' },
    ecl: { type: '"L" | "M" | "Q" | "H"', required: false, description: 'Error correction level.' },
    padding: { type: 'number', required: false, description: 'Quiet zone in modules. Default 2.' },
    caption: { type: 'string', required: false, description: 'Caption below code.' },
  },
  example: { type: 'qr', props: { value: 'https://example.com', size: 160, caption: 'Scan to visit' } },
};
