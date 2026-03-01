// ─── Krebs cycle reactions ───
import { store, simState, counters } from '../state.js';


export function advanceKrebs(idx, direction) {
    if (!simState.oxygenAvailable || !simState.krebsEnabled) return false;
    const fwd = direction !== 'reverse';
    const rev = direction !== 'forward';

    if (idx === 0) {
        if (fwd && store.acetylCoA > 0 && store.oaa > 0) {
            let t = Math.min(store.acetylCoA, store.oaa, 2);
            store.acetylCoA -= t; store.oaa -= t; store.citrate += t;
            return { enzyme: 'Citrate Synthase', reaction: 'Acetyl-CoA + OAA → Citrate', yields: null };
        }
    }
    else if (idx === 1) {
        if (store.citrate > 0) { let t = Math.min(store.citrate, 2); store.citrate -= t; store.isocitrate += t; return { enzyme: 'Aconitase', reaction: 'Citrate → Isocitrate', yields: null }; }
    }
    else if (idx === 2) {
        if (store.isocitrate > 0 && store.nadh < store.totalNad) {
            let t = Math.min(store.isocitrate, store.totalNad - store.nadh, 2);
            store.isocitrate -= t; store.akg += t; store.nadh += t; store.co2Produced += t;
            return { enzyme: 'Isocitrate DH', reaction: 'Isocitrate → α-KG + CO₂ + NADH', yields: { nadh: t } };
        }
    }
    else if (idx === 3) {
        if (store.akg > 0 && store.nadh < store.totalNad) {
            let t = Math.min(store.akg, store.totalNad - store.nadh, 2);
            store.akg -= t; store.succoa += t; store.nadh += t; store.co2Produced += t;
            return { enzyme: 'α-KGDH', reaction: 'α-KG → Succinyl-CoA + CO₂ + NADH', yields: { nadh: t } };
        }
    }
    else if (idx === 4) {
        if (fwd && store.succoa > 0 && store.atp < store.totalAtpAdp) {
            let t = Math.min(store.succoa, store.totalAtpAdp - store.atp, 2);
            store.succoa -= t; store.succinate += t; store.atp += t;
            return { enzyme: 'SCS', reaction: 'Succinyl-CoA → Succinate + ATP', yields: { atp: t } };
        } else if (rev && store.succinate > 0 && store.atp > 0) {
            let t = Math.min(store.succinate, store.atp, 2);
            store.succinate -= t; store.succoa += t; store.atp -= t;
            return { enzyme: 'SCS (Reverse)', reaction: 'Succinate + ATP → Succinyl-CoA', yields: { atpConsume: t } };
        }
    }
    else if (idx === 5) {
        if (fwd && store.succinate > 0 && store.fadh2 < store.totalFad) {
            let t = Math.min(store.succinate, store.totalFad - store.fadh2, 2);
            store.succinate -= t; store.fumarate += t; store.fadh2 += t;
            return { enzyme: 'SDH', reaction: 'Succinate → Fumarate + FADH₂', yields: { fadh2: t } };
        } else if (rev && store.fumarate > 0 && store.fadh2 > 0) {
            let t = Math.min(store.fumarate, store.fadh2, 2);
            store.fumarate -= t; store.succinate += t; store.fadh2 -= t;
            return { enzyme: 'SDH (Reverse)', reaction: 'Fumarate + FADH₂ → Succinate', yields: null };
        }
    }
    else if (idx === 6) {
        if (store.fumarate > 0) { let t = Math.min(store.fumarate, 2); store.fumarate -= t; store.malate += t; return { enzyme: 'Fumarase', reaction: 'Fumarate → Malate', yields: null }; }
    }
    else if (idx === 7) {
        if (fwd && store.malate > 0 && store.nadh < store.totalNad) {
            let t = Math.min(store.malate, store.totalNad - store.nadh, 2);
            store.malate -= t; store.oaa += t; store.nadh += t;
            counters.krebsTurns += t;
            return { enzyme: 'Malate DH', reaction: 'Malate → OAA + NADH', yields: { nadh: t } };
        } else if (rev && store.oaa > 0 && store.nadh > 0) {
            let t = Math.min(store.oaa, store.nadh, 2);
            store.oaa -= t; store.malate += t; store.nadh -= t;
            return { enzyme: 'Malate DH (Reverse)', reaction: 'OAA + NADH → Malate', yields: { nadhConsume: t } };
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
    return { enzyme: 'Krebs Cycle (×2)', reaction: '2 AcCoA → 4 CO₂ + 6 NADH + 2 FADH₂ + 2 ATP', yields: { nadh: 6, fadh2: 2, atp: 2 } };
}
