// manifest/entries/word-guess.ts — the LLM-facing entry for the word-guess
// data widget: a daily-word style guessing game. The model writes the answer
// (and optionally a hint); the widget runs the board, the scoring, the
// on-screen keyboard and the share grid. `value` is the bound field (written
// by the widget); `on_complete` is the one event. The answer is visible in
// the spec, which is fine for a casual game.
import type { WidgetManifestEntry } from '../index.js';

export const wordGuessEntry: WidgetManifestEntry = {
  type: 'word-guess',
  category: 'composite',
  description:
    'Word guessing game: answer (4 to 7 letters A to Z), hint, max_guesses. Letter feedback, on-screen keyboard, share grid. Bind value {guesses, status, hint_used}; on_complete {won, guesses}.',
  props: {
    title: { type: 'string', required: false, description: 'Puzzle name, e.g. "Kitchen words". Defaults to "Word guess".' },
    answer: { type: 'string', required: true, description: 'The word to guess: 4 to 7 letters, A to Z only, any case. Anything else shows a friendly error instead of the board.' },
    hint: { type: 'string', required: false, description: 'A nudge the player can reveal; using it is recorded in value.hint_used and the share line.' },
    max_guesses: { type: 'number', required: false, description: 'Rows on the board. Default 6, clamped 1 to 10.' },
    allow_any_word: { type: 'boolean', required: false, description: 'Default true. No dictionary ships, so any letters count as a guess either way.' },
    value: {
      type: '{ guesses: string[]; status: "playing" | "won" | "lost"; hint_used: boolean }',
      required: false,
      description: 'The game so far, written by the widget on every guess and hint. Bind with `bind: "{state.game}"` to read it elsewhere; the widget never reads it back.',
    },
  },
  events: {
    on_complete: { type: 'EventAction', required: false, description: 'Fired once when the game ends, with { won, guesses }.' },
  },
  example: {
    type: 'word-guess',
    bind: '{state.game}',
    props: {
      title: 'Kitchen words',
      answer: 'whisk',
      hint: 'You beat eggs with it',
    },
  },
};
