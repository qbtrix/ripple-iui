// manifest/entries/focus-timer.ts: the LLM-facing entry for the focus-timer
// data widget (aliases pomodoro, pomodoro-timer). The model writes the
// durations and the task; the widget runs the cycle, the rounds and the log.
// `value` is the bound field (default value / onchange); no events.
import type { WidgetManifestEntry } from '../index.js';

export const focusTimerEntry: WidgetManifestEntry = {
  type: 'focus-timer',
  category: 'composite',
  description:
    'Pomodoro timer: focus, short break, a long break every Nth round; rounds toward goal_rounds, a log of finished rounds, an editable task. Use it, not separate timer widgets. Bind value.',
  props: {
    title: { type: 'string', required: false, description: 'e.g. "Deep work".' },
    focus_min: { type: 'number', required: false, description: 'Minutes of focus, 1 to 120. Default 25.' },
    short_break_min: { type: 'number', required: false, description: 'Minutes of short break, 1 to 60. Default 5.' },
    long_break_min: { type: 'number', required: false, description: 'Minutes of long break, 1 to 60. Default 15.' },
    rounds_before_long: { type: 'number', required: false, description: 'Focus rounds before a long break, 1 to 12. Default 4.' },
    goal_rounds: { type: 'number', required: false, description: 'Focus rounds to aim for today, 1 to 24.' },
    task: { type: 'string', required: false, description: 'What the visitor is focusing on. The visitor can edit it.' },
    auto_start_next: { type: 'boolean', required: false, description: 'Start the next phase on its own when one ends. Default false: it waits with a "Start break" button.' },
    value: {
      type: '{ phase: "focus" | "short" | "long"; remaining_s: number; running: boolean; rounds_done: number; task: string; log: string[] }',
      required: false,
      description: 'Two-way bind with `bind: "{state.focus}"`. Written on start, pause, reset, skip, phase end and edits (not every second), so remaining_s is as of the last event. `log` holds the ISO time each focus round finished.',
    },
  },
  example: {
    type: 'focus-timer',
    bind: '{state.focus}',
    props: {
      title: 'Deep work',
      focus_min: 25,
      short_break_min: 5,
      long_break_min: 15,
      rounds_before_long: 4,
      goal_rounds: 8,
      task: 'Draft the quarterly update',
    },
  },
};
