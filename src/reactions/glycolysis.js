// ─── Glycolysis reactions ───
import { store, simState, counters } from '../state.js';


export function advanceGlycolysis(idx, direction) {
    const fwd = direction !== 'reverse';
    const rev = direction !== 'forward';
    const isShared = [0, 1, 2, 3, 5, 6, 10].includes(idx);

    if (!isShared && !simState.glycolysisEnabled) return false;
    if (isShared && !simState.glycolysisEnabled && !simState.calvinEnabled && !simState.pppEnabled) return false;
    if (idx === 2 && !simState.glycolysisEnabled && !simState.calvinEnabled) return false;
    if (idx === 3 && !simState.glycolysisEnabled && !simState.calvinEnabled) return false;
    if ((idx === 5 || idx === 6) && !simState.glycolysisEnabled && !simState.calvinEnabled) return false;

    if (idx === 0) {
        if (fwd && store.glucose > 0 && store.atp >= 1) {
            store.glucose--; store.atp--; store.g6p++;
            return { enzyme: 'HK', reaction: 'Glucose + ATP → G6P', yields: { atpConsume: 1 } };
        } else if (rev && store.g6p > 0) {
            store.g6p--; store.glucose++;
            return { enzyme: 'G6Pase', reaction: 'G6P → Glucose', yields: null };
        }
    }
    else if (idx === 1) {
        if (fwd && store.g6p > 0) {
            store.g6p--; store.f6p++;
            return { enzyme: 'PGI', reaction: 'G6P → F6P', yields: null };
        } else if (rev && store.f6p > 0) {
            store.f6p--; store.g6p++;
            return { enzyme: 'PGI', reaction: 'F6P → G6P', yields: null };
        }
    }
    else if (idx === 2) {
        if (fwd && store.f6p > 0 && store.atp >= 1) {
            store.f6p--; store.atp--; store.f16bp++;
            return { enzyme: 'PFK', reaction: 'F6P + ATP → F1,6BP', yields: { atpConsume: 1 } };
        } else if (rev && store.f16bp > 0) {
            store.f16bp--; store.f6p++;
            return { enzyme: 'FBPase', reaction: 'F1,6BP → F6P', yields: null };
        }
    }
    else if (idx === 3) {
        if (fwd && store.f16bp > 0) {
            let t = Math.min(store.f16bp, 2);
            store.f16bp -= t; store.g3p += 2 * t;
            return { enzyme: 'Aldolase/TPI', reaction: 'F1,6BP → 2 G3P', yields: null };
        } else if (rev && store.g3p >= 2) {
            let t = Math.floor(Math.min(store.g3p / 2, 2));
            store.g3p -= 2 * t; store.f16bp += t;
            return { enzyme: 'Aldolase (Reverse)', reaction: '2 G3P → F1,6BP', yields: null };
        }
    }
    else if (idx === 5) {
        if (fwd && store.g3p >= 2 && store.nadh <= store.totalNad - 2) {
            store.g3p -= 2; store.bpg += 2; store.nadh += 2;
            return { enzyme: 'GAPDH', reaction: '2 G3P + 2 NAD⁺ → 2 1,3-BPG', yields: { nadh: 2 } };
        } else if (rev && store.bpg >= 2 && store.nadph >= 2) {
            store.bpg -= 2; store.g3p += 2; store.nadph -= 2;
            return { enzyme: 'GAPDH (Reverse)', reaction: '2 1,3-BPG + 2 NADPH → 2 G3P', yields: { nadphConsume: 2 } };
        }
    }
    else if (idx === 6) {
        if (fwd && store.bpg >= 2 && store.atp <= store.totalAtpAdp - 2) {
            store.bpg -= 2; store.pga3 += 2; store.atp += 2;
            return { enzyme: 'PGK', reaction: '2 1,3-BPG + 2 ADP → 2 3-PGA + 2 ATP', yields: { atp: 2 } };
        } else if (rev && store.pga3 >= 2 && store.atp >= 2) {
            store.pga3 -= 2; store.bpg += 2; store.atp -= 2;
            return { enzyme: 'PGK (Reverse)', reaction: '2 3-PGA + 2 ATP → 2 1,3-BPG', yields: { atpConsume: 2 } };
        }
    }
    else if (idx === 7) {
        if (fwd && store.pga3 >= 2) { store.pga3 -= 2; store.pga2 += 2; return { enzyme: 'PGM', reaction: '2 3-PGA → 2 2-PGA', yields: null }; }
        else if (rev && store.pga2 >= 2) { store.pga2 -= 2; store.pga3 += 2; return { enzyme: 'PGM (Reverse)', reaction: '2 2-PGA → 2 3-PGA', yields: null }; }
    }
    else if (idx === 8) {
        if (fwd && store.pga2 >= 2) { store.pga2 -= 2; store.pep += 2; return { enzyme: 'Enolase', reaction: '2 2-PGA → 2 PEP', yields: null }; }
        else if (rev && store.pep >= 2) { store.pep -= 2; store.pga2 += 2; return { enzyme: 'Enolase (Reverse)', reaction: '2 PEP → 2 2-PGA', yields: null }; }
    }
    else if (idx === 9) {
        if (fwd && store.pep >= 2 && store.atp <= store.totalAtpAdp - 2) {
            store.pep -= 2; store.pyruvate += 2; store.atp += 2;
            counters.glycRuns++;
            return { enzyme: 'PK', reaction: '2 PEP + 2 ADP → 2 Pyruvate + 2 ATP', yields: { atp: 2 } };
        } else if (rev && store.pyruvate >= 2 && store.atp >= 2) {
            store.pyruvate -= 2; store.atp -= 2; store.pep += 2;
            return { enzyme: 'PC+PEPCK', reaction: '2 Pyruvate + 2 ATP → 2 PEP', yields: { atpConsume: 2 } };
        }
    }
    else if (idx === 10) {
        if (fwd && store.r5p >= 6) {
            store.r5p -= 6; store.f6p += 5;
            return { enzyme: 'TKT+TAL', reaction: '6 R5P → 5 F6P (- Sugar)', yields: null };
        } else if (rev && store.f6p >= 5) {
            store.f6p -= 5; store.r5p += 6;
            return { enzyme: 'TK+SBPase', reaction: '5 F6P → 6 R5P (+ Sugar)', yields: null };
        }
    }
    return false;
}

export function runGlycolysisUpper() {
    if (!simState.glycolysisEnabled || store.glucose < 1 || store.atp < 2) return false;
    store.glucose--;
    store.atp -= 2;
    store.g3p += 2;
    return { enzyme: 'Glycolysis (Upper)', reaction: 'Glucose + 2 ATP → 2 G3P', yields: { atpConsume: 2 } };
}

export function runGlycolysisLower() {
    if (!simState.glycolysisEnabled || store.g3p < 2 || store.totalNad - store.nadh < 2 || store.totalAtpAdp - store.atp < 4) return false;
    store.g3p -= 2;
    store.nadh += 2;
    store.atp += 4;
    store.pyruvate += 2;
    counters.glycRuns++;
    return { enzyme: 'Glycolysis (Lower)', reaction: '2 G3P → 2 Pyruvate + 4 ATP + 2 NADH', yields: { atp: 4, nadh: 2 } };
}

export function runGlycolysisLowerReverse() {
    if (!simState.glycolysisEnabled || store.pyruvate < 2 || store.atp < 2) return false;
    store.pyruvate -= 2;
    store.atp -= 2;
    store.pep += 2;
    return { enzyme: 'Gluconeogenesis (PC+PEPCK)', reaction: '2 Pyruvate + 2 ATP → 2 PEP', yields: { atpConsume: 2 } };
}

export function runGlycolysisUpperReverse() {
    if (!simState.glycolysisEnabled || store.g3p < 2) return false;
    store.g3p -= 2;
    store.glucose++;
    return { enzyme: 'Gluconeogenesis (Upper)', reaction: '2 G3P → Glucose', yields: null };
}
