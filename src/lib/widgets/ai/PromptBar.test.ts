// @file widgets/ai/PromptBar.test.ts
// @description NEW (beautiful-ui re-skin arc, lane C, 2026-09-14). Behaviour
//   coverage for PromptBar: send gating and the Enter / Shift+Enter split, the
//   `@` and `/` typeahead (open, filter, arrow, pick, Escape, and the
//   empty-list guard), the attach / connect / dictation callbacks that replaced
//   the source's fakes, attachment chips, and the model picker's visibility
//   rule. Like TaskRows it is not in the spec registry, so there is no
//   registry-wiring test — it reaches callers through `$lib/ui` only.
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PromptBar from './PromptBar.svelte';

const SOURCES = [
  { key: 'attach', name: 'Upload', desc: 'From your computer', icon: 'paperclip', attach: true },
  { key: 'metrics', name: 'Metrics', desc: 'Sales and churn', icon: 'chart-column' },
  { key: 'gmail', name: 'Gmail', desc: 'Read and manage mail', icon: 'mail', connect: true },
];
const COMMANDS = [
  { key: 'summarize', name: '/summarize', desc: 'Digest the thread' },
  { key: 'restock', name: '/restock', desc: 'Build a reorder list' },
];
const MODELS = [
  { key: 'fast', name: 'Fast', tag: 'Basic' },
  { key: 'deep', name: 'Deep', tag: 'Flagship' },
];

/** The composer is uncontrolled internally, so drive it like a real keyboard. */
const type = (el: HTMLElement, text: string) =>
  fireEvent.input(el, { target: { value: text } });

describe('PromptBar — composing and sending', () => {
  it('renders a prompt textarea and the controls', () => {
    const { getByLabelText } = render(PromptBar);
    expect(getByLabelText('Prompt')).toBeTruthy();
    expect(getByLabelText('Send')).toBeTruthy();
    expect(getByLabelText('Start dictation')).toBeTruthy();
    expect(getByLabelText('Add attachments and sources')).toBeTruthy();
  });

  it('seeds the draft from value and shows the placeholder', () => {
    const { getByLabelText } = render(PromptBar, {
      props: { value: 'half a thought', placeholder: 'Ask anything' },
    });
    const input = getByLabelText('Prompt') as HTMLTextAreaElement;
    expect(input.value).toBe('half a thought');
    expect(input.getAttribute('placeholder')).toBe('Ask anything');
  });

  it('disables send until there is something to send', async () => {
    const { getByLabelText } = render(PromptBar);
    const send = getByLabelText('Send') as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    await type(getByLabelText('Prompt'), 'hello');
    expect(send.disabled).toBe(false);
  });

  it('enables send on attachments alone, with an empty draft', () => {
    const { getByLabelText } = render(PromptBar, { props: { attachments: ['notes.pdf'] } });
    expect((getByLabelText('Send') as HTMLButtonElement).disabled).toBe(false);
  });

  it('raises oninput and onchange on every edit', async () => {
    const oninput = vi.fn();
    const onchange = vi.fn();
    const { getByLabelText } = render(PromptBar, { props: { oninput, onchange } });
    await type(getByLabelText('Prompt'), 'draft');
    expect(oninput).toHaveBeenCalledWith('draft');
    expect(onchange).toHaveBeenCalledWith('draft');
  });

  it('sends the trimmed draft on Enter and clears it', async () => {
    const onsend = vi.fn();
    const { getByLabelText } = render(PromptBar, { props: { onsend } });
    const input = getByLabelText('Prompt') as HTMLTextAreaElement;
    await type(input, '  ship it  ');
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(onsend).toHaveBeenCalledWith('ship it');
    expect(input.value).toBe('');
  });

  it('does not send on Shift+Enter', async () => {
    const onsend = vi.fn();
    const { getByLabelText } = render(PromptBar, { props: { onsend } });
    const input = getByLabelText('Prompt');
    await type(input, 'first line');
    await fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(onsend).not.toHaveBeenCalled();
  });

  it('sends from the button too', async () => {
    const onsend = vi.fn();
    const { getByLabelText } = render(PromptBar, { props: { value: 'go', onsend } });
    await fireEvent.click(getByLabelText('Send'));
    expect(onsend).toHaveBeenCalledWith('go');
  });
});

describe('PromptBar — the @ and / typeahead', () => {
  it('opens a listbox of sources on @ and filters as you type', async () => {
    const { getByLabelText, getByRole, queryByRole, getAllByRole } = render(PromptBar, {
      props: { sources: SOURCES },
    });
    const input = getByLabelText('Prompt');
    expect(queryByRole('listbox')).toBeNull();

    await type(input, '@');
    expect(getByRole('listbox')).toBeTruthy();
    expect(getAllByRole('option')).toHaveLength(3);

    await type(input, '@met');
    const options = getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain('Metrics');
  });

  it('is a combobox, not a menu, and points at the active option', async () => {
    const { getByLabelText, getAllByRole } = render(PromptBar, { props: { id: 'pb', sources: SOURCES } });
    const input = getByLabelText('Prompt');
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');

    await type(input, '@');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(input.getAttribute('aria-controls')).toBe('pb-menu');
    expect(input.getAttribute('aria-activedescendant')).toBe('pb-option-0');

    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input.getAttribute('aria-activedescendant')).toBe('pb-option-1');
    expect(getAllByRole('option')[1].getAttribute('aria-selected')).toBe('true');

    // Wraps from the top.
    await fireEvent.keyDown(input, { key: 'ArrowUp' });
    await fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(input.getAttribute('aria-activedescendant')).toBe('pb-option-2');
  });

  it('opens nothing when there are no sources configured', async () => {
    const { getByLabelText, queryByRole } = render(PromptBar);
    await type(getByLabelText('Prompt'), 'email me @');
    expect(queryByRole('listbox')).toBeNull();
  });

  it('inserts the picked source as an @mention', async () => {
    const { getByLabelText, getAllByRole } = render(PromptBar, { props: { sources: SOURCES } });
    const input = getByLabelText('Prompt') as HTMLTextAreaElement;
    await type(input, 'look at @met');
    await fireEvent.click(getAllByRole('option')[0]);
    expect(input.value).toBe('look at @Metrics ');
  });

  it('picks the active row on Enter', async () => {
    const { getByLabelText } = render(PromptBar, { props: { commands: COMMANDS } });
    const input = getByLabelText('Prompt') as HTMLTextAreaElement;
    await type(input, '/');
    await fireEvent.keyDown(input, { key: 'ArrowDown' });
    await fireEvent.keyDown(input, { key: 'Enter' });
    expect(input.value).toBe('/restock ');
  });

  it('filters commands by their name without the slash', async () => {
    const { getByLabelText, getAllByRole } = render(PromptBar, { props: { commands: COMMANDS } });
    await type(getByLabelText('Prompt'), '/sum');
    const options = getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain('/summarize');
  });

  it('shows a no-matches line rather than an empty panel', async () => {
    const { getByLabelText, getByText, queryAllByRole } = render(PromptBar, { props: { sources: SOURCES } });
    await type(getByLabelText('Prompt'), '@zzz');
    expect(queryAllByRole('option')).toHaveLength(0);
    expect(getByText(/No matches for/)).toBeTruthy();
  });

  it('dismisses the list on Escape and reopens on the next edit', async () => {
    const { getByLabelText, queryByRole, getByRole } = render(PromptBar, { props: { sources: SOURCES } });
    const input = getByLabelText('Prompt');
    await type(input, '@');
    await fireEvent.keyDown(input, { key: 'Escape' });
    expect(queryByRole('listbox')).toBeNull();
    await type(input, '@m');
    expect(getByRole('listbox')).toBeTruthy();
  });

  it('opens the source list from the + button with no token typed', async () => {
    const { getByLabelText, getByRole } = render(PromptBar, { props: { sources: SOURCES } });
    await fireEvent.click(getByLabelText('Add attachments and sources'));
    expect(getByRole('listbox')).toBeTruthy();
  });
});

describe('PromptBar — the callbacks that replaced the source fakes', () => {
  it('raises onattach for an attach row instead of inserting a mention', async () => {
    const onattach = vi.fn();
    const { getByLabelText, getAllByRole } = render(PromptBar, {
      props: { sources: SOURCES, onattach },
    });
    const input = getByLabelText('Prompt') as HTMLTextAreaElement;
    await type(input, '@up');
    await fireEvent.click(getAllByRole('option')[0]);
    expect(onattach).toHaveBeenCalledOnce();
    expect(input.value).toBe('');
  });

  it('picking an unconnected source raises onconnect instead of inserting it', async () => {
    const onconnect = vi.fn();
    const { getByLabelText, getAllByRole } = render(PromptBar, {
      props: { sources: SOURCES, onconnect },
    });
    const input = getByLabelText('Prompt') as HTMLTextAreaElement;
    await type(input, '@gmail');
    await fireEvent.click(getAllByRole('option')[0]);
    expect(onconnect).toHaveBeenCalledWith(expect.objectContaining({ key: 'gmail' }));
    expect(input.value).toBe('@gmail');
  });

  it('a connected source inserts like any other, and reads Connected', async () => {
    const onconnect = vi.fn();
    const sources = [{ key: 'gmail', name: 'Gmail', connect: true, connected: true }];
    const { getByLabelText, getByText, getAllByRole } = render(PromptBar, {
      props: { sources, onconnect },
    });
    const input = getByLabelText('Prompt') as HTMLTextAreaElement;
    await type(input, '@');
    expect(getByText('Connected')).toBeTruthy();
    await fireEvent.click(getAllByRole('option')[0]);
    expect(onconnect).not.toHaveBeenCalled();
    expect(input.value).toBe('@Gmail ');
  });

  it('toggles dictation through onlisten and shows the equalizer while live', async () => {
    const onlisten = vi.fn();
    const { getByLabelText, container } = render(PromptBar, { props: { onlisten } });
    await fireEvent.click(getByLabelText('Start dictation'));
    expect(onlisten).toHaveBeenCalledWith(true);
    expect(container.querySelector('.ripple-prompt-eq')).toBeTruthy();
    expect(getByLabelText('Stop dictation').getAttribute('aria-pressed')).toBe('true');
  });

  it('shows Listening… as the placeholder when the caller sets listening', () => {
    const { getByLabelText } = render(PromptBar, { props: { listening: true } });
    expect(getByLabelText('Prompt').getAttribute('placeholder')).toBe('Listening…');
  });

  it('renders attachment chips and raises onremoveattachment', async () => {
    const onremoveattachment = vi.fn();
    const { getByLabelText, getByText } = render(PromptBar, {
      props: { attachments: ['pos-export.csv'], onremoveattachment },
    });
    expect(getByText('pos-export.csv')).toBeTruthy();
    await fireEvent.click(getByLabelText('Remove pos-export.csv'));
    expect(onremoveattachment).toHaveBeenCalledWith('pos-export.csv', 0);
  });
});

describe('PromptBar — model picker and variants', () => {
  it('hides the picker when there is nothing to choose between', () => {
    const { queryByLabelText } = render(PromptBar, { props: { models: [MODELS[0]] } });
    expect(queryByLabelText('Choose model')).toBeNull();
  });

  it('shows the selected model on the trigger', () => {
    const { getByLabelText } = render(PromptBar, { props: { models: MODELS, model: 'deep' } });
    expect(getByLabelText('Choose model').textContent).toContain('Deep');
  });

  it('falls back to the first model when none is named', () => {
    const { getByLabelText } = render(PromptBar, { props: { models: MODELS } });
    expect(getByLabelText('Choose model').textContent).toContain('Fast');
  });

  it('marks the variant on the root', () => {
    const { container } = render(PromptBar, { props: { variant: 'pill' } });
    expect(container.querySelector('.ripple-prompt-bar')?.getAttribute('data-variant')).toBe('pill');
  });

  it('disables every control when disabled', () => {
    const { getByLabelText } = render(PromptBar, { props: { value: 'text', disabled: true } });
    expect((getByLabelText('Prompt') as HTMLTextAreaElement).disabled).toBe(true);
    expect((getByLabelText('Send') as HTMLButtonElement).disabled).toBe(true);
    expect((getByLabelText('Start dictation') as HTMLButtonElement).disabled).toBe(true);
  });
});
