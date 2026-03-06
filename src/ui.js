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
    if (forceClose) {
        dom.dashboard.classList.remove('open');
    } else {
        dom.dashboard.classList.toggle('open');
    }
    const isOpen = dom.dashboard.classList.contains('open');
    if (dom.menuBtn) dom.menuBtn.classList.toggle('active', isOpen);
    // Push canvas layout on desktop; mobile uses bottom sheet overlay
    Renderer.sidebarInset = (isOpen && !_isMobile()) ? _SIDEBAR_W : 0;
}

/** Wire all DOM events: toggles, presets, reset, theme, sidebar, shortcuts, info tips. */
export function bindEvents(dom) {
    initDashboard(dom);

    // ── Pathway & environment toggles ──
    dom.lightToggle.addEventListener('change', () => {
        simState.lightOn = dom.lightToggle.checked;
        updateTheme(dom.themeBtn);
    });
    dom.oxygenToggle.addEventListener('change', () => simState.oxygenAvailable = dom.oxygenToggle.checked);
    dom.glycToggle.addEventListener('change', () => simState.glycolysisEnabled = dom.glycToggle.checked);
    dom.pppToggle.addEventListener('change', () => simState.pppEnabled = dom.pppToggle.checked);
    dom.calvinToggle.addEventListener('change', () => simState.calvinEnabled = dom.calvinToggle.checked);
    dom.krebsToggle.addEventListener('change', () => simState.krebsEnabled = dom.krebsToggle.checked);
    if (dom.betaoxToggle) dom.betaoxToggle.addEventListener('change', () => simState.betaoxEnabled = dom.betaoxToggle.checked);
    if (dom.autoplayToggle) dom.autoplayToggle.addEventListener('change', () => simState.autoPlay = dom.autoplayToggle.checked);
    dom.uncouplingToggle?.addEventListener('change', e => { simState.uncouplingEnabled = e.target.checked; });

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
    });

    // ── Reset ──
    dom.resetBtn.addEventListener('click', () => {
        resetState();
        resetAutoplayTimers();
        Particles.electrons.length = 0; Particles.protons.length = 0; Particles.photons.length = 0; Renderer.metabPulse = {};
        updateDashboard();
    });

    // ── Add substrates ──
    if (dom.addGlucoseBtn) dom.addGlucoseBtn.addEventListener('click', () => { store.glucose++; updateDashboard(); });
    if (dom.addFattyAcidBtn) dom.addFattyAcidBtn.addEventListener('click', () => { store.fattyAcid++; updateDashboard(); });

    // ── Theme ──
    if (dom.themeBtn) dom.themeBtn.addEventListener('click', () => cycleTheme(dom.themeBtn));

    // ── Sidebar ──
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

    // ── Intro screen ──
    if (dom.introStart && dom.introScreen) {
        dom.introStart.addEventListener('click', () => {
            dom.introScreen.classList.add('hidden');
            document.body.classList.add('app-ready');
            // Auto-open sidebar on desktop
            if (!_isMobile()) {
                toggleSidebar(dom);
            }
            // Delay display:none until CSS fade-out completes
            setTimeout(() => { dom.introScreen.style.display = 'none'; }, 850);
        });
    }

    // ── Keyboard shortcuts (via shared-shortcuts.js) ──
    const toggleCheck = (el, setter) => {
        el.checked = !el.checked;
        setter(el.checked);
    };

    const shortcuts = [
        { key: 'Space', label: 'Toggle autoplay', group: 'Simulation', action: () => {
            if (dom.autoplayToggle) toggleCheck(dom.autoplayToggle, v => simState.autoPlay = v);
        }},
        { key: 'G', label: 'Add glucose', group: 'Simulation', action: () => { store.glucose++; updateDashboard(); } },
        { key: 'F', label: 'Add fatty acid', group: 'Simulation', action: () => { store.fattyAcid++; updateDashboard(); } },
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
        { key: '5', label: 'Toggle beta oxidation', group: 'Pathways', action: () => {
            if (dom.betaoxToggle) toggleCheck(dom.betaoxToggle, v => simState.betaoxEnabled = v);
        }},
        { key: 'T', label: 'Toggle theme', group: 'View', action: () => cycleTheme(dom.themeBtn) },
        { key: 'S', label: 'Toggle sidebar', group: 'View', action: () => toggleSidebar(dom) },
    ];

    if (typeof initShortcuts === 'function') {
        initShortcuts(shortcuts, { helpTitle: 'Keyboard Shortcuts' });
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

    if (typeof createInfoTip === 'function') {
        document.querySelectorAll('.info-trigger[data-info]').forEach(trigger => {
            const key = trigger.dataset.info;
            if (infoData[key]) {
                createInfoTip(trigger, infoData[key]);
            }
        });
    }

    // ── Reference overlay (Shift+click or long-press on info buttons) ──
    // Content is trusted project-defined HTML from reference.js (not user input)
    const refOverlay = document.getElementById('reference-overlay');
    const refTitle = document.getElementById('reference-title');
    const refBody = document.getElementById('reference-body');
    const refClose = document.getElementById('reference-close');

    const openReference = (key) => {
        const ref = REFERENCE[key];
        if (!ref) return;
        refTitle.textContent = ref.title;
        refBody.innerHTML = ref.body; // trusted static content from reference.js
        refOverlay.hidden = false;
        if (typeof renderMathInElement === 'function') {
            renderMathInElement(refBody, { delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
            ]});
        }
    };

    if (refOverlay) {
        document.querySelectorAll('.info-trigger[data-info]').forEach(trigger => {
            // Shift+click (desktop)
            trigger.addEventListener('click', (e) => {
                if (!e.shiftKey) return;
                e.stopPropagation();
                openReference(trigger.dataset.info);
            });
            // Long-press (mobile): 500ms touch hold opens reference
            let longPressTimer = 0;
            trigger.addEventListener('touchstart', (e) => {
                longPressTimer = setTimeout(() => {
                    e.preventDefault();
                    openReference(trigger.dataset.info);
                    longPressTimer = 0;
                }, 500);
            }, { passive: false });
            trigger.addEventListener('touchend', () => {
                if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = 0; }
            });
            trigger.addEventListener('touchmove', () => {
                if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = 0; }
            });
        });
        refClose.addEventListener('click', () => { refOverlay.hidden = true; });
        refOverlay.addEventListener('click', (e) => {
            if (e.target === refOverlay) refOverlay.hidden = true;
        });
    }
}
