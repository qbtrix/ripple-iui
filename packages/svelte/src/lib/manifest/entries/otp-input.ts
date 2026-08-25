import type { WidgetManifestEntry } from '../index.js';

export const otpInputEntry: WidgetManifestEntry = {
  type: 'otp-input',
  category: 'input',
  description: 'One-time password input with individual character cells. Auto-advances on type.',
  props: {
    label: { type: 'string', required: false, description: 'Label text.' },
    bind: { type: 'string', required: false, description: 'Two-way state path for OTP value.' },
    value: { type: 'string', required: false, description: 'Current OTP.' },
    length: { type: 'number', required: false, description: 'Number of cells. Default 6.' },
    alpha: { type: 'boolean', required: false, description: 'Accept alphanumeric (else digits only).' },
    mask: { type: 'boolean', required: false, description: 'Mask cells like a password.' },
    disabled: { type: 'boolean', required: false, description: 'Disable input.' },
  },
  events: {
    on_complete: { type: 'EventAction', required: false, description: 'Fired when all cells are filled.' },
    on_change: { type: 'EventAction', required: false, description: 'Fired on every change.' },
  },
  example: { type: 'otp-input', props: { label: 'Verification code', length: 6, mask: true, bind: '{state.verificationCode}' } },
  pocket: {
    state: { verificationCode: '', verified: false },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'otp-input',
          props: { label: 'Verification code', length: 6, mask: true },
          bind: 'state.verificationCode',
          on_complete: {
            action: 'flow',
            steps: [
              { action: 'set', target: 'verified', value: true },
              { action: 'toast', message: 'Code accepted', variant: 'success' },
            ],
          },
        },
        { type: 'alert', show: '{state.verified}', props: { variant: 'success', title: 'Verified', description: 'Your account is now active.' } },
      ],
    },
  },
};
