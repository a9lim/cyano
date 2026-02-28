// ─── Biosim entry point ───
import { simState, store, updateAnimations } from './src/state.js';
import { updateTheme } from './src/theme.js';
import { showActiveStep, updateDashboard } from './src/dashboard.js';
import { advanceStep } from './src/reactions/dispatch.js';
import { autoplayTick } from './src/autoplay.js';
import { cacheDOMElements, bindEvents } from './src/ui.js';
import Renderer from './src/renderer.js';

// ── Initialize ──
const dom = cacheDOMElements();
Renderer.init(dom.canvas);
bindEvents(dom);

// Wire click-to-react
Renderer.onEnzymeClick = advanceStep;

// Initialize theme and sidebar inset
updateTheme(dom.themeBtn);
Renderer.sidebarInset = 0;
Renderer._sidebarInsetCurrent = 0;
Renderer._sidebarAnimTo = 0;
Renderer.computeLayout();

// Initial dashboard state
updateDashboard();
showActiveStep('Ready', 'Click a highlighted molecule to start', null);

// ── Render Loop ──
let lastTime = performance.now();

function mainLoop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    simState.time += dt;
    simState.protonGradient = store.protonGradient;

    updateAnimations(dt);
    autoplayTick(dt);
    Renderer.draw(simState);
    requestAnimationFrame(mainLoop);
}

requestAnimationFrame(mainLoop);
