// Segmented overflow: labels never wrap and the track scrolls inside its container instead of spilling.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import Segmented from './Segmented.svelte';

describe('Segmented overflow', () => {
  it('caps the track at its container and scrolls; labels do not wrap', () => {
    const options = ['Visiting card 3.5 × 2 in', 'A4 210 × 297 mm', 'A5 148 × 210 mm', 'Flex banner 6 × 3 ft'];
    const { getByRole, getAllByRole } = render(Segmented, { props: { options, value: options[0] } });
    const track = getByRole('radiogroup');
    expect(track.className).toContain('max-w-full');
    expect(track.className).toContain('overflow-x-auto');
    for (const b of getAllByRole('radio')) expect(b.className).toContain('whitespace-nowrap');
  });
});
