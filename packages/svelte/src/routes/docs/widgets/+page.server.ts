// /docs/widgets: the category index, built from the widget manifest at prerender.
import { widgetCategories } from '$lib/site/docs/widgets.js';

export const load = () => ({ categories: widgetCategories() });
