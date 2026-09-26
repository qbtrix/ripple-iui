// @file primitives/badge-tones.test.ts
// @description NEW 2026-09-27 (canon gaps 2). The ./primitives Badge gains
//   `success` and `warning` variants in the same shape as `destructive`: a /10
//   tint (/20 in dark and on link hover) and the tone's readable -text token.
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { createRawSnippet } from 'svelte';
import { Badge, badgeVariants } from './index.js';

afterEach(cleanup);

describe('Badge tones', () => {
  it.each(['success', 'warning'] as const)('%s is on ripple tokens, shaped like destructive', (tone) => {
    const cls = badgeVariants({ variant: tone });
    for (const part of [`bg-ripple-${tone}/10`, `text-ripple-${tone}-text`, `dark:bg-ripple-${tone}/20`, `[a]:hover:bg-ripple-${tone}/20`]) {
      expect(cls).toContain(part);
    }
  });

  it('renders the variant on the element', () => {
    const children = createRawSnippet(() => ({ render: () => '<span>Live</span>' }));
    const { container } = render(Badge, { variant: 'success', children });
    expect(container.querySelector('[data-slot="badge"]')!.className).toContain('text-ripple-success-text');
  });
});
