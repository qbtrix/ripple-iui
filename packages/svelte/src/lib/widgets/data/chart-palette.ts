// chart-palette.ts — the default categorical palette for the echarts-backed
// data widgets (chart, funnel, treemap, sankey). A spec's own `colors` always
// win per index; these fill every slot it leaves out.
//
// Paw blue leads, then teal, ochre, violet, orange, magenta: calm hues that
// avoid the red/green pair so a series never reads as a status. The light and
// dark sets are separate steps of the same hues, picked against white (#ffffff)
// and the dark card (#11151b). Both sets pass the dataviz validator
// (validate_palette.js) on adjacent pairs plus the 6->1 wraparound: worst CVD
// ΔE 15.6, normal-vision ΔE >= 17.4, every slot >= 3:1 on its surface, and the
// first three slots also pass all-pairs. Re-run the validator before changing
// a value or the order; the order is part of the colour-blind safety.

export const CHART_PALETTE_LIGHT = ['#0055ff', '#0e9a94', '#876207', '#794db6', '#bf5914', '#a5397e'] as const;
export const CHART_PALETTE_DARK = ['#0055ff', '#28a6a0', '#9c7210', '#8a5fc9', '#da7134', '#b94c90'] as const;

/** Resolve any CSS colour to [r, g, b] (0-255), or null if it can't be read.
 *  rgb()/hex parse directly; anything else (oklch, hsl, names) goes through a
 *  1px canvas, which jsdom lacks, so there it returns null. */
export function toRgb(color: string): [number, number, number] | null {
	if (!color) return null;
	const m = color.match(/^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
	if (m) return [+m[1], +m[2], +m[3]];
	const hex = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
	if (hex) return [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)];
	try {
		const ctx = document.createElement('canvas').getContext('2d');
		if (!ctx) return null;
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, 1, 1);
		const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
		return [r, g, b];
	} catch {
		return null;
	}
}

/** The palette for a chart whose text colour is `fg`: light text means a dark
 *  surface. An unreadable colour falls back to the light set. */
export function chartPalette(fg: string): readonly string[] {
	const rgb = toRgb(fg);
	if (!rgb) return CHART_PALETTE_LIGHT;
	const [r, g, b] = rgb;
	return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? CHART_PALETTE_DARK : CHART_PALETTE_LIGHT;
}

/** An echarts option-level `color` list: the spec's colours by index, the
 *  palette for every slot they leave out. */
export function mergePalette(colors: readonly string[] | undefined, palette: readonly string[]): string[] {
	const n = Math.max(colors?.length ?? 0, palette.length);
	return Array.from({ length: n }, (_, i) => colors?.[i] || palette[i % palette.length]);
}
