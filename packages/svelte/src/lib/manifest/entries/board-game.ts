// manifest/entries/board-game.ts — the LLM-facing entry for the board-game
// play widget (plan 2026-10-10, A3). The model picks the game and settings;
// the widget runs the board, the computer opponent and the score. `value` is
// the bound field (written by the widget); `on_complete` is the one event.
import type { WidgetManifestEntry } from '../index.js';

export const boardGameEntry: WidgetManifestEntry = {
  type: 'board-game',
  category: 'composite',
  description:
    'Tic-tac-toe or connect-four against a built-in computer: game, player, first, difficulty, best_of. The widget plays, detects wins and keeps score. Bind value; on_complete {winner, series}.',
  props: {
    game: { type: '"tic-tac-toe" | "connect-four"', required: true, description: 'Which game. The aliases tic-tac-toe and connect-four pick it too, but always set it.' },
    title: { type: 'string', required: false, description: 'Heading. Default: the game name.' },
    player: {
      type: '"X" | "O" | "red" | "yellow"',
      required: false,
      description: 'The mark the visitor plays: X or O for tic-tac-toe, red or yellow for connect-four. Default X / red. The computer takes the other.',
    },
    first: { type: '"player" | "computer"', required: false, description: 'Who moves first in every game. Default player.' },
    difficulty: {
      type: '"easy" | "medium" | "hard"',
      required: false,
      description: 'easy plays randomly, medium wins or blocks, hard searches ahead (unbeatable at tic-tac-toe). Default medium.',
    },
    best_of: {
      type: '1 | 3 | 5',
      required: false,
      description: 'Play a best-of series; it ends when one side has a majority or every game is played. Omit for open-ended play where every game counts.',
    },
    value: {
      type: '{ board: string[]; turn: "player" | "computer" | null; result: "player" | "computer" | "draw" | null; series: { player: number; computer: number; draws: number } }',
      required: false,
      description: 'The game so far, written by the widget on every move. `board` is row-major ("" empty). Bind with `bind: "{state.game}"` to show it elsewhere.',
    },
  },
  events: {
    on_complete: {
      type: 'EventAction',
      required: false,
      description: 'Fired once per finished series with { winner: "player" | "computer" | "draw", series }. Without best_of, every game finishes the series.',
    },
  },
  example: {
    type: 'board-game',
    bind: '{state.game}',
    props: { game: 'tic-tac-toe', player: 'X', first: 'player', difficulty: 'medium', best_of: 3 },
  },
};
