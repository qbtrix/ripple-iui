// @file core/spec-issues.test.ts
// @description specIssues reports schema and catalog problems with
//   validateCatalog-style paths, and formatSpecIssues renders them for the
//   model's next turn. The catalog is injected, as in the engine's
//   validateCatalog.
import { describe, it, expect } from 'vitest';
import { formatSpecIssues, specIssues } from './spec-issues.js';

const catalog = { widgetTypes: ['flex', 'text', 'list'] };

describe('specIssues', () => {
	it('returns [] for a clean spec', () => {
		const spec = {
			ui: {
				type: 'flex',
				children: [{ type: 'each', items: '{state.rows}', children: [{ type: 'text' }] }]
			},
			state: { rows: [] }
		};
		expect(specIssues(spec, catalog)).toEqual([]);
	});

	it('locates a schema error with a validateCatalog-style path', () => {
		const spec = {
			ui: { type: 'flex', children: [{ type: 'text' }, { type: 'text' }, { type: 'text', props: 'big' }] }
		};
		const issues = specIssues(spec, catalog);
		expect(issues).toHaveLength(1);
		expect(issues[0].path).toBe('ui.children[2].props');
		expect(issues[0].message).toMatch(/expected (record|object)/i);
	});

	it('reports a missing `ui` at path `ui`', () => {
		const issues = specIssues({ state: {} }, catalog);
		expect(issues.map((i) => i.path)).toEqual(['ui']);
	});

	it('reports a non-object spec at path `spec`', () => {
		const issues = specIssues('not a spec', catalog);
		expect(issues).toHaveLength(1);
		expect(issues[0].path).toBe('spec');
	});

	it('names an unknown widget type and where it is', () => {
		const spec = { ui: { type: 'flex', children: [{ type: 'text' }, { type: 'text' }, { type: 'lsit' }] } };
		expect(specIssues(spec, catalog)).toEqual([
			{ path: 'ui.children[2]', message: 'widget type "lsit" isn\'t in the catalog' }
		]);
	});

	it('finds an unknown type inside an `if` node\'s else_children', () => {
		const spec = {
			ui: {
				type: 'if',
				condition: '{state.ok}',
				children: [{ type: 'text' }],
				else_children: [{ type: 'flex', children: [{ type: 'txet' }] }]
			}
		};
		expect(specIssues(spec, catalog)).toEqual([
			{ path: 'ui.else_children[0].children[0]', message: 'widget type "txet" isn\'t in the catalog' }
		]);
	});

	it('reports schema and catalog problems together', () => {
		const spec = { ui: { type: 'flex', props: 3, children: [{ type: 'lsit' }] } };
		const issues = specIssues(spec, catalog);
		expect(issues.map((i) => i.path)).toEqual(['ui.props', 'ui.children[0]']);
	});

	it('honours extraWidgetTypes', () => {
		const spec = { ui: { type: 'custom-thing' } };
		expect(specIssues(spec, { ...catalog, extraWidgetTypes: ['custom-thing'] })).toEqual([]);
	});
});

describe('formatSpecIssues', () => {
	it('returns an empty string for no issues', () => {
		expect(formatSpecIssues([])).toBe('');
	});

	it('lists each issue as `path: message` under a one-line lead', () => {
		const text = formatSpecIssues([
			{ path: 'ui.children[2]', message: 'widget type "lsit" isn\'t in the catalog' },
			{ path: 'ui.props', message: 'Invalid input' }
		]);
		expect(text.split('\n')).toEqual([
			'The last UI spec has 2 problems. Fix them in the next spec:',
			'- ui.children[2]: widget type "lsit" isn\'t in the catalog',
			'- ui.props: Invalid input'
		]);
	});
});
