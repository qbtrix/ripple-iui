/**
 * Manages client-side intent chaining and navigation history.
 * Allows instant transitions between steps without AI roundtrips.
 *
 * V4: Adds forward navigation (browser-like history) and display labels.
 */
export class ChainExecutor {
    // Use $state for reactive history tracking
    _history = $state([]);
    _forwardStack = $state([]);
    _context = $state({});
    // Quiz score tracking (universal for any quiz-type flow)
    _quizScore = $state({
        correct: 0,
        wrong: 0,
        answers: []
    });
    /**
     * Initialize with the root spec
     */
    constructor(rootSpec) {
        if (rootSpec) {
            this._history = [{
                    spec: rootSpec,
                    state: { selected: null, formData: {} }
                }];
        }
    }
    /**
     * Get history (reactive)
     */
    get history() {
        return this._history;
    }
    /**
     * Get context (reactive)
     */
    get context() {
        return this._context;
    }
    /**
     * Set context (for external updates)
     */
    set context(value) {
        this._context = value;
    }
    /**
     * Get the current active spec
     */
    get currentSpec() {
        return this._history.length > 0 ? this._history[this._history.length - 1].spec : null;
    }
    /**
     * Get the current state
     */
    get currentState() {
        return this._history.length > 0 ? this._history[this._history.length - 1].state : null;
    }
    /**
     * Check if back navigation is possible (reactive!)
     */
    get canGoBack() {
        return this._history.length > 1;
    }
    /**
     * Get history length for UI display
     */
    get historyLength() {
        return this._history.length;
    }
    /**
     * Check if forward navigation is possible (reactive!)
     */
    get canGoForward() {
        return this._forwardStack.length > 0;
    }
    /**
     * Get forward stack length for UI display
     */
    get forwardStackLength() {
        return this._forwardStack.length;
    }
    /**
     * Check if current spec has a chain (more steps to come)
     */
    get hasNextChain() {
        const current = this.currentSpec;
        if (!current)
            return false;
        return !!(current.chain || current.chain_map);
    }
    /**
     * Estimate total steps by walking the chain structure
     * Returns undefined if unknown (dynamic chain_map)
     */
    get estimatedTotalSteps() {
        const first = this._history[0]?.spec;
        if (!first)
            return undefined;
        let count = 0;
        let current = first;
        while (current) {
            count++;
            // If there's a chain_map, we can't predict the path
            if (current.chain_map)
                return undefined;
            // Follow linear chain
            current = current.chain;
        }
        return count > 1 ? count : undefined;
    }
    /**
     * Get quiz score (reactive)
     */
    get quizScore() {
        return this._quizScore;
    }
    /**
     * Record a quiz answer (updates score)
     */
    recordQuizAnswer(isCorrect) {
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
    advance(selection, formData = {}, idField) {
        const current = this.currentSpec;
        if (!current)
            return null;
        // Save current state before advancing
        this.updateCurrentState(selection, formData);
        // Generate unique context key based on spec id or step number
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
     * Go back one step in history (pushes current to forward stack)
     */
    back() {
        if (!this.canGoBack)
            return null;
        // Push current entry to forward stack before removing
        const current = this._history[this._history.length - 1];
        this._forwardStack = [current, ...this._forwardStack];
        // Remove from history (immutable for reactivity)
        this._history = this._history.slice(0, -1);
        // Return the now-current entry (previous step)
        const prev = this._history[this._history.length - 1];
        return prev ? { spec: prev.spec, state: prev.state } : null;
    }
    /**
     * Go forward one step (pops from forward stack)
     */
    forward() {
        if (!this.canGoForward)
            return null;
        // Pop from forward stack
        const [next, ...rest] = this._forwardStack;
        this._forwardStack = rest;
        // Push to history
        this._history = [...this._history, next];
        return { spec: next.spec, state: next.state };
    }
    /**
     * Reset history with a new root spec
     */
    reset(spec) {
        this._history = [{
                spec,
                state: { selected: null, formData: {} }
            }];
        this._context = {};
    }
    /**
     * Update the state of the current history entry
     */
    updateCurrentState(selected, formData) {
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
    getAccumulatedContext() {
        return { ...this._context };
    }
    /**
     * Push a new spec onto the history stack
     */
    push(spec) {
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
     * Generate a unique context key for a spec
     */
    getContextKey(spec) {
        // Prefer explicit ID
        if (spec.id)
            return spec.id;
        // Fall back to sanitized title
        if (spec.title) {
            return spec.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        }
        // Last resort: intent + step number
        return `${spec.intent}_step_${this._history.length}`;
    }
    /**
     * Helper to extract a string key from selection for chain_map lookup
     */
    getSelectionKey(selection, idField) {
        if (typeof selection === 'string')
            return selection;
        if (typeof selection === 'number')
            return String(selection);
        if (typeof selection === 'object' && selection !== null) {
            const obj = selection;
            // Try custom ID field first
            if (idField && idField in obj) {
                return String(obj[idField]);
            }
            // Then try common ID fields
            if ('id' in obj)
                return String(obj.id);
            if ('value' in obj)
                return String(obj.value);
            if ('key' in obj)
                return String(obj.key);
        }
        return null;
    }
}
