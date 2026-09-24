// Markdown.security.test.ts — widget-level proof that the Markdown widget
// sanitizes spec-controlled content before {@html} (closes the P1 finding end to
// end: util -> widget -> real DOM). A markdown spec node is attacker-influenced
// when the authoring agent is prompt-injected, so raw <img onerror>/<script> must
// never reach the rendered DOM.
import { render } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import Markdown from './Markdown.svelte';

describe('Markdown widget — XSS sanitization', () => {
  it('strips onerror from an image in the markdown source', () => {
    const { container } = render(Markdown, {
      props: { content: 'before <img src=x onerror="alert(document.domain)"> after' }
    });
    expect(container.querySelector('img[onerror]')).toBeNull();
    expect(container.innerHTML).not.toContain('onerror');
    expect(container.innerHTML).not.toContain('alert(');
  });

  it('removes a <script> tag embedded in the source', () => {
    const { container } = render(Markdown, {
      props: { content: 'ok\n\n<script>steal(document.cookie)<\/script>' }
    });
    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('steal(');
  });

  it('still renders legitimate markdown (bold, link)', () => {
    const { container } = render(Markdown, {
      props: { content: 'a **bold** word and [a link](https://ok.example)' }
    });
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    const a = container.querySelector('a');
    expect(a?.getAttribute('href')).toBe('https://ok.example');
  });
});
