// @file widgets/media/ModelViewer.test.ts
// @description Tests for the lazy-loaded 3D `model-viewer` widget. Proves
//   the loading placeholder renders before the ~300KB module resolves.
// @created 2026-05-22 — Increment 5 (escape-hatch widgets).
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ModelViewer from './ModelViewer.svelte';

describe('ModelViewer', () => {
  it('renders a loading placeholder before the viewer module resolves', () => {
    const { container } = render(ModelViewer, {
      props: { src: 'https://example.com/model.glb', alt: 'A model' }
    });
    // The dynamic import has not resolved synchronously — placeholder shows.
    const loading = container.querySelector('.ripple-model-viewer-loading');
    expect(loading).not.toBeNull();
    expect(loading!.getAttribute('aria-busy')).toBe('true');
  });
});
