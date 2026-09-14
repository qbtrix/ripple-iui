// utils.ts — shared helpers for the component library.
// 2026-09-14: `cn` is the canonical shadcn form again — twMerge(clsx(...)).
// It was clsx alone, which concatenates without resolving Tailwind conflicts,
// so a caller's `w-[220px]`, `z-[100]` or `text-xs` fought the component's base
// class and the winner came down to the order Tailwind happened to emit the
// stylesheet in. tailwind-merge was already a declared dependency and simply
// unused. This removes the need for per-component regex workarounds (the
// `defaultWidth` special case in dialog-content.svelte is deleted with it).
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
