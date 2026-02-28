// ─── Glycolysis reactions ───
import { store, simState, counters } from '../state.js';
import { showActiveStep } from '../dashboard.js';

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
            showActiveStep('HK', 'Glucose + ATP → G6P', { atpConsume: 1 });
            return true;
        } else if (rev && store.g6p > 0) {
            store.g6p--; store.glucose++;
            showActiveStep('G6Pase', 'G6P → Glucose', null);
            return true;
        }
    }
    else if (idx === 1) {
        if (fwd && store.g6p > 0) {
            store.g6p--; store.f6p++;
            showActiveStep('PGI', 'G6P → F6P', null);
            return true;
        } else if (rev && store.f6p > 0) {
            store.f6p--; store.g6p++;
            showActiveStep('PGI', 'F6P → G6P', null);
            return true;
        }
    }
    else if (idx === 2) {
        if (fwd && store.f6p > 0 && store.atp >= 1) {
            store.f6p--; store.atp--; store.f16bp++;
            showActiveStep('PFK', 'F6P + ATP → F1,6BP', { atpConsume: 1 });
            return true;
        } else if (rev && store.f16bp > 0) {
            store.f16bp--; store.f6p++;
            showActiveStep('FBPase', 'F1,6BP → F6P', null);
            return true;
        }
    }
    else if (idx === 3) {
        if (fwd && store.f16bp > 0) {
            let t = Math.min(store.f16bp, 2);
            store.f16bp -= t; store.g3p += 2 * t;
            showActiveStep('Aldolase/TPI', 'F1,6BP → 2 G3P', null);
            return true;
        } else if (rev && store.g3p >= 2) {
            let t = Math.floor(Math.min(store.g3p / 2, 2));
            store.g3p -= 2 * t; store.f16bp += t;
            showActiveStep('Aldolase (Reverse)', '2 G3P → F1,6BP', null);
            return true;
        }
    }
    else if (idx === 5) {
        if (fwd && store.g3p >= 2 && store.nadh <= store.totalNad - 2) {
            store.g3p -= 2; store.bpg += 2; store.nadh += 2;
            showActiveStep('GAPDH', '2 G3P + 2 NAD⁺ → 2 1,3-BPG', { nadh: 2 });
            return true;
        } else if (rev && store.bpg >= 2 && store.nadph >= 2) {
            store.bpg -= 2; store.g3p += 2; store.nadph -= 2;
            showActiveStep('GAPDH (Reverse)', '2 1,3-BPG + 2 NADPH → 2 G3P', { nadphConsume: 2 });
            return true;
        }
    }
    else if (idx === 6) {
        if (fwd && store.bpg >= 2 && store.atp <= store.totalAtpAdp - 2) {
            store.bpg -= 2; store.pga3 += 2; store.atp += 2;
            showActiveStep('PGK', '2 1,3-BPG + 2 ADP → 2 3-PGA + 2 ATP', { atp: 2 });
            return true;
        } else if (rev && store.pga3 >= 2 && store.atp >= 2) {
            store.pga3 -= 2; store.bpg += 2; store.atp -= 2;
            showActiveStep('PGK (Reverse)', '2 3-PGA + 2 ATP → 2 1,3-BPG', { atpConsume: 2 });
            return true;
        }
    }
    else if (idx === 7) {
        if (fwd && store.pga3 >= 2) { store.pga3 -= 2; store.pga2 += 2; showActiveStep('PGM', '2 3-PGA → 2 2-PGA', null); return true; }
        else if (rev && store.pga2 >= 2) { store.pga2 -= 2; store.pga3 += 2; showActiveStep('PGM (Reverse)', '2 2-PGA → 2 3-PGA', null); return true; }
    }
    else if (idx === 8) {
        if (fwd && store.pga2 >= 2) { store.pga2 -= 2; store.pep += 2; showActiveStep('Enolase', '2 2-PGA → 2 PEP', null); return true; }
        else if (rev && store.pep >= 2) { store.pep -= 2; store.pga2 += 2; showActiveStep('Enolase (Reverse)', '2 PEP → 2 2-PGA', null); return true; }
    }
    else if (idx === 9) {
        if (store.pep >= 2 && store.atp <= store.totalAtpAdp - 2) {
            store.pep -= 2; store.pyruvate += 2; store.atp += 2;
            counters.glycRuns++;
            showActiveStep('PK', '2 PEP + 2 ADP → 2 Pyruvate + 2 ATP', { atp: 2 });
            return true;
        }
    }
    else if (idx === 10) {
        if (fwd && store.r5p >= 6) {
            store.r5p -= 6; store.f6p += 5;
            showActiveStep('TKT+TAL', '6 R5P → 5 F6P (- Sugar)', null);
            return true;
        } else if (rev && store.f6p >= 5) {
            store.f6p -= 5; store.r5p += 6;
            showActiveStep('TK+SBPase', '5 F6P → 6 R5P (+ Sugar)', null);
            return true;
        }
    }
    return false;
}

export function runGlycolysisUpper() {
    if (!simState.glycolysisEnabled || store.glucose < 1 || store.atp < 2) return false;
    store.glucose--;
    store.atp -= 2;
    store.g3p += 2;
    showActiveStep('Glycolysis (Upper)', 'Glucose + 2 ATP → 2 G3P', { atpConsume: 2 });
    return true;
}

export function runGlycolysisLower() {
    if (!simState.glycolysisEnabled || store.g3p < 2 || store.totalNad - store.nadh < 2 || store.totalAtpAdp - store.atp < 4) return false;
    store.g3p -= 2;
    store.nadh += 2;
    store.atp += 4;
    store.pyruvate += 2;
    counters.glycRuns++;
    showActiveStep('Glycolysis (Lower)', '2 G3P → 2 Pyruvate + 4 ATP + 2 NADH', { atp: 4, nadh: 2 });
    return true;
}
