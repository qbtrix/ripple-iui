// static/theme-init.js — Runs in <head> before first paint: dark is the default
// (app.html sets it), and this drops it when the visitor chose light (stored by
// +layout.svelte). A file, not an inline script, so the CSP needs no hash for it.
try {
	if (localStorage.getItem('ripple-theme') === 'light') document.documentElement.classList.remove('dark');
} catch {
	/* storage blocked: stay dark */
}
