// Beta-oxidation / fatty acid synthesis — 4-step spiral cleaving 2C units.
// Forward (catabolic): uses FAD + NAD+, produces acetyl-CoA per round.
// Reverse (anabolic): uses NADPH + ATP, builds fatty acid chain.
// 7 rounds fully oxidize palmitoyl-CoA (C16) to 8 acetyl-CoA.
import { store, simState, counters } from '../state.js';


export function advanceBetaOx(idx, direction) {
    if (!simState.betaoxEnabled) return false;
    const fwd = direction !== 'reverse';
    const rev = direction !== 'forward';

    if (idx === 0) {
        // ACAD (fwd): Acyl-CoA dehydrogenase — FAD-linked oxidation
        if (fwd && store.fattyAcid > 0 && store.fadh2 < store.totalFad) {
            store.fattyAcid--; store.enoylCoA++; store.fadh2++;
            return { enzyme: 'ACAD', reaction: 'Acyl-CoA + FAD → Enoyl-CoA + FADH₂', yields: { fadh2: 1 } };
        // ACC+ER (rev): Enoyl reductase — NADPH-dependent reduction + ATP-dependent carboxylation
        } else if (rev && store.enoylCoA > 0 && store.nadph > 0 && store.atp > 0) {
            store.enoylCoA--; store.fattyAcid++; store.nadph--; store.atp--;
            return { enzyme: 'ACC+ER', reaction: 'Enoyl-CoA + NADPH + ATP → Acyl-CoA + NADP⁺ + ADP', yields: { nadphConsume: 1, atpConsume: 1 } };
        }
    }
    else if (idx === 1) {
        // ECH (fwd): Enoyl-CoA hydratase — hydration
        if (fwd && store.enoylCoA > 0) {
            store.enoylCoA--; store.hydroxyCoA++;
            return { enzyme: 'ECH', reaction: 'Enoyl-CoA + H₂O → OH-Acyl-CoA', yields: null };
        // DH (rev): Dehydratase — dehydration
        } else if (rev && store.hydroxyCoA > 0) {
            store.hydroxyCoA--; store.enoylCoA++;
            return { enzyme: 'DH', reaction: 'OH-Acyl-CoA → Enoyl-CoA + H₂O', yields: null };
        }
    }
    else if (idx === 2) {
        // HACD (fwd): 3-Hydroxyacyl-CoA DH — NAD+-linked oxidation
        if (fwd && store.hydroxyCoA > 0 && store.nadh < store.totalNad) {
            store.hydroxyCoA--; store.ketoCoA++; store.nadh++;
            return { enzyme: 'HACD', reaction: 'OH-Acyl-CoA + NAD⁺ → Keto-CoA + NADH', yields: { nadh: 1 } };
        // KR (rev): Ketoacyl reductase — NADPH-dependent reduction
        } else if (rev && store.ketoCoA > 0 && store.nadph > 0) {
            store.ketoCoA--; store.hydroxyCoA++; store.nadph--;
            return { enzyme: 'KR', reaction: 'Keto-CoA + NADPH → OH-Acyl-CoA + NADP⁺', yields: { nadphConsume: 1 } };
        }
    }
    else if (idx === 3) {
        // Thiolase (fwd): thiolytic cleavage releases one acetyl-CoA, shortens chain by 2C
        if (fwd && store.ketoCoA > 0) {
            store.ketoCoA--; store.fattyAcid++; store.acetylCoA++;
            return { enzyme: 'Thiolase', reaction: 'Keto-CoA + CoA → Acyl-CoA + Acetyl-CoA', yields: null };
        // KAS (rev): Ketoacyl synthase — condensation extends chain by 2C at ATP cost
        } else if (rev && store.fattyAcid > 0 && store.acetylCoA > 0 && store.atp > 0) {
            store.fattyAcid--; store.acetylCoA--; store.atp--; store.ketoCoA++;
            return { enzyme: 'KAS', reaction: 'Acyl-CoA + Acetyl-CoA + ATP → Keto-CoA + ADP', yields: { atpConsume: 1 } };
        }
    }
    return false;
}

/** Batch: 7 rounds of beta-oxidation (Palmitoyl-CoA → 8 Acetyl-CoA + 7 FADH2 + 7 NADH) */
export function runBetaOxCycle() {
    if (!simState.betaoxEnabled) return false;
    if (store.fattyAcid < 1 || store.totalFad - store.fadh2 < 7 || store.totalNad - store.nadh < 7) return false;
    store.fattyAcid--;
    store.acetylCoA += 8;
    store.fadh2 += 7;
    store.nadh += 7;
    counters.betaoxRuns++;
    return { enzyme: 'β-Oxidation (×7)', reaction: 'Palmitoyl-CoA → 8 Acetyl-CoA + 7 FADH₂ + 7 NADH', yields: { fadh2: 7, nadh: 7 } };
}

/** Batch: de novo fatty acid synthesis (8 Acetyl-CoA + 14 NADPH + 14 ATP → Palmitoyl-CoA).
 *  Uses different cofactors than degradation: NADPH (not NADH/FADH2) and ATP. */
export function runBetaOxReverse() {
    if (!simState.betaoxEnabled) return false;
    if (store.acetylCoA < 8 || store.nadph < 14 || store.atp < 14) return false;
    store.acetylCoA -= 8;
    store.nadph -= 14;
    store.atp -= 14;
    store.fattyAcid++;
    return { enzyme: 'FA Synthesis (×7)', reaction: '8 Acetyl-CoA + 14 NADPH + 14 ATP → Palmitoyl-CoA', yields: { nadphConsume: 14, atpConsume: 14 } };
}
