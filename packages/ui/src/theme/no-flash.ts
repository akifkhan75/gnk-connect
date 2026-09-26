/**
 * Inline this in each app's <head> before any CSS so the right theme is applied
 * before first paint. The storage key must match ThemeProvider's storageKey.
 */
export const noFlashScript = (storageKey = 'gnk-theme') =>
  `(function(){try{var t=localStorage.getItem('${storageKey}')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
