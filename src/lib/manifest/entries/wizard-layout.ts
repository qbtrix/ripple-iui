import type { WidgetManifestEntry } from '../index.js';

export const wizardLayoutEntry: WidgetManifestEntry = {
  type: 'wizard-layout',
  category: 'composite',
  description:
    'Multi-step wizard with numbered step indicator and sticky back/next/cancel bar. Render per-step content via `if` against {state.currentStep}. On the last step the next button becomes `finishLabel`.',
  props: {
    title: { type: 'string', required: false, description: 'Wizard title.' },
    description: { type: 'string', required: false, description: 'Wizard description.' },
    steps: { type: 'Array<{ id: string; label: string; description?: string; icon?: string; valid?: boolean; optional?: boolean }>', required: true, description: 'Steps. `valid: false` blocks Next. `optional: true` shows an "Optional" pip.' },
    currentStep: { type: 'string', required: false, description: 'Bound active step id. Use top-level `bind` to two-way bind to a state path (e.g. `bind: "currentStep"`).' },
    orientation: { type: '"horizontal" | "vertical"', required: false, description: 'Step indicator orientation. Default "horizontal".' },
    nextLabel: { type: 'string', required: false, description: 'Default "Next".' },
    backLabel: { type: 'string', required: false, description: 'Default "Back".' },
    finishLabel: { type: 'string', required: false, description: 'Label on the last step. Default "Submit".' },
    cancelLabel: { type: 'string', required: false, description: 'Default "Cancel".' },
    showCancel: { type: 'boolean', required: false, description: 'Default true.' },
    allowJumpBack: { type: 'boolean', required: false, description: 'Allow clicking visited steps to jump back. Default true.' },
    nextActions: { type: 'EventAction | EventAction[]', required: false, description: 'Actions to dispatch when Next is clicked (before advancing).' },
    backActions: { type: 'EventAction | EventAction[]', required: false, description: 'Actions to dispatch when Back is clicked (before retreating).' },
    finishActions: { type: 'EventAction | EventAction[]', required: false, description: 'Actions to dispatch when Submit is clicked on the last step.' },
    cancelActions: { type: 'EventAction | EventAction[]', required: false, description: 'Actions to dispatch when Cancel is clicked.' },
  },
  example: {
    type: 'wizard-layout',
    bind: 'currentStep',
    props: {
      title: 'New project',
      steps: [
        { id: 'basics', label: 'Basics', description: 'Name & repo' },
        { id: 'team', label: 'Team', description: 'Owners & access' },
        { id: 'integrations', label: 'Integrations', optional: true },
        { id: 'review', label: 'Review' },
      ],
      finishActions: [{ action: 'toast', message: 'Project created', variant: 'success' }],
    },
    children: [
      { type: 'if', condition: 'state.currentStep === "basics"', children: [
        { type: 'input', bind: 'projectName', props: { label: 'Project name' } },
      ] },
      { type: 'if', condition: 'state.currentStep === "team"', children: [
        { type: 'people-picker', bind: 'team', props: { label: 'Team members' } },
      ] },
      { type: 'if', condition: 'state.currentStep === "review"', children: [
        { type: 'text', props: { text: 'Review your choices.' } },
      ] },
    ],
  },
};
