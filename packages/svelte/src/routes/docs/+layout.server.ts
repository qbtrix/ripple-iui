// The docs sidebar, built once at prerender: the markdown sections from
// src/docs, then the generated widget reference's categories.
import { buildNav } from '$lib/site/docs/content.js';
import { widgetCategories } from '$lib/site/docs/widgets.js';

export const load = () => ({
	nav: buildNav(),
	widgetNav: widgetCategories().map((c) => ({ id: c.id, title: c.title }))
});
