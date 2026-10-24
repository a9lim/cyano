// UI wiring — the colophon, the margin (specimen, lines, conditions, feed),
// organism presets and their specimens, keyboard shortcuts, the about panel,
// info tips and the reference overlay.
import { simState, store, resetState } from './state.js';
import { updateTheme, cycleTheme, systemTheme } from './theme.js';
import { initDashboard, updateDashboard } from './dashboard.js';
import { resetAutoplayTimers } from './autoplay.js';
import { resetFlux } from './flux.js';
import { mapTags } from './mapdraw.js';
import Renderer from './renderer.js';
import Particles from './particles.js';
import { ORGANISMS } from './organisms.js';
import { SPECIMENS, SPECIMEN_OF } from './specimens.js';
import { REFERENCE } from './reference.js';

const _isPhone = () => window.matchMedia('(max-width: 760px)').matches;
const _buzz = (k) => { if (typeof _haptics !== 'undefined') _haptics.trigger(k); };

let reverseMode = false;
window._lumenReverseMode = () => reverseMode;

/** The DOM cache. Only IDs matter. */
export function cacheDOMElements() {
    const $ = (id) => document.getElementById(id);
    return {
        canvas: $('sim-canvas'), caption: $('lu-caption'),
        lightToggle: $('light-toggle'), oxygenToggle: $('oxygen-toggle'), uncouplingToggle: $('uncoupling-toggle'),
        glycToggle: $('glyc-toggle'), pppToggle: $('ppp-toggle'), calvinToggle: $('calvin-toggle'),
        krebsToggle: $('krebs-toggle'), betaoxToggle: $('betaox-toggle'),
        resetBtn: $('reset-btn'), addGlucoseBtn: $('add-glucose-btn'), addFattyAcidBtn: $('add-fatty-acid-btn'),
        themeBtn: $('theme-btn'), menuBtn: $('menu-btn'), closeStats: $('close-stats'), dashboard: $('dashboard'),
        modeBtn: $('mode-btn'), speedUp: $('speed-up'), speedDown: $('speed-down'), speedVal: $('speed-val'),
        organismGroup: $('organism-group'), organismDesc: $('organism-desc'),
        protonsLeaked: $('protons-leaked'), protonGradient: $('proton-gradient'),
        atpBar: $('atp-bar'), atpRatio: $('atp-ratio'), nadhBar: $('nadh-bar'), nadhRatio: $('nadh-ratio'),
        nadphBar: $('nadph-bar'), nadphRatio: $('nadph-ratio'), fadh2Bar: $('fadh2-bar'), fadh2Ratio: $('fadh2-ratio'),
        co2Net: $('co2-net'), o2Net: $('o2-net'), h2oNet: $('h2o-net'),
        krebsEnzyme: $('krebs-enzyme'), krebsReaction: $('krebs-reaction'), krebsYield: $('krebs-yield'),
        krebsTurn: $('krebs-turn'), calvinTurn: $('calvin-turn'), glycolysisRun: $('glycolysis-run'),
        pppRun: $('ppp-run'), betaoxRun: $('betaox-run'),
        atpSubstrate: $('atp-substrate'), atpOxidative: $('atp-oxidative'), atpSourceSub: $('atp-source-sub'), atpSourceOx: $('atp-source-ox'),
        rosProduced: $('ros-produced'), rosScavenged: $('ros-scavenged'), activeROS: $('active-ros'),
        healthBar: $('health-bar'), healthRatio: $('health-ratio'),
        statsVisible: () => document.getElementById('tab-stats').classList.contains('active') && !document.body.classList.contains('lu-closed'),
    };
}

/** Put the specimen's membrane under the microscope and set what it can run. */
function setSpecimen(id) {
    const can = SPECIMENS[id].can;
    simState.specimen = id;
    simState.linearLightEnabled = can.photo;
    simState.cyclicLightEnabled = can.cyclic;
    simState.oxphosEnabled = can.resp;
    Renderer.setSpecimen(id);
}

/** Open or close the margin (a bottom sheet on phones). */
function setMargin(dom, open) {
    document.body.classList.toggle('lu-closed', !open);
    dom.menuBtn.setAttribute('aria-expanded', String(open));
}

export function bindEvents(dom, hooks) {
    initDashboard(dom);
    const touched = () => hooks.onInteract && hooks.onInteract();
    const pathwayRows = { glycolysis: dom.glycToggle, ppp: dom.pppToggle, calvin: dom.calvinToggle, krebs: dom.krebsToggle, betaox: dom.betaoxToggle };

    // ── Organism presets: switches, pools and the specimen ──
    const applyOrganism = (key, quiet) => {
        for (const b of dom.organismGroup.querySelectorAll('[data-org]')) {
            const on = b.dataset.org === key;
            b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1;
        }
        setSpecimen(SPECIMEN_OF[key]);
        if (key === 'custom') {
            simState.lockedPathways = {};
            for (const t of Object.values(pathwayRows)) { t.disabled = false; t.closest('.lu-row').classList.remove('locked'); t.closest('.lu-row').title = ''; }
            dom.organismDesc.textContent = 'Manual control of all pathways, on a membrane with every complex';
            return;
        }
        const org = ORGANISMS[key];
        simState.activeOrganism = key;
        simState.lockedPathways = org.lockedReason || {};
        for (const [pw, t] of Object.entries(pathwayRows)) {
            const reason = org.lockedReason?.[pw];
            t.checked = org.pathways[pw];
            t.dispatchEvent(new Event('change'));
            t.disabled = !org.pathways[pw] && !!reason;
            t.closest('.lu-row').classList.toggle('locked', !!reason);
            t.closest('.lu-row').title = reason || '';
        }
        dom.lightToggle.checked = org.environment.light; dom.lightToggle.dispatchEvent(new Event('change'));
        dom.oxygenToggle.checked = org.environment.oxygen; dom.oxygenToggle.dispatchEvent(new Event('change'));
        resetState();
        store.atp = Math.round(store.totalAtpAdp * org.initialRatios.atp);
        store.nadh = Math.round(store.totalNad * org.initialRatios.nadh);
        store.nadph = Math.round(store.totalNadp * org.initialRatios.nadph);
        store.fadh2 = Math.round(store.totalFad * org.initialRatios.fadh2);
        resetFlux(); Particles.clear(); mapTags.length = 0;
        dom.organismDesc.textContent = org.desc;
        updateDashboard();
        if (!quiet) _buzz('medium');
    };
    hooks.applyOrganism = applyOrganism;
    dom.organismGroup.addEventListener('click', (e) => {
        const b = e.target.closest('[data-org]');
        if (b) { touched(); applyOrganism(b.dataset.org); }
    });
    dom.organismGroup.addEventListener('keydown', (e) => {
        const bs = [...dom.organismGroup.querySelectorAll('[data-org]')], i = bs.indexOf(document.activeElement);
        const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
        if (!d || i < 0) return;
        e.preventDefault(); const n = bs[(i + d + bs.length) % bs.length]; n.focus(); n.click();
    });

    // ── Switches ──
    _forms.bindToggle(dom.lightToggle, v => { simState.lightOn = v; updateTheme(dom.themeBtn); touched(); });
    _forms.bindToggle(dom.oxygenToggle, v => { simState.oxygenAvailable = v; touched(); });
    _forms.bindToggle(dom.glycToggle, v => { simState.glycolysisEnabled = v; touched(); });
    _forms.bindToggle(dom.pppToggle, v => { simState.pppEnabled = v; touched(); });
    _forms.bindToggle(dom.calvinToggle, v => { simState.calvinEnabled = v; touched(); });
    _forms.bindToggle(dom.krebsToggle, v => { simState.krebsEnabled = v; touched(); });
    _forms.bindToggle(dom.betaoxToggle, v => { simState.betaoxEnabled = v; touched(); });
    _forms.bindToggle(dom.uncouplingToggle, v => { simState.uncouplingEnabled = v; touched(); });
    const flip = (el) => { if (el.disabled) return; el.checked = !el.checked; el.dispatchEvent(new Event('change')); };

    // ── Taps run forward or backward ──
    const syncMode = () => {
        dom.modeBtn.textContent = reverseMode ? 'backward' : 'forward';
        dom.modeBtn.setAttribute('aria-pressed', String(reverseMode));
        dom.modeBtn.setAttribute('aria-label', reverseMode ? 'Reverse mode' : 'Forward mode');
        dom.modeBtn.title = (reverseMode ? 'Reverse mode' : 'Forward mode') + ' (X)';
    };
    dom.modeBtn.addEventListener('click', () => { reverseMode = !reverseMode; syncMode(); });
    syncMode();

    // ── Particle speed ──
    const SPEEDS = [0.25, 0.5, 1, 2, 4];
    let speedIdx = 2;
    const setSpeed = (d) => {
        speedIdx = Math.max(0, Math.min(SPEEDS.length - 1, speedIdx + d));
        simState.speed = SPEEDS[speedIdx];
        dom.speedVal.textContent = SPEEDS[speedIdx] + '×';
        showToast('Speed ' + SPEEDS[speedIdx] + '×');
    };
    dom.speedUp.addEventListener('click', () => setSpeed(1));
    dom.speedDown.addEventListener('click', () => setSpeed(-1));

    // ── Reset and feed ──
    dom.resetBtn.addEventListener('click', () => {
        touched();
        resetState(); resetAutoplayTimers(); resetFlux(); Particles.clear(); mapTags.length = 0;
        updateDashboard(); _buzz('warning');
    });
    const addGlucose = () => { touched(); store.glucose++; updateDashboard(); _buzz('light'); };
    const addFat = () => { touched(); store.fattyAcid++; updateDashboard(); _buzz('light'); };
    dom.addGlucoseBtn.addEventListener('click', addGlucose);
    dom.addFattyAcidBtn.addEventListener('click', addFat);

    // ── Margin ──
    setMargin(dom, !_isPhone());
    dom.menuBtn.addEventListener('click', () => setMargin(dom, document.body.classList.contains('lu-closed')));
    dom.closeStats.addEventListener('click', () => setMargin(dom, false));
    const toggleMargin = (force) => setMargin(dom, force === false ? false : document.body.classList.contains('lu-closed'));

    // ── Keyboard ──
    const zoomAt = (f) => Renderer.camera.zoomBy(f, Renderer.W / 2, Renderer.H / 2);
    const shortcuts = [
        { key: 'Space', label: 'Play or pause', group: 'Simulation', action: () => document.querySelector('[data-colophon="play"]')?.click() },
        { key: ',', label: 'Slower particles', group: 'Simulation', action: () => setSpeed(-1) },
        { key: '.', label: 'Faster particles', group: 'Simulation', action: () => setSpeed(1) },
        { key: 'R', label: 'Reset', group: 'Simulation', action: () => dom.resetBtn.click() },
        { key: 'G', label: 'Add glucose', group: 'Simulation', action: addGlucose },
        { key: 'F', label: 'Add fatty acid', group: 'Simulation', action: addFat },
        { key: 'X', label: 'Taps run forward or backward', group: 'Simulation', action: () => dom.modeBtn.click() },
        { key: 'L', label: 'Toggle light', group: 'Conditions', action: () => flip(dom.lightToggle) },
        { key: 'O', label: 'Toggle oxygen', group: 'Conditions', action: () => flip(dom.oxygenToggle) },
        { key: 'U', label: 'Toggle uncoupling', group: 'Conditions', action: () => flip(dom.uncouplingToggle) },
        { key: '1', label: 'Toggle glycolysis', group: 'Lines', action: () => flip(dom.glycToggle) },
        { key: '2', label: 'Toggle pentose phosphate', group: 'Lines', action: () => flip(dom.pppToggle) },
        { key: '3', label: 'Toggle Calvin cycle', group: 'Lines', action: () => flip(dom.calvinToggle) },
        { key: '4', label: 'Toggle Krebs cycle', group: 'Lines', action: () => flip(dom.krebsToggle) },
        { key: '5', label: 'Toggle β-oxidation', group: 'Lines', action: () => flip(dom.betaoxToggle) },
        { key: 'T', label: 'Cycle theme', group: 'View', action: () => cycleTheme(dom.themeBtn) },
        { key: 'S', label: 'Toggle the margin', group: 'View', action: () => toggleMargin() },
        { key: 'Escape', label: 'Close the margin', group: 'View', action: () => toggleMargin(false) },
        { key: '[', label: 'Previous tab', group: 'View', action: () => cycleTab(-1) },
        { key: ']', label: 'Next tab', group: 'View', action: () => cycleTab(1) },
        { key: '=', label: 'Zoom in', group: 'View', action: () => zoomAt(1.25) },
        { key: '-', label: 'Zoom out', group: 'View', action: () => zoomAt(0.8) },
        { key: '0', label: 'Fit', group: 'View', action: () => Renderer.resetView() },
    ];
    initShortcuts(shortcuts, { helpTitle: 'Keyboard shortcuts' });

    // ── Colophon: play, theme, help ──
    const about = initAboutPanel({
        title: 'Lumen',
        lastUpdated: '2026-10-24',
        description: 'Explore how cells make energy. A membrane in cross-section sits above the cell’s carbon network, drawn as a transit map. Each organism puts its own membrane under the microscope. Click an enzyme on the map or a complex in the membrane to run it, or let it play, and watch protons pile up, ATP synthase turn, and the busiest lines thicken.',
        controls: [
            { label: 'Run a reaction', value: 'Click an enzyme on the map or a complex' },
            { label: 'Run it backward', value: 'Right-click (or X on touch)' },
            { label: 'A whole turn', value: 'Click a loop’s name' },
            { label: 'Add substrate', value: 'Glucose (G) / fatty acid (F)' },
            { label: 'Toggle a line', value: 'Margin or keys 1–5' },
            { label: 'Conditions', value: 'Light (L) / oxygen (O) / uncoupling (U)' },
            { label: 'Play / pause', value: 'Space' },
            { label: 'Particle speed', value: ', and .' },
            { label: 'Zoom / pan', value: '= / - / 0, scroll, drag' },
            { label: 'Margin', value: 'S, Esc, and [ / ] for tabs' },
        ],
        shortcuts: shortcuts,
        repo: 'https://github.com/a9lim/lumen',
    });
    const col = _colophon.mount({
        playing: simState.autoPlay,
        onPlay: () => { touched(); simState.autoPlay = !simState.autoPlay; return simState.autoPlay; },
        onHelp: () => about.show(),
        onTheme: (t) => systemTheme(t, dom.themeBtn),
    });
    hooks.setPlaying = (p) => col.setPlaying(p);
    dom.themeBtn.addEventListener('click', () => { cycleTheme(dom.themeBtn); _buzz('selection'); });
    updateTheme(dom.themeBtn);


    // ── Info tips and the reference overlay ──
    registerInfoTips({
        glycolysis: { title: 'Glycolysis', body: 'Splits glucose into 2 pyruvate, netting 2 ATP and 2 NADH. Run backward it is gluconeogenesis.' },
        ppp: { title: 'Pentose phosphate pathway', body: 'Produces NADPH for biosynthesis and antioxidant defense.' },
        calvin: { title: 'Calvin cycle', body: 'Fixes CO₂ into sugar using ATP and NADPH from the light reactions. It runs back along the glycolysis corridor on its own track.' },
        krebs: { title: 'Krebs cycle (TCA)', body: 'Oxidizes acetyl-CoA to CO₂, producing NADH, FADH₂, and GTP. Needs oxygen.' },
        sunlight: { title: 'Sunlight', body: 'Powers photosynthetic electron transport where the membrane has photosystems, and bacteriorhodopsin in the archaeon.' },
        oxygen: { title: 'Ambient O₂', body: 'Enables aerobic respiration. Without it, fermentation regenerates NAD⁺.' },
        protons: { title: 'Proton gradient', body: 'Protons pumped across the membrane drive ATP synthase: four per ATP, twelve per turn.' },
        betaox: { title: 'Beta oxidation', body: 'Breaks fatty acids into acetyl-CoA, yielding FADH₂ and NADH per round. Backward, it is fatty-acid synthesis.' },
        uncoupling: { title: 'Uncoupling', body: 'Leaks protons back across the membrane, dissipating the gradient as heat.' },
        oxStress: { title: 'Oxidative stress', body: 'ROS from electron leak damage cells; SOD, catalase, and GPx scavenge them.' },
    });
    const openReference = initReferenceOverlay(document.getElementById('reference-overlay'), document.getElementById('reference-title'),
        document.getElementById('reference-body'), document.getElementById('reference-close'), REFERENCE);
    bindReferenceTriggers(openReference);
    setMobileHint('hint', 'Tap an enzyme or a complex to run it; X makes taps run backward. Long-press for what it is; pinch to zoom.', '.panel-hint');
}
