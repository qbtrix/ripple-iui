// discover/discover.ssr.test.ts — static-safety contract for the Discover card
// set: every component renders its picture, media source and links through
// `svelte/server` with no hydration, the path a prerendered public catalogue
// page takes. Runs in the `ssr` vitest project. Also pins itemHref's routes.
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import DetailMedia from './DetailMedia.svelte';
import DiscoverRow from './DiscoverRow.svelte';
import DiscoverTile from './DiscoverTile.svelte';
import ItemArt from './ItemArt.svelte';
import { itemHref } from './href.js';
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
    expect(body).toContain('Invoice maker');
    expect(body).toContain('Staff pick');
    expect(body).toContain('1.2k remixes');
    expect(body).toContain('>Use<');
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
    const img = render(ItemArt, { props: { imageUrl: 'https://cdn.example.com/a.png', alt: 'Preview of A', tint: 'var(--ripple-accent)', initial: 'A' } }).body;
    expect(img).toContain('<img');
    expect(img).toContain('alt="Preview of A"');
    const cover = render(ItemArt, { props: { imageUrl: null, alt: 'Song cover', mediaKind: 'audio', tint: 'var(--ripple-accent)', initial: 'S' } }).body;
    expect(cover).toContain('discover-music-cover');
    expect(cover).toContain('<svg');
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

describe('itemHref', () => {
  it('routes by kind', () => {
    expect(itemHref('tool', 'invoice-maker')).toBe('/free-tools/invoice-maker');
    expect(itemHref('game', 'snake')).toBe('/play/snake');
    expect(itemHref('site', 'dentist')).toBe('/templates/dentist');
    expect(itemHref('video', 'vid-1')).toBe('/discover/vid-1');
    expect(itemHref('music', 'a b')).toBe('/discover/a%20b');
  });
});
