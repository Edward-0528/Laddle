// ---------------------------------------------------------------------------
// Small runtime fixes for phones, installed once from main.tsx.
// ---------------------------------------------------------------------------

const RELOAD_KEY = 'ladle.chunkReloadAt';

/**
 * After a deploy, a phone that kept the old page open asks for build files
 * that no longer exist. Vite fires `vite:preloadError` when a lazy page or
 * its CSS fails to load; reload once to pick up the new build instead of
 * showing an unstyled or broken screen. Guarded so it can't loop.
 */
function reloadOnStaleBuild() {
  window.addEventListener('vite:preloadError', (event) => {
    let last = 0;
    try { last = Number(sessionStorage.getItem(RELOAD_KEY) || 0); } catch { /* ignore */ }
    if (Date.now() - last < 15_000) return; // already tried: let the error show
    event.preventDefault();
    try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* ignore */ }
    window.location.reload();
  });
}

/**
 * Keep the focused text field visible above the on-screen keyboard. Android
 * resizes the page (see interactive-widget in index.html) and iOS pans; in
 * both cases we nudge the field into the middle once the keyboard is up.
 */
function keepFocusedFieldVisible() {
  const isField = (el: Element | null): el is HTMLElement =>
    !!el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|range|color|file)$/i.test((el as HTMLInputElement).type)));

  const reveal = () => {
    const el = document.activeElement;
    if (isField(el)) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  const isTouch = () => window.matchMedia('(pointer: coarse)').matches;

  document.addEventListener('focusin', (e) => {
    if (!isTouch() || !isField(e.target as Element)) return;
    // Wait for the keyboard animation to finish
    window.setTimeout(reveal, 320);
  });
  window.visualViewport?.addEventListener('resize', () => { if (isTouch()) window.setTimeout(reveal, 60); });
}

export function installMobileFixes() {
  reloadOnStaleBuild();
  keepFocusedFieldVisible();
}
