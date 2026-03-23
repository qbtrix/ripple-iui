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
