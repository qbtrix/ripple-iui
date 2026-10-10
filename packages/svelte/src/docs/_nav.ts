// docs/_nav.ts — The docs sidebar's sections, in order. Each section is a
// folder of .md files under src/docs; pages inside it sort by their
// frontmatter `order`. A section with no pages is dropped, so the sidebar never
// shows a dead link: add the folder and its first page together. The widget
// reference (/docs/widgets) is generated from the manifest and added by the
// docs layout after these.
export const sections = [
	{ title: 'Getting started', dir: 'getting-started' },
	{ title: 'Concepts', dir: 'concepts' },
	{ title: 'Guides', dir: 'guides' },
	{ title: 'API reference', dir: 'api' },
	{ title: 'Architecture', dir: 'architecture' }
];
