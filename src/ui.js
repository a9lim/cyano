// ─── UI: DOM cache, event binding, sidebar, intro ───
import { simState, store, resetState } from './state.js';
import { updateTheme, cycleTheme } from './theme.js';
import { initDashboard, updateDashboard } from './dashboard.js';
import { resetAutoplayTimers } from './autoplay.js';
import Renderer from './renderer.js';
import Particles from './particles.js';

const _SIDEBAR_W = 374; // panel-w(350) + gap(24)
function _isMobile() { return window.innerWidth <= 900; }

export function cacheDOMElements() {
    return {
        canvas: document.getElementById('sim-canvas'),
        lightToggle: document.getElementById('light-toggle'),
        oxygenToggle: document.getElementById('oxygen-toggle'),
        glycToggle: document.getElementById('glyc-toggle'),
        pppToggle: document.getElementById('ppp-toggle'),
        calvinToggle: document.getElementById('calvin-toggle'),
        krebsToggle: document.getElementById('krebs-toggle'),
        autoplayToggle: document.getElementById('autoplay-toggle'),
        resetBtn: document.getElementById('reset-btn'),
        addGlucoseBtn: document.getElementById('add-glucose-btn'),
        themeBtn: document.getElementById('theme-btn'),
        menuBtn: document.getElementById('menu-btn'),
        closeStats: document.getElementById('close-stats'),
        dashboard: document.getElementById('dashboard'),
        introScreen: document.getElementById('intro-screen'),
        introStart: document.getElementById('intro-start'),
        // Ratio Bars
        atpBar: document.getElementById('atp-bar'), atpRatio: document.getElementById('atp-ratio'),
        nadhBar: document.getElementById('nadh-bar'), nadhRatio: document.getElementById('nadh-ratio'),
        nadphBar: document.getElementById('nadph-bar'), nadphRatio: document.getElementById('nadph-ratio'),
        fadh2Bar: document.getElementById('fadh2-bar'), fadh2Ratio: document.getElementById('fadh2-ratio'),
        // Counters
        protonGradient: document.getElementById('proton-gradient'),
        co2Net: document.getElementById('co2-net'),
        o2Net: document.getElementById('o2-net'),
        h2oNet: document.getElementById('h2o-net'),
        // Active Step
        krebsEnzyme: document.getElementById('krebs-enzyme'), krebsReaction: document.getElementById('krebs-reaction'),
        krebsYield: document.getElementById('krebs-yield'), krebsTurn: document.getElementById('krebs-turn'),
        calvinTurn: document.getElementById('calvin-turn'), glycolysisRun: document.getElementById('glycolysis-run'),
        pppRun: document.getElementById('ppp-run'),
    };
}

function toggleSidebar(dom, forceClose) {
    if (forceClose) {
        dom.dashboard.classList.remove('open');
    } else {
        dom.dashboard.classList.toggle('open');
    }
    const isOpen = dom.dashboard.classList.contains('open');
    if (dom.menuBtn) dom.menuBtn.classList.toggle('active', isOpen);
    Renderer.sidebarInset = (isOpen && !_isMobile()) ? _SIDEBAR_W : 0;
}

export function bindEvents(dom) {
    // Initialize dashboard DOM reference
    initDashboard(dom);

    // Pathway toggles
    dom.lightToggle.addEventListener('change', () => {
        simState.lightOn = dom.lightToggle.checked;
        updateTheme(dom.themeBtn);
    });
    dom.oxygenToggle.addEventListener('change', () => simState.oxygenAvailable = dom.oxygenToggle.checked);
    dom.glycToggle.addEventListener('change', () => simState.glycolysisEnabled = dom.glycToggle.checked);
    dom.pppToggle.addEventListener('change', () => simState.pppEnabled = dom.pppToggle.checked);
    dom.calvinToggle.addEventListener('change', () => simState.calvinEnabled = dom.calvinToggle.checked);
    dom.krebsToggle.addEventListener('change', () => simState.krebsEnabled = dom.krebsToggle.checked);
    if (dom.autoplayToggle) dom.autoplayToggle.addEventListener('change', () => simState.autoPlay = dom.autoplayToggle.checked);

    // Reset
    dom.resetBtn.addEventListener('click', () => {
        resetState();
        resetAutoplayTimers();
        Particles.electrons.length = 0; Particles.protons.length = 0; Particles.photons.length = 0; Renderer.metabPulse = {};
        updateDashboard();
    });

    // Add glucose
    if (dom.addGlucoseBtn) dom.addGlucoseBtn.addEventListener('click', () => { store.glucose++; updateDashboard(); });

    // Theme toggle
    if (dom.themeBtn) dom.themeBtn.addEventListener('click', () => cycleTheme(dom.themeBtn));

    // Sidebar toggle
    if (dom.menuBtn) dom.menuBtn.addEventListener('click', () => toggleSidebar(dom));
    if (dom.closeStats) dom.closeStats.addEventListener('click', () => toggleSidebar(dom, true));

    // Swipe-to-dismiss for mobile bottom sheet
    if (typeof window.initSwipeDismiss === 'function' && dom.dashboard) {
        window.initSwipeDismiss(dom.dashboard, {
            onDismiss() {
                if (dom.menuBtn) dom.menuBtn.classList.remove('active');
                Renderer.sidebarInset = 0;
            }
        });
    }

    // Intro screen
    if (dom.introStart && dom.introScreen) {
        dom.introStart.addEventListener('click', () => {
            dom.introScreen.classList.add('hidden');
            document.body.classList.add('app-ready');
            if (!_isMobile()) {
                toggleSidebar(dom);
            }
            setTimeout(() => { dom.introScreen.style.display = 'none'; }, 850);
        });
    }

    // ─── Keyboard shortcuts ───
    const toggleCheck = (el, setter) => {
        el.checked = !el.checked;
        setter(el.checked);
    };

    const shortcuts = [
        { key: 'Space', label: 'Toggle autoplay', group: 'Simulation', action: () => {
            if (dom.autoplayToggle) toggleCheck(dom.autoplayToggle, v => simState.autoPlay = v);
        }},
        { key: 'G', label: 'Add glucose', group: 'Simulation', action: () => { store.glucose++; updateDashboard(); } },
        { key: 'L', label: 'Toggle light', group: 'Environment', action: () => {
            toggleCheck(dom.lightToggle, v => { simState.lightOn = v; updateTheme(dom.themeBtn); });
        }},
        { key: 'O', label: 'Toggle oxygen', group: 'Environment', action: () => {
            toggleCheck(dom.oxygenToggle, v => simState.oxygenAvailable = v);
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
        { key: 'T', label: 'Toggle theme', group: 'View', action: () => cycleTheme(dom.themeBtn) },
        { key: 'S', label: 'Toggle sidebar', group: 'View', action: () => toggleSidebar(dom) },
    ];

    if (typeof initShortcuts === 'function') {
        initShortcuts(shortcuts, { helpTitle: 'Keyboard Shortcuts' });
    }

    // ─── Info tips ───
    const infoData = {
        glycolysis: { title: 'Glycolysis', body: 'Breaks down glucose into pyruvate, producing 2 ATP and 2 NADH per glucose.<br>Net: Glucose + 2 NAD\u207A + 2 ADP \u2192 2 Pyruvate + 2 NADH + 2 ATP' },
        ppp: { title: 'Pentose Phosphate Pathway', body: 'Generates NADPH for biosynthesis (primary role). The non-oxidative phase recycles R5P back to G6P, allowing continuous NADPH production.<br>Net per cycle: G6P + 2 NADP\u207A \u2192 G6P(regenerated) + 2 NADPH + CO\u2082' },
        calvin: { title: 'Calvin Cycle', body: 'Fixes CO\u2082 into organic carbon using ATP and NADPH from the light reactions.<br>Net: 3 CO\u2082 + 9 ATP + 6 NADPH \u2192 G3P + 9 ADP + 6 NADP\u207A' },
        krebs: { title: 'Krebs Cycle (TCA)', body: 'Oxidizes acetyl-CoA to CO\u2082, generating NADH, FADH\u2082, and GTP.<br>Net: Acetyl-CoA + 3 NAD\u207A + FAD + GDP \u2192 2 CO\u2082 + 3 NADH + FADH\u2082 + GTP' },
        sunlight: { title: 'Sunlight', body: 'Enables photosynthetic light reactions (Z-scheme). PSII splits water, PSI reduces NADP\u207A. Drives linear electron flow and proton pumping.' },
        oxygen: { title: 'Ambient O\u2082', body: 'Enables aerobic respiration (Krebs cycle + ETC). When off, fermentation regenerates NAD\u207A from NADH to sustain glycolysis.' },
        autoplay: { title: 'Auto-Play', body: 'Automatically advances reactions in priority order: ATP synthase \u2192 ETC \u2192 metabolic pathways. Includes passive ATP/NADPH drain to mimic cellular maintenance.' },
        protons: { title: 'Proton Gradient', body: 'H\u207A ions pumped across the membrane by ETC complexes. Drives ATP synthase (4 H\u207A \u2192 1 ATP). Higher gradient = faster ATP production.' },
    };

    if (typeof createInfoTip === 'function') {
        document.querySelectorAll('.info-trigger[data-info]').forEach(trigger => {
            const key = trigger.dataset.info;
            if (infoData[key]) {
                createInfoTip(trigger, infoData[key]);
            }
        });
    }
}
