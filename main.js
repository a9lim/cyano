// Entry point — wires canvas, DOM, theme, and the render loop.
// Sparkline sampling at 5 Hz feeds 60-second ring buffers for dashboard gauges.
import { simState, store, histories, updateAnimations } from './src/state.js';
import { updateTheme } from './src/theme.js';
import { showActiveStep, updateDashboard } from './src/dashboard.js';
import { pushSample } from './src/sparkline.js';
import { advanceStep } from './src/reactions/dispatch.js';
import { autoplayTick, protonLeakTick } from './src/autoplay.js';
import { cacheDOMElements, bindEvents } from './src/ui.js';
import Renderer from './src/renderer.js';

// ── Initialize ──
const dom = cacheDOMElements();
Renderer.init(dom.canvas);
bindEvents(dom);

// Canvas click → advanceStep (set by dispatch.js signature)
Renderer.onEnzymeClick = advanceStep;

updateTheme(dom.themeBtn);
Renderer.sidebarInset = 0;
Renderer._sidebarInsetCurrent = 0;
Renderer._sidebarAnimTo = 0;
Renderer._updateLayout();

updateDashboard();
showActiveStep('Ready', 'Click a highlighted molecule to start', null);

// ── Render Loop ──
let lastTime = performance.now();
let sparkTimer = 0;

function mainLoop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    simState.time += dt;
    simState.protonGradient = store.protonGradient;

    updateAnimations(dt);
    autoplayTick(dt);
    protonLeakTick(dt);
    sparkTimer += dt;
    if (sparkTimer > 0.2) {
        sparkTimer = 0;
        pushSample(histories.atp, store.atp / store.totalAtpAdp);
        pushSample(histories.nadh, store.nadh / store.totalNad);
        pushSample(histories.nadph, store.nadph / store.totalNadp);
        pushSample(histories.fadh2, store.fadh2 / store.totalFad);
        pushSample(histories.gradient, Math.min(1, store.protonGradient / 40));
    }
    Renderer.draw(simState);
    requestAnimationFrame(mainLoop);
}

requestAnimationFrame(mainLoop);
