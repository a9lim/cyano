/* ===================================================================
   sim.js — Click-to-advance simulation with flexible bi-directional reactions
   =================================================================== */

(function () {
    'use strict';

    const simState = {
        time: 0, speed: 1, lightOn: true, oxygenAvailable: true, fermenting: false,
        glycolysisEnabled: true, pppEnabled: true, calvinEnabled: true, krebsEnabled: true,
        oxphosEnabled: true, linearLightEnabled: true, cyclicLightEnabled: true,
        store: null // will reference the store object for renderer highlighting
    };

    const store = {
        // Core energy
        atp: 5, nadh: 0, nadph: 0, fadh2: 0,
        totalAtpAdp: 20, totalNad: 20, totalNadp: 20,
        // Active tracking
        protonGradient: 0, protonsPumped: 0, o2Produced: 0, o2Consumed: 0, h2oSplit: 0, electronsTransferred: 0, co2Fixed: 0,

        // --- Metabolite Pools ---
        // Glycolysis / Gluconeogenesis
        glucose: 1, g6p: 0, f6p: 0, f16bp: 0, g3p: 0, bpg: 0, pga3: 0, pga2: 0, pep: 0, pyruvate: 0, ethanol: 0,
        // PPP
        pgl6: 0, pga6: 0, xu5p: 0, s7p: 0, r5p: 0,
        // Calvin
        rubp: 3,
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
        resetBtn: document.getElementById('reset-btn'),
        // Ratio Bars
        atpBar: document.getElementById('atp-bar'), atpRatio: document.getElementById('atp-ratio'),
        nadhBar: document.getElementById('nadh-bar'), nadhRatio: document.getElementById('nadh-ratio'),
        nadphBar: document.getElementById('nadph-bar'), nadphRatio: document.getElementById('nadph-ratio'),
        // Counters
        protonGradient: document.getElementById('proton-gradient'),
        protonsPumped: document.getElementById('protons-pumped'), o2Produced: document.getElementById('o2-produced'),
        o2Consumed: document.getElementById('o2-consumed'), h2oSplit: document.getElementById('h2o-split'),
        electronsTransferred: document.getElementById('electrons-transferred'),
        // Active Step
        krebsEnzyme: document.getElementById('krebs-enzyme'), krebsReaction: document.getElementById('krebs-reaction'),
        krebsYield: document.getElementById('krebs-yield'), krebsTurn: document.getElementById('krebs-turn'),
        calvinTurn: document.getElementById('calvin-turn'), glycolysisRun: document.getElementById('glycolysis-run'),
    };

    let krebsTurns = 0, calvinTurns = 0, glycRuns = 0;

    /* ---- Init ---- */
    Renderer.init(dom.canvas);

    // Toggles
    dom.lightToggle.addEventListener('change', () => {
        simState.lightOn = dom.lightToggle.checked;
        document.body.classList.toggle('light-mode', simState.lightOn);
    });
    document.body.classList.toggle('light-mode', simState.lightOn);
    dom.oxygenToggle.addEventListener('change', () => simState.oxygenAvailable = dom.oxygenToggle.checked);
    dom.glycToggle.addEventListener('change', () => simState.glycolysisEnabled = dom.glycToggle.checked);
    dom.pppToggle.addEventListener('change', () => simState.pppEnabled = dom.pppToggle.checked);
    dom.calvinToggle.addEventListener('change', () => simState.calvinEnabled = dom.calvinToggle.checked);
    dom.krebsToggle.addEventListener('change', () => simState.krebsEnabled = dom.krebsToggle.checked);
    dom.resetBtn.addEventListener('click', resetSimulation);

    function resetSimulation() {
        Object.keys(store).forEach(k => store[k] = 0);
        store.atp = 5; store.glucose = 1; store.oaa = 2; store.rubp = 3;
        store.totalAtpAdp = 20; store.totalNad = 20; store.totalNadp = 20;
        krebsTurns = 0; calvinTurns = 0; glycRuns = 0;
        dom.krebsTurn.textContent = '0'; dom.calvinTurn.textContent = '0'; dom.glycolysisRun.textContent = '0';
        simState.time = 0; simState.fermenting = false;
        Renderer.electrons = []; Renderer.protons = [];
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
        if (y.fadh2) store.fadh2 += y.fadh2;
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
       REACTION LOGIC
       ============================================================ */
    function advanceStep(pathway, stepIndex) {
        let ran = false;
        if (pathway === 'glycolysis') ran = advanceGlycolysis(stepIndex);
        else if (pathway === 'calvin') ran = advanceCalvin(stepIndex);
        else if (pathway === 'ppp') ran = advancePPP(stepIndex);
        else if (pathway === 'krebs') ran = advanceKrebs(stepIndex);
        else if (pathway === 'pdh') ran = advancePDH();
        else if (pathway === 'fermentation') ran = advanceFermentation();
        else if (pathway === 'etc_resp' || pathway === 'etc_photo' || pathway === 'etc_cyclic') ran = advanceETC(pathway);
        else if (pathway === 'run_krebs') ran = runKrebsCycle();
        else if (pathway === 'run_calvin') ran = runCalvinCycle();
        else if (pathway === 'run_ppp') ran = runPPPCycle();
        else if (pathway === 'run_glycolysis') ran = runGlycolysis();
        else if (pathway === 'atp_syn') ran = advanceATPSynthase();
        else if (pathway === 'br') ran = advanceBacteriorhodopsin();

        updateDashboard();
    }
    Renderer.onEnzymeClick = advanceStep;

    function advanceGlycolysis(idx) {
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
            if (store.glucose > 0 && store.atp >= 1) {
                store.glucose--; store.atp--; store.g6p++;
                showActiveStep('HK / G6Pase', 'Glucose + ATP → G6P', { atpConsume: 1 });
                return true;
            } else if (store.g6p > 0) {
                store.g6p--; store.glucose++;
                showActiveStep('HK / G6Pase (Reverse)', 'G6P → Glucose', null);
                return true;
            }
        }
        else if (idx === 1) { // PGI (Reversible)
            if (store.g6p > 0) {
                store.g6p--; store.f6p++;
                showActiveStep('PGI', 'G6P → F6P', null);
                return true;
            } else if (store.f6p > 0) {
                store.f6p--; store.g6p++;
                showActiveStep('PGI', 'F6P → G6P', null);
                return true;
            }
        }
        else if (idx === 2) { // PFK / FBPase
            if (store.f6p > 0 && store.atp >= 1) {
                store.f6p--; store.atp--; store.f16bp++;
                showActiveStep('PFK / FBPase', 'F6P + ATP → F1,6BP', { atpConsume: 1 });
                return true;
            } else if (store.f16bp > 0) {
                store.f16bp--; store.f6p++;
                showActiveStep('PFK / FBPase (Reverse)', 'F1,6BP → F6P', null);
                return true;
            }
        }
        else if (idx === 3) { // Aldolase (Reversible)
            if (store.f16bp > 0) {
                let t = Math.min(store.f16bp, 2);
                store.f16bp -= t; store.g3p += 2 * t;
                showActiveStep('Aldolase/TPI', 'F1,6BP → 2× G3P', null);
                return true;
            } else if (store.g3p >= 2) {
                let t = Math.floor(Math.min(store.g3p / 2, 2));
                store.g3p -= 2 * t; store.f16bp += t;
                showActiveStep('Aldolase (Reverse)', '2× G3P → F1,6BP', null);
                return true;
            }
        }
        else if (idx === 5) { // GAPDH (Reversible)
            if (store.g3p >= 2 && store.nadh <= store.totalNad - 2) { // Glycolytic: NAD+ dependent
                store.g3p -= 2; store.bpg += 2; store.nadh += 2;
                showActiveStep('GAPDH', '2× G3P + 2NAD⁺ → 2× 1,3-BPG', { nadh: 2 });
                return true;
            } else if (store.bpg >= 2 && store.nadph >= 2) { // Calvin/Gluconeo: NADPH dependent
                store.bpg -= 2; store.g3p += 2; store.nadph -= 2;
                showActiveStep('GAPDH (Reverse)', '2× 1,3-BPG + 2NADPH → 2× G3P', { nadphConsume: 2 });
                return true;
            }
        }
        else if (idx === 6) { // PGK (Reversible)
            if (store.bpg >= 2 && store.atp <= store.totalAtpAdp - 2) {
                store.bpg -= 2; store.pga3 += 2; store.atp += 2;
                showActiveStep('PGK', '2× 1,3-BPG + 2ADP → 2× 3-PGA + 2ATP', { atp: 2 });
                return true;
            } else if (store.pga3 >= 2 && store.atp >= 2) {
                store.pga3 -= 2; store.bpg += 2; store.atp -= 2;
                showActiveStep('PGK (Reverse)', '2× 3-PGA + 2ATP → 2× 1,3-BPG', { atpConsume: 2 });
                return true;
            }
        }
        else if (idx === 7) { // PGM (Reversible)
            if (store.pga3 >= 2) { store.pga3 -= 2; store.pga2 += 2; showActiveStep('PGM', '2× 3-PGA → 2× 2-PGA', null); return true; }
            else if (store.pga2 >= 2) { store.pga2 -= 2; store.pga3 += 2; showActiveStep('PGM (Reverse)', '2× 2-PGA → 2× 3-PGA', null); return true; }
        }
        else if (idx === 8) { // Enolase (Reversible)
            if (store.pga2 >= 2) { store.pga2 -= 2; store.pep += 2; showActiveStep('Enolase', '2× 2-PGA → 2× PEP', null); return true; }
            else if (store.pep >= 2) { store.pep -= 2; store.pga2 += 2; showActiveStep('Enolase (Reverse)', '2× PEP → 2× 2-PGA', null); return true; }
        }
        else if (idx === 9) { // PK / PEPCK
            if (store.pep >= 2 && store.atp <= store.totalAtpAdp - 2) {
                store.pep -= 2; store.pyruvate += 2; store.atp += 2;
                glycRuns += 2; dom.glycolysisRun.textContent = Math.floor(glycRuns / 2); // 1 glucose = 2 pyruvates = 1 run
                showActiveStep('PK / PEPCK', '2× PEP + 2ADP → 2× Pyruvate + 2ATP', { atp: 2 });
                return true;
            } else if (store.pyruvate >= 2 && store.atp >= 2) {
                store.pyruvate -= 2; store.pep += 2; store.atp -= 2;
                showActiveStep('PK / PEPCK (Reverse)', '2× Pyruvate + 2ATP → 2× PEP', { atpConsume: 2 });
                return true;
            }
        }
        else if (idx === 10) { // TKT / TAL / TK / SBP (Shared F6P <-> R5P)
            if (store.r5p >= 6) {
                store.r5p -= 6; store.f6p += 5;
                showActiveStep('TKT / TAL (Forward)', '6 R5P → 5 F6P (- Sugar)', null);
                return true;
            } else if (store.f6p >= 5) {
                store.f6p -= 5; store.r5p += 6;
                showActiveStep('TK / SBPase (Reverse)', '5 F6P → 6 R5P (+ Sugar)', null);
                return true;
            } else if (store.r5p > 0) {
                let t = Math.min(store.r5p, 2);
                store.r5p -= t; store.f6p += t;
                showActiveStep('TKT / TAL (Partial)', 'R5P → F6P (- Sugar)', null);
                return true;
            } else if (store.f6p > 0) {
                let t = Math.min(store.f6p, 2);
                store.f6p -= t; store.r5p += t;
                showActiveStep('TK / SBPase (Partial)', 'F6P → R5P (+ Sugar)', null);
                return true;
            }
        }
        return false;
    }

    function advanceCalvin(idx) {
        if (!simState.calvinEnabled) return false;

        if (idx === 0) { // RuBisCO
            if (store.rubp > 0) {
                let t = Math.min(store.rubp, 2);
                store.rubp -= t; store.pga3 += 2 * t; store.co2Fixed += t;
                showActiveStep('RuBisCO', 'RuBP -CO₂ → 2× 3-PGA', { co2Fixed: t });
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
        else if (idx === 7) { // PRK
            if (store.r5p > 0 && store.atp >= 1) {
                let t = Math.min(store.r5p, store.atp, 2);
                store.r5p -= t; store.atp -= t; store.rubp += t;
                showActiveStep('PRK', 'R5P -ATP → RuBP', { atpConsume: t });
                return true;
            }
        }
        return false;
    }

    function advancePPP(idx) {
        if (!simState.pppEnabled) return false;

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
                store.pga6 -= t; store.r5p += t; store.nadph += t; store.co2Fixed -= t; // arbitrary tracking
                showActiveStep('6PGDH', '6-PGA → R5P + NADPH', { nadph: t });
                return true;
            }
        }
        return false;
    }

    function advancePDH() {
        if (!simState.oxygenAvailable) return false;
        if (store.pyruvate >= 2 && store.nadh <= store.totalNad - 2) {
            store.pyruvate -= 2; store.acetylCoA += 2; store.nadh += 2;
            showActiveStep('Pyruvate DH', '2× Pyruvate → 2× Acetyl-CoA + 2NADH', { nadh: 2 });
            return true;
        }
        return false;
    }

    function advanceKrebs(idx) {
        if (!simState.oxygenAvailable || !simState.krebsEnabled) return false;

        if (idx === 0) { // Citrate Synthase
            if (store.acetylCoA > 0 && store.oaa > 0) {
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
                store.isocitrate -= t; store.akg += t; store.nadh += t;
                showActiveStep('Isocitrate DH', 'Isocitrate → α-KG + NADH', { nadh: t });
                return true;
            }
        }
        else if (idx === 3) { // KGDH
            if (store.akg > 0 && store.nadh < store.totalNad) {
                let t = Math.min(store.akg, store.totalNad - store.nadh, 2);
                store.akg -= t; store.succoa += t; store.nadh += t;
                showActiveStep('α-KGDH', 'α-KG → Succinyl-CoA + NADH', { nadh: t });
                return true;
            }
        }
        else if (idx === 4) { // Succinyl-CoA Synthetase
            if (store.succoa > 0 && store.atp < store.totalAtpAdp) {
                let t = Math.min(store.succoa, store.totalAtpAdp - store.atp, 2);
                store.succoa -= t; store.succinate += t; store.atp += t;
                showActiveStep('SCS', 'Succinyl-CoA → Succinate + ATP', { atp: t });
                return true;
            } else if (store.succinate > 0 && store.atp > 0) {
                let t = Math.min(store.succinate, store.atp, 2);
                store.succinate -= t; store.succoa += t; store.atp -= t;
                showActiveStep('SCS (Reverse)', 'Succinate + ATP → Succinyl-CoA', { atpConsume: t });
                return true;
            }
        }
        else if (idx === 5) { // SDH
            if (store.succinate > 0) {
                let t = Math.min(store.succinate, 2);
                store.succinate -= t; store.fumarate += t; store.fadh2 += t;
                showActiveStep('SDH', 'Succinate → Fumarate + FADH₂', { fadh2: t });
                return true;
            } else if (store.fumarate > 0 && store.fadh2 > 0) {
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
            if (store.malate > 0 && store.nadh < store.totalNad) {
                let t = Math.min(store.malate, store.totalNad - store.nadh, 2);
                store.malate -= t; store.oaa += t; store.nadh += t;
                krebsTurns += t; dom.krebsTurn.textContent = krebsTurns;
                showActiveStep('Malate DH', 'Malate → OAA + NADH', { nadh: t });
                return true;
            } else if (store.oaa > 0 && store.nadh > 0) {
                let t = Math.min(store.oaa, store.nadh, 2);
                store.oaa -= t; store.malate += t; store.nadh -= t;
                showActiveStep('Malate DH (Reverse)', 'OAA + NADH → Malate', { nadhConsume: t });
                return true;
            }
        }
        return false;
    }

    function advanceFermentation() {
        if (simState.oxygenAvailable || store.pyruvate < 2 || store.nadh < 2) return false;
        store.pyruvate -= 2; store.nadh -= 2; store.ethanol += 2;
        simState.fermenting = true;
        showActiveStep('PDC/ADH', '2× Pyruvate + 2NADH → 2× Ethanol + 2NAD⁺', null);
        return true;
    }

    function advanceETC(pathway) {
        if (pathway === 'etc_resp') {
            if (!simState.oxygenAvailable || !simState.oxphosEnabled) return false;
            let src = null;
            if (store.nadh > 0) { store.nadh--; src = 'ndh1'; pumpProtons(4, 'ndh1'); }
            else if (store.fadh2 > 0) { store.fadh2--; src = 'sdh'; }
            if (src) {
                store.electronsTransferred += 2;
                Renderer.spawnElectron(src, 'pq', 'resp');
                setTimeout(() => { Renderer.spawnElectron('pq', 'cytb6f', 'resp'); pumpProtons(2, 'cytb6f'); }, 300);
                setTimeout(() => { Renderer.spawnElectron('cytb6f', 'cytOx', 'resp'); pumpProtons(2, 'cytOx'); store.o2Consumed += 0.5; }, 600);
                return true;
            }
        } else if (pathway === 'etc_photo') {
            if (!simState.lightOn || !simState.linearLightEnabled) return false;
            store.h2oSplit++; store.o2Produced += 0.5; store.electronsTransferred += 2;
            pumpProtons(4, 'psii');
            Renderer.spawnElectron('psii', 'pq', 'photo');
            setTimeout(() => { Renderer.spawnElectron('pq', 'cytb6f', 'photo'); pumpProtons(2, 'cytb6f'); }, 250);
            setTimeout(() => Renderer.spawnElectron('cytb6f', 'pc', 'photo'), 500);
            setTimeout(() => Renderer.spawnElectron('pc', 'psi', 'photo'), 750);
            setTimeout(() => Renderer.spawnElectron('psi', 'fd', 'photo'), 1000);
            setTimeout(() => {
                Renderer.spawnElectron('fd', 'fnr', 'photo');
                if (store.nadph < store.totalNadp) store.nadph++;
            }, 1200);
            return true;
        } else if (pathway === 'etc_cyclic') {
            if (!simState.lightOn || !simState.cyclicLightEnabled) return false;
            store.electronsTransferred += 2;
            Renderer.spawnElectron('fd', 'pq', 'cyclic');
            setTimeout(() => { Renderer.spawnElectron('pq', 'cytb6f', 'cyclic'); pumpProtons(2, 'cytb6f'); }, 350);
            setTimeout(() => Renderer.spawnElectron('cytb6f', 'pc', 'cyclic'), 700);
            setTimeout(() => Renderer.spawnElectron('pc', 'psi', 'cyclic'), 1000);
            return true;
        }
        return false;
    }

    function advanceBacteriorhodopsin() {
        if (!simState.lightOn) return false;
        store.protonGradient += 1; store.protonsPumped += 1;
        const cx = Renderer.etcComplexes.br?.cx;
        if (cx) Renderer.spawnProton(cx, 'up');
        return true;
    }

    function advanceATPSynthase() {
        if (store.protonGradient >= 4 && store.atp < store.totalAtpAdp) {
            store.protonGradient -= 4; store.atp++;
            const cx = Renderer.etcComplexes.atpSyn?.cx;
            if (cx) for (let i = 0; i < 4; i++) setTimeout(() => Renderer.spawnProton(cx, 'down'), i * 60);
            return true;
        }
        return false;
    }

    function runKrebsCycle() {
        if (!simState.oxygenAvailable || !simState.krebsEnabled || store.acetylCoA < 1 || store.totalNad - store.nadh < 3 || store.totalAtpAdp - store.atp < 1) return false;
        store.acetylCoA--;
        store.nadh += 3;
        store.fadh2++;
        store.atp++;
        krebsTurns++;
        dom.krebsTurn.textContent = krebsTurns;
        showActiveStep('Krebs Cycle (Full)', 'Acetyl-CoA → 2 CO₂ + 3 NADH + FADH₂ + ATP', { nadh: 3, fadh2: 1, atp: 1 });
        return true;
    }

    function runGlycolysis() {
        if (!simState.glycolysisEnabled || store.glucose < 1 || store.totalAtpAdp - store.atp < 2 || store.totalNad - store.nadh < 2) return false;
        store.glucose--;
        store.atp += 2;
        store.nadh += 2;
        store.pyruvate += 2;
        glycRuns++;
        if (dom.glycolysisRun) dom.glycolysisRun.textContent = glycRuns;
        showActiveStep('Glycolysis (Full)', 'Glucose → 2 Pyruvate + 2 ATP + 2 NADH', { atp: 2, nadh: 2 });
        return true;
    }

    function runCalvinCycle() {
        if (!simState.calvinEnabled || store.atp < 9 || store.nadph < 6 || store.rubp < 3) return false;
        store.atp -= 9;
        store.nadph -= 6;
        // Regenerates 3 RuBP, yielding 1 net G3P
        store.g3p += 1;
        store.co2Fixed += 3;
        calvinTurns++;
        dom.calvinTurn.textContent = calvinTurns;
        showActiveStep('Calvin Cycle (Full)', '3 CO₂ + 9 ATP + 6 NADPH → G3P', { atpConsume: 9, nadphConsume: 6 });
        return true;
    }

    function runPPPCycle() {
        if (!simState.pppEnabled || store.g6p < 1 || store.totalNadp - store.nadph < 2) return false;
        store.g6p--;
        store.nadph += 2;
        store.r5p++;
        store.co2Fixed--;
        showActiveStep('PPP (Full)', 'G6P → R5P + CO₂ + 2 NADPH', { nadph: 2 });
        return true;
    }

    /* ---- Dashboard ---- */
    function updateDashboard() {
        const atpPct = Math.round((store.atp / store.totalAtpAdp) * 100);
        dom.atpBar.style.width = atpPct + '%'; dom.atpRatio.textContent = atpPct + '%';
        const nadhPct = Math.round((store.nadh / store.totalNad) * 100);
        dom.nadhBar.style.width = nadhPct + '%'; dom.nadhRatio.textContent = nadhPct + '%';
        const nadphPct = Math.round((store.nadph / store.totalNadp) * 100);
        dom.nadphBar.style.width = nadphPct + '%'; dom.nadphRatio.textContent = nadphPct + '%';

        dom.protonGradient.textContent = store.protonGradient;
        dom.protonsPumped.textContent = store.protonsPumped; dom.o2Produced.textContent = store.o2Produced.toFixed(1);
        dom.o2Consumed.textContent = store.o2Consumed.toFixed(1); dom.h2oSplit.textContent = store.h2oSplit;
        dom.electronsTransferred.textContent = store.electronsTransferred;
    }

    /* ---- Render Loop ---- */
    let lastTime = performance.now();
    function mainLoop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        simState.time += dt;
        simState.protonGradient = store.protonGradient;
        Renderer.draw(simState);
        requestAnimationFrame(mainLoop);
    }

    // Init state
    updateDashboard();
    showActiveStep('Ready', 'Click a highlighted molecule to start', null);
    requestAnimationFrame(mainLoop);
})();
