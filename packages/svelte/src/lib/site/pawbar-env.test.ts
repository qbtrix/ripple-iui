// lib/site/pawbar-env.test.ts — The opt-in guard for the landing chat's live path.

import { describe, expect, test } from 'vitest';
import { pawbarEnv } from './pawbar-env.js';

const full = { PUBLIC_PAWBAR_ENDPOINT: 'https://pb.example', PUBLIC_PAWBAR_WIDGET_ID: 'w', PUBLIC_PAWBAR_SITE_KEY: 'k' };

describe('pawbarEnv', () => {
	test('no env: off and empty, in any mode', () => {
		for (const mode of ['production', 'development'])
			expect(pawbarEnv({}, mode)).toEqual({ live: false, endpoint: '', widgetId: '', siteKey: '' });
	});

	test('production with a Paw Bar var but no flag fails the build, naming the var', () => {
		expect(() => pawbarEnv({ PUBLIC_PAWBAR_URL: 'x' }, 'production')).toThrow(/PUBLIC_PAWBAR_URL.*PUBLIC_PAWBAR_LIVE=1/);
		expect(() => pawbarEnv({ ...full, PUBLIC_PAWBAR_LIVE: 'true' }, 'production')).toThrow(/PUBLIC_PAWBAR_LIVE=1/);
	});

	test('empty values do not count as set', () => {
		expect(pawbarEnv({ PUBLIC_PAWBAR_ENDPOINT: '' }, 'production').live).toBe(false);
	});

	test('development without the flag stays off rather than throwing', () => {
		expect(pawbarEnv(full, 'development')).toEqual({ live: false, endpoint: '', widgetId: '', siteKey: '' });
	});

	test('the flag turns it on and passes the config through', () => {
		expect(pawbarEnv({ ...full, PUBLIC_PAWBAR_LIVE: '1' }, 'production')).toEqual({
			live: true,
			endpoint: 'https://pb.example',
			widgetId: 'w',
			siteKey: 'k'
		});
	});

	test('the flag with missing config fails a production build', () => {
		expect(() => pawbarEnv({ PUBLIC_PAWBAR_LIVE: '1' }, 'production')).toThrow(/needs PUBLIC_PAWBAR_ENDPOINT/);
	});
});
