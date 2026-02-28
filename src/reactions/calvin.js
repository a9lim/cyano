// ─── Calvin cycle reactions ───
import { store, simState, counters } from '../state.js';
import { showActiveStep } from '../dashboard.js';

export function advanceCalvin(idx, direction) {
    if (!simState.calvinEnabled) return false;

    if (idx === 0) {
        if (store.rubp > 0) {
            store.rubp -= 1; store.pga3 += 2; store.co2Fixed += 1;
            showActiveStep('RuBisCO', 'RuBP + CO₂ → 2 3-PGA', { co2Fixed: 1 });
            return true;
        }
    }
    else if (idx === 5) {
        if (store.f16bp > 0) {
            let t = Math.min(store.f16bp, 2);
            store.f16bp -= t; store.f6p += t;
            showActiveStep('FBPase', 'F1,6-BP → F6P', null);
            return true;
        }
    }
    else if (idx === 7) {
        if (store.r5p > 0 && store.atp >= 1) {
            let t = Math.min(store.r5p, store.atp, 3);
            store.r5p -= t; store.atp -= t; store.rubp += t;
            showActiveStep('PRK', t + ' R5P + ' + t + ' ATP → ' + t + ' RuBP', { atpConsume: t });
            return true;
        }
    }
    return false;
}

export function runCalvinCycle() {
    if (!simState.calvinEnabled || store.atp < 18 || store.nadph < 12 || store.rubp < 6) return false;
    store.atp -= 18;
    store.nadph -= 12;
    store.g3p += 2;
    store.co2Fixed += 6;
    counters.calvinTurns += 2;
    showActiveStep('Calvin Cycle (×6)', '6 CO₂ + 18 ATP + 12 NADPH → 2 G3P', { atpConsume: 18, nadphConsume: 12 });
    return true;
}
