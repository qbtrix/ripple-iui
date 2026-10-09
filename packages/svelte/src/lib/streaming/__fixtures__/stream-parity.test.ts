// @file streaming/__fixtures__/stream-parity.test.ts
// @description expectStreamParity() on a composite DW-0 already hardened, so
//   the data-widget agents start from a helper known to pass on a good widget.
import { afterEach, describe, it } from 'vitest';
import { cleanup } from '@testing-library/svelte';
import { expectStreamParity } from './stream-parity.js';

afterEach(cleanup);

describe('expectStreamParity', () => {
	it('passes for checklist-layout streamed with id-less items', async () => {
		await expectStreamParity({
			ui: {
				type: 'checklist-layout',
				props: {
					title: 'Launch gate',
					items: [
						{ label: 'Pick a domain', state: 'done' },
						{ label: 'Write the copy', state: 'in-progress', owner: { name: 'Ana Ruiz' } },
						{ id: 'task-1', label: 'Security review', state: 'blocked' }
					]
				}
			}
		});
	});
});
