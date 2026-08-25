import type { WidgetManifestEntry } from '../index.js';

export const soulStatusEntry: WidgetManifestEntry = {
  type: 'soul-status',
  category: 'display',
  description: 'Agent soul state — avatar, name, energy, mood, status. Compact pill or expanded card.',
  props: {
    name: { type: 'string', required: false, description: 'Agent name.' },
    role: { type: 'string', required: false, description: 'Agent role.' },
    initials: { type: 'string', required: false, description: 'Avatar initials.' },
    color: { type: 'string', required: false, description: 'Avatar background color.' },
    mood: { type: 'string', required: false, description: 'Mood emoji/text.' },
    energy: { type: 'number', required: false, description: 'Energy level (0-100).' },
    memories: { type: 'number', required: false, description: 'Memory count.' },
    lastAction: { type: 'string', required: false, description: 'Last action performed.' },
    status: { type: '"online" | "offline" | "busy"', required: false, description: 'Online status.' },
    compact: { type: 'boolean', required: false, description: 'Compact pill (true) or expanded card (false).' },
  },
  example: { type: 'soul-status', props: { name: 'Claude', role: 'AI Assistant', color: '#6366f1', mood: '😊', energy: 85, memories: 342, status: 'online', compact: true } },
};
