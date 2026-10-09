// static/theme-init.js — Runs in <head> before first paint. app.html starts on
// `dark`; this keeps it only when the visitor chose dark (stored by
// +layout.svelte) or, with no choice stored, when the OS prefers dark. A file,
// not an inline script, so the CSP needs no hash for it.
try {
	const stored = localStorage.getItem('ripple-theme');
	const dark = stored ? stored === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
	document.documentElement.classList.toggle('dark', dark);
} catch {
	/* storage blocked: stay dark */
}
