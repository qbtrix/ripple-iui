// docs/_nav.ts — The docs sidebar's sections, in order. Each section is a
// folder of .md files under src/docs; pages inside it sort by their
// frontmatter `order`. A section with no pages is dropped, so the sidebar never
// shows a dead link: add the folder and its first page together.
export const sections = [{ title: 'Getting started', dir: 'getting-started' }];
