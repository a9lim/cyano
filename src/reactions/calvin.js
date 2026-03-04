// Calvin cycle — carbon fixation using ATP + NADPH from light reactions.
// Only 3 of the 8 conceptual steps are modeled (the others are shared
// glycolysis enzymes running in reverse via dispatch.js).
import { store, simState, counters } from '../state.js';


export function advanceCalvin(idx, direction) {
    if (!simState.calvinEnabled) return false;

    // Step 0: RuBisCO — CO2 fixation (RuBP + CO2 → 2x 3-PGA)
    if (idx === 0) {
        if (store.rubp > 0) {
            store.rubp -= 1; store.pga3 += 2; store.co2Fixed += 1;
            return { enzyme: 'RuBisCO', reaction: 'RuBP + CO₂ → 2 3-PGA', yields: { co2Fixed: 1 } };
        }
    }
    // Step 5: FBPase — dephosphorylation (shared with gluconeogenesis)
    else if (idx === 5) {
        if (store.f16bp > 0) {
            let t = Math.min(store.f16bp, 2);
            store.f16bp -= t; store.f6p += t;
            return { enzyme: 'FBPase', reaction: 'F1,6-BP → F6P', yields: null };
        }
    }
    // Step 7: PRK — regenerates RuBP from R5P at the cost of ATP
    else if (idx === 7) {
        if (store.r5p > 0 && store.atp >= 1) {
            let t = Math.min(store.r5p, store.atp, 3);
            store.r5p -= t; store.atp -= t; store.rubp += t;
            return { enzyme: 'PRK', reaction: t + ' R5P + ' + t + ' ATP → ' + t + ' RuBP', yields: { atpConsume: t } };
        }
    }
    return false;
}

/** Batch: 6 Calvin turns (6 CO2 + 18 ATP + 12 NADPH → 2 G3P net) */
export function runCalvinCycle() {
    if (!simState.calvinEnabled || store.atp < 18 || store.nadph < 12 || store.rubp < 6) return false;
    store.atp -= 18;
    store.nadph -= 12;
    store.g3p += 2;
    store.co2Fixed += 6;
    counters.calvinTurns += 2;
    return { enzyme: 'Calvin Cycle (×6)', reaction: '6 CO₂ + 18 ATP + 12 NADPH → 2 G3P', yields: { atpConsume: 18, nadphConsume: 12 } };
}
