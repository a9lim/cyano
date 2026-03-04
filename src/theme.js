// Three-state theme toggle: 0=Simulation (follows sunlight), 1=Light, 2=Dark.
// Sets data-theme on <html> and syncs simState.visualLightMode for canvas.
import { simState } from './state.js';

let themeMode = 0;
const _themeNames = ['auto', 'light', 'dark'];
const _themeTitles = ['Theme: Simulation', 'Theme: Light', 'Theme: Dark'];

export function updateTheme(themeBtn) {
    document.documentElement.dataset.theme =
        themeMode === 1 ? 'light' :
        themeMode === 2 ? 'dark' :
        simState.lightOn ? 'light' : 'dark';
    simState.visualLightMode = document.documentElement.dataset.theme === 'light';
    if (themeBtn) {
        themeBtn.setAttribute('data-theme', _themeNames[themeMode]);
        themeBtn.title = _themeTitles[themeMode];
    }
}

export function cycleTheme(themeBtn) {
    themeMode = (themeMode + 1) % 3;
    updateTheme(themeBtn);
}
