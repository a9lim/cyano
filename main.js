// Entry point — wires the engine, the scene and the margin, then runs one
// loop: animations, autoplay and leak ticks, flux, particles, 5 Hz sparkline
// samples, the draw, and the live caption.
//
// Lumen opens on a living frame: the cyanobacterium, already running, after
// a silent warm-up so the lines carry flux and the lumen holds protons from
// the first frame. Under reduced motion it opens on that frame held still,
// until the first interaction.
import { simState, store, histories, updateAnimations, pushSample } from './src/state.js';
import { updateDashboard } from './src/dashboard.js';
import { advanceStep, onReaction } from './src/reactions/dispatch.js';
import { autoplayTick, protonLeakTick } from './src/autoplay.js';
import { cacheDOMElements, bindEvents } from './src/ui.js';
import { recordReaction, updateFlux } from './src/flux.js';
import { lineState } from './src/mapdraw.js';
import { LINES } from './src/maplayout.js';
import { Membrane } from './src/membrane.js';
import Renderer from './src/renderer.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const dom = cacheDOMElements();
onReaction(recordReaction);
Renderer.init(dom.canvas);
Renderer.onEnzymeClick = advanceStep;

let frozen = false;
const hooks = { onInteract: () => { frozen = false; } };
Renderer.onInteract = hooks.onInteract;
simState.autoPlay = !reduced;
bindEvents(dom, hooks);
hooks.applyOrganism('cyanobacterium', true);

// ATP synthase's turning rate, from the ATP it makes (a third of a turn each)
let turnRate = 0, lastOx = 0;
function trackTurns(dt) {
    if (store.atpOxidative < lastOx) { lastOx = store.atpOxidative; turnRate = 0; }
    turnRate += ((store.atpOxidative - lastOx) / 3 / dt - turnRate) * (1 - Math.exp(-dt / 3));
    lastOx = store.atpOxidative;
}

function sample() {
    pushSample(histories.atp, store.atp / store.totalAtpAdp);
    pushSample(histories.nadh, store.nadh / store.totalNad);
    pushSample(histories.nadph, store.nadph / store.totalNadp);
    pushSample(histories.fadh2, store.fadh2 / store.totalFad);
    pushSample(histories.gradient, Math.min(1, store.protonGradient / 40));
}

/** Run the model silently for a while; chains land at once and nothing is drawn. */
function warm(seconds) {
    const was = simState.autoPlay;
    simState.autoPlay = true;
    Renderer.warm = true;
    const dt = 1 / 30;
    for (let t = 0; t < seconds; t += dt) {
        simState.time += dt;
        updateAnimations(dt); autoplayTick(dt); protonLeakTick(dt); updateFlux(dt); trackTurns(dt);
        if (seconds - t < 60 && Math.round(t * 30) % 6 === 0) sample();
    }
    simState.autoPlay = was;
    Renderer.endWarm();
    updateDashboard();
}
warm(24);
frozen = reduced;

new ResizeObserver(() => requestAnimationFrame(() => Renderer.resize())).observe(document.getElementById('sim-container'));
new MutationObserver(() => { Renderer.themeChanged(); updateDashboard(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// ── Caption ──
const setCaption = _colophon.caption(dom.caption, 400);
function captionText() {
    const spec = Membrane.spec;
    let busiest = null;
    for (const id of Object.keys(LINES)) {
        const st = lineState(id);
        if (st && st.on && (!busiest || st.flux > busiest.flux)) busiest = st;
    }
    const g = store.protonGradient, turns = turnRate;
    if (Renderer.narrow) {
        return `${spec.name}, ${simState.lightOn ? 'light' : 'dark'}${simState.oxygenAvailable ? '' : ', no O₂'}${frozen ? ', still' : simState.autoPlay ? '' : ', paused'}. `
            + (busiest && busiest.flux > 0.02 ? `${busiest.name} ${Math.round(busiest.flux * 60)}/min. ` : '')
            + `${g} H⁺ ${spec.where}` + (Membrane.pos.atpSyn ? `; ATP synthase ${turns.toFixed(1)} turns/s.` : '.');
    }
    let s = `${spec.name} ${simState.lightOn ? 'in the light' : 'in the dark'}${simState.oxygenAvailable ? '' : ', without oxygen'}${frozen ? ', held still' : simState.autoPlay ? '' : ', paused'}: ${spec.say}. `;
    s += busiest && busiest.flux > 0.02 ? `${busiest.name} carries the most carbon, ${Math.round(busiest.flux * 60)} reactions a minute. ` : 'No line is running. ';
    s += `${g} proton${g === 1 ? '' : 's'} ${spec.where}`;
    s += Membrane.pos.atpSyn ? `; ATP synthase turns ${turns < 0.05 ? 'not at all' : turns.toFixed(1) + ' times a second'}.` : '.';
    return s;
}

// ── Loop ──
let last = performance.now(), sparkT = 0, ready = false;
Promise.race([_loadTextFonts(), new Promise(r => setTimeout(r, 1500))]).then(() => { ready = true; Renderer.themeChanged(); });

function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (!frozen) {
        simState.time += dt;
        updateAnimations(dt);
        autoplayTick(dt);
        protonLeakTick(dt);
        updateFlux(dt);
        if (dt > 0) trackTurns(dt);
        Renderer.update(dt);
        sparkT += dt;
        if (sparkT > 0.2) { sparkT = 0; sample(); }
    }
    if (ready) {
        Renderer.draw(frozen ? 0 : dt);
        setCaption(captionText());
    }
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
