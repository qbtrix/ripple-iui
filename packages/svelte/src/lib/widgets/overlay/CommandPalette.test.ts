// src/lib/widgets/overlay/CommandPalette.test.ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import CommandPalette from './CommandPalette.svelte';

const commands = [
  { id: 'new-doc', label: 'New document', group: 'File', shortcut: '⌘N' },
  { id: 'open', label: 'Open file...', group: 'File' },
  { id: 'settings', label: 'Open settings', group: 'App', keywords: ['preferences'] },
  { id: 'theme', label: 'Toggle theme', group: 'App' }
];

describe('CommandPalette', () => {
  it('does not render content when closed', () => {
    const { container } = render(CommandPalette, {
      props: { value: false, commands }
    });
    expect(container.textContent).not.toContain('New document');
  });

  it('renders all commands grouped when open with empty query', () => {
    const { getByText } = render(CommandPalette, {
      props: { value: true, commands }
    });
    expect(getByText('New document')).not.toBeNull();
    expect(getByText('Open file...')).not.toBeNull();
    expect(getByText('Open settings')).not.toBeNull();
    expect(getByText('File')).not.toBeNull();
    expect(getByText('App')).not.toBeNull();
  });

  it('shows shortcut hints when provided', () => {
    const { getByText } = render(CommandPalette, {
      props: { value: true, commands }
    });
    expect(getByText('⌘N')).not.toBeNull();
  });
});
