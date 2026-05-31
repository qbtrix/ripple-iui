/**
 * @file chain-executor.svelte.ts
 * @description The Chain Flow STEP-sequencer (RFC 13 §5.2). Walks a nested
 *   `chain` / `chain_map` `UniversalSpec` tree client-side with zero round-trips,
 *   accumulating each step's data and keeping back/forward history.
 *
 *   NAMING — do not confuse with the action VM's `flow` verb
 *   (`core/event-dispatcher.ts`). That verb is an ACTION-sequencer: it runs a
 *   list of actions *within a single step* (set/api/navigate/…). This class is
 *   a STEP-sequencer: it advances *between steps* of a flow. They are siblings,
 *   not the same thing — a terminal `onComplete: {kind:'navigate'}` here is
 *   literally the action VM's `navigate` action, handed off at the end of the
 *   step sequence.
 *
 * @changes
 *   - RFC 13 M1: typed `chain_map`/`onComplete`/`flowId` off the schema (dropped
 *     the `as any` casts); `flowId` now takes precedence in the context key.
 *   - Added `MAX_HISTORY_DEPTH` bound + a loop guard so a `chain_map`/`chain`
 *     that points back into the tree can't grow history without limit.
 *   - Added `terminalAction()` so a terminal step's `onComplete` FlowAction and
 *     the full accumulated payload can be fired by the host.
 */
import type { UniversalSpec, FlowAction } from '../schema/universal-spec.js';

/**
 * Maximum Chain Flow history depth. Analogous to the action VM's
 * `MAX_FLOW_DEPTH` (`event-dispatcher.ts`); bounds a malformed or cyclic tree
 * so `advance` can't push steps without limit.
 */
export const MAX_HISTORY_DEPTH = 64;

/**
 * State snapshot for chain navigation
 */
export interface ChainState {
	selected: unknown;
	formData: Record<string, unknown>;
	/** Human-readable label for breadcrumb display */
	displayLabel?: string;
}

/**
 * History entry with both spec and state
 */
interface HistoryEntry {
	spec: UniversalSpec;
	state: ChainState;
}

/**
 * The terminal hand-off returned by {@link ChainExecutor.terminalAction} when a
 * step has no further `chain`/`chain_map`: the step's declared `FlowAction`
 * (or `undefined`) plus the full namespaced context accumulated across the walk.
 */
export interface TerminalResult {
	action: FlowAction | undefined;
	payload: Record<string, unknown>;
}

/**
 * Manages client-side intent chaining and navigation history.
 * Allows instant transitions between steps without AI roundtrips.
 *
 * V4: Adds forward navigation (browser-like history) and display labels.
 */
export class ChainExecutor {
	// Use $state for reactive history tracking
	private _history = $state<HistoryEntry[]>([]);
	private _forwardStack = $state<HistoryEntry[]>([]);
	private _context = $state<Record<string, unknown>>({});

	/**
	 * Non-reactive ledger of the RAW (un-proxied) spec object at each history
	 * position, in lockstep with `_history`. Used for the cycle guard and for
	 * resolving the next step. We must NOT read the next-step candidate off the
	 * `$state`-proxied `currentSpec`: Svelte's proxy eagerly enumerates keys
	 * (`ownKeys`) when a spec object is spread into `$state`, which infinitely
	 * recurses on a malformed cyclic tree (chain/chain_map pointing back into the
	 * tree). Comparing and walking RAW references keeps the guard O(depth) and
	 * crash-free on pathological input, while `_history` stays reactive for the
	 * renderer. Plain field (not `$state`) — identity tracking, never rendered.
	 */
	private _rawSpecs: UniversalSpec[] = [];

	/** Raw-spec mirror of `_forwardStack`, kept in lockstep for back/forward. */
	private _rawForward: UniversalSpec[] = [];

	// Quiz score tracking (universal for any quiz-type flow)
	private _quizScore = $state<{ correct: number; wrong: number; answers: boolean[] }>({
		correct: 0,
		wrong: 0,
		answers: []
	});

	/**
	 * Initialize with the root spec
	 */
	constructor(rootSpec?: UniversalSpec) {
		if (rootSpec) {
			this._history = [{
				spec: rootSpec,
				state: { selected: null, formData: {} }
			}];
			this._rawSpecs = [rootSpec];
		}
	}

	/** The raw (un-proxied) spec at the top of history — used to walk safely. */
	private get currentRawSpec(): UniversalSpec | null {
		return this._rawSpecs.length > 0 ? this._rawSpecs[this._rawSpecs.length - 1] : null;
	}

	/**
	 * Get history (reactive)
	 */
	get history(): HistoryEntry[] {
		return this._history;
	}

	/**
	 * Get context (reactive)
	 */
	get context(): Record<string, unknown> {
		return this._context;
	}

	/**
	 * Set context (for external updates)
	 */
	set context(value: Record<string, unknown>) {
		this._context = value;
	}

	/**
	 * Get the current active spec
	 */
	get currentSpec(): UniversalSpec | null {
		return this._history.length > 0 ? this._history[this._history.length - 1].spec : null;
	}

	/**
	 * Get the current state
	 */
	get currentState(): ChainState | null {
		return this._history.length > 0 ? this._history[this._history.length - 1].state : null;
	}

	/**
	 * Check if back navigation is possible (reactive!)
	 */
	get canGoBack(): boolean {
		return this._history.length > 1;
	}

	/**
	 * Get history length for UI display
	 */
	get historyLength(): number {
		return this._history.length;
	}

	/**
	 * Check if forward navigation is possible (reactive!)
	 */
	get canGoForward(): boolean {
		return this._forwardStack.length > 0;
	}

	/**
	 * Get forward stack length for UI display
	 */
	get forwardStackLength(): number {
		return this._forwardStack.length;
	}

	/**
	 * Check if current spec has a chain (more steps to come).
	 * Reads the raw spec (not the proxy) so a cyclic tree can't overflow on
	 * `chain`/`chain_map` access.
	 */
	get hasNextChain(): boolean {
		const current = this.currentRawSpec;
		if (!current) return false;
		return !!(current.chain || current.chain_map);
	}

	/**
	 * True when the current step is terminal (no chain / chain_map left).
	 * At a terminal step {@link advance} returns `null` and the host should
	 * run {@link terminalAction}.
	 */
	get isTerminal(): boolean {
		return !this.hasNextChain;
	}

	/**
	 * Estimate total steps by walking the chain structure
	 * Returns undefined if unknown (dynamic chain_map)
	 */
	get estimatedTotalSteps(): number | undefined {
		// Walk raw specs (not proxies) and identity-guard against cycles.
		const first = this._rawSpecs[0];
		if (!first) return undefined;

		let count = 0;
		let current: UniversalSpec | undefined = first;

		const seen = new Set<UniversalSpec>();
		while (current) {
			// Loop guard: a `chain` that points back into the tree would spin here.
			if (seen.has(current)) return undefined;
			seen.add(current);
			count++;
			// If there's a chain_map, we can't predict the path
			if (current.chain_map) return undefined;
			// Follow linear chain
			current = current.chain as UniversalSpec | undefined;
		}

		return count > 1 ? count : undefined;
	}

	/**
	 * Get quiz score (reactive)
	 */
	get quizScore(): { correct: number; wrong: number; answers: boolean[] } {
		return this._quizScore;
	}

	/**
	 * Record a quiz answer (updates score)
	 */
	recordQuizAnswer(isCorrect: boolean) {
		this._quizScore = {
			correct: this._quizScore.correct + (isCorrect ? 1 : 0),
			wrong: this._quizScore.wrong + (isCorrect ? 0 : 1),
			answers: [...this._quizScore.answers, isCorrect]
		};
	}

	/**
	 * Reset quiz score (call when starting new quiz)
	 */
	resetQuizScore() {
		this._quizScore = { correct: 0, wrong: 0, answers: [] };
	}

	/**
	 * Advance to the next step in the chain based on selection
	 * Returns the next spec if found locally, or null if we need to emit to AI
	 *
	 * @param selection - Current selection (item or array of items)
	 * @param formData - Current form data
	 * @param idField - Custom ID field name (from fields mapping)
	 */
	advance(
		selection: unknown,
		formData: Record<string, unknown> = {},
		idField?: string
	): UniversalSpec | null {
		// Walk the RAW spec, never the `$state`-proxied `currentSpec`: reading
		// `chain`/`chain_map` off the proxy can force Svelte to enumerate a
		// cyclic tree and overflow the stack. The raw ledger is identical content
		// without the proxy.
		const current = this.currentRawSpec;
		if (!current) return null;

		// Save current state before advancing
		this.updateCurrentState(selection, formData);

		// Generate unique context key based on flowId / spec id / title / step.
		const contextKey = this.getContextKey(current);
		this._context = {
			...this._context,
			[`${contextKey}_selection`]: selection,
			[`${contextKey}_formData`]: formData
		};

		// 1. Check for chain_map (selection-based routing)
		if (current.chain_map) {
			const key = this.getSelectionKey(selection, idField);
			if (key && current.chain_map[key]) {
				return this.push(current.chain_map[key]);
			}
		}

		// 2. Fall back to linear chain
		if (current.chain) {
			return this.push(current.chain);
		}

		// End of local chain
		return null;
	}

	/**
	 * At a terminal step (no chain/chain_map left), return the step's declared
	 * `onComplete` FlowAction together with the full namespaced payload the walk
	 * accumulated. The host runs the action (emit / navigate / chat); see the
	 * STEP-sequencer vs action-sequencer note on the class. Returns `null` if
	 * the current step still has further steps (not yet terminal).
	 */
	terminalAction(): TerminalResult | null {
		const current = this.currentRawSpec;
		if (!current || this.hasNextChain) return null;
		return {
			action: current.onComplete,
			payload: this.getAccumulatedContext()
		};
	}

	/**
	 * Go back one step in history (pushes current to forward stack)
	 */
	back(): { spec: UniversalSpec; state: ChainState } | null {
		if (!this.canGoBack) return null;

		// Push current entry to forward stack before removing
		const current = this._history[this._history.length - 1];
		this._forwardStack = [current, ...this._forwardStack];
		// Mirror the raw reference so forward() can restore exact identity.
		const currentRaw = this._rawSpecs[this._rawSpecs.length - 1];
		this._rawForward = [currentRaw, ...this._rawForward];

		// Remove from history (immutable for reactivity)
		this._history = this._history.slice(0, -1);
		this._rawSpecs = this._rawSpecs.slice(0, -1);

		// Return the now-current entry (previous step)
		const prev = this._history[this._history.length - 1];
		return prev ? { spec: prev.spec, state: prev.state } : null;
	}

	/**
	 * Go forward one step (pops from forward stack)
	 */
	forward(): { spec: UniversalSpec; state: ChainState } | null {
		if (!this.canGoForward) return null;

		// Pop from forward stack
		const [next, ...rest] = this._forwardStack;
		this._forwardStack = rest;
		// Pop the mirrored raw reference in lockstep.
		const [nextRaw, ...rawRest] = this._rawForward;
		this._rawForward = rawRest;

		// Push to history
		this._history = [...this._history, next];
		this._rawSpecs = [...this._rawSpecs, nextRaw];

		return { spec: next.spec, state: next.state };
	}

	/**
	 * Reset history with a new root spec
	 */
	reset(spec: UniversalSpec) {
		this._history = [{
			spec,
			state: { selected: null, formData: {} }
		}];
		this._rawSpecs = [spec];
		this._forwardStack = [];
		this._rawForward = [];
		this._context = {};
	}

	/**
	 * Update the state of the current history entry
	 */
	updateCurrentState(selected: unknown, formData: Record<string, unknown>) {
		if (this._history.length > 0) {
			// Create new array with updated last item (immutable for reactivity)
			const updated = [...this._history];
			updated[updated.length - 1] = {
				...updated[updated.length - 1],
				state: { selected, formData }
			};
			this._history = updated;
		}
	}

	/**
	 * Get all accumulated context (for confirmation step)
	 */
	getAccumulatedContext(): Record<string, unknown> {
		return { ...this._context };
	}

	/**
	 * Push a new spec onto the history stack.
	 *
	 * Guards (RFC 13 §8 "Chain depth / loops"):
	 *  - bounds history at {@link MAX_HISTORY_DEPTH} so a malformed tree can't
	 *    grow the stack without limit;
	 *  - refuses to push a spec object that is already in history (a
	 *    `chain`/`chain_map` that points back into the tree), which would
	 *    otherwise let the user walk the same cycle forever.
	 * In either case it returns `null`, surfacing as "end of local chain" to the
	 * caller (same shape as a genuinely terminal step) rather than throwing.
	 */
	private push(spec: UniversalSpec): UniversalSpec | null {
		if (this._history.length >= MAX_HISTORY_DEPTH) {
			console.warn(
				`ChainExecutor: history depth exceeded MAX_HISTORY_DEPTH=${MAX_HISTORY_DEPTH}; refusing to advance.`
			);
			return null;
		}
		// Loop guard: the RAW next spec is already on the stack → cyclic tree.
		// Compared against the non-reactive raw ledger (and BEFORE the spec enters
		// `$state`), so a self-referential / back-pointing tree returns null
		// instead of overflowing Svelte's proxy enumeration.
		if (this._rawSpecs.some((raw) => raw === spec)) {
			console.warn('ChainExecutor: chain/chain_map points back into history (loop); refusing to advance.');
			return null;
		}

		// Track the raw reference first, then the reactive (proxied) entry.
		this._rawSpecs = [...this._rawSpecs, spec];
		// Create new array with new item (immutable for reactivity)
		this._history = [
			...this._history,
			{
				spec,
				state: { selected: null, formData: {} }
			}
		];
		return spec;
	}

	/**
	 * Generate a unique context key for a spec.
	 * Precedence (RFC 13 §5.2): `flowId` → `id` → slug(title) → `step_N`.
	 */
	private getContextKey(spec: UniversalSpec): string {
		// Prefer the explicit flow step id.
		if (spec.flowId) return spec.flowId;

		// Then an explicit spec id.
		if (spec.id) return spec.id;

		// Fall back to sanitized title.
		if (spec.title) {
			return spec.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
		}

		// Last resort: intent + step number.
		return `${spec.intent}_step_${this._history.length}`;
	}

	/**
	 * Helper to extract a string key from selection for chain_map lookup
	 */
	private getSelectionKey(selection: unknown, idField?: string): string | null {
		if (typeof selection === 'string') return selection;
		if (typeof selection === 'number') return String(selection);

		if (typeof selection === 'object' && selection !== null) {
			const obj = selection as Record<string, unknown>;

			// Try custom ID field first
			if (idField && idField in obj) {
				return String(obj[idField]);
			}

			// Then try common ID fields
			if ('id' in obj) return String(obj.id);
			if ('value' in obj) return String(obj.value);
			if ('key' in obj) return String(obj.key);
		}

		return null;
	}
}
