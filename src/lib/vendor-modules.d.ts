// src/lib/vendor-modules.d.ts
// Created 2026-07-08: ambient declarations for third-party packages that ship no
// TypeScript types. Qr.svelte (`qrcode-svg`) and GanttChart.svelte (`frappe-gantt`)
// both `await import(...)` these at runtime; under `strict`/`noImplicitAny`
// svelte-check flagged the untyped modules. There is no @types package for either,
// so we declare them here (`any`) instead — an offline, in-repo fix.

declare module 'qrcode-svg';
declare module 'frappe-gantt';
