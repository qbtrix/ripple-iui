// manifest/entries/flashcard-deck.ts — the LLM-facing entry for the
// flashcard-deck data widget (design doc 2026-10-09 §3.9). The model writes
// the cards; the widget runs the flips, marks, score and re-deal. `score` is
// the bound field (written by the widget); `on_complete` is the one event.
import type { WidgetManifestEntry } from '../index.js';

export const flashcardDeckEntry: WidgetManifestEntry = {
  type: 'flashcard-deck',
  category: 'composite',
  description:
    'Study deck: cards[{front, back, hint, category}]. Flip each card, mark Got it or Missed it, then a score screen with Practise missed. Bind score; on_complete {score, total}.',
  props: {
    title: { type: 'string', required: false, description: 'Deck name, e.g. "Beginner Spanish".' },
    subtitle: { type: 'string', required: false, description: 'One line under the title.' },
    verdict: { type: '{ text: string; status?: "good" | "warn" | "bad" | "info" | "neutral" }', required: false, description: 'The answer up front, at most 140 chars. Usually omitted for a deck.' },
    cards: {
      type: 'Array<{ id?: string; front: string; back: string; hint?: string; category?: string }>',
      required: true,
      description: 'The cards. `front` is the prompt, `back` the answer, `hint` an optional nudge shown on request, `category` a small topic label.',
    },
    shuffle: { type: 'boolean', required: false, description: 'Deal in shuffled order (a new order on every restart). Default false.' },
    score: { type: 'number', required: false, description: 'Cards known since the last restart, written by the widget. Bind with `bind: "{state.score}"` to show it elsewhere.' },
  },
  events: {
    on_complete: { type: 'EventAction', required: false, description: 'Fired at the end of every pass with { score, total }.' },
  },
  example: {
    type: 'flashcard-deck',
    bind: '{state.score}',
    props: {
      title: 'Beginner Spanish',
      subtitle: 'Flip, then mark whether you knew it',
      cards: [
        { front: 'Hello', back: 'Hola', category: 'Greetings' },
        { front: 'Thank you', back: 'Gracias', category: 'Greetings' },
        { front: 'Please', back: 'Por favor', category: 'Greetings' },
        { front: 'Water', back: 'Agua', hint: 'Sounds like "aqua"', category: 'Food and drink' },
        { front: 'Friend', back: 'Amigo / Amiga', category: 'People' },
        { front: 'Where is the bathroom?', back: '¿Dónde está el baño?', category: 'Travel' },
      ],
    },
  },
};
