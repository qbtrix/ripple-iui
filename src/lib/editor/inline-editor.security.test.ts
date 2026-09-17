// editor/inline-editor.security.test.ts
// @description XSS regression proof for the visual editor's RAW-HTML paths — the
//   fourth sink PR #99 missed. #99 sanitized the three `{@html}` render sinks
//   (Markdown, RichTextDisplay, Qr), so a poisoned `richtext` node RENDERS safely.
//   The editor then re-introduced the payload on the way back OUT: the controller
//   seeded the rich editor from the RAW spec prop (`adapter.readProp`), and every
//   TipTap teardown path wrote that raw string straight to `el.innerHTML`, which
//   bypasses ProseMirror's schema entirely. Open the inline editor on a poisoned
//   node, press Escape (or just navigate away), and the handler is installed in the
//   host origin.
//
//   WHICH PATHS ARE ACTUALLY EXPLOITABLE (measured, not assumed):
//     • MOUNT (`new Editor({ content: seed })`) — NOT a sink. ProseMirror parses the
//       seed in an inert document and StarterKit's schema has no image node, so the
//       payload is dropped before the view is built. Verified: after mount the
//       element holds only `<p>hi</p>` inside the ProseMirror shell.
//     • TEARDOWN (`restoreRichHtml` — cancel / destroy / unchanged-commit / the
//       import-failure branch) — IS the sink. It writes the seed string verbatim
//       into a LIVE, in-document element.
//   That asymmetry is why the bug survived #99: the editor looks safe while mounted.
//
//   ASSERTION NOTE. jsdom compiles an inline `onerror` attribute into a real event
//   handler function (asserted here) but runs it in a sandboxed global, so a
//   cross-context `window.x = 1` side effect is not observable from the test. We
//   therefore assert the security-relevant primitive — that a live event handler
//   carrying attacker code got INSTALLED on a node in the document — rather than
//   its firing, which is a real-browser property.
// @created 2026-08-04 (close the editor innerHTML sink)
import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InlineEditorController from './RippleInlineEditor.svelte';
import { TipTapInlineEditor } from './core/inline-editor-tiptap.js';
import { SourceFidelityInlineEditor } from './core/inline-editor-source.js';
import { registerInlineEditor } from './core/index.js';
import type {
  EditableNode,
  InlineEditor as InlineEditorSlot,
  InlineEditorMountOpts,
  LaneAdapter,
  TargetRef
} from './core/index.js';

/** An LLM-authored richtext prop carrying a handler payload. */
const PAYLOAD = '<p>Quarterly report</p><img src="x" onerror="window.__RIPPLE_XSS = 1">';
/** Benign structural markup a real richtext node holds — must survive untouched. */
const BENIGN = '<p>Hello <strong>world</strong></p>';

const ref = (uid: string): TargetRef => ({ uid, lane: 'ripple' });

/** Assert no attacker-controlled handler is installed on any node inside `el`. */
function expectNoLiveHandler(el: HTMLElement): void {
  const img = el.querySelector('img[onerror]') as HTMLImageElement | null;
  expect(img).toBeNull();
  expect(el.innerHTML).not.toContain('onerror');
  expect(el.innerHTML).not.toContain('__RIPPLE_XSS');
}

/** A host element in the LIVE document (an in-document element is what makes it a sink). */
function liveHost(id = 'n_prose001', inner = ''): HTMLElement {
  const el = document.createElement('div');
  el.id = id;
  el.innerHTML = inner;
  document.body.appendChild(el);
  return el;
}

function makeStage(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

/** Spy adapter over one richtext node whose `html` prop is attacker-controlled. */
function poisonedRichAdapter(kind?: 'squire'): { adapter: LaneAdapter; applyEdit: ReturnType<typeof vi.fn> } {
  const applyEdit = vi.fn(() => true);
  const node: EditableNode = {
    uid: 'n_prose001',
    type: 'richtext',
    props: { html: PAYLOAD },
    text: PAYLOAD,
    childUids: []
  };
  const adapter: LaneAdapter = {
    id: 'ripple',
    ...(kind ? { inlineEditor: kind } : {}),
    resolveElement: (el) => (el.closest('#n_prose001') ? ref('n_prose001') : null),
    readNode: () => node,
    readProp: (_r, name) => (name === 'html' ? PAYLOAD : undefined),
    listChildren: () => [],
    getFields: () => [],
    applyEdit
  };
  return { adapter, applyEdit };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('editor XSS — TipTap teardown writes the seed to innerHTML (the missed sink)', () => {
  it('destroy() must not install an attacker handler in the live document', () => {
    const el = liveHost();
    const handle = TipTapInlineEditor.mount(el, {
      content: PAYLOAD,
      onCommit: vi.fn(),
      onCancel: vi.fn()
    });

    // The silent teardown the controller calls on re-entry / unmount. It runs
    // synchronously, before the async TipTap import can settle, and restores the seed.
    handle.destroy();

    expectNoLiveHandler(el);
  });

  it('keeps benign structural markup intact on restore (no over-sanitizing)', () => {
    const el = liveHost();
    const handle = TipTapInlineEditor.mount(el, {
      content: BENIGN,
      onCommit: vi.fn(),
      onCancel: vi.fn()
    });
    handle.destroy();

    expect(el.querySelector('strong')?.textContent).toBe('world');
    expect(el.innerHTML).toBe(BENIGN);
  });
});

describe('editor XSS — end to end through the inline-edit controller', () => {
  it('double-click a poisoned richtext node, then tear down: no handler lands in the DOM', async () => {
    const stage = makeStage('<div id="n_prose001"><p>Quarterly report</p></div>');
    const prose = stage.querySelector('#n_prose001') as HTMLElement;
    const { adapter } = poisonedRichAdapter();

    const { unmount } = render(InlineEditorController, {
      props: { adapter, container: stage }
    });
    await tick();

    await fireEvent.dblClick(prose); // opens the rich editor, seeded from the raw prop
    unmount(); // controller destroys the active slot -> the teardown restore path

    expectNoLiveHandler(prose);
  });

  it('hands the rich slot a SANITIZED seed (both lanes get clean input)', async () => {
    // A fake slot double captures exactly what the controller seeds an editor with —
    // the chokepoint fix, asserted independently of any impl's teardown behavior.
    const mounts: InlineEditorMountOpts[] = [];
    const fake: InlineEditorSlot = {
      mount(_el, opts) {
        mounts.push(opts);
        return { destroy() {} };
      }
    };
    registerInlineEditor('squire', fake);

    const stage = makeStage('<div id="n_prose001"><p>Quarterly report</p></div>');
    const prose = stage.querySelector('#n_prose001') as HTMLElement;
    const { adapter } = poisonedRichAdapter('squire');

    render(InlineEditorController, { props: { adapter, container: stage } });
    await tick();
    await fireEvent.dblClick(prose);

    expect(mounts).toHaveLength(1);
    expect(mounts[0].content).not.toContain('onerror');
    expect(mounts[0].content).not.toContain('__RIPPLE_XSS');
    // The legitimate copy the author wrote is still there — we sanitized, not dropped.
    expect(mounts[0].content).toContain('Quarterly report');
  });
});

describe('editor XSS — source-fidelity lane keeps byte-stability (the deliberate exception)', () => {
  // The source lane seeds from the LIVE element, not the model: whatever it restores
  // was already rendered in the document, so restoring it grants no capability the
  // page did not already have. Sanitizing there would strip legitimate hand-authored
  // markup (`style` is FORBIDDEN by sanitizeHtml) and destroy the reason EP-4 exists.
  // This test fails loudly if someone later wraps `restoreInner` in the sanitizer.
  it('restores hand-authored style attributes verbatim on cancel', () => {
    const host = liveHost('n_src0001', '<p class="lead" style="color:red">Hello <strong>world</strong></p>');
    const el = host.firstElementChild as HTMLElement;
    el.setAttribute('data-ripple-editing', 'n_src0001');

    SourceFidelityInlineEditor.mount(el, {
      content: el.innerHTML,
      onCommit: vi.fn(),
      onCancel: vi.fn()
    });
    (el.firstChild as Text).data = 'Hi '; // simulate a contenteditable text edit
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(el.getAttribute('style')).toBe('color:red');
    expect(el.innerHTML).toBe('Hello <strong>world</strong>');
  });
});
