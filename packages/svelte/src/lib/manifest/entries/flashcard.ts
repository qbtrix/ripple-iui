// @file manifest/entries/flashcard.ts
// @description Manifest entry for the `flashcard` widget.
// @created 2026-05-31 — composite consumer widgets migration (ocean-flow port).
import type { WidgetManifestEntry } from '../index.js';

export const flashcardEntry: WidgetManifestEntry = {
  type: 'flashcard',
  category: 'interactive',
  description:
    'Study flashcard with a 3D flip between a question (front) and answer (back), plus "Got it" and "Needs review" actions for spaced repetition.',
  props: {
    front: { type: 'string', required: true, description: 'Question / front text.' },
    back: { type: 'string', required: true, description: 'Answer / back text.' },
    category: { type: 'string', required: false, description: 'Topic label shown above the card.' },
    index: { type: 'string', required: false, description: 'Position label, e.g. "3 of 10".' },
  },
  events: {
    on_flip: { type: 'EventAction', required: false, description: 'Fired with the new flip state.' },
    on_correct: { type: 'EventAction', required: false, description: 'Fired when marked correct.' },
    on_incorrect: { type: 'EventAction', required: false, description: 'Fired when marked for review.' },
  },
  example: {
    type: 'flashcard',
    props: { front: 'What is the capital of France?', back: 'Paris', category: 'Geography', index: '1 of 10' },
  },
};
