// Three-state theme toggle: 0=Simulation (follows sunlight), 1=Light, 2=Dark.
// Sets data-theme on <html> and syncs simState.visualLightMode for canvas.
// The switch itself goes through the shared _toolbar.toggleTheme, which flips
// data-theme and keeps <meta name="theme-color"> on the active canvas color.
import { simState } from './state.js';

let themeMode = 0;
const _themeNames = ['auto', 'light', 'dark'];
const _themeTitles = ['Theme: simulation', 'Theme: light', 'Theme: dark'];

export function updateTheme(themeBtn) {
    const next =
        themeMode === 1 ? 'light' :
        themeMode === 2 ? 'dark' :
        simState.lightOn ? 'light' : 'dark';
    // Two themes, so a different target is exactly one toggle away.
    if (document.documentElement.dataset.theme !== next) _toolbar.toggleTheme();
    simState.visualLightMode = next === 'light';
    if (themeBtn) {
        themeBtn.setAttribute('data-theme', _themeNames[themeMode]);
        themeBtn.title = _themeTitles[themeMode];
    }
}

export function cycleTheme(themeBtn) {
    themeMode = (themeMode + 1) % 3;
    updateTheme(themeBtn);
}
