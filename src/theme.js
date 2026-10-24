// Three-state theme: Light, Dark, and Sunlight (follows the light toggle,
// so the page goes dark when the cell's lights go out). It starts from the
// system preference, which shared/colophon.js applies; the choice isn't
// stored. The button shows a sun, a moon, or the half-disc for Sunlight.
import { simState } from './state.js';

const _MODES = ['light', 'dark', 'sun'];
const _TITLES = { light: 'Theme: light', dark: 'Theme: dark', sun: 'Theme: follows sunlight' };
let mode = null;

export function updateTheme(btn) {
    if (!mode) mode = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const want = mode === 'sun' ? (simState.lightOn ? 'light' : 'dark') : mode;
    if (document.documentElement.dataset.theme !== want) _colophon.toggleTheme();
    simState.visualLightMode = want === 'light';
    if (btn) {
        btn.dataset.mode = mode;
        btn.title = _TITLES[mode] + ' (T)';
        btn.setAttribute('aria-label', _TITLES[mode]);
    }
}

export function cycleTheme(btn) {
    if (!mode) updateTheme();
    mode = _MODES[(_MODES.indexOf(mode) + 1) % _MODES.length];
    updateTheme(btn);
}

/** The system theme changed (colophon's listener already applied it). */
export function systemTheme(theme, btn) {
    if (mode !== 'sun') mode = theme;
    updateTheme(btn);
}
