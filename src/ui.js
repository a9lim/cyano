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

}
