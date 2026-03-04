// Pentose Phosphate Pathway — oxidative phase only (3 steps).
// Primary role: NADPH production for biosynthesis and antioxidant defense.
// Non-oxidative rearrangement is handled by glycolysis step 10 (TKT+TAL).
import { store, simState, counters } from '../state.js';


export function advancePPP(idx, direction) {
    if (!simState.pppEnabled) return false;

    // Step 0: G6PDH — rate-limiting, allosterically regulated by NADPH/NADP+ ratio
    if (idx === 0) {
        if (store.g6p > 0 && store.nadph < store.totalNadp) {
            let t = Math.min(store.g6p, store.totalNadp - store.nadph, 2);
            store.g6p -= t; store.pgl6 += t; store.nadph += t;
            return { enzyme: 'G6PDH', reaction: 'G6P → 6-PGL + NADPH', yields: { nadph: t } };
        }
    }
    // Step 1: Lactonase — hydrolysis (spontaneous in vivo)
    else if (idx === 1) {
        if (store.pgl6 > 0) { let t = Math.min(store.pgl6, 2); store.pgl6 -= t; store.pga6 += t; return { enzyme: 'Lactonase', reaction: '6-PGL → 6-PGA', yields: null }; }
    }
    // Step 2: 6PGDH — oxidative decarboxylation, second NADPH + CO2
    else if (idx === 2) {
        if (store.pga6 > 0 && store.nadph < store.totalNadp) {
            let t = Math.min(store.pga6, store.totalNadp - store.nadph, 2);
            store.pga6 -= t; store.r5p += t; store.nadph += t; store.co2Produced += t;
            counters.pppRuns += t;
            return { enzyme: '6PGDH', reaction: '6-PGA → R5P + CO₂ + NADPH', yields: { nadph: t } };
        }
    }
    return false;
}

/** Batch: 6 PPP turns (net: G6P → 12 NADPH + 6 CO2, R5P recycled to G6P) */
export function runPPPCycle() {
    if (!simState.pppEnabled || store.g6p < 6 || store.totalNadp - store.nadph < 12) return false;
    store.g6p--;
    store.nadph += 12;
    store.co2Produced += 6;
    counters.pppRuns++;
    return { enzyme: 'PPP (×6)', reaction: 'G6P → 12 NADPH + 6 CO₂', yields: { nadph: 12 } };
}
