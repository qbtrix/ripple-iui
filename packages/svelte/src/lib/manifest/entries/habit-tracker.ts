// manifest/entries/habit-tracker.ts: the LLM-facing entry for the
// habit-tracker data widget. The model sets up the habits (name, an icon key
// from HABIT_ICONS, a weekly target) and may seed demo ticks; the widget runs
// the week grid, streaks and targets from the visitor's local clock. `value`
// is the bound field; no events; nothing is stored beyond the value.
import type { WidgetManifestEntry } from '../index.js';

const ICON_KEYS =
  '"read" | "run" | "walk" | "bike" | "gym" | "stretch" | "water" | "sleep" | "meditate" | "journal" | "code" | "music" | "veg" | "no-sugar" | "vitamins"';

export const habitTrackerEntry: WidgetManifestEntry = {
  type: 'habit-tracker',
  category: 'composite',
  description:
    'Habit tracker app: habits[{id, name, icon, target_per_week}] on a week grid the visitor ticks; streaks, weekly target rings, today %. Bind value.',
  props: {
    title: { type: 'string', required: false, description: 'e.g. "My week".' },
    habits: {
      type: `Array<{ id: string; name: string; icon?: ${ICON_KEYS}; target_per_week: number }>`,
      required: true,
      description: '1 to 8 habits. target_per_week is 1 to 7 (7 = every day). Any other icon value shows a plain dot.',
    },
    week_start: { type: '"mon" | "sun"', required: false, description: 'First day of the week. Default "mon".' },
    weeks: { type: 'number', required: false, description: 'Weeks of history the visitor can page back through, 1 to 4. Default 1.' },
    seed: {
      type: 'Record<string, number[]>',
      required: false,
      description: 'Demo ticks per habit id as day offsets back from today (0 = today, 1 = yesterday). Leave out for a fresh tracker.',
    },
  },
  example: {
    type: 'habit-tracker',
    bind: '{state.habits}',
    props: {
      title: 'My week',
      week_start: 'mon',
      weeks: 2,
      habits: [
        { id: 'read', name: 'Read 20 pages', icon: 'read', target_per_week: 5 },
        { id: 'run', name: 'Run', icon: 'run', target_per_week: 3 },
        { id: 'water', name: 'Drink 2L water', icon: 'water', target_per_week: 7 },
        { id: 'meditate', name: 'Meditate', icon: 'meditate', target_per_week: 4 },
      ],
      seed: { read: [1, 2, 3, 5], run: [2, 4], water: [0, 1, 2, 3, 4, 5, 6, 7], meditate: [1] },
    },
  },
};
