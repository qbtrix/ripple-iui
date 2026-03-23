import { resolveString } from './expression-resolver.js';
export class EventDispatcher {
    stateManager;
    onEvent;
    constructor(stateManager, onEvent) {
        this.stateManager = stateManager;
        this.onEvent = onEvent;
    }
    async dispatch(handler, context, eventValue) {
        const handlers = Array.isArray(handler) ? handler : [handler];
        for (const h of handlers) {
            await this.dispatchSingle(h, context, eventValue);
        }
    }
    async dispatchSingle(handler, context, eventValue) {
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
    handleSet(handler, context, eventValue) {
        if (!handler.target)
            return;
        let value = handler.value !== undefined ? handler.value : eventValue;
        if (typeof value === 'string') {
            value = resolveString(value, context);
        }
        this.stateManager.set(handler.target, value);
    }
    handleOpen(handler) {
        if (!handler.target)
            return;
        this.stateManager.set(handler.target, true);
    }
    emitExternal(handler, context, eventValue) {
        if (!this.onEvent)
            return;
        const event = { type: handler.action };
        if (handler.url) {
            event.url = resolveString(handler.url, context);
        }
        if (handler.method)
            event.method = handler.method;
        if (handler.headers)
            event.headers = handler.headers;
        if (handler.body) {
            const resolved = {};
            for (const [key, value] of Object.entries(handler.body)) {
                resolved[key] = typeof value === 'string' ? resolveString(value, context) : value;
            }
            event.body = resolved;
        }
        if (handler.target)
            event.target = handler.target;
        if (handler.message) {
            event.message = resolveString(handler.message, context);
        }
        if (handler.variant)
            event.variant = handler.variant;
        if (handler.action === 'emit') {
            let value = handler.value !== undefined ? handler.value : eventValue;
            if (typeof value === 'string')
                value = resolveString(value, context);
            event.name = handler.target;
            event.payload = value;
        }
        this.onEvent(event);
    }
}
export function createEventDispatcher(stateManager, onEvent) {
    return new EventDispatcher(stateManager, onEvent);
}
