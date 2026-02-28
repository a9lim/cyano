// ─── Fermentation & related reactions ───
import { store, simState } from '../state.js';
import { showActiveStep } from '../dashboard.js';

export function advancePDH() {
    if (!simState.oxygenAvailable) return false;
    if (store.pyruvate >= 2 && store.nadh <= store.totalNad - 2) {
        store.pyruvate -= 2; store.acetylCoA += 2; store.nadh += 2; store.co2Produced += 2;
        showActiveStep('Pyruvate DH', '2 Pyruvate → 2 Acetyl-CoA + 2 CO₂ + 2 NADH', { nadh: 2 });
        return true;
    }
    return false;
}

export function advancePDC() {
    if (simState.oxygenAvailable || store.pyruvate < 2) return false;
    store.pyruvate -= 2; store.acetaldehyde += 2; store.co2Produced += 2;
    simState.fermenting = true;
    showActiveStep('PDC', '2 Pyruvate → 2 Acetaldehyde + 2 CO₂', null);
    return true;
}

export function advanceADH(direction) {
    const fwd = direction !== 'reverse';
    const rev = direction !== 'forward';
    if (fwd && store.ethanol >= 2 && store.totalNad - store.nadh >= 2) {
        store.ethanol -= 2; store.acetaldehyde += 2; store.nadh += 2;
        showActiveStep('ADH', '2 Ethanol + 2 NAD⁺ → 2 Acetaldehyde + 2 NADH', { nadh: 2 });
        return true;
    }
    if (rev && store.acetaldehyde >= 2 && store.nadh >= 2) {
        store.acetaldehyde -= 2; store.nadh -= 2; store.ethanol += 2;
        showActiveStep('ADH', '2 Acetaldehyde + 2 NADH → 2 Ethanol', null);
        return true;
    }
    return false;
}

export function advanceALDH() {
    if (!simState.oxygenAvailable || store.acetaldehyde < 2 || store.totalNad - store.nadh < 2) return false;
    store.acetaldehyde -= 2; store.aceticAcid += 2; store.nadh += 2;
    showActiveStep('ALDH', '2 Acetaldehyde → 2 Acetic Acid + 2 NADH', { nadh: 2 });
    return true;
}

export function advanceFermentation() {
    if (simState.oxygenAvailable || store.pyruvate < 2 || store.nadh < 2) return false;
    store.pyruvate -= 2; store.nadh -= 2; store.ethanol += 2; store.co2Produced += 2;
    simState.fermenting = true;
    showActiveStep('PDC/ADH', '2 Pyruvate + 2 NADH → 2 Ethanol + 2 CO₂', null);
    return true;
}

export function advanceACS() {
    if (!simState.oxygenAvailable || store.aceticAcid < 2 || store.atp < 2) return false;
    store.aceticAcid -= 2; store.atp -= 2; store.acetylCoA += 2;
    showActiveStep('ACS', '2 Acetic Acid + 2 ATP → 2 Acetyl-CoA', { atpConsume: 2 });
    return true;
}
