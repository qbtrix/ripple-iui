// src/lib/core/toast-bus.svelte.ts
/**
 * In-process queue for toast events emitted by the EventDispatcher.
 * The Toast widget reads `toasts` and renders a stack; the host's `onEvent`
 * callback (if any) still fires, so external integrations are unchanged.
 */

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastEntry {
  id: string;
  message: string;
  variant: ToastVariant;
  ttlMs: number;
}

export interface PushInput {
  message: string;
  variant?: ToastVariant;
  ttlMs?: number;
}

export class ToastBus {
  toasts = $state<ToastEntry[]>([]);
  private nextId = 0;

  push(input: PushInput): string {
    const id = `t${++this.nextId}`;
    const ttlMs = input.ttlMs ?? 4000;
    const variant = input.variant ?? 'info';
    this.toasts.push({ id, message: input.message, variant, ttlMs });
    if (ttlMs > 0) {
      setTimeout(() => this.dismiss(id), ttlMs);
    }
    return id;
  }

  dismiss(id: string): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  clear(): void {
    this.toasts = [];
  }
}

export function createToastBus(): ToastBus {
  return new ToastBus();
}
