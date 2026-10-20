export const ZOOM_STEPS = [80, 90, 100, 110, 125, 150, 175] as const;
const KEY = 'ui-zoom-pct';

export function loadZoom(): number {
  try {
    const v = Number(localStorage.getItem(KEY));
    if ((ZOOM_STEPS as readonly number[]).includes(v)) return v;
  } catch {
    /* storage unavailable */
  }
  return 100;
}

export function applyZoom(pct: number): void {
  document.documentElement.style.fontSize = `${pct}%`;
  try {
    localStorage.setItem(KEY, String(pct));
  } catch {
    /* storage unavailable */
  }
}
