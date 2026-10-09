// site/docs/in-view.ts — An {@attach} that reports when an element comes near
// the viewport, so the docs mount live renders only where someone can see them
// (the widget index cards, the variant rows). Without IntersectionObserver it
// reports visible straight away: the render shows, it just is not lazy.
import type { Attachment } from 'svelte/attachments';

/** Calls `onChange(true)` as the element nears the viewport and `onChange(false)` as it leaves; with `once`, stops after the first true. */
export function inView(onChange: (visible: boolean) => void, { margin = '200px', once = false } = {}): Attachment {
	return (el) => {
		if (typeof IntersectionObserver === 'undefined') {
			onChange(true);
			return () => {};
		}
		const io = new IntersectionObserver(
			(entries) => {
				const visible = entries.some((e) => e.isIntersecting);
				onChange(visible);
				if (visible && once) io.disconnect();
			},
			{ rootMargin: margin }
		);
		io.observe(el);
		return () => io.disconnect();
	};
}
