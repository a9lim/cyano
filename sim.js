/* ===================================================================
   sim.js — Click-to-advance simulation with flexible bi-directional reactions
   =================================================================== */

(function () {
    'use strict';

    const simState = {
        time: 0, speed: 1, lightOn: true, oxygenAvailable: true, fermenting: false,
        glycolysisEnabled: true, pppEnabled: true, calvinEnabled: true, krebsEnabled: true,
        oxphosEnabled: true, linearLightEnabled: true, cyclicLightEnabled: true,
        autoPlay: false,
        store: null, // will reference the store object for renderer highlighting
        // Animation state
        calvinRot: Anim.rotAccum(),
        krebsRot: Anim.rotAccum(),
        pppRot: Anim.rotAccum(),
        glycolysisFade: Anim.fade(1),
        calvinFade: Anim.fade(1),
        krebsFade: Anim.fade(1),
        pppFade: Anim.fade(1),
        respEtcFade: Anim.fade(1),
        photoEtcFade: Anim.fade(1),
        fermentFade: Anim.fade(0)
    };

    const store = {
        // Core energy
        atp: 5, nadh: 0, nadph: 0, fadh2: 0,
        totalAtpAdp: 40, totalNad: 40, totalNadp: 40, totalFad: 20,
        // Active tracking
        protonGradient: 0, protonsPumped: 0, o2Produced: 0, o2Consumed: 0, h2oSplit: 0, h2oProduced: 0, electronsTransferred: 0, co2Fixed: 0, co2Produced: 0,

        // --- Metabolite Pools ---
        // Glycolysis / Gluconeogenesis
        glucose: 1, g6p: 6, f6p: 0, f16bp: 0, g3p: 0, bpg: 0, pga3: 0, pga2: 0, pep: 0, pyruvate: 0, ethanol: 0, acetaldehyde: 0, aceticAcid: 0,
        // PPP
        pgl6: 0, pga6: 0, xu5p: 0, s7p: 0, r5p: 0,
        // Calvin
        rubp: 6,
        // Krebs
        acetylCoA: 0, citrate: 0, isocitrate: 0, akg: 0, succoa: 0, succinate: 0, fumarate: 0, malate: 0, oaa: 2
    };
    simState.store = store;

    /* ---- DOM ---- */
    const dom = {
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

    let krebsTurns = 0, calvinTurns = 0, glycRuns = 0, pppRuns = 0;

    /* ---- Init ---- */
    Renderer.init(dom.canvas);

    // Theme: 0 = simulation (follows sunlight), 1 = light, 2 = dark
    let themeMode = 0;
    const _themeNames = ['auto', 'light', 'dark'];
    const _themeTitles = ['Theme: Simulation', 'Theme: Light', 'Theme: Dark'];

    function updateTheme() {
        document.body.dataset.theme =
            themeMode === 1 ? 'light' :
            themeMode === 2 ? 'dark' :
            simState.lightOn ? 'light' : 'dark';
        simState.visualLightMode = document.body.dataset.theme === 'light';
        if (dom.themeBtn) {
            dom.themeBtn.setAttribute('data-theme', _themeNames[themeMode]);
            dom.themeBtn.title = _themeTitles[themeMode];
        }
    }

    // Toggles
    dom.lightToggle.addEventListener('change', () => {
        simState.lightOn = dom.lightToggle.checked;
        if (themeMode === 0) updateTheme();
    });
    dom.oxygenToggle.addEventListener('change', () => simState.oxygenAvailable = dom.oxygenToggle.checked);
    dom.glycToggle.addEventListener('change', () => simState.glycolysisEnabled = dom.glycToggle.checked);
    dom.pppToggle.addEventListener('change', () => simState.pppEnabled = dom.pppToggle.checked);
    dom.calvinToggle.addEventListener('change', () => simState.calvinEnabled = dom.calvinToggle.checked);
    dom.krebsToggle.addEventListener('change', () => simState.krebsEnabled = dom.krebsToggle.checked);
    if (dom.autoplayToggle) dom.autoplayToggle.addEventListener('change', () => simState.autoPlay = dom.autoplayToggle.checked);
    dom.resetBtn.addEventListener('click', resetSimulation);
    if (dom.addGlucoseBtn) dom.addGlucoseBtn.addEventListener('click', () => { store.glucose++; updateDashboard(); });

    // Theme toggle — cycles through simulation / light / dark
    if (dom.themeBtn) dom.themeBtn.addEventListener('click', () => {
        themeMode = (themeMode + 1) % 3;
        updateTheme();
    });

    // Menu button — toggles sidebar + smoothly pushes canvas layout
    const _sidebarW = 374; // panel-w(350) + gap(24)
    function _isMobile() { return window.innerWidth <= 900; }
    function toggleSidebar(forceClose) {
        if (forceClose) {
            dom.dashboard.classList.remove('open');
        } else {
            dom.dashboard.classList.toggle('open');
        }
        const isOpen = dom.dashboard.classList.contains('open');
        if (dom.menuBtn) dom.menuBtn.classList.toggle('active', isOpen);
        // On mobile, don't push the canvas — sidebar is an overlay
        Renderer.sidebarInset = (isOpen && !_isMobile()) ? _sidebarW : 0;
    }
    if (dom.menuBtn) dom.menuBtn.addEventListener('click', () => toggleSidebar());
    if (dom.closeStats) dom.closeStats.addEventListener('click', () => toggleSidebar(true));

    // Swipe-to-dismiss for mobile bottom sheet
    if (typeof initSwipeDismiss === 'function' && dom.dashboard) {
        initSwipeDismiss(dom.dashboard, {
            onDismiss() {
                if (dom.menuBtn) dom.menuBtn.classList.remove('active');
                Renderer.sidebarInset = 0;
            }
        });
    }

    // Intro screen dismissal
    if (dom.introStart && dom.introScreen) {
        dom.introStart.addEventListener('click', () => {
            dom.introScreen.classList.add('hidden');
            document.body.classList.add('app-ready');
            // Only auto-open sidebar on desktop; on mobile, user opens manually
            if (!_isMobile()) {
                dom.dashboard.classList.add('open');
            }
            setTimeout(() => { dom.introScreen.style.display = 'none'; }, 850);
        });
    }

    // Initialize theme and sidebar inset (panel starts hidden, opens on intro dismiss)
    updateTheme();
    Renderer.sidebarInset = 0;
    Renderer._sidebarInsetCurrent = 0;
    Renderer._sidebarAnimTo = 0;
    Renderer.computeLayout();

    // Zoom controls
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const zoomResetBtn = document.getElementById('zoom-reset-btn');
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => Renderer.zoomIn());
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => Renderer.zoomOut());
    if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => Renderer.resetZoom());

    function resetSimulation() {
        Object.keys(store).forEach(k => store[k] = 0);
        store.atp = 5; store.glucose = 1; store.g6p = 6; store.oaa = 2; store.rubp = 6;
        store.totalAtpAdp = 40; store.totalNad = 40; store.totalNadp = 40; store.totalFad = 20;
        krebsTurns = 0; calvinTurns = 0; glycRuns = 0; pppRuns = 0;
        dom.krebsTurn.textContent = '0'; dom.calvinTurn.textContent = '0'; dom.glycolysisRun.textContent = '0';
        if (dom.pppRun) dom.pppRun.textContent = '0';
        simState.time = 0; simState.fermenting = false;
        Renderer.electrons = []; Renderer.protons = []; Renderer.photons = []; Renderer.metabPulse = {};
        updateDashboard();
    }

    /* ---- Helpers ---- */
    function showActiveStep(enzyme, reaction, yields) {
        dom.krebsEnzyme.textContent = enzyme;
        dom.krebsReaction.textContent = reaction;
        dom.krebsYield.textContent = yields
            ? Object.entries(yields).map(([k, v]) => k.includes('Consume') ? `-${v} ${k.replace('Consume', '').toUpperCase()}` : `+${v} ${k.toUpperCase()}`).join(' ')
            : '—';
    }

    function applyYields(y) {
        if (!y) return;
        if (y.atpConsume && store.atp >= y.atpConsume) store.atp -= y.atpConsume;
        if (y.atp && store.atp < store.totalAtpAdp) store.atp = Math.min(store.atp + y.atp, store.totalAtpAdp);
        if (y.nadh && store.nadh < store.totalNad) store.nadh = Math.min(store.nadh + y.nadh, store.totalNad);
        if (y.nadph && store.nadph < store.totalNadp) store.nadph = Math.min(store.nadph + y.nadph, store.totalNadp);
        if (y.nadphConsume && store.nadph >= y.nadphConsume) store.nadph -= y.nadphConsume;
        if (y.fadh2 && store.fadh2 < store.totalFad) store.fadh2 = Math.min(store.fadh2 + y.fadh2, store.totalFad);
        if (y.co2Fixed) store.co2Fixed += y.co2Fixed;
    }

    function pumpProtons(count, complexKey) {
        store.protonGradient += count; store.protonsPumped += count;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const cx = Renderer.etcComplexes[complexKey]?.cx;
                if (cx) Renderer.spawnProton(cx, 'up');
            }, i * 80);
        }
    }

    /* ============================================================
       REACTION LOGIC — dispatch map replaces if-else chain
       ============================================================ */
    const _dispatch = {
        glycolysis:             (i, d) => advanceGlycolysis(i, d),
        calvin:                 (i, d) => advanceCalvin(i, d),
        ppp:                    (i, d) => advancePPP(i, d),
        krebs:                  (i, d) => advanceKrebs(i, d),
        pdh:                    ()     => advancePDH(),
        pdc:                    ()     => advancePDC(),
        adh:                    (_i, d) => advanceADH(d),
        aldh:                   ()     => advanceALDH(),
        acs:                    ()     => advanceACS(),
        fermentation:           ()     => advanceFermentation(),
        etc_resp:               (i)    => advanceETC('etc_resp', i),
        etc_photo:              (i)    => advanceETC('etc_photo', i),
        etc_cyclic:             (i)    => advanceETC('etc_cyclic', i),
        run_krebs:              ()     => runKrebsCycle(),
        run_calvin:             ()     => runCalvinCycle(),
        run_ppp:                ()     => runPPPCycle(),
        run_glycolysis_upper:   ()     => runGlycolysisUpper(),
        run_glycolysis_lower:   ()     => runGlycolysisLower(),
        atp_syn:                ()     => advanceATPSynthase(),
        br:                     ()     => advanceBacteriorhodopsin(),
        nnt:                    ()     => advanceNNT(),
    };

    // Rotation nudges keyed by pathway (only for cycle-related pathways)
    const _rotNudge = {
        run_krebs:  { rot: 'krebsRot',  delta: -_TWO_PI },
        krebs:      { rot: 'krebsRot',  delta: -0.4 },
        run_calvin: { rot: 'calvinRot', delta:  _TWO_PI },
        calvin:     { rot: 'calvinRot', delta:  0.4 },
        run_ppp:    { rot: 'pppRot',    delta:  _TWO_PI },
        ppp:        { rot: 'pppRot',    delta:  0.4 },
    };

    function advanceStep(pathway, stepIndex, direction) {
        const handler = _dispatch[pathway];
        const ran = handler ? handler(stepIndex, direction) : false;

        if (ran) {
            const nudge = _rotNudge[pathway];
            if (nudge) simState[nudge.rot].targetAngle += nudge.delta;
        }

        updateDashboard();
        return ran;
    }
    Renderer.onEnzymeClick = advanceStep;

    function advanceGlycolysis(idx, direction) {
        const fwd = direction !== 'reverse';
        const rev = direction !== 'forward';
        // Shared logic: Enzymes 0, 1, 3, 5, 6, 10 are used by multiple pathways
        const isShared = [0, 1, 2, 3, 5, 6, 10].includes(idx);

        if (!isShared && !simState.glycolysisEnabled) return false;
        if (isShared && !simState.glycolysisEnabled && !simState.calvinEnabled && !simState.pppEnabled) return false;

        // F6P <-> F16BP is shared with Calvin (FBPase)
        if (idx === 2 && !simState.glycolysisEnabled && !simState.calvinEnabled) return false;
        // F16BP <-> G3P is shared with Calvin
        if (idx === 3 && !simState.glycolysisEnabled && !simState.calvinEnabled) return false;
        // G3P <-> BPG <-> 3PGA are shared
        if ((idx === 5 || idx === 6) && !simState.glycolysisEnabled && !simState.calvinEnabled) return false;

        if (idx === 0) { // HK/G6Pase
            if (fwd && store.glucose > 0 && store.atp >= 1) {
                store.glucose--; store.atp--; store.g6p++;
                showActiveStep('HK', 'Glucose + ATP → G6P', { atpConsume: 1 });
                return true;
            } else if (rev && store.g6p > 0) {
                store.g6p--; store.glucose++;
                showActiveStep('G6Pase', 'G6P → Glucose', null);
                return true;
            }
        }
        else if (idx === 1) { // PGI (Reversible)
            if (fwd && store.g6p > 0) {
                store.g6p--; store.f6p++;
                showActiveStep('PGI', 'G6P → F6P', null);
                return true;
            } else if (rev && store.f6p > 0) {
                store.f6p--; store.g6p++;
                showActiveStep('PGI', 'F6P → G6P', null);
                return true;
            }
        }
        else if (idx === 2) { // PFK / FBPase
            if (fwd && store.f6p > 0 && store.atp >= 1) {
                store.f6p--; store.atp--; store.f16bp++;
                showActiveStep('PFK', 'F6P + ATP → F1,6BP', { atpConsume: 1 });
                return true;
            } else if (rev && store.f16bp > 0) {
                store.f16bp--; store.f6p++;
                showActiveStep('FBPase', 'F1,6BP → F6P', null);
                return true;
            }
        }
        else if (idx === 3) { // Aldolase (Reversible)
            if (fwd && store.f16bp > 0) {
                let t = Math.min(store.f16bp, 2);
                store.f16bp -= t; store.g3p += 2 * t;
                showActiveStep('Aldolase/TPI', 'F1,6BP → 2 G3P', null);
                return true;
            } else if (rev && store.g3p >= 2) {
                let t = Math.floor(Math.min(store.g3p / 2, 2));
                store.g3p -= 2 * t; store.f16bp += t;
                showActiveStep('Aldolase (Reverse)', '2 G3P → F1,6BP', null);
                return true;
            }
        }
        else if (idx === 5) { // GAPDH (Reversible)
            if (fwd && store.g3p >= 2 && store.nadh <= store.totalNad - 2) {
                store.g3p -= 2; store.bpg += 2; store.nadh += 2;
                showActiveStep('GAPDH', '2 G3P + 2 NAD⁺ → 2 1,3-BPG', { nadh: 2 });
                return true;
            } else if (rev && store.bpg >= 2 && store.nadph >= 2) {
                store.bpg -= 2; store.g3p += 2; store.nadph -= 2;
                showActiveStep('GAPDH (Reverse)', '2 1,3-BPG + 2 NADPH → 2 G3P', { nadphConsume: 2 });
                return true;
            }
        }
        else if (idx === 6) { // PGK (Reversible)
            if (fwd && store.bpg >= 2 && store.atp <= store.totalAtpAdp - 2) {
                store.bpg -= 2; store.pga3 += 2; store.atp += 2;
                showActiveStep('PGK', '2 1,3-BPG + 2 ADP → 2 3-PGA + 2 ATP', { atp: 2 });
                return true;
            } else if (rev && store.pga3 >= 2 && store.atp >= 2) {
                store.pga3 -= 2; store.bpg += 2; store.atp -= 2;
                showActiveStep('PGK (Reverse)', '2 3-PGA + 2 ATP → 2 1,3-BPG', { atpConsume: 2 });
                return true;
            }
        }
        else if (idx === 7) { // PGM (Reversible)
            if (fwd && store.pga3 >= 2) { store.pga3 -= 2; store.pga2 += 2; showActiveStep('PGM', '2 3-PGA → 2 2-PGA', null); return true; }
            else if (rev && store.pga2 >= 2) { store.pga2 -= 2; store.pga3 += 2; showActiveStep('PGM (Reverse)', '2 2-PGA → 2 3-PGA', null); return true; }
        }
        else if (idx === 8) { // Enolase (Reversible)
            if (fwd && store.pga2 >= 2) { store.pga2 -= 2; store.pep += 2; showActiveStep('Enolase', '2 2-PGA → 2 PEP', null); return true; }
            else if (rev && store.pep >= 2) { store.pep -= 2; store.pga2 += 2; showActiveStep('Enolase (Reverse)', '2 PEP → 2 2-PGA', null); return true; }
        }
        else if (idx === 9) { // PK (irreversible)
            if (store.pep >= 2 && store.atp <= store.totalAtpAdp - 2) {
                store.pep -= 2; store.pyruvate += 2; store.atp += 2;
                glycRuns++; dom.glycolysisRun.textContent = glycRuns;
                showActiveStep('PK', '2 PEP + 2 ADP → 2 Pyruvate + 2 ATP', { atp: 2 });
                return true;
            }
        }
        else if (idx === 10) { // TKT+TAL / TK+SBP (Shared F6P <-> R5P)
            if (fwd && store.r5p >= 6) {
                store.r5p -= 6; store.f6p += 5;
                showActiveStep('TKT+TAL', '6 R5P → 5 F6P (- Sugar)', null);
                return true;
            } else if (rev && store.f6p >= 5) {
                store.f6p -= 5; store.r5p += 6;
                showActiveStep('TK+SBPase', '5 F6P → 6 R5P (+ Sugar)', null);
                return true;
            }
        }
        return false;
    }

    function advanceCalvin(idx, direction) {
        if (!simState.calvinEnabled) return false;
        // Calvin steps are mostly irreversible, but direction is accepted for consistency

        if (idx === 0) { // RuBisCO: RuBP + CO₂ → 2 3-PGA
            if (store.rubp > 0) {
                store.rubp -= 1; store.pga3 += 2; store.co2Fixed += 1;
                showActiveStep('RuBisCO', 'RuBP + CO₂ → 2 3-PGA', { co2Fixed: 1 });
                return true;
            }
        }
        else if (idx === 5) { // FBPase (F16BP -> F6P)
            if (store.f16bp > 0) {
                let t = Math.min(store.f16bp, 2);
                store.f16bp -= t; store.f6p += t;
                showActiveStep('FBPase', 'F1,6-BP → F6P', null);
                return true;
            }
        }
        // idx 6 removed; handled by shared idx 10 in advanceGlycolysis
        else if (idx === 7) { // PRK: R5P + ATP → RuBP
            if (store.r5p > 0 && store.atp >= 1) {
                let t = Math.min(store.r5p, store.atp, 3);
                store.r5p -= t; store.atp -= t; store.rubp += t;
                showActiveStep('PRK', t + ' R5P + ' + t + ' ATP → ' + t + ' RuBP', { atpConsume: t });
                return true;
            }
        }
        return false;
    }

    function advancePPP(idx, direction) {
        if (!simState.pppEnabled) return false;
        // PPP steps are mostly irreversible, but direction is accepted for consistency

        if (idx === 0) { // G6PDH
            if (store.g6p > 0 && store.nadph < store.totalNadp) {
                let t = Math.min(store.g6p, store.totalNadp - store.nadph, 2);
                store.g6p -= t; store.pgl6 += t; store.nadph += t;
                showActiveStep('G6PDH', 'G6P → 6-PGL + NADPH', { nadph: t });
                return true;
            }
        }
        else if (idx === 1) { // Lactonase
            if (store.pgl6 > 0) { let t = Math.min(store.pgl6, 2); store.pgl6 -= t; store.pga6 += t; showActiveStep('Lactonase', '6-PGL → 6-PGA', null); return true; }
        }
        else if (idx === 2) { // 6PGDH -> R5P
            if (store.pga6 > 0 && store.nadph < store.totalNadp) {
                let t = Math.min(store.pga6, store.totalNadp - store.nadph, 2);
                store.pga6 -= t; store.r5p += t; store.nadph += t; store.co2Produced += t;
                pppRuns += t; if (dom.pppRun) dom.pppRun.textContent = pppRuns;
                showActiveStep('6PGDH', '6-PGA → R5P + CO₂ + NADPH', { nadph: t });
                return true;
            }
        }
        return false;
    }

    function advancePDH() {
        if (!simState.oxygenAvailable) return false;
        if (store.pyruvate >= 2 && store.nadh <= store.totalNad - 2) {
            store.pyruvate -= 2; store.acetylCoA += 2; store.nadh += 2; store.co2Produced += 2;
            showActiveStep('Pyruvate DH', '2 Pyruvate → 2 Acetyl-CoA + 2 CO₂ + 2 NADH', { nadh: 2 });
            return true;
        }
        return false;
    }

    function advanceKrebs(idx, direction) {
        if (!simState.oxygenAvailable || !simState.krebsEnabled) return false;
        const fwd = direction !== 'reverse';
        const rev = direction !== 'forward';

        if (idx === 0) { // Citrate Synthase
            if (fwd && store.acetylCoA > 0 && store.oaa > 0) {
                let t = Math.min(store.acetylCoA, store.oaa, 2);
                store.acetylCoA -= t; store.oaa -= t; store.citrate += t;
                showActiveStep('Citrate Synthase', 'Acetyl-CoA + OAA → Citrate', null);
                return true;
            }
        }
        else if (idx === 1) { // Aconitase
            if (store.citrate > 0) { let t = Math.min(store.citrate, 2); store.citrate -= t; store.isocitrate += t; showActiveStep('Aconitase', 'Citrate → Isocitrate', null); return true; }
        }
        else if (idx === 2) { // IDH
            if (store.isocitrate > 0 && store.nadh < store.totalNad) {
                let t = Math.min(store.isocitrate, store.totalNad - store.nadh, 2);
                store.isocitrate -= t; store.akg += t; store.nadh += t; store.co2Produced += t;
                showActiveStep('Isocitrate DH', 'Isocitrate → α-KG + CO₂ + NADH', { nadh: t });
                return true;
            }
        }
        else if (idx === 3) { // KGDH
            if (store.akg > 0 && store.nadh < store.totalNad) {
                let t = Math.min(store.akg, store.totalNad - store.nadh, 2);
                store.akg -= t; store.succoa += t; store.nadh += t; store.co2Produced += t;
                showActiveStep('α-KGDH', 'α-KG → Succinyl-CoA + CO₂ + NADH', { nadh: t });
                return true;
            }
        }
        else if (idx === 4) { // Succinyl-CoA Synthetase
            if (fwd && store.succoa > 0 && store.atp < store.totalAtpAdp) {
                let t = Math.min(store.succoa, store.totalAtpAdp - store.atp, 2);
                store.succoa -= t; store.succinate += t; store.atp += t;
                showActiveStep('SCS', 'Succinyl-CoA → Succinate + ATP', { atp: t });
                return true;
            } else if (rev && store.succinate > 0 && store.atp > 0) {
                let t = Math.min(store.succinate, store.atp, 2);
                store.succinate -= t; store.succoa += t; store.atp -= t;
                showActiveStep('SCS (Reverse)', 'Succinate + ATP → Succinyl-CoA', { atpConsume: t });
                return true;
            }
        }
        else if (idx === 5) { // SDH
            if (fwd && store.succinate > 0 && store.fadh2 < store.totalFad) {
                let t = Math.min(store.succinate, store.totalFad - store.fadh2, 2);
                store.succinate -= t; store.fumarate += t; store.fadh2 += t;
                showActiveStep('SDH', 'Succinate → Fumarate + FADH₂', { fadh2: t });
                return true;
            } else if (rev && store.fumarate > 0 && store.fadh2 > 0) {
                let t = Math.min(store.fumarate, store.fadh2, 2);
                store.fumarate -= t; store.succinate += t; store.fadh2 -= t;
                showActiveStep('SDH (Reverse)', 'Fumarate + FADH₂ → Succinate', null);
                return true;
            }
        }
        else if (idx === 6) { // Fumarase
            if (store.fumarate > 0) { let t = Math.min(store.fumarate, 2); store.fumarate -= t; store.malate += t; showActiveStep('Fumarase', 'Fumarate → Malate', null); return true; }
        }
        else if (idx === 7) { // MDH
            if (fwd && store.malate > 0 && store.nadh < store.totalNad) {
                let t = Math.min(store.malate, store.totalNad - store.nadh, 2);
                store.malate -= t; store.oaa += t; store.nadh += t;
                krebsTurns += t; dom.krebsTurn.textContent = krebsTurns;
                showActiveStep('Malate DH', 'Malate → OAA + NADH', { nadh: t });
                return true;
            } else if (rev && store.oaa > 0 && store.nadh > 0) {
                let t = Math.min(store.oaa, store.nadh, 2);
                store.oaa -= t; store.malate += t; store.nadh -= t;
                showActiveStep('Malate DH (Reverse)', 'OAA + NADH → Malate', { nadhConsume: t });
                return true;
            }
        }
        return false;
    }

    function advancePDC() {
        if (simState.oxygenAvailable || store.pyruvate < 2) return false;
        store.pyruvate -= 2; store.acetaldehyde += 2; store.co2Produced += 2;
        simState.fermenting = true;
        showActiveStep('PDC', '2 Pyruvate → 2 Acetaldehyde + 2 CO₂', null);
        return true;
    }

    function advanceADH(direction) {
        const fwd = direction !== 'reverse';
        const rev = direction !== 'forward';
        // Forward (oxidation): Ethanol → Acetaldehyde + NADH
        if (fwd && store.ethanol >= 2 && store.totalNad - store.nadh >= 2) {
            store.ethanol -= 2; store.acetaldehyde += 2; store.nadh += 2;
            showActiveStep('ADH', '2 Ethanol + 2 NAD⁺ → 2 Acetaldehyde + 2 NADH', { nadh: 2 });
            return true;
        }
        // Reverse (fermentation): Acetaldehyde + NADH → Ethanol
        if (rev && store.acetaldehyde >= 2 && store.nadh >= 2) {
            store.acetaldehyde -= 2; store.nadh -= 2; store.ethanol += 2;
            showActiveStep('ADH', '2 Acetaldehyde + 2 NADH → 2 Ethanol', null);
            return true;
        }
        return false;
    }

    function advanceALDH() {
        if (!simState.oxygenAvailable || store.acetaldehyde < 2 || store.totalNad - store.nadh < 2) return false;
        store.acetaldehyde -= 2; store.aceticAcid += 2; store.nadh += 2;
        showActiveStep('ALDH', '2 Acetaldehyde → 2 Acetic Acid + 2 NADH', { nadh: 2 });
        return true;
    }

    function advanceFermentation() {
        // Combined PDC + ADH for autoplay convenience
        if (simState.oxygenAvailable || store.pyruvate < 2 || store.nadh < 2) return false;
        store.pyruvate -= 2; store.nadh -= 2; store.ethanol += 2; store.co2Produced += 2;
        simState.fermenting = true;
        showActiveStep('PDC/ADH', '2 Pyruvate + 2 NADH → 2 Ethanol + 2 CO₂', null);
        return true;
    }

    function advanceACS() {
        if (!simState.oxygenAvailable || store.aceticAcid < 2 || store.atp < 2) return false;
        store.aceticAcid -= 2; store.atp -= 2; store.acetylCoA += 2;
        showActiveStep('ACS', '2 Acetic Acid + 2 ATP → 2 Acetyl-CoA', { atpConsume: 2 });
        return true;
    }

    function advanceETC(pathway, stepIndex) {
        const D = 550; // relay delay between complexes (ms)
        if (pathway === 'etc_resp') {
            if (!simState.oxygenAvailable || !simState.oxphosEnabled) return false;
            let src = null;
            if (stepIndex === 1) {
                if (store.fadh2 > 0) { store.fadh2--; src = 'sdh'; }
                else return false;
            } else if (stepIndex === 0) {
                if (store.nadh > 0) { store.nadh--; src = 'ndh1'; pumpProtons(4, 'ndh1'); }
                else return false;
            } else {
                // No stepIndex: prioritize NADH, fall back to FADH2
                if (store.nadh > 0) { store.nadh--; src = 'ndh1'; pumpProtons(4, 'ndh1'); }
                else if (store.fadh2 > 0) { store.fadh2--; src = 'sdh'; }
            }
            if (src) {
                store.electronsTransferred += 2;
                Renderer.spawnElectron(src, 'pq', 'resp');
                setTimeout(() => { Renderer.spawnElectron('pq', 'cytb6f', 'resp'); pumpProtons(4, 'cytb6f'); updateDashboard(); }, D);
                setTimeout(() => Renderer.spawnElectron('cytb6f', 'pc', 'resp'), D * 2);
                setTimeout(() => { Renderer.spawnElectron('pc', 'cytOx', 'resp'); pumpProtons(2, 'cytOx'); store.o2Consumed += 0.5; store.h2oProduced++; updateDashboard(); }, D * 3);
                return true;
            }
        } else if (pathway === 'etc_photo') {
            if (!simState.lightOn || !simState.linearLightEnabled) return false;
            store.h2oSplit++; store.o2Produced += 0.5; store.electronsTransferred += 2;
            pumpProtons(2, 'psii');
            Renderer.spawnPhoton('psii');
            Renderer.spawnElectron('psii', 'pq', 'photo');
            setTimeout(() => { Renderer.spawnElectron('pq', 'cytb6f', 'photo'); pumpProtons(4, 'cytb6f'); updateDashboard(); }, D);
            setTimeout(() => Renderer.spawnElectron('cytb6f', 'pc', 'photo'), D * 2);
            setTimeout(() => Renderer.spawnElectron('pc', 'psi', 'photo'), D * 3);
            setTimeout(() => { Renderer.spawnPhoton('psi'); Renderer.spawnElectron('psi', 'fd', 'photo'); }, D * 4);
            setTimeout(() => {
                Renderer.spawnElectron('fd', 'fnr', 'photo');
                if (store.nadph < store.totalNadp) store.nadph++;
                updateDashboard();
            }, D * 5);
            return true;
        } else if (pathway === 'etc_cyclic') {
            if (!simState.lightOn || !simState.cyclicLightEnabled) return false;
            store.electronsTransferred += 2;
            Renderer.spawnPhoton('psi');
            Renderer.spawnElectron('psi', 'fd', 'cyclic');
            setTimeout(() => Renderer.spawnElectron('fd', 'pq', 'cyclic'), D);
            setTimeout(() => { Renderer.spawnElectron('pq', 'cytb6f', 'cyclic'); pumpProtons(4, 'cytb6f'); updateDashboard(); }, D * 2);
            setTimeout(() => Renderer.spawnElectron('cytb6f', 'pc', 'cyclic'), D * 3);
            setTimeout(() => Renderer.spawnElectron('pc', 'psi', 'cyclic'), D * 4);
            return true;
        }
        return false;
    }

    function advanceBacteriorhodopsin() {
        if (!simState.lightOn) return false;
        store.protonGradient += 1; store.protonsPumped += 1;
        Renderer.spawnPhoton('br');
        const cx = Renderer.etcComplexes.br?.cx;
        if (cx) Renderer.spawnProton(cx, 'up');
        return true;
    }

    function advanceNNT() {
        // NADH + NADP⁺ + H⁺(gradient) → NADPH + NAD⁺
        if (store.protonGradient < 1 || store.nadh < 1 || store.nadph >= store.totalNadp) return false;
        store.protonGradient -= 1;
        store.nadh -= 1;
        store.nadph += 1;
        const cx = Renderer.etcComplexes.nnt?.cx;
        if (cx) Renderer.spawnProton(cx, 'down');
        return true;
    }

    function advanceATPSynthase() {
        if (store.protonGradient >= 4 && store.atp < store.totalAtpAdp) {
            store.protonGradient -= 4; store.atp++;
            const cx = Renderer.etcComplexes.atpSyn?.cx;
            if (cx) for (let i = 0; i < 4; i++) setTimeout(() => Renderer.spawnProton(cx, 'down'), i * 200);
            return true;
        }
        return false;
    }

    function runKrebsCycle() {
        // 2 turns: 2 AcCoA + 2 OAA → 4 CO₂ + 6 NADH + 2 FADH₂ + 2 ATP (+ regenerate 2 OAA)
        if (!simState.oxygenAvailable || !simState.krebsEnabled || store.acetylCoA < 2 || store.oaa < 2 || store.totalNad - store.nadh < 6 || store.totalAtpAdp - store.atp < 2 || store.totalFad - store.fadh2 < 2) return false;
        store.acetylCoA -= 2;
        // OAA is consumed and regenerated (net 0) — no mutation needed
        store.nadh += 6;
        store.fadh2 = Math.min(store.fadh2 + 2, store.totalFad);
        store.atp += 2;
        store.co2Produced += 4;
        krebsTurns += 2;
        dom.krebsTurn.textContent = krebsTurns;
        showActiveStep('Krebs Cycle (×2)', '2 AcCoA → 4 CO₂ + 6 NADH + 2 FADH₂ + 2 ATP', { nadh: 6, fadh2: 2, atp: 2 });
        return true;
    }

    function runCalvinCycle() {
        // 2 turns: 6 CO₂ + 18 ATP + 12 NADPH → 2 G3P (regenerates 6 RuBP)
        if (!simState.calvinEnabled || store.atp < 18 || store.nadph < 12 || store.rubp < 6) return false;
        store.atp -= 18;
        store.nadph -= 12;
        store.g3p += 2;
        store.co2Fixed += 6;
        calvinTurns += 2;
        dom.calvinTurn.textContent = calvinTurns;
        showActiveStep('Calvin Cycle (×6)', '6 CO₂ + 18 ATP + 12 NADPH → 2 G3P', { atpConsume: 18, nadphConsume: 12 });
        return true;
    }

    function runPPPCycle() {
        if (!simState.pppEnabled || store.g6p < 6 || store.totalNadp - store.nadph < 12) return false;
        store.g6p--;  // 6 consumed, 5 regenerated (net -1)
        store.nadph += 12;
        store.co2Produced += 6;
        pppRuns++;
        if (dom.pppRun) dom.pppRun.textContent = pppRuns;
        showActiveStep('PPP (×6)', 'G6P → 12 NADPH + 6 CO₂', { nadph: 12 });
        return true;
    }

    /* ---- Auto-step helpers: try each individual cycle step in order ---- */
    function autoStepKrebs() {
        if (!simState.oxygenAvailable || !simState.krebsEnabled) return false;
        for (let i = 0; i < 8; i++) {
            if (advanceStep('krebs', i, 'forward')) return true;
        }
        return false;
    }
    function autoStepCalvin() {
        if (!simState.calvinEnabled || !simState.lightOn) return false;
        // Try Calvin steps: RuBisCO, then shared reverse steps (PGK rev, GAPDH rev), FBPase, TKT, PRK
        if (advanceStep('calvin', 0, 'forward')) return true;
        if (advanceStep('glycolysis', 6, 'reverse')) return true;  // PGK reverse (3-PGA → BPG)
        if (advanceStep('glycolysis', 5, 'reverse')) return true;  // GAPDH reverse (BPG → G3P)
        if (advanceStep('glycolysis', 3, 'reverse')) return true;  // Aldolase reverse (G3P → F16BP)
        if (advanceStep('calvin', 5, 'forward')) return true;       // FBPase (F16BP → F6P)
        if (advanceStep('glycolysis', 10, 'reverse')) return true;  // TK/SBP (F6P → R5P)
        if (advanceStep('calvin', 7, 'forward')) return true;       // PRK (R5P → RuBP)
        return false;
    }
    function autoStepPPP() {
        if (!simState.pppEnabled) return false;
        // Oxidative phase: G6P → 6-PGL → 6-PGA → R5P
        for (let i = 0; i < 3; i++) {
            if (advanceStep('ppp', i, 'forward')) return true;
        }
        // Non-oxidative regeneration: 6 R5P → 5 F6P → 5 G6P
        if (advanceStep('glycolysis', 10, 'forward')) return true;  // TKT/TAL (R5P → F6P)
        if (advanceStep('glycolysis', 1, 'reverse')) return true;   // PGI (F6P → G6P)
        return false;
    }

    /* ---- Split glycolysis runs: upper (Glc→G3P) and lower (G3P→Pyr) ---- */
    function runGlycolysisUpper() {
        // Glucose + ATP → G6P → F6P + ATP → F1,6BP → 2 G3P  (net: -2 ATP)
        if (!simState.glycolysisEnabled || store.glucose < 1 || store.atp < 2) return false;
        store.glucose--;
        store.atp -= 2;
        store.g3p += 2;
        showActiveStep('Glycolysis (Upper)', 'Glucose + 2 ATP → 2 G3P', { atpConsume: 2 });
        return true;
    }
    function runGlycolysisLower() {
        // 2 G3P + 2 NAD⁺ + 4 ADP → 2 Pyruvate + 2 NADH + 4 ATP  (net: +4 ATP, +2 NADH)
        if (!simState.glycolysisEnabled || store.g3p < 2 || store.totalNad - store.nadh < 2 || store.totalAtpAdp - store.atp < 4) return false;
        store.g3p -= 2;
        store.nadh += 2;
        store.atp += 4;
        store.pyruvate += 2;
        glycRuns++;
        if (dom.glycolysisRun) dom.glycolysisRun.textContent = glycRuns;
        showActiveStep('Glycolysis (Lower)', '2 G3P → 2 Pyruvate + 4 ATP + 2 NADH', { atp: 4, nadh: 2 });
        return true;
    }

    /* ---- Dashboard ---- */
    function animateStatEl(el, newText) {
        if (!el) return;
        if (el.textContent !== newText) {
            el.textContent = newText;
            el.classList.add('bump');
            setTimeout(() => el.classList.remove('bump'), 150);
        }
    }

    function updateBar(bar, ratio, val, total) {
        const pct = Math.round((val / total) * 100) + '%';
        if (bar) { bar.style.width = pct; ratio.textContent = pct; }
    }

    function updateDashboard() {
        updateBar(dom.atpBar, dom.atpRatio, store.atp, store.totalAtpAdp);
        updateBar(dom.nadhBar, dom.nadhRatio, store.nadh, store.totalNad);
        updateBar(dom.nadphBar, dom.nadphRatio, store.nadph, store.totalNadp);
        updateBar(dom.fadh2Bar, dom.fadh2Ratio, store.fadh2, store.totalFad);

        animateStatEl(dom.protonGradient, '' + store.protonGradient);
        animateStatEl(dom.co2Net, '' + (store.co2Produced - store.co2Fixed));
        animateStatEl(dom.o2Net, (store.o2Produced - store.o2Consumed).toFixed(1));
        animateStatEl(dom.h2oNet, '' + (store.h2oProduced - store.h2oSplit));
    }

    /* ---- Render Loop ---- */
    let lastTime = performance.now();
    let etcTimer = 0;
    let metabolicTimer = 0;
    let autoPlayStepIndex = 0;
    let passiveDrainTimer = 0;
    function mainLoop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        simState.time += dt;
        simState.protonGradient = store.protonGradient;

        // Update animation accumulators
        simState.calvinRot.update(dt, simState.calvinEnabled && simState.autoPlay);
        simState.krebsRot.update(dt, simState.krebsEnabled && simState.oxygenAvailable && simState.autoPlay, -1.5);
        simState.pppRot.update(dt, simState.pppEnabled && simState.autoPlay);
        simState.glycolysisFade.update(dt, simState.glycolysisEnabled ? 1 : 0);
        simState.calvinFade.update(dt, simState.calvinEnabled ? 1 : 0);
        simState.krebsFade.update(dt, (simState.krebsEnabled && simState.oxygenAvailable) ? 1 : 0);
        simState.pppFade.update(dt, simState.pppEnabled ? 1 : 0);
        simState.respEtcFade.update(dt, simState.oxygenAvailable ? 1 : 0);
        simState.photoEtcFade.update(dt, simState.lightOn ? 1 : 0);
        simState.fermentFade.update(dt, (!simState.oxygenAvailable && simState.glycolysisEnabled) ? 1 : 0);

        // Auto-Play Logic
        if (simState.autoPlay) {
            etcTimer += dt;
            metabolicTimer += dt;
            passiveDrainTimer += dt;

            // Passive ATP/NADPH drain to mimic cellular maintenance
            if (passiveDrainTimer > 1.6) {
                passiveDrainTimer = 0;
                if (store.atp > 2) store.atp -= 3;
                if (store.nadph > 1) store.nadph -= 2;
                updateDashboard();
            }

            // ETC + ATP synthase — fast tick (continuous membrane processes)
            if (etcTimer > 0.4) {
                etcTimer = 0;
                advanceStep('atp_syn');
                advanceStep('atp_syn');
                advanceStep('atp_syn');
                advanceStep('etc_resp');  // NADH first, then FADH2
                advanceStep('etc_photo');
                advanceStep('nnt');
            }

            // Metabolic pathways — slow tick, round-robin
            if (metabolicTimer > 0.8) {
                metabolicTimer = 0;
                const metabolicSteps = [
                    () => advanceStep('run_krebs'),
                    () => advanceStep('pdh'),
                    () => { if (!simState.lightOn) advanceStep('run_glycolysis_lower'); },
                    () => advanceStep('run_glycolysis_upper'),
                    () => advanceStep('run_calvin'),
                    () => advanceStep('run_ppp'),
                    () => {
                        if (simState.oxygenAvailable) {
                            advanceStep('adh', null, 'forward');
                            advanceStep('aldh');
                            advanceStep('acs');
                        } else {
                            advanceStep('fermentation');
                            advanceStep('adh', null, 'reverse');
                        }
                    },
                ];
                metabolicSteps[autoPlayStepIndex % metabolicSteps.length]();
                autoPlayStepIndex++;
            }
        }

        Renderer.draw(simState);
        requestAnimationFrame(mainLoop);
    }

    // Init state
    updateDashboard();
    showActiveStep('Ready', 'Click a highlighted molecule to start', null);
    requestAnimationFrame(mainLoop);
})();
