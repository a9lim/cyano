// UI wiring — DOM cache, event binding, sidebar, organism presets,
// intro screen, keyboard shortcuts, and info tip registration.
import { simState, store, resetState } from './state.js';
import { updateTheme, cycleTheme } from './theme.js';
import { initDashboard, updateDashboard } from './dashboard.js';
import { resetAutoplayTimers } from './autoplay.js';
import Renderer from './renderer.js';
import Particles from './particles.js';
import { ORGANISMS } from './organisms.js';
import { REFERENCE } from './reference.js';

const _SIDEBAR_W = 374; // panel-w(350) + right gap(24)
function _isMobile() { return window.innerWidth <= 900; }

/** Build the DOM element cache. Only IDs matter — class names/hierarchy can change freely. */
export function cacheDOMElements() {
    return {
        canvas: document.getElementById('sim-canvas'),
        lightToggle: document.getElementById('light-toggle'),
        oxygenToggle: document.getElementById('oxygen-toggle'),
        glycToggle: document.getElementById('glyc-toggle'),
        pppToggle: document.getElementById('ppp-toggle'),
        calvinToggle: document.getElementById('calvin-toggle'),
        krebsToggle: document.getElementById('krebs-toggle'),
        betaoxToggle: document.getElementById('betaox-toggle'),
        autoplayToggle: document.getElementById('autoplay-toggle'),
        uncouplingToggle: document.getElementById('uncoupling-toggle'),
        protonsLeaked: document.getElementById('protons-leaked'),
        resetBtn: document.getElementById('reset-btn'),
        addGlucoseBtn: document.getElementById('add-glucose-btn'),
        addFattyAcidBtn: document.getElementById('add-fatty-acid-btn'),
        themeBtn: document.getElementById('theme-btn'),
        menuBtn: document.getElementById('menu-btn'),
        closeStats: document.getElementById('close-stats'),
        dashboard: document.getElementById('dashboard'),
        introScreen: document.getElementById('intro-screen'),
        introStart: document.getElementById('intro-start'),
        atpBar: document.getElementById('atp-bar'), atpRatio: document.getElementById('atp-ratio'),
        nadhBar: document.getElementById('nadh-bar'), nadhRatio: document.getElementById('nadh-ratio'),
        nadphBar: document.getElementById('nadph-bar'), nadphRatio: document.getElementById('nadph-ratio'),
        fadh2Bar: document.getElementById('fadh2-bar'), fadh2Ratio: document.getElementById('fadh2-ratio'),
        protonGradient: document.getElementById('proton-gradient'),
        co2Net: document.getElementById('co2-net'),
        o2Net: document.getElementById('o2-net'),
        h2oNet: document.getElementById('h2o-net'),
        krebsEnzyme: document.getElementById('krebs-enzyme'), krebsReaction: document.getElementById('krebs-reaction'),
        krebsYield: document.getElementById('krebs-yield'), krebsTurn: document.getElementById('krebs-turn'),
        calvinTurn: document.getElementById('calvin-turn'), glycolysisRun: document.getElementById('glycolysis-run'),
        pppRun: document.getElementById('ppp-run'),
        betaoxRun: document.getElementById('betaox-run'),
        atpSubstrate: document.getElementById('atp-substrate'),
        atpOxidative: document.getElementById('atp-oxidative'),
        atpSourceSub: document.getElementById('atp-source-sub'),
        atpSourceOx: document.getElementById('atp-source-ox'),
        organismSelect: document.getElementById('organism-select'),
        organismDesc: document.getElementById('organism-desc'),
        rosProduced: document.getElementById('ros-produced'),
        rosScavenged: document.getElementById('ros-scavenged'),
        activeROS: document.getElementById('active-ros'),
        healthBar: document.getElementById('health-bar'),
        healthRatio: document.getElementById('health-ratio'),
    };
}

function toggleSidebar(dom, forceClose) {
    var isOpen;
    if (forceClose) {
        _toolbar.closeSidebar(dom.menuBtn, dom.dashboard);
        isOpen = false;
    } else {
        isOpen = _toolbar.toggleSidebar(dom.menuBtn, dom.dashboard);
    }
    // Push canvas layout on desktop; mobile uses bottom sheet overlay
    Renderer.sidebarInset = (isOpen && !_isMobile()) ? _SIDEBAR_W : 0;
}

/** Wire all DOM events: toggles, presets, reset, theme, sidebar, shortcuts, info tips. */
export function bindEvents(dom) {
    initDashboard(dom);

    // ── Pathway & environment toggles ──
    _forms.bindToggle(dom.lightToggle, v => { simState.lightOn = v; updateTheme(dom.themeBtn); });
    _forms.bindToggle(dom.oxygenToggle, v => { simState.oxygenAvailable = v; });
    _forms.bindToggle(dom.glycToggle, v => { simState.glycolysisEnabled = v; });
    _forms.bindToggle(dom.pppToggle, v => { simState.pppEnabled = v; });
    _forms.bindToggle(dom.calvinToggle, v => { simState.calvinEnabled = v; });
    _forms.bindToggle(dom.krebsToggle, v => { simState.krebsEnabled = v; });
    if (dom.betaoxToggle) _forms.bindToggle(dom.betaoxToggle, v => { simState.betaoxEnabled = v; });
    if (dom.autoplayToggle) _forms.bindToggle(dom.autoplayToggle, v => { simState.autoPlay = v; });
    if (dom.uncouplingToggle) _forms.bindToggle(dom.uncouplingToggle, v => { simState.uncouplingEnabled = v; });

    // ── Organism preset selector ──
    dom.organismSelect?.addEventListener('change', e => {
        const key = e.target.value;
        if (key === 'custom') {
            simState.lockedPathways = {};
            const pathwayMap = {
                glycolysis: dom.glycToggle,
                ppp: dom.pppToggle,
                calvin: dom.calvinToggle,
                krebs: dom.krebsToggle,
                betaox: dom.betaoxToggle,
            };
            for (const [pw, toggle] of Object.entries(pathwayMap)) {
                toggle.disabled = false;
                toggle.closest('.ctrl-row')?.classList.remove('locked');
            }
            dom.organismDesc.textContent = 'Manual control of all pathways';
            return;
        }
        const org = ORGANISMS[key];
        if (!org) return;

        simState.activeOrganism = key;
        simState.lockedPathways = org.lockedReason || {};

        // Apply pathway enables + lock state
        const pathwayMap = {
            glycolysis: dom.glycToggle,
            ppp: dom.pppToggle,
            calvin: dom.calvinToggle,
            krebs: dom.krebsToggle,
            betaox: dom.betaoxToggle,
        };
        for (const [pw, toggle] of Object.entries(pathwayMap)) {
            const enabled = org.pathways[pw];
            toggle.checked = enabled;
            toggle.dispatchEvent(new Event('change'));
            toggle.disabled = !enabled && !!org.lockedReason?.[pw];
            toggle.closest('.ctrl-row')?.classList.toggle('locked', !!org.lockedReason?.[pw]);
        }

        dom.lightToggle.checked = org.environment.light;
        dom.lightToggle.dispatchEvent(new Event('change'));
        dom.oxygenToggle.checked = org.environment.oxygen;
        dom.oxygenToggle.dispatchEvent(new Event('change'));

        // Reset pools to organism-specific initial ratios
        resetState();
        store.atp = Math.round(store.totalAtpAdp * org.initialRatios.atp);
        store.nadh = Math.round(store.totalNad * org.initialRatios.nadh);
        store.nadph = Math.round(store.totalNadp * org.initialRatios.nadph);
        store.fadh2 = Math.round(store.totalFad * org.initialRatios.fadh2);

        dom.organismDesc.textContent = org.desc;
        _haptics.trigger('medium');
    });

    // ── Reset ──
    dom.resetBtn.addEventListener('click', () => {
        resetState();
        resetAutoplayTimers();
        Particles.electrons.length = 0; Particles.protons.length = 0; Particles.photons.length = 0; Renderer.metabPulse = {};
        updateDashboard();
        _haptics.trigger('warning');
    });

    // ── Add substrates ──
    if (dom.addGlucoseBtn) dom.addGlucoseBtn.addEventListener('click', () => { store.glucose++; updateDashboard(); _haptics.trigger('light'); });
    if (dom.addFattyAcidBtn) dom.addFattyAcidBtn.addEventListener('click', () => { store.fattyAcid++; updateDashboard(); _haptics.trigger('light'); });

    // ── Theme ──
    if (dom.themeBtn) dom.themeBtn.addEventListener('click', () => { cycleTheme(dom.themeBtn); _haptics.trigger('selection'); });

    // ── Sidebar ──
    _toolbar.initSidebar(dom.menuBtn, dom.dashboard, dom.closeStats, {
        onToggle(isOpen) {
            Renderer.sidebarInset = (isOpen && !_isMobile()) ? _SIDEBAR_W : 0;
        }
    });

    // ── Intro screen ──
    _intro.init(dom.introScreen, dom.introStart);

    // ── Keyboard shortcuts (via shared-shortcuts.js) ──
    const toggleCheck = (el, setter) => {
        el.checked = !el.checked;
        setter(el.checked);
    };

    const SPEEDS = [0.25, 0.5, 1, 2, 4];
    let speedIdx = 2; // default 1×

    const cycleSpeed = () => {
        speedIdx = (speedIdx + 1) % SPEEDS.length;
        simState.speed = SPEEDS[speedIdx];
        showToast('Speed ' + SPEEDS[speedIdx] + '\u00d7');
    };
    const decycleSpeed = () => {
        speedIdx = (speedIdx - 1 + SPEEDS.length) % SPEEDS.length;
        simState.speed = SPEEDS[speedIdx];
        showToast('Speed ' + SPEEDS[speedIdx] + '\u00d7');
    };

    function cycleTab(dir) {
        var btns = document.querySelectorAll('.tab-btn');
        var idx = 0;
        btns.forEach(function(b, i) { if (b.classList.contains('active')) idx = i; });
        var next = (idx + dir + btns.length) % btns.length;
        btns[next].click();
    }

    const canvas = dom.canvas;
    const zoomIn    = () => Renderer.camera.zoomBy(1.25, canvas.width / 2, canvas.height / 2);
    const zoomOut   = () => Renderer.camera.zoomBy(0.8, canvas.width / 2, canvas.height / 2);
    const zoomReset = () => {
        Renderer._updateLayout();
        const mz = Renderer._minZoom();
        Renderer.camera.reset(Renderer.W / (2 * mz), Renderer.H / (2 * mz), mz);
    };

    const shortcuts = [
        { key: 'Space', label: 'Toggle autoplay', group: 'Simulation', action: () => {
            if (dom.autoplayToggle) toggleCheck(dom.autoplayToggle, v => simState.autoPlay = v);
        }},
        { key: ',', label: 'Slow down', group: 'Simulation', action: decycleSpeed },
        { key: '.', label: 'Speed up', group: 'Simulation', action: cycleSpeed },
        { key: 'R', label: 'Reset simulation', group: 'Simulation', action: () => dom.resetBtn.click() },
        { key: 'G', label: 'Add glucose', group: 'Simulation', action: () => { store.glucose++; updateDashboard(); } },
        { key: 'F', label: 'Add fatty acid', group: 'Simulation', action: () => { store.fattyAcid++; updateDashboard(); } },
        { key: 'L', label: 'Toggle light', group: 'Environment', action: () => {
            toggleCheck(dom.lightToggle, v => { simState.lightOn = v; updateTheme(dom.themeBtn); });
        }},
        { key: 'O', label: 'Toggle oxygen', group: 'Environment', action: () => {
            toggleCheck(dom.oxygenToggle, v => simState.oxygenAvailable = v);
        }},
        { key: 'U', label: 'Toggle uncoupling', group: 'Environment', action: () => {
            if (dom.uncouplingToggle) toggleCheck(dom.uncouplingToggle, v => simState.uncouplingEnabled = v);
        }},
        { key: '1', label: 'Toggle glycolysis', group: 'Pathways', action: () => {
            toggleCheck(dom.glycToggle, v => simState.glycolysisEnabled = v);
        }},
        { key: '2', label: 'Toggle PPP', group: 'Pathways', action: () => {
            toggleCheck(dom.pppToggle, v => simState.pppEnabled = v);
        }},
        { key: '3', label: 'Toggle Calvin', group: 'Pathways', action: () => {
            toggleCheck(dom.calvinToggle, v => simState.calvinEnabled = v);
        }},
        { key: '4', label: 'Toggle Krebs', group: 'Pathways', action: () => {
            toggleCheck(dom.krebsToggle, v => simState.krebsEnabled = v);
        }},
        { key: '5', label: 'Toggle beta oxidation', group: 'Pathways', action: () => {
            if (dom.betaoxToggle) toggleCheck(dom.betaoxToggle, v => simState.betaoxEnabled = v);
        }},
        { key: 'X', label: 'Toggle forward/reverse', group: 'Simulation', action: () => {} },
        { key: 'T', label: 'Toggle theme', group: 'View', action: () => cycleTheme(dom.themeBtn) },
        { key: 'S', label: 'Toggle sidebar', group: 'View', action: () => toggleSidebar(dom) },
        { key: 'Escape', label: 'Close sidebar', group: 'View', action: () => toggleSidebar(dom, true) },
        { key: '[', label: 'Previous tab', group: 'View', action: () => cycleTab(-1) },
        { key: ']', label: 'Next tab', group: 'View', action: () => cycleTab(1) },
        { key: '=', label: 'Zoom in', group: 'View', action: zoomIn },
        { key: '-', label: 'Zoom out', group: 'View', action: zoomOut },
        { key: '0', label: 'Reset zoom', group: 'View', action: zoomReset },
    ];

    if (typeof initShortcuts === 'function') {
        initShortcuts(shortcuts, { helpTitle: 'Keyboard Shortcuts' });
    }

    if (typeof initAboutPanel === 'function') {
        initAboutPanel({
            title: 'Cyano',
            description: 'Explore how cells produce energy. Click enzyme labels to advance reactions step by step, toggle sunlight and oxygen to shift between photosynthesis, respiration, and fermentation, and watch cofactor pools and the proton gradient respond in real time.',
            controls: [
                { label: 'Advance reaction', value: 'Click enzyme label on canvas' },
                { label: 'Reverse reaction', value: 'Right-click bidirectional enzyme' },
                { label: 'Add substrate', value: 'Glucose (G) / Fatty Acid (F)' },
                { label: 'Toggle pathway', value: 'Sidebar toggles or keys 1\u20135' },
                { label: 'Toggle environment', value: 'Light (L) / Oxygen (O) / Uncoupling (U)' },
                { label: 'Auto-play', value: 'Space bar or sidebar toggle' },
                { label: 'Speed', value: ', / . to decrease / increase' },
                { label: 'Reset', value: 'R' },
                { label: 'Zoom / pan', value: '= / - / 0, scroll wheel, drag' },
                { label: 'Tabs', value: '[ / ] to cycle sidebar tabs' },
            ],
            shortcuts: shortcuts,
            repo: 'https://github.com/a9lim/cyano',
        });
    }

    // ── Info tips (via shared-info.js) — short summaries ──
    const infoData = {
        glycolysis: { title: 'Glycolysis', body: 'Splits glucose into 2 pyruvate, netting 2 ATP and 2 NADH.' },
        ppp: { title: 'Pentose Phosphate Pathway', body: 'Produces NADPH for biosynthesis and antioxidant defense.' },
        calvin: { title: 'Calvin Cycle', body: 'Fixes CO\u2082 into sugar using ATP and NADPH from the light reactions.' },
        krebs: { title: 'Krebs Cycle (TCA)', body: 'Oxidizes acetyl-CoA to CO\u2082, producing NADH, FADH\u2082, and GTP.' },
        sunlight: { title: 'Sunlight', body: 'Powers photosynthetic electron transport: water splitting, O\u2082 release, NADPH production.' },
        oxygen: { title: 'Ambient O\u2082', body: 'Enables aerobic respiration. Without it, fermentation regenerates NAD\u207A.' },
        autoplay: { title: 'Auto-Play', body: 'Continuously fires reactions in priority order, mimicking cellular steady state.' },
        protons: { title: 'Proton Gradient', body: 'H\u207A gradient across the membrane drives ATP synthase (4 H\u207A per ATP).' },
        betaox: { title: 'Beta Oxidation', body: 'Breaks fatty acids into acetyl-CoA, yielding FADH\u2082 and NADH per round.' },
        uncoupling: { title: 'Uncoupling Proteins', body: 'Leak protons across the membrane, dissipating the gradient as heat.' },
        oxStress: { title: 'Oxidative Stress', body: 'ROS from electron leak damage cells; SOD, catalase, and GPx scavenge them.' },
    };

    registerInfoTips(infoData);

    // ── Reference overlay (Shift+click / long-press on info buttons) ──
    const openReference = initReferenceOverlay(
        document.getElementById('reference-overlay'),
        document.getElementById('reference-title'),
        document.getElementById('reference-body'),
        document.getElementById('reference-close'),
        REFERENCE
    );
    bindReferenceTriggers(openReference);
}
