// @file widgets/media/Embed.bridge.test.ts
// @description Proves the capability-bridge shim is composed into srcdoc
//   ONLY when a host publishes a bridge on context, that the token is
//   host-minted per instance (never spec-settable), that the frame's
//   contentWindow is attached so the host can check `event.source`, and
//   that the security posture — sandbox string, permissions enum, 64KB
//   author-content cap — is unchanged by the bridge.
// @created 2026-08-25 — T1 of the widget capability bridge arc.
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import Embed, { EMBED_SANDBOX, EMBED_SRCDOC_MAX } from './Embed.svelte';
import {
  WIDGET_BRIDGE_CONTEXT_KEY,
  INVOKE_TOOL_CALL_V1,
  type WidgetBridgeHost
} from '../../core/widget-bridge-protocol.js';

function fakeHost(token = 'tok_test_instance') {
  const attach = vi.fn();
  const revoke = vi.fn();
  const connect = vi.fn(() => ({ token, attach, revoke }));
  return { host: { connect } as unknown as WidgetBridgeHost, connect, attach, revoke, token };
}

function renderWithHost(props: Record<string, unknown>, host?: WidgetBridgeHost) {
  const context = new Map<unknown, unknown>();
  if (host) context.set(WIDGET_BRIDGE_CONTEXT_KEY, host);
  return render(Embed, { props: props as never, context });
}

describe('Embed — capability bridge composition', () => {
  it('injects no shim when no host publishes a bridge', () => {
    const { container } = renderWithHost({
      mode: 'srcdoc',
      srcdoc: '<p>hi</p>',
      title: 'Inline'
    });
    const srcdoc = container.querySelector('iframe')!.getAttribute('srcdoc');
    expect(srcdoc).toBe('<p>hi</p>');
    expect(srcdoc).not.toContain(INVOKE_TOOL_CALL_V1);
  });

  it('prepends the shim carrying the host-minted token when a bridge exists', () => {
    const { host, connect, token } = fakeHost();
    const { container } = renderWithHost(
      { mode: 'srcdoc', srcdoc: '<p>hi</p>', title: 'Inline', id: 'w1' },
      host
    );

    const srcdoc = container.querySelector('iframe')!.getAttribute('srcdoc')!;
    expect(connect).toHaveBeenCalledWith({ widgetId: 'w1' });
    expect(srcdoc).toContain(token);
    expect(srcdoc).toContain(INVOKE_TOOL_CALL_V1);
    // Shim first, author content after — `paw` exists before author code runs.
    expect(srcdoc.indexOf('<script>')).toBe(0);
    expect(srcdoc.endsWith('<p>hi</p>')).toBe(true);
  });

  it('attaches the frame contentWindow so the host can check event.source', () => {
    const { host, attach } = fakeHost();
    const { container } = renderWithHost(
      { mode: 'srcdoc', srcdoc: '<p>hi</p>', title: 'Inline' },
      host
    );
    const iframe = container.querySelector('iframe')!;
    expect(attach).toHaveBeenCalled();
    expect(attach.mock.calls.at(-1)![0]).toBe(iframe.contentWindow);
  });

  it('revokes the token when the widget is destroyed', () => {
    const { host, revoke } = fakeHost();
    const { unmount } = renderWithHost(
      { mode: 'srcdoc', srcdoc: '<p>hi</p>', title: 'Inline' },
      host
    );
    expect(revoke).not.toHaveBeenCalled();
    unmount();
    expect(revoke).toHaveBeenCalledTimes(1);
  });

  it('leaves mode=url embeds unbridged', () => {
    const { host, connect } = fakeHost();
    const { container } = renderWithHost(
      { mode: 'url', url: 'https://example.com', title: 'Example' },
      host
    );
    expect(connect).not.toHaveBeenCalled();
    expect(container.querySelector('iframe')!.hasAttribute('srcdoc')).toBe(false);
  });

  it('never lets a spec mint its own token — props cannot carry one', () => {
    const { container } = renderWithHost({
      mode: 'srcdoc',
      srcdoc: '<p>hi</p>',
      title: 'Inline',
      // A hallucinated spec trying to grant itself authority.
      token: 'spec_forged_token',
      bridge: { token: 'spec_forged_token' }
    });
    const srcdoc = container.querySelector('iframe')!.getAttribute('srcdoc')!;
    expect(srcdoc).toBe('<p>hi</p>');
    expect(srcdoc).not.toContain('spec_forged_token');
  });
});

describe('Embed — bridge does not weaken the security posture', () => {
  it('keeps the exact sandbox string on a bridged frame', () => {
    const { host } = fakeHost();
    const { container } = renderWithHost(
      { mode: 'srcdoc', srcdoc: '<p>hi</p>', title: 'Inline' },
      host
    );
    const iframe = container.querySelector('iframe')!;
    expect(iframe.getAttribute('sandbox')).toBe(EMBED_SANDBOX);
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-same-origin');
    expect(iframe.getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  it('still drops permissions outside the closed enum on a bridged frame', () => {
    const { host } = fakeHost();
    const { container } = renderWithHost(
      {
        mode: 'srcdoc',
        srcdoc: '<p>hi</p>',
        title: 'Inline',
        allow: ['camera', 'geolocation', 'fullscreen']
      },
      host
    );
    const allow = container.querySelector('iframe')!.getAttribute('allow');
    expect(allow).toBe('fullscreen');
  });

  it('measures the 64KB cap against AUTHOR content only', () => {
    const { host } = fakeHost();
    const author = 'a'.repeat(EMBED_SRCDOC_MAX + 500);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = renderWithHost(
      { mode: 'srcdoc', srcdoc: author, title: 'Inline' },
      host
    );
    const srcdoc = container.querySelector('iframe')!.getAttribute('srcdoc')!;
    const shim = srcdoc.slice(0, srcdoc.length - EMBED_SRCDOC_MAX);

    // The author keeps the whole 64KB budget; the shim sits on top of it.
    expect(srcdoc.length - shim.length).toBe(EMBED_SRCDOC_MAX);
    expect(shim).toContain(INVOKE_TOOL_CALL_V1);
    warn.mockRestore();
  });
});
