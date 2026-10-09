// lib/site/playground/tail.svelte.ts — Keeps a streaming pane at its newest line, until the visitor scrolls up.
// stick() scrolls to the bottom while following and remembers where it put the
// view. A scroll event only unfollows when the view sits ABOVE that mark, so
// content that grew between our scroll and its event (the view is no longer at
// the bottom, but nobody moved it) never reads as the visitor leaving.
// Scrolling back to the bottom, or resume() (the Live pill), follows again.

type Scroller = { scrollTop: number; scrollHeight: number; clientHeight: number };

export const SLACK = 24;
export const atBottom = (el: Scroller, slack = SLACK) => el.scrollHeight - el.scrollTop - el.clientHeight <= slack;

export class Tail {
	following = $state(true);
	#mark = 0;

	stick(el: Scroller) {
		if (!this.following) return;
		el.scrollTop = el.scrollHeight;
		this.#mark = el.scrollTop;
	}

	onScroll(el: Scroller) {
		if (atBottom(el)) this.following = true;
		else if (el.scrollTop < this.#mark - SLACK) this.following = false;
	}

	resume(el: Scroller) {
		this.following = true;
		this.stick(el);
	}

	/** A new version in the pane: start following from the top of it. */
	reset() {
		this.following = true;
		this.#mark = 0;
	}
}
