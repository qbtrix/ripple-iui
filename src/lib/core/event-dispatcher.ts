import type { EventHandler, EventHandlerOrArray } from '../schema/event-handler.js';
import type { StateManager } from './state-manager.svelte.js';
import { resolveString, type ResolverContext } from './expression-resolver.js';
import type { RippleEvent } from '../types.js';

export type OnEventCallback = (event: RippleEvent) => void;

export class EventDispatcher {
  constructor(
    private stateManager: StateManager,
    private onEvent?: OnEventCallback
  ) {}

  async dispatch(
    handler: EventHandlerOrArray,
    context: ResolverContext,
    eventValue?: unknown
  ): Promise<void> {
    const handlers = Array.isArray(handler) ? handler : [handler];
    for (const h of handlers) {
      await this.dispatchSingle(h, context, eventValue);
    }
  }

  private async dispatchSingle(
    handler: EventHandler,
    context: ResolverContext,
    eventValue?: unknown
  ): Promise<void> {
    switch (handler.action) {
      case 'set':
        this.handleSet(handler, context, eventValue);
        break;
      case 'open':
        this.handleOpen(handler);
        break;
      case 'api':
      case 'navigate':
      case 'toast':
      case 'emit':
      case 'pin':
      case 'unpin':
        this.emitExternal(handler, context, eventValue);
        break;
      default:
        console.warn(`EventDispatcher: Unknown action "${handler.action}"`);
    }
  }

  private handleSet(
    handler: EventHandler,
    context: ResolverContext,
    eventValue?: unknown
  ): void {
    if (!handler.target) return;
    let value = handler.value !== undefined ? handler.value : eventValue;
    if (typeof value === 'string') {
      value = resolveString(value, context);
    }
    this.stateManager.set(handler.target, value);
  }

  private handleOpen(handler: EventHandler): void {
    if (!handler.target) return;
    this.stateManager.set(handler.target, true);
  }

  private emitExternal(
    handler: EventHandler,
    context: ResolverContext,
    eventValue?: unknown
  ): void {
    if (!this.onEvent) return;

    const event: RippleEvent = { type: handler.action as RippleEvent['type'] };

    if (handler.url) {
      event.url = resolveString(handler.url, context) as string;
    }
    if (handler.method) event.method = handler.method;
    if (handler.headers) event.headers = handler.headers;
    if (handler.body) {
      const resolved: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(handler.body)) {
        resolved[key] = typeof value === 'string' ? resolveString(value, context) : value;
      }
      event.body = resolved;
    }
    if (handler.target) event.target = handler.target;
    if (handler.message) {
      event.message = resolveString(handler.message, context) as string;
    }
    if (handler.variant) event.variant = handler.variant;

    if (handler.action === 'emit') {
      let value = handler.value !== undefined ? handler.value : eventValue;
      if (typeof value === 'string') value = resolveString(value, context);
      event.name = handler.target;
      event.payload = value;
    }

    this.onEvent(event);
  }
}

export function createEventDispatcher(
  stateManager: StateManager,
  onEvent?: OnEventCallback
): EventDispatcher {
  return new EventDispatcher(stateManager, onEvent);
}
