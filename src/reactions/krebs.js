// ─── Krebs cycle reactions ───
import { store, simState, counters } from '../state.js';
import { showActiveStep } from '../dashboard.js';

export function advanceKrebs(idx, direction) {
    if (!simState.oxygenAvailable || !simState.krebsEnabled) return false;
    const fwd = direction !== 'reverse';
    const rev = direction !== 'forward';

    if (idx === 0) {
        if (fwd && store.acetylCoA > 0 && store.oaa > 0) {
            let t = Math.min(store.acetylCoA, store.oaa, 2);
            store.acetylCoA -= t; store.oaa -= t; store.citrate += t;
            showActiveStep('Citrate Synthase', 'Acetyl-CoA + OAA → Citrate', null);
            return true;
        }
    }
    else if (idx === 1) {
        if (store.citrate > 0) { let t = Math.min(store.citrate, 2); store.citrate -= t; store.isocitrate += t; showActiveStep('Aconitase', 'Citrate → Isocitrate', null); return true; }
    }
    else if (idx === 2) {
        if (store.isocitrate > 0 && store.nadh < store.totalNad) {
            let t = Math.min(store.isocitrate, store.totalNad - store.nadh, 2);
            store.isocitrate -= t; store.akg += t; store.nadh += t; store.co2Produced += t;
            showActiveStep('Isocitrate DH', 'Isocitrate → α-KG + CO₂ + NADH', { nadh: t });
            return true;
        }
    }
    else if (idx === 3) {
        if (store.akg > 0 && store.nadh < store.totalNad) {
            let t = Math.min(store.akg, store.totalNad - store.nadh, 2);
            store.akg -= t; store.succoa += t; store.nadh += t; store.co2Produced += t;
            showActiveStep('α-KGDH', 'α-KG → Succinyl-CoA + CO₂ + NADH', { nadh: t });
            return true;
        }
    }
    else if (idx === 4) {
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
    else if (idx === 5) {
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
    else if (idx === 6) {
        if (store.fumarate > 0) { let t = Math.min(store.fumarate, 2); store.fumarate -= t; store.malate += t; showActiveStep('Fumarase', 'Fumarate → Malate', null); return true; }
    }
    else if (idx === 7) {
        if (fwd && store.malate > 0 && store.nadh < store.totalNad) {
            let t = Math.min(store.malate, store.totalNad - store.nadh, 2);
            store.malate -= t; store.oaa += t; store.nadh += t;
            counters.krebsTurns += t;
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

export function runKrebsCycle() {
    if (!simState.oxygenAvailable || !simState.krebsEnabled || store.acetylCoA < 2 || store.oaa < 2 || store.totalNad - store.nadh < 6 || store.totalAtpAdp - store.atp < 2 || store.totalFad - store.fadh2 < 2) return false;
    store.acetylCoA -= 2;
    store.nadh += 6;
    store.fadh2 = Math.min(store.fadh2 + 2, store.totalFad);
    store.atp += 2;
    store.co2Produced += 4;
    counters.krebsTurns += 2;
    showActiveStep('Krebs Cycle (×2)', '2 AcCoA → 4 CO₂ + 6 NADH + 2 FADH₂ + 2 ATP', { nadh: 6, fadh2: 2, atp: 2 });
    return true;
}
