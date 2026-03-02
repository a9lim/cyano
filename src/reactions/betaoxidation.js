// ─── Beta Oxidation reactions ───
import { store, simState, counters } from '../state.js';


export function advanceBetaOx(idx, direction) {
    if (!simState.betaoxEnabled) return false;
    const fwd = direction !== 'reverse';
    const rev = direction !== 'forward';

    if (idx === 0) {
        // Forward: ACAD (Acyl-CoA dehydrogenase) — oxidation with FAD
        if (fwd && store.fattyAcid > 0 && store.fadh2 < store.totalFad) {
            store.fattyAcid--; store.enoylCoA++; store.fadh2++;
            return { enzyme: 'ACAD', reaction: 'Acyl-CoA + FAD → Enoyl-CoA + FADH₂', yields: { fadh2: 1 } };
        // Reverse: ACC+ER (Acetyl-CoA carboxylase + Enoyl-CoA reductase) — reduction with NADPH + ATP
        } else if (rev && store.enoylCoA > 0 && store.nadph > 0 && store.atp > 0) {
            store.enoylCoA--; store.fattyAcid++; store.nadph--; store.atp--;
            return { enzyme: 'ACC+ER', reaction: 'Enoyl-CoA + NADPH + ATP → Acyl-CoA + NADP⁺ + ADP', yields: { nadphConsume: 1, atpConsume: 1 } };
        }
    }
    else if (idx === 1) {
        // Forward: ECH (Enoyl-CoA hydratase) — hydration
        if (fwd && store.enoylCoA > 0) {
            store.enoylCoA--; store.hydroxyCoA++;
            return { enzyme: 'ECH', reaction: 'Enoyl-CoA + H₂O → OH-Acyl-CoA', yields: null };
        // Reverse: DH (Dehydratase) — dehydration
        } else if (rev && store.hydroxyCoA > 0) {
            store.hydroxyCoA--; store.enoylCoA++;
            return { enzyme: 'DH', reaction: 'OH-Acyl-CoA → Enoyl-CoA + H₂O', yields: null };
        }
    }
    else if (idx === 2) {
        // Forward: HACD (3-Hydroxyacyl-CoA dehydrogenase) — oxidation with NAD⁺
        if (fwd && store.hydroxyCoA > 0 && store.nadh < store.totalNad) {
            store.hydroxyCoA--; store.ketoCoA++; store.nadh++;
            return { enzyme: 'HACD', reaction: 'OH-Acyl-CoA + NAD⁺ → Keto-CoA + NADH', yields: { nadh: 1 } };
        // Reverse: KR (Ketoacyl-CoA reductase) — reduction with NADPH
        } else if (rev && store.ketoCoA > 0 && store.nadph > 0) {
            store.ketoCoA--; store.hydroxyCoA++; store.nadph--;
            return { enzyme: 'KR', reaction: 'Keto-CoA + NADPH → OH-Acyl-CoA + NADP⁺', yields: { nadphConsume: 1 } };
        }
    }
    else if (idx === 3) {
        // Forward: Thiolase — thiolytic cleavage
        if (fwd && store.ketoCoA > 0) {
            store.ketoCoA--; store.fattyAcid++; store.acetylCoA++;
            return { enzyme: 'Thiolase', reaction: 'Keto-CoA + CoA → Acyl-CoA + Acetyl-CoA', yields: null };
        // Reverse: KAS (Ketoacyl-CoA synthase) — condensation with ATP
        } else if (rev && store.fattyAcid > 0 && store.acetylCoA > 0 && store.atp > 0) {
            store.fattyAcid--; store.acetylCoA--; store.atp--; store.ketoCoA++;
            return { enzyme: 'KAS', reaction: 'Acyl-CoA + Acetyl-CoA + ATP → Keto-CoA + ADP', yields: { atpConsume: 1 } };
        }
    }
    return false;
}

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

export function runBetaOxReverse() {
    if (!simState.betaoxEnabled) return false;
    // Fatty acid synthesis: 8 Acetyl-CoA + 14 NADPH + 14 ATP → Palmitoyl-CoA
    // (7 NADPH from KR, 7 NADPH from ACC+ER, 7 ATP from KAS, 7 ATP from ACC+ER)
    if (store.acetylCoA < 8 || store.nadph < 14 || store.atp < 14) return false;
    store.acetylCoA -= 8;
    store.nadph -= 14;
    store.atp -= 14;
    store.fattyAcid++;
    return { enzyme: 'FA Synthesis (×7)', reaction: '8 Acetyl-CoA + 14 NADPH + 14 ATP → Palmitoyl-CoA', yields: { nadphConsume: 14, atpConsume: 14 } };
}
