/**
 * @file manifest/slim-widgets.ts
 * @description The standard widget set for slim hosts: the few atoms every
 * host of `@ripple-ui/core/headless/slim` is expected to draw, documented for
 * the agent that writes specs for it.
 *
 * Each entry is a strict SUBSET of the same widget in `@ripple-ui/svelte`'s
 * full manifest: same `type`, same prop names, and prop values drawn from the
 * full widget's own. So a spec written against these atoms is also a valid
 * spec for the full renderer. `@ripple-ui/svelte`'s
 * `manifest/slim-widgets.test.ts` fails if a type, prop or value drifts.
 *
 * A host adds its own widgets alongside these with
 * `buildSlimManifest({ widgets: [...SLIM_WIDGETS, ...own] })`. There is no
 * image atom on purpose: a slim host typically sits on someone else's page,
 * where a model-chosen image URL is a request fired on render.
 *
 * @changes
 *   - 2026-09-27: created (text, heading, badge, button, flex).
 */

import type { SlimWidgetEntry } from './slim.js';

export const SLIM_WIDGETS: SlimWidgetEntry[] = [
	{
		type: 'text',
		category: 'display',
		description: 'A run of plain text. No markdown.',
		props: {
			text: { type: 'string', required: true, description: 'The text.' }
		},
		example: { type: 'text', props: { text: 'Ships in 2 working days.' } }
	},
	{
		type: 'heading',
		category: 'display',
		description: 'A short title for a block.',
		props: {
			text: { type: 'string', required: true, description: 'The title.' },
			level: { type: '2 | 3 | 4', required: false, description: 'Heading level. Default 3.' }
		},
		example: { type: 'heading', props: { text: 'Your options', level: 3 } }
	},
	{
		type: 'badge',
		category: 'display',
		description: 'A short status label, such as stock or delivery time.',
		props: {
			text: { type: 'string', required: true, description: 'The label.' },
			variant: {
				type: '"default" | "success" | "warning" | "destructive"',
				required: false,
				description: 'Default "default".'
			}
		},
		example: { type: 'badge', props: { text: 'In stock', variant: 'success' } }
	},
	{
		type: 'button',
		category: 'input',
		description: 'A button. on_click runs actions: local state, or an emit the host acts on.',
		props: {
			label: { type: 'string', required: true, description: 'Button text.' },
			variant: {
				type: '"default" | "secondary" | "outline"',
				required: false,
				description: '"default" for the one main action.'
			},
			disabled: { type: 'boolean', required: false, description: 'Disable the button.' }
		},
		events: { on_click: { type: 'EventAction', required: false, description: 'Action run on click.' } },
		example: {
			type: 'button',
			props: { label: 'Show details', variant: 'secondary' },
			on_click: { action: 'toggle', target: 'details' }
		}
	},
	{
		type: 'flex',
		category: 'layout',
		description: 'Lays its children out in a row or a column. The only layout atom.',
		props: {
			direction: { type: '"row" | "column"', required: false, description: 'Default "column".' },
			gap: { type: 'number', required: false, description: 'Space between children in px (0-24).' },
			align: { type: '"start" | "center" | "end"', required: false, description: 'Cross-axis alignment.' },
			wrap: { type: 'boolean', required: false, description: 'Wrap a row onto more lines.' }
		},
		example: {
			type: 'flex',
			props: { direction: 'row', gap: 8, align: 'center' },
			children: [
				{ type: 'badge', props: { text: 'In stock', variant: 'success' } },
				{ type: 'text', props: { text: 'Ships tomorrow' } }
			]
		}
	}
];
