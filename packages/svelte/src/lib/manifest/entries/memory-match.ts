// manifest/entries/memory-match.ts — the LLM-facing entry for the memory-match
// play widget (plan 2026-10-10, G1). The model writes the pairs; the widget
// deals, flips, matches, times and scores. `value` is the bound field (written
// by the widget); `on_complete` is the one event, fired once per won game.
import type { WidgetManifestEntry } from '../index.js';

export const memoryMatchEntry: WidgetManifestEntry = {
  type: 'memory-match',
  category: 'composite',
  description:
    'Card-flip pairs game: pairs[{id, a, b}] (6 to 12), each side text, one emoji or "icon:<key>". Moves, time, best, win screen. Bind value; on_complete {moves, seconds}.',
  props: {
    title: { type: 'string', required: false, description: 'Theme of the game, e.g. "Spanish animals".' },
    pairs: {
      type: 'Array<{ id: string; a: string; b: string }>',
      required: true,
      description:
        '6 to 12 pairs (more than 12 are dropped). `a` and `b` are the two cards that match: plain text (a word and its translation), a single emoji, or "icon:<key>" with a key from the data icon maps (coffee, flight, train, car, home, food, fish, bread, cheese, camera, wifi, ...). An unknown key shows as its text, so prefer emoji for pictures.',
    },
    columns: { type: 'number', required: false, description: 'Grid columns. Default: auto by card count (4 up to 16 cards, then 5, then 6).' },
    time_limit_s: { type: 'number', required: false, description: 'Optional time limit in seconds; when it runs out the game ends. No limit by default.' },
    value: {
      type: '{ moves: number; matched: string[]; completed: boolean; seconds: number }',
      required: false,
      description: 'The game so far, written by the widget on each move. `matched` lists pair ids. Bind with `bind: "{state.game}"` to show it elsewhere.',
    },
  },
  events: {
    on_complete: { type: 'EventAction', required: false, description: 'Fired once when every pair is matched, with { moves, seconds }.' },
  },
  example: {
    type: 'memory-match',
    bind: '{state.game}',
    props: {
      title: 'Spanish animals',
      pairs: [
        { id: 'dog', a: 'perro', b: '🐶' },
        { id: 'cat', a: 'gato', b: '🐱' },
        { id: 'horse', a: 'caballo', b: '🐴' },
        { id: 'bird', a: 'pájaro', b: '🐦' },
        { id: 'fish', a: 'pez', b: '🐟' },
        { id: 'cow', a: 'vaca', b: '🐮' },
      ],
    },
  },
};
