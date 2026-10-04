// discover/discover.ssr.test.ts — static-safety contract for the Discover card
// set: every component renders its picture, media source and links through
// `svelte/server` with no hydration, the path a prerendered public catalogue
// page takes, and that only http(s) urls reach a src or an action href. Runs in
// the `ssr` vitest project. Also pins the pure item rules: itemHref's routes,
// primaryFor, the usage labels and the placeholder palette.
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import DetailMedia from './DetailMedia.svelte';
import DiscoverRow from './DiscoverRow.svelte';
import DiscoverTile from './DiscoverTile.svelte';
import ItemArt from './ItemArt.svelte';
import { CARD_PALETTE, tintFor } from './art.js';
import { itemHref } from './href.js';
import { primaryFor, remixLabel, usageLabel, usedLabel } from './item.js';
import type { DiscoverItem } from './types.js';

const tool: DiscoverItem = {
  id: 'tool-1',
  slug: 'invoice-maker',
  kind: 'tool',
  mediaKind: null,
  title: 'Invoice maker',
  desc: 'Bill a client in a minute.',
  imageUrl: 'https://cdn.example.com/invoice.png',
  liveUrl: 'https://invoice.example.com',
  remixCount: 1200,
  featured: true,
};

const video: DiscoverItem = {
  id: 'vid-1',
  kind: 'video',
  mediaKind: 'video',
  title: 'Sunset loop',
  desc: 'Eight seconds of sky.',
  imageUrl: 'https://cdn.example.com/sunset.jpg',
  mediaUrl: 'https://cdn.example.com/sunset.mp4',
  remixCount: 3,
  featured: false,
};

const song: DiscoverItem = { ...video, id: 'song-1', kind: 'music', mediaKind: 'audio', title: 'Lo-fi walk', imageUrl: null, mediaUrl: 'https://cdn.example.com/walk.mp3' };

describe('discover card set — SSR static safety', () => {
  it('DiscoverTile bakes the image, the links and the labels into server markup', () => {
    const { body } = render(DiscoverTile, { props: { item: tool, href: '/free-tools/invoice-maker' } });
    expect(body).toContain('<img');
    expect(body).toContain('src="https://cdn.example.com/invoice.png"');
    expect(body).toContain('loading="lazy"');
    expect(body).toContain('href="/free-tools/invoice-maker"');
    expect(body).toContain('href="https://invoice.example.com/"');
    expect(body).toMatch(/<a [^>]*href="https:\/\/invoice\.example\.com\/"[^>]*rel="nofollow ugc noopener noreferrer"/);
    expect(body).toMatch(/<a [^>]*href="https:\/\/invoice\.example\.com\/"[^>]*target="_blank"/);
    expect(body).not.toMatch(/<a [^>]*href="\/free-tools\/invoice-maker"[^>]*rel=/);
    expect(body).not.toMatch(/<a [^>]*href="\/free-tools\/invoice-maker"[^>]*target=/);
    expect(body).toContain('Invoice maker');
    expect(body).toContain('Staff pick');
    expect(body).toContain('1.2k remixes');
    expect(body).toContain('>Use<');
  });

  it.each([DiscoverTile, DiscoverRow])('target and rel pass through to the art and title links', (Component) => {
    const { body } = render(Component, { props: { item: { ...tool, liveUrl: null }, href: 'https://pocketpaw.xyz/free-tools/invoice-maker', target: '_blank', rel: 'noopener' } });
    const links = body.match(/<a [^>]*>/g) ?? [];
    expect(links).toHaveLength(2);
    for (const a of links) {
      expect(a).toContain('href="https://pocketpaw.xyz/free-tools/invoice-maker"');
      expect(a).toContain('target="_blank"');
      expect(a).toContain('rel="noopener"');
    }
  });

  it('DiscoverTile without href renders no page link, and without callbacks no buttons', () => {
    const { body } = render(DiscoverTile, { props: { item: { ...tool, liveUrl: null, featured: false } } });
    expect(body).not.toContain('<a ');
    expect(body).not.toContain('<button');
    expect(body).toContain('Invoice maker');
  });

  it('DiscoverTile draws the tinted initial when there is no picture', () => {
    const { body } = render(DiscoverTile, { props: { item: { ...tool, imageUrl: null } } });
    expect(body).not.toContain('<img');
    expect(body).toContain('>I<');
    expect(body).toContain('--art-tint: var(--ripple-');
  });

  it('DiscoverRow bakes the image and the links into server markup', () => {
    const { body } = render(DiscoverRow, { props: { item: video, href: '/discover/vid-1' } });
    expect(body).toContain('src="https://cdn.example.com/sunset.jpg"');
    expect(body).toContain('href="/discover/vid-1"');
    expect(body).toContain('discover-video-badge');
    expect(body).toContain('3 used');
    expect(body).toContain('role="listitem"');
  });

  it('ItemArt prints a lazy <img> or the music cover', () => {
    const img = render(ItemArt, { props: { imageUrl: 'https://cdn.example.com/a.png', title: 'A', tint: 'var(--ripple-accent)', initial: 'A' } }).body;
    expect(img).toContain('<img');
    expect(img).toContain('alt="Preview of A"');
    const cover = render(ItemArt, { props: { imageUrl: null, title: 'S', mediaKind: 'audio', tint: 'var(--ripple-accent)', initial: 'S' } }).body;
    expect(cover).toContain('discover-music-cover');
    expect(cover).toContain('<svg');
  });

  it('ItemArt keeps the play badge on a video with no poster and does not claim one', () => {
    const { body } = render(ItemArt, { props: { imageUrl: null, title: 'Clip', mediaKind: 'video', tint: 'var(--ripple-accent)', initial: 'C' } });
    expect(body).toContain('discover-video-badge');
    expect(body).not.toContain('<img');
    expect(body).toContain('aria-label="Preview of Clip"');
    expect(body).not.toContain('Video poster');
  });

  it.each(['javascript:alert(1)', 'data:image/png;base64,AAAA', '//evil.example.com/a.png', '/relative.png'])('a non-http preview %s renders the placeholder, not an <img>', (imageUrl) => {
    const { body } = render(DiscoverTile, { props: { item: { ...tool, imageUrl } } });
    expect(body).not.toContain('<img');
    expect(body).not.toContain(imageUrl);
    expect(body).toContain('>I<');
  });

  it('DetailMedia drops a non-http poster but keeps the video', () => {
    const { body } = render(DetailMedia, { props: { item: { ...video, imageUrl: 'data:image/png;base64,AAAA' } } });
    expect(body).toContain('<video');
    expect(body).not.toContain('poster=');
  });

  it('DetailMedia renders video, audio and image with src in the markup', () => {
    const v = render(DetailMedia, { props: { item: video } }).body;
    expect(v).toContain('<video');
    expect(v).toContain('src="https://cdn.example.com/sunset.mp4"');
    expect(v).toContain('poster="https://cdn.example.com/sunset.jpg"');
    expect(v).toContain('controls');
    const a = render(DetailMedia, { props: { item: song } }).body;
    expect(a).toContain('<audio');
    expect(a).toContain('src="https://cdn.example.com/walk.mp3"');
    expect(a).toContain('discover-music-cover');
    const i = render(DetailMedia, { props: { item: { ...video, kind: 'image', mediaKind: 'image', mediaUrl: 'https://cdn.example.com/full.png' } } }).body;
    expect(i).toContain('<img');
    expect(i).toContain('src="https://cdn.example.com/full.png"');
    expect(render(DetailMedia, { props: { item: tool } }).body).not.toMatch(/<(img|video|audio)/);
  });

  it('DetailMedia drops a non-http media url', () => {
    const { body } = render(DetailMedia, { props: { item: { ...video, mediaUrl: 'javascript:alert(1)' } } });
    expect(body).not.toContain('<video');
  });
});

describe('DiscoverTile for a song', () => {
  it('draws the music cover and the used label', () => {
    const { body } = render(DiscoverTile, { props: { item: { ...song, remixCount: 1 } } });
    expect(body).toContain('discover-music-cover');
    expect(body).toContain('aria-label="Song cover for Lo-fi walk"');
    expect(body).toContain('1 used');
    expect(body).not.toContain('<img');
  });
});

describe('item rules', () => {
  it('primaryFor drops a liveUrl that is not http(s)', () => {
    for (const liveUrl of ['javascript:alert(1)', '//evil.example.com', 'data:text/html,hi', '/relative']) {
      expect(primaryFor({ ...tool, liveUrl })).toBeNull();
    }
    expect(primaryFor(tool)).toEqual({ label: 'Use', href: 'https://invoice.example.com/', needsAccount: false });
    expect(primaryFor({ ...tool, kind: 'game' })?.label).toBe('Play');
  });

  it('labels read right at 0 and 1', () => {
    expect(remixLabel(0)).toBe('No remixes yet');
    expect(remixLabel(1)).toBe('1 remix');
    expect(remixLabel(2)).toBe('2 remixes');
    expect(usedLabel(0)).toBe('Not used yet');
    expect(usedLabel(1)).toBe('1 used');
    expect(usedLabel(1500)).toBe('1.5k used');
    expect(usageLabel({ ...song, remixCount: 0 })).toBe('Not used yet');
    expect(usageLabel({ ...tool, remixCount: 1 })).toBe('1 remix');
  });

  it('tintFor is stable, coloured and never neutral', () => {
    expect(tintFor('abc')).toBe(tintFor('abc'));
    expect(CARD_PALETTE).not.toContain('var(--ripple-muted-foreground)');
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'tool-1', 'vid-1']) expect(CARD_PALETTE).toContain(tintFor(id));
  });
});

describe('itemHref', () => {
  it('routes by kind', () => {
    expect(itemHref('tool', 'invoice-maker')).toBe('/free-tools/invoice-maker');
    expect(itemHref('game', 'snake')).toBe('/play/snake');
    expect(itemHref('site', 'dentist')).toBe('/templates/dentist');
    expect(itemHref('video', 'vid-1')).toBe('/discover/vid-1');
    expect(itemHref('music', 'a b')).toBe('/discover/a%20b');
  });
});
