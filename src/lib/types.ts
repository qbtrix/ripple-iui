/**
 * @file types.ts
 * @description Shared runtime types exchanged with the host application.
 * @changes
 *   - Initial RippleEvent type for host-delegated actions
 *   - Added RippleEventResult for async chaining of `api` success / error
 */

export type RippleEvent = {
  type: 'api' | 'navigate' | 'toast' | 'emit' | 'pin' | 'unpin';
  url?: string;
  method?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  target?: string;
  message?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  name?: string;
  payload?: unknown;
};

/**
 * Result returned by an `onEvent` host callback. Lets the dispatcher chain
 * `on_success` / `on_error` continuations for `api` actions.
 *
 * Hosts returning `void` are treated as a silent success — no error branch
 * fires, no response body is written. This preserves backwards compatibility
 * with hosts written before async chaining existed.
 */
export type RippleEventResult = {
  ok: boolean;
  data?: unknown;
  error?: {
    message: string;
    status?: number;
    body?: unknown;
  };
};
