/**
 * @file state-mutator.ts
 * @description Pure, in-place mutations on a state dict — the data
 * counterpart to `./spec-mutator.ts` (which mutates the UI tree).
 *
 * Widgets bind to state via `{state.<path>}`; mutating state with these
 * helpers (or via the dispatch action chains in `event-dispatcher.ts`)
 * triggers reactive re-renders without touching widget structure.
 *
 * Path syntax: dotted with bracket indexing. Examples:
 *   "filter"                  → state.filter
 *   "user.name"               → state.user.name
 *   "tasks[0].status"         → state.tasks[0].status
 *   "groups[2].members[1].id" → arbitrary nesting
 *
 * Dispatch helper `applyStateOp` reads `payload.action` and routes to
 * the matching mutation; returns `true` when applied, `false` when the
 * action is unknown.
 *
 * Payload shape conventions:
 *   "state_set"       → { path, value }
 *   "state_appended"  → { path, item }
 *   "state_removed"   → { path }
 *   "state_patched"   → { partial }
 */

const SEGMENT = /^([^.\[\]]+)((?:\[\d+\])*)$/;
const INDEX = /\[(\d+)\]/g;

type Token = string | number;

function parsePath(path: string): Token[] {
  if (!path) throw new Error('path is required');
  const out: Token[] = [];
  for (const part of path.split('.')) {
    const m = SEGMENT.exec(part);
    if (!m) throw new Error(`malformed path segment: ${part}`);
    out.push(m[1]);
    const brackets = m[2];
    if (brackets) {
      INDEX.lastIndex = 0;
      let im;
      while ((im = INDEX.exec(brackets)) !== null) {
        out.push(Number(im[1]));
      }
    }
  }
  return out;
}

export function getStatePath(state: Record<string, unknown>, path: string): unknown {
  const tokens = parsePath(path);
  let cursor: unknown = state;
  for (const tok of tokens) {
    if (typeof tok === 'number') {
      if (!Array.isArray(cursor) || tok < 0 || tok >= cursor.length) return undefined;
      cursor = cursor[tok];
    } else {
      if (!cursor || typeof cursor !== 'object' || !(tok in (cursor as object))) return undefined;
      cursor = (cursor as Record<string, unknown>)[tok];
    }
  }
  return cursor;
}

export function setStatePath(
  state: Record<string, unknown>,
  path: string,
  value: unknown
): unknown {
  const tokens = parsePath(path);
  if (tokens.length === 0) throw new Error('empty path');

  let cursor: any = state;
  for (let i = 0; i < tokens.length - 1; i++) {
    const tok = tokens[i];
    if (typeof tok === 'number') {
      if (!Array.isArray(cursor) || tok < 0 || tok >= cursor.length) {
        throw new Error(`list index ${tok} out of range`);
      }
      cursor = cursor[tok];
    } else {
      if (!cursor || typeof cursor !== 'object') {
        throw new Error(`cannot walk through segment ${tok}`);
      }
      let next = cursor[tok];
      if (!next || (typeof next !== 'object' && !Array.isArray(next))) {
        next = {};
        cursor[tok] = next;
      }
      cursor = next;
    }
  }

  const last = tokens[tokens.length - 1];
  if (typeof last === 'number') {
    if (!Array.isArray(cursor) || last < 0 || last >= cursor.length) {
      throw new Error(`list index ${last} out of range`);
    }
    const old = cursor[last];
    cursor[last] = value;
    return old;
  }
  const old = cursor[last];
  cursor[last] = value;
  return old;
}

export function appendStatePath(
  state: Record<string, unknown>,
  path: string,
  item: unknown
): number {
  const tokens = parsePath(path);
  if (tokens.length === 0) throw new Error('empty path');

  let cursor: any = state;
  for (let i = 0; i < tokens.length - 1; i++) {
    const tok = tokens[i];
    if (typeof tok === 'number') {
      if (!Array.isArray(cursor) || tok < 0 || tok >= cursor.length) {
        throw new Error(`cannot walk through index ${tok}`);
      }
      cursor = cursor[tok];
    } else {
      if (!cursor || typeof cursor !== 'object') {
        throw new Error(`cannot walk through ${tok}`);
      }
      let next = cursor[tok];
      if (!next || (typeof next !== 'object' && !Array.isArray(next))) {
        next = {};
        cursor[tok] = next;
      }
      cursor = next;
    }
  }

  const last = tokens[tokens.length - 1];
  if (typeof last === 'number') {
    throw new Error('append_path target must be a key, not an index');
  }
  let target = cursor[last];
  if (target == null) {
    target = [];
    cursor[last] = target;
  }
  if (!Array.isArray(target)) {
    throw new Error(`cannot append to non-list at ${path}`);
  }
  target.push(item);
  return target.length;
}

export function removeStatePath(state: Record<string, unknown>, path: string): unknown {
  const tokens = parsePath(path);
  if (tokens.length === 0) throw new Error('empty path');

  let cursor: any = state;
  for (let i = 0; i < tokens.length - 1; i++) {
    const tok = tokens[i];
    if (typeof tok === 'number') {
      if (!Array.isArray(cursor) || tok < 0 || tok >= cursor.length) {
        throw new Error(`cannot walk through index ${tok}`);
      }
      cursor = cursor[tok];
    } else {
      if (!cursor || typeof cursor !== 'object' || !(tok in cursor)) {
        throw new Error(`path not found at segment ${tok}`);
      }
      cursor = cursor[tok];
    }
  }

  const last = tokens[tokens.length - 1];
  if (typeof last === 'number') {
    if (!Array.isArray(cursor) || last < 0 || last >= cursor.length) {
      throw new Error(`list index ${last} out of range`);
    }
    return cursor.splice(last, 1)[0];
  }
  if (!cursor || typeof cursor !== 'object' || !(last in cursor)) {
    throw new Error(`key ${last} not in state`);
  }
  const old = cursor[last];
  delete cursor[last];
  return old;
}

export function patchState(
  state: Record<string, unknown>,
  partial: Record<string, unknown>
): Record<string, unknown> {
  if (!partial || typeof partial !== 'object' || Array.isArray(partial)) {
    throw new Error('patch target must be a dict');
  }
  const prev: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(partial)) {
    prev[k] = state[k];
    state[k] = v;
  }
  return prev;
}

// ---------------------------------------------------------------------------
// Dispatch by action name
// ---------------------------------------------------------------------------

/**
 * Apply a state-mutation payload to `state` in place. Returns `true`
 * when the action was recognised and applied; `false` when unknown
 * (caller decides — typically refetch).
 */
export function applyStateOp(
  state: Record<string, unknown>,
  payload: Record<string, unknown>
): boolean {
  const action = payload.action;
  switch (action) {
    case 'state_set':
      setStatePath(state, String(payload.path), payload.value);
      return true;
    case 'state_appended':
      appendStatePath(state, String(payload.path), payload.item);
      return true;
    case 'state_removed':
      removeStatePath(state, String(payload.path));
      return true;
    case 'state_patched':
      patchState(state, (payload.partial as Record<string, unknown>) ?? {});
      return true;
    default:
      return false;
  }
}
