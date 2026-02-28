// ─── Pentose Phosphate Pathway reactions ───
import { store, simState, counters } from '../state.js';
import { showActiveStep } from '../dashboard.js';

export function advancePPP(idx, direction) {
    if (!simState.pppEnabled) return false;

    if (idx === 0) {
        if (store.g6p > 0 && store.nadph < store.totalNadp) {
            let t = Math.min(store.g6p, store.totalNadp - store.nadph, 2);
            store.g6p -= t; store.pgl6 += t; store.nadph += t;
            showActiveStep('G6PDH', 'G6P → 6-PGL + NADPH', { nadph: t });
            return true;
        }
    }
    else if (idx === 1) {
        if (store.pgl6 > 0) { let t = Math.min(store.pgl6, 2); store.pgl6 -= t; store.pga6 += t; showActiveStep('Lactonase', '6-PGL → 6-PGA', null); return true; }
    }
    else if (idx === 2) {
        if (store.pga6 > 0 && store.nadph < store.totalNadp) {
            let t = Math.min(store.pga6, store.totalNadp - store.nadph, 2);
            store.pga6 -= t; store.r5p += t; store.nadph += t; store.co2Produced += t;
            counters.pppRuns += t;
            showActiveStep('6PGDH', '6-PGA → R5P + CO₂ + NADPH', { nadph: t });
            return true;
        }
    }
    return false;
}

export function runPPPCycle() {
    if (!simState.pppEnabled || store.g6p < 6 || store.totalNadp - store.nadph < 12) return false;
    store.g6p--;
    store.nadph += 12;
    store.co2Produced += 6;
    counters.pppRuns++;
    showActiveStep('PPP (×6)', 'G6P → 12 NADPH + 6 CO₂', { nadph: 12 });
    return true;
}
