// @file components/NodeRenderer.rawprops.test.ts
// @description Regression tests for the raw-prop path through NodeRenderer.
//   The bug: every prop of every node ran through `resolveValue`, whose
//   `/\{([^}]+)\}/g` substitution deleted any `{...}` block it could not
//   evaluate as a spec expression. Agent-authored JavaScript inside an
//   `embed` widget's `srcdoc` therefore lost every function body and
//   arrived as a SyntaxError — silently, since a brace-free srcdoc passed
//   through untouched. Broken since `embed` shipped (2026-05-22).
// @created 2026-08-25
import { render } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import Ripple from '$lib/Ripple.svelte';

const SCRIPTED_SRCDOC = `<!doctype html>
<html><body>
<div id="out"></div>
<button id="read">Read</button>
<script>
function busy(msg) { out.className = 'out'; out.textContent = msg; }
document.getElementById('read').onclick = function () { busy('…'); paw.invokeTool('read').then(render); };
</script>
</body></html>`;

test('a braced srcdoc reaches the iframe byte-for-byte', () => {
  const { container } = render(Ripple, {
    props: {
      spec: {
        state: {},
        ui: {
          type: 'embed',
          props: { mode: 'srcdoc', srcdoc: SCRIPTED_SRCDOC, title: 'Widget' },
        },
      },
    },
  });

  const iframe = container.querySelector('iframe');
  expect(iframe).not.toBeNull();
  expect(iframe!.getAttribute('srcdoc')).toBe(SCRIPTED_SRCDOC);
});

test('the `iframe` alias of the embed widget gets the same raw treatment', () => {
  const { container } = render(Ripple, {
    props: {
      spec: {
        state: {},
        ui: {
          type: 'iframe',
          props: { mode: 'srcdoc', srcdoc: SCRIPTED_SRCDOC, title: 'Widget' },
        },
      },
    },
  });

  expect(container.querySelector('iframe')!.getAttribute('srcdoc')).toBe(
    SCRIPTED_SRCDOC
  );
});

test('a brace-free srcdoc is still unchanged', () => {
  const plain = '<!doctype html><html><body><p>hello</p></body></html>';
  const { container } = render(Ripple, {
    props: {
      spec: {
        state: {},
        ui: {
          type: 'embed',
          props: { mode: 'srcdoc', srcdoc: plain, title: 'Widget' },
        },
      },
    },
  });

  expect(container.querySelector('iframe')!.getAttribute('srcdoc')).toBe(plain);
});

test('sibling props on the same embed node still resolve expressions', () => {
  const { container } = render(Ripple, {
    props: {
      spec: {
        state: { who: 'Ada' },
        ui: {
          type: 'embed',
          props: {
            mode: 'srcdoc',
            srcdoc: SCRIPTED_SRCDOC,
            title: 'Report for {state.who}',
          },
        },
      },
    },
  });

  const iframe = container.querySelector('iframe')!;
  expect(iframe.getAttribute('title')).toBe('Report for Ada');
  expect(iframe.getAttribute('srcdoc')).toBe(SCRIPTED_SRCDOC);
});

test('an ordinary string prop on an ordinary widget still interpolates', () => {
  const { container } = render(Ripple, {
    props: {
      spec: {
        state: { foo: 'bar' },
        ui: { type: 'text', props: { text: 'value is {state.foo}' } },
      },
    },
  });

  expect(container.textContent).toContain('value is bar');
});
