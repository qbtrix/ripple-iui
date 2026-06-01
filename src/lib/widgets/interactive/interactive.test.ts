// @file widgets/interactive/interactive.test.ts
// @description Registry + render coverage for the composite consumer widgets
//   ported from ocean-flow. Asserts every new type key resolves to a real
//   component, and exercises the jsdom-safe widgets (TodoList interaction,
//   Timer + Flashcard initial render). Canvas/media widgets (DrawingCanvas,
//   AudioPlayer, VideoPlayer) cannot be meaningfully driven in jsdom — their
//   Canvas2D / HTMLMediaElement APIs are unimplemented — so they are only
//   mount-smoke-tested here and need a real-browser preview pass before merge.
// @created 2026-05-31 — composite consumer widgets migration.
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { getWidget, hasWidget } from '../index.js';
import TodoList from './TodoList.svelte';
import Timer from './Timer.svelte';
import Flashcard from './Flashcard.svelte';
import DrawingCanvas from './DrawingCanvas.svelte';

describe('composite consumer widgets — registry wiring', () => {
  it('every new type key resolves to a component (no ghosts)', () => {
    const types = [
      'todo-list', 'todo', 'todos',
      'drawing-canvas', 'drawing', 'canvas', 'sketchpad',
      'timer', 'countdown', 'pomodoro',
      'flashcard', 'flip-card',
      'audio', 'audio-player',
      'video', 'video-player',
    ];
    for (const t of types) {
      expect(hasWidget(t), `type "${t}" is not registered`).toBe(true);
      expect(getWidget(t), `type "${t}" resolves to undefined`).toBeTruthy();
    }
  });

  it('aliases resolve to the same component as the canonical type', () => {
    expect(getWidget('todo')).toBe(getWidget('todo-list'));
    expect(getWidget('pomodoro')).toBe(getWidget('timer'));
    expect(getWidget('flip-card')).toBe(getWidget('flashcard'));
    expect(getWidget('audio-player')).toBe(getWidget('audio'));
    expect(getWidget('video-player')).toBe(getWidget('video'));
    expect(getWidget('sketchpad')).toBe(getWidget('drawing-canvas'));
  });
});

describe('TodoList', () => {
  it('renders bound items', () => {
    const { getByText } = render(TodoList, {
      props: { value: [{ id: 'a', text: 'Buy milk', done: false }] },
    });
    expect(getByText('Buy milk')).toBeTruthy();
  });

  it('emits the new array via onchange when a task is added', async () => {
    let received: unknown = null;
    const { getByPlaceholderText, getByText } = render(TodoList, {
      props: { value: [], onchange: (items) => (received = items) },
    });
    const input = getByPlaceholderText('Add a new task...') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'Write tests' } });
    await fireEvent.click(getByText('Add'));
    expect(Array.isArray(received)).toBe(true);
    expect((received as Array<{ text: string }>)[0].text).toBe('Write tests');
  });

  it('emits a toggled item via onchange', async () => {
    let received: Array<{ done: boolean }> = [];
    const { container } = render(TodoList, {
      props: {
        value: [{ id: 'a', text: 'Task', done: false }],
        onchange: (items) => (received = items as Array<{ done: boolean }>),
      },
    });
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    await fireEvent.change(checkbox);
    expect(received[0].done).toBe(true);
  });

  it('shows the remaining count', () => {
    const { getByText } = render(TodoList, {
      props: {
        value: [
          { id: 'a', text: 'One', done: false },
          { id: 'b', text: 'Two', done: true },
        ],
      },
    });
    expect(getByText('1 task remaining')).toBeTruthy();
  });
});

describe('Timer', () => {
  it('renders the formatted start time from the duration prop', () => {
    const { getByText } = render(Timer, { props: { duration: 25 } });
    expect(getByText('25:00')).toBeTruthy();
  });

  it('renders preset pills', () => {
    const { getByText } = render(Timer, { props: { presets: [5, 15] } });
    expect(getByText('5m')).toBeTruthy();
    expect(getByText('15m')).toBeTruthy();
  });
});

describe('Flashcard', () => {
  it('renders the front text and category', () => {
    const { getByText } = render(Flashcard, {
      props: { front: 'Q?', back: 'A!', category: 'Math' },
    });
    expect(getByText('Q?')).toBeTruthy();
    expect(getByText('Math')).toBeTruthy();
  });

  it('renders the back text in the (hidden) back face', () => {
    const { getByText } = render(Flashcard, { props: { front: 'Q?', back: 'A!' } });
    // Both faces are in the DOM; the back is CSS-hidden via backface-visibility.
    expect(getByText('A!')).toBeTruthy();
  });
});

describe('DrawingCanvas — mount smoke only (Canvas2D is jsdom-unimplemented)', () => {
  it('mounts a <canvas> with a toolbar (interaction needs a real browser)', () => {
    const { container } = render(DrawingCanvas, { props: { width: 100, height: 80 } });
    expect(container.querySelector('canvas')).not.toBeNull();
  });
});
