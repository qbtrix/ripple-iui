// manifest/entries/interval-workout.ts — the LLM-facing entry for the
// interval-workout data widget (design doc 2026-10-09 §3.8). The model writes
// the exercises and the timings; the widget runs the timer. Rows use `kind`
// from a closed enum, never `type`; `workSec` is the bound field; no events.
import type { WidgetManifestEntry } from '../index.js';

const EXERCISE_KINDS = '"cardio" | "strength" | "core" | "mobility" | "rest"';

export const intervalWorkoutEntry: WidgetManifestEntry = {
  type: 'interval-workout',
  category: 'composite',
  description:
    'Interval workout timer: exercises[{name, cue, kind}], workSec, restSec, rounds. Counts down work and rest in seconds, one exercise at a time. Bind workSec.',
  props: {
    title: { type: 'string', required: false, description: 'Workout name, e.g. "20-minute home HIIT".' },
    subtitle: { type: 'string', required: false, description: 'One line under the title (level, equipment).' },
    verdict: { type: '{ text: string; status?: "good" | "warn" | "bad" | "info" | "neutral" }', required: false, description: 'The answer up front, at most 140 chars. Omit it and the total time leads.' },
    exercises: {
      type: `Array<{ id?: string; name: string; cue?: string; kind?: ${EXERCISE_KINDS} }>`,
      required: true,
      description: 'In order, one round. `cue` is a one-line form tip. A "rest" kind is a rest block (restSec long) with no extra rest beside it.',
    },
    workSec: { type: 'number', required: true, description: 'Seconds of work per exercise (5 to 600). Two-way bind with `bind: "{state.workSec}"`; a change applies from the next interval.' },
    restSec: { type: 'number', required: true, description: 'Seconds of rest between exercises (0 to 300; 0 skips rests).' },
    rounds: { type: 'number', required: false, description: 'Times through the list. Default 1. Total time = rounds × exercises × workSec plus the rests.' },
  },
  example: {
    type: 'interval-workout',
    bind: '{state.workSec}',
    props: {
      title: '20-minute home HIIT',
      subtitle: 'No equipment · 2 rounds',
      verdict: { text: 'Ten moves, twice through; drop push-ups to your knees if form slips.', status: 'info' },
      workSec: 40,
      restSec: 20,
      rounds: 2,
      exercises: [
        { name: 'Jumping jacks', cue: 'Land softly and keep a steady rhythm.', kind: 'cardio' },
        { name: 'Bodyweight squats', cue: 'Chest up, hips back, drive through the heels.', kind: 'strength' },
        { name: 'Mountain climbers', cue: 'Hands under shoulders, knees fast.', kind: 'core' },
        { name: 'Push-ups', cue: 'Straight line from head to heels.', kind: 'strength' },
        { name: 'High knees', cue: 'Knees to hip height, stay on the balls of your feet.', kind: 'cardio' },
        { name: 'Reverse lunges', cue: 'Step back and alternate legs.', kind: 'strength' },
        { name: 'Plank shoulder taps', cue: 'Feet wide, hips still.', kind: 'core' },
        { name: 'Skater hops', cue: 'Leap side to side and land on one foot.', kind: 'cardio' },
        { name: 'Glute bridges', cue: 'Squeeze at the top for a beat.', kind: 'strength' },
        { name: 'Burpees', cue: 'Squat, jump back, jump in, jump up.', kind: 'cardio' },
      ],
    },
  },
};
