// manifest/entries/quiz.ts — the LLM-facing entry for the quiz data widget. The
// model writes the questions; the widget runs the picks, the right-or-wrong
// reveal, the streak, the optional countdown and the score screen. `value` is
// the bound field (written by the widget); `on_complete` is the one event.
import type { WidgetManifestEntry } from '../index.js';

export const quizEntry: WidgetManifestEntry = {
  type: 'quiz',
  category: 'composite',
  description:
    'Trivia game: questions[{prompt, choices, answer (index), why}]. Instant right or wrong, a streak, optional countdown, then a score screen with misses and Retry. Bind value; on_complete.',
  props: {
    title: { type: 'string', required: false, description: 'Quiz name, e.g. "Space trivia".' },
    topic: { type: 'string', required: false, description: 'A small label above the title, e.g. "Astronomy".' },
    questions: {
      type: 'Array<{ id?: string; prompt: string; choices: string[]; answer: number; why?: string; image?: string }>',
      required: true,
      description:
        '3 to 12 questions. `choices` holds 2 to 5 short answers; `answer` is the 0-based index of the right one; `why` is one sentence shown after the pick; `image` an optional https photo URL. A question whose answer is outside its choices is skipped. The answers sit in the spec, so this suits casual play, not exams.',
    },
    seconds_per_question: { type: 'number', required: false, description: 'Seconds per question (3 to 600). Off by default; when set the quiz waits for Start, and running out counts as wrong.' },
    shuffle_choices: { type: 'boolean', required: false, description: 'Shuffle each question\'s choices (a new order on every Retry). Default false.' },
    value: {
      type: '{ index: number; answers: (number | null)[]; score: number; done: boolean }',
      required: false,
      description: 'Progress, written by the widget: the current question, the picked choice per answered question (null = ran out of time), the score and whether every question is answered. Bind with `bind: "{state.quiz}"`.',
    },
  },
  events: {
    on_complete: { type: 'EventAction', required: false, description: 'Fired once per run when the last question is answered, with { score, total }.' },
  },
  example: {
    type: 'quiz',
    bind: '{state.quiz}',
    props: {
      title: 'Space trivia',
      topic: 'Astronomy',
      questions: [
        { prompt: 'Which planet has the shortest day?', choices: ['Earth', 'Jupiter', 'Mars', 'Venus'], answer: 1, why: 'Jupiter spins once in under 10 hours.' },
        { prompt: 'What is the closest star to the Sun?', choices: ['Sirius', 'Betelgeuse', 'Proxima Centauri'], answer: 2, why: 'Proxima Centauri is about 4.2 light years away.' },
        { prompt: 'How long does sunlight take to reach Earth?', choices: ['8 seconds', 'About 8 minutes', 'About 8 hours'], answer: 1, why: 'Light covers the 150 million km in roughly 8 minutes 20 seconds.' },
      ],
    },
  },
};
