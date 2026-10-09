// The docs sidebar, built once at prerender from src/docs.
import { buildNav } from '$lib/site/docs/content.js';

export const load = () => ({ nav: buildNav() });
