// discover/ItemArt.test.ts — the client half of ItemArt: a picture that fails
// to load drops to the tinted placeholder, and a new url gets its own try.
// The server markup is covered in discover.ssr.test.ts; this runs in the
// `client` vitest project because it needs a mounted <img> to fire error on.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import ItemArt from './ItemArt.svelte';

const base = { title: 'Alpha', tint: 'var(--ripple-accent)', initial: 'A' };

afterEach(cleanup);

describe('ItemArt onerror fallback', () => {
  it('drops to the placeholder when the picture fails, keeping the video badge', async () => {
    const { container } = render(ItemArt, { ...base, imageUrl: 'https://cdn.example.com/a.png', mediaKind: 'video' });
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    await fireEvent.error(img!);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Preview of Alpha');
    expect(container.textContent).toContain('A');
    expect(container.querySelector('[data-testid="discover-video-badge"]')).not.toBeNull();
  });

  it('tries again when the url changes after a failure', async () => {
    const { container, rerender } = render(ItemArt, { ...base, imageUrl: 'https://cdn.example.com/a.png' });
    await fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    await rerender({ ...base, imageUrl: 'https://cdn.example.com/b.png' });
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example.com/b.png');
  });
});
