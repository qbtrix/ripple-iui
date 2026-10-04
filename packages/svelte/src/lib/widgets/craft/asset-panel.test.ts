// widgets/craft/asset-panel.test.ts — the drag payload and local filter
// (asset-panel.ts), and AssetPanel's tabs, per-tab search, chips, loading and
// empty states, click/drag insert, collapse to the rail and keyboard.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import AssetPanel from './AssetPanel.svelte';
import { ASSET_MIME, filterAssets, isAssetDrag, readAssetDrop, writeAssetDrag, type AssetItem } from './asset-panel.js';

afterEach(cleanup);

/** jsdom has no DataTransfer; a Map-backed stand-in with the parts we use. */
function fakeDataTransfer() {
  const data = new Map<string, string>();
  return {
    setData: (t: string, v: string) => void data.set(t, v),
    getData: (t: string) => data.get(t) ?? '',
    get types() { return [...data.keys()]; },
    effectAllowed: 'all',
  } as unknown as DataTransfer;
}

const diwali: AssetItem = { id: 't1', label: 'Diwali offer', thumb: 'data:image/png;base64,', width: 300, height: 120, tags: ['festival', 'diwali'], kind: 'template', data: { doc: 'diwali.json' } };
const card: AssetItem = { id: 't2', label: 'Visiting card', thumb: 'data:image/png;base64,', tags: ['card'], kind: 'template' };
const holi: AssetItem = { id: 't3', label: 'Holi sale banner', tags: ['festival'], kind: 'template' };

describe('asset-panel model', () => {
  it('round-trips a tile through a drag as typed JSON plus a plain-text label', () => {
    const dt = fakeDataTransfer();
    writeAssetDrag(dt, diwali, 'templates');
    expect(dt.getData('text/plain')).toBe('Diwali offer');
    expect(dt.effectAllowed).toBe('copy');
    expect(isAssetDrag(dt)).toBe(true);
    expect(readAssetDrop(dt)).toEqual({ tab: 'templates', id: 't1', label: 'Diwali offer', kind: 'template', data: { doc: 'diwali.json' } });
  });

  it('reads anything else as null', () => {
    const dt = fakeDataTransfer();
    expect(readAssetDrop(dt)).toBeNull();
    dt.setData(ASSET_MIME, '{not json');
    expect(readAssetDrop(dt)).toBeNull();
    expect(readAssetDrop(null)).toBeNull();
  });

  it('filters by every token over label and tags, and by the active chip', () => {
    const all = [diwali, card, holi];
    expect(filterAssets(all, '', null)).toHaveLength(3);
    expect(filterAssets(all, 'festival', null).map((i) => i.id)).toEqual(['t1', 't3']);
    expect(filterAssets(all, 'sale festival', null).map((i) => i.id)).toEqual(['t3']);
    expect(filterAssets(all, '', 'card').map((i) => i.id)).toEqual(['t2']);
    expect(filterAssets(all, 'holi', 'card')).toEqual([]);
  });
});

const tabs = [
  { id: 'templates', label: 'Templates', icon: 'layout-template', filters: [{ id: 'festival', label: 'Festival' }, { id: 'card', label: 'Cards' }] },
  { id: 'elements', label: 'Elements', icon: 'shapes', captions: false },
  { id: 'uploads', label: 'Uploads', emptyText: 'Upload a photo or logo' },
];
const tiles = () => [...document.querySelectorAll<HTMLElement>('[data-asset-tile]')];

describe('AssetPanel', () => {
  it('shows the first tab with its tiles, captions and lazy thumbnails', () => {
    const { getByRole } = render(AssetPanel, { props: { tabs, items: { templates: [diwali, card, holi] } } });
    expect(getByRole('tab', { name: 'Templates' }).getAttribute('aria-selected')).toBe('true');
    expect(getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(getByRole('tab', { name: 'Templates' }).id);
    expect(tiles().map((t) => t.lastElementChild!.textContent!.trim())).toEqual(['Diwali offer', 'Visiting card', 'Holi sale banner']);
    const img = tiles()[0].querySelector('img')!;
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(tiles()[0].querySelector('span')!.style.aspectRatio).toBe('300 / 120');
  });

  it('shows skeleton tiles while a tab is loading and an empty state when it has none', async () => {
    const { getByRole, getByText, container } = render(AssetPanel, { props: { tabs, items: { templates: [diwali], uploads: [] } } });
    await fireEvent.click(getByRole('tab', { name: 'Elements' }));
    expect(container.querySelectorAll('[data-asset-skeleton]').length).toBe(8);
    expect(getByRole('status').textContent).toContain('Loading elements');
    await fireEvent.click(getByRole('tab', { name: 'Uploads' }));
    getByText('Upload a photo or logo');
  });

  it('searches and filters per tab, keeping each tab’s query', async () => {
    const onsearch = vi.fn();
    const { getByRole, getByLabelText } = render(AssetPanel, { props: { tabs, items: { templates: [diwali, card, holi], elements: [] }, onsearch } });
    const box = getByLabelText('Search templates') as HTMLInputElement;
    await fireEvent.input(box, { target: { value: 'banner' } });
    flushSync();
    expect(onsearch).toHaveBeenCalledWith('templates', 'banner');
    expect(tiles().map((t) => t.title)).toEqual(['Holi sale banner']);
    await fireEvent.click(getByRole('tab', { name: 'Elements' }));
    await fireEvent.click(getByRole('tab', { name: 'Templates' }));
    expect((getByLabelText('Search templates') as HTMLInputElement).value).toBe('banner');

    await fireEvent.input(getByLabelText('Search templates'), { target: { value: '' } });
    const cards = getByRole('button', { name: 'Cards' });
    await fireEvent.click(cards);
    expect(cards.getAttribute('aria-pressed')).toBe('true');
    expect(tiles().map((t) => t.title)).toEqual(['Visiting card']);
    await fireEvent.click(getByRole('button', { name: 'All' }));
    expect(tiles()).toHaveLength(3);
  });

  it('inserts on click and carries the typed payload on drag', async () => {
    const oninsert = vi.fn();
    render(AssetPanel, { props: { tabs, items: { templates: [diwali] }, oninsert } });
    await fireEvent.click(tiles()[0]);
    expect(oninsert).toHaveBeenCalledWith(diwali, 'templates');
    const dataTransfer = fakeDataTransfer();
    await fireEvent.dragStart(tiles()[0], { dataTransfer });
    expect(tiles()[0].getAttribute('draggable')).toBe('true');
    expect(readAssetDrop(dataTransfer)?.id).toBe('t1');
  });

  it('collapses to the rail by clicking the open tab, and reopens on any tab', async () => {
    const { getByRole, queryByRole, container } = render(AssetPanel, { props: { tabs, items: { templates: [diwali] } } });
    await fireEvent.click(getByRole('tab', { name: 'Templates' }));
    expect(queryByRole('tabpanel')).toBeNull();
    expect(container.querySelector('[data-slot="asset-panel"]')!.hasAttribute('data-collapsed')).toBe(true);
    expect(getByRole('button', { name: 'Open library' }).getAttribute('aria-expanded')).toBe('false');
    await fireEvent.click(getByRole('tab', { name: 'Uploads' }));
    expect(getByRole('tabpanel')).not.toBeNull();
    await fireEvent.click(getByRole('button', { name: 'Close library' }));
    expect(queryByRole('tabpanel')).toBeNull();
  });

  it('arrow keys move through the rail and the grid', async () => {
    const ontab = vi.fn();
    const { getByRole } = render(AssetPanel, { props: { tabs, items: { templates: [diwali, card, holi] }, ontab } });
    const first = getByRole('tab', { name: 'Templates' });
    first.focus();
    await fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(ontab).toHaveBeenCalledWith('elements');
    expect(document.activeElement).toBe(getByRole('tab', { name: 'Elements' }));
    await fireEvent.keyDown(document.activeElement!, { key: 'ArrowUp' });

    expect(tiles().map((t) => t.tabIndex)).toEqual([0, -1, -1]);
    tiles()[0].focus();
    await fireEvent.keyDown(tiles()[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(tiles()[1]);
    await fireEvent.keyDown(tiles()[1], { key: 'End' });
    expect(document.activeElement).toBe(tiles()[2]);
  });

  it('labels caption-less tiles for screen readers', async () => {
    const { getByRole } = render(AssetPanel, { props: { tabs, tab: 'elements', items: { elements: [{ id: 'e1', label: 'Diya', thumb: 'data:image/png;base64,' }] } } });
    expect(getByRole('button', { name: 'Diya' })).toBe(tiles()[0]);
  });
});
