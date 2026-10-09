// manifest/entries/growth-projection.ts — the LLM-facing entry for the
// growth-projection data widget (design doc 2026-10-09 §3.7). The model writes
// four numbers and the widget computes the schedule, chart, table and totals.
// `rate` is percent (5 means 5%); `deposit` is per month and is the bound field;
// rate and years edits fire on_ratechange / on_yearschange with the new number.
import type { WidgetManifestEntry } from '../index.js';

export const growthProjectionEntry: WidgetManifestEntry = {
  type: 'growth-projection',
  category: 'composite',
  staticSafe: true,
  description:
    'Savings growth from 4 numbers: initial, deposit (a month), rate (% a year), years. Widget computes chart, yearly table, totals; sliders retune. Bind deposit.',
  props: {
    title: { type: 'string', required: false, description: 'e.g. "Savings growth".' },
    subtitle: { type: 'string', required: false, description: 'One line under the title.' },
    verdict: { type: '{ text: string; status?: "good" | "warn" | "bad" | "info" | "neutral" }', required: false, description: 'The answer up front, at most 140 chars. Omit it and the final balance leads.' },
    currency: { type: 'string', required: false, description: 'ISO 4217 code. Default "USD". Never put a symbol in the numbers.' },
    initial: { type: 'number', required: false, description: 'Starting balance. Default 0. For a lump sum with no deposits, set this and deposit: 0.' },
    deposit: { type: 'number', required: true, description: 'Added at the end of every month. Write 0 for none. Two-way bind with `bind: "{state.deposit}"`.' },
    rate: { type: 'number', required: true, description: 'Interest in percent a year: 5 means 5%, never 0.05. Capped at 100.' },
    years: { type: 'number', required: true, description: 'How long. Fractions round to whole months. Capped at 100.' },
    compounding: { type: '"monthly" | "yearly"', required: false, description: 'Default "monthly". "yearly" credits interest once a year.' },
    goal: { type: 'number', required: false, description: 'Target balance: draws a goal line and says the year it is reached.' },
    inflation: { type: 'number', required: false, description: 'Percent a year; adds the final balance in today\'s money.' },
  },
  events: {
    on_ratechange: { type: 'EventAction', required: false, description: 'Fires with the new rate after the user changes it, e.g. { action: "set", target: "rate", value: "{event}" }.' },
    on_yearschange: { type: 'EventAction', required: false, description: 'Fires with the new years after the user changes them.' },
  },
  example: {
    type: 'growth-projection',
    bind: '{state.deposit}',
    props: {
      title: 'Savings growth',
      currency: 'USD',
      initial: 0,
      rate: 5,
      years: 10,
      compounding: 'monthly',
      goal: 50000,
    },
  },
};
