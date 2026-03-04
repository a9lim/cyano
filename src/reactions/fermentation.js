// Fermentation and pyruvate processing — anaerobic NAD+ regeneration
// and aerobic ethanol salvage pathway.
import { store, simState } from '../state.js';


/** PDH (aerobic): Pyruvate → Acetyl-CoA + CO2 + NADH — irreversible link to Krebs */
export function advancePDH() {
    if (!simState.oxygenAvailable) return false;
    if (store.pyruvate >= 2 && store.nadh <= store.totalNad - 2) {
        store.pyruvate -= 2; store.acetylCoA += 2; store.nadh += 2; store.co2Produced += 2;
        return { enzyme: 'Pyruvate DH', reaction: '2 Pyruvate → 2 Acetyl-CoA + 2 CO₂ + 2 NADH', yields: { nadh: 2 } };
    }
    return false;
}

/** PDC (anaerobic): Pyruvate → Acetaldehyde + CO2 — first step of fermentation */
export function advancePDC() {
    if (simState.oxygenAvailable || store.pyruvate < 2) return false;
    store.pyruvate -= 2; store.acetaldehyde += 2; store.co2Produced += 2;
    simState.fermenting = true;
    return { enzyme: 'PDC', reaction: '2 Pyruvate → 2 Acetaldehyde + 2 CO₂', yields: null };
}

/** ADH (bidirectional): Ethanol ↔ Acetaldehyde.
 *  Forward (aerobic): oxidizes ethanol, producing NADH.
 *  Reverse (anaerobic): reduces acetaldehyde, consuming NADH to regenerate NAD+. */
export function advanceADH(direction) {
    const fwd = direction !== 'reverse';
    const rev = direction !== 'forward';
    if (fwd && store.ethanol >= 2 && store.totalNad - store.nadh >= 2) {
        store.ethanol -= 2; store.acetaldehyde += 2; store.nadh += 2;
        return { enzyme: 'ADH', reaction: '2 Ethanol + 2 NAD⁺ → 2 Acetaldehyde + 2 NADH', yields: { nadh: 2 } };
    }
    if (rev && store.acetaldehyde >= 2 && store.nadh >= 2) {
        store.acetaldehyde -= 2; store.nadh -= 2; store.ethanol += 2;
        return { enzyme: 'ADH', reaction: '2 Acetaldehyde + 2 NADH → 2 Ethanol', yields: null };
    }
    return false;
}

/** ALDH (aerobic): Acetaldehyde → Acetic Acid + NADH — detoxification pathway */
export function advanceALDH() {
    if (!simState.oxygenAvailable || store.acetaldehyde < 2 || store.totalNad - store.nadh < 2) return false;
    store.acetaldehyde -= 2; store.aceticAcid += 2; store.nadh += 2;
    return { enzyme: 'ALDH', reaction: '2 Acetaldehyde → 2 Acetic Acid + 2 NADH', yields: { nadh: 2 } };
}

/** Combined fermentation (anaerobic): Pyruvate + NADH → Ethanol + CO2 — regenerates NAD+ for glycolysis */
export function advanceFermentation() {
    if (simState.oxygenAvailable || store.pyruvate < 2 || store.nadh < 2) return false;
    store.pyruvate -= 2; store.nadh -= 2; store.ethanol += 2; store.co2Produced += 2;
    simState.fermenting = true;
    return { enzyme: 'PDC/ADH', reaction: '2 Pyruvate + 2 NADH → 2 Ethanol + 2 CO₂', yields: null };
}

/** ACS (aerobic): Acetic Acid + ATP → Acetyl-CoA — feeds salvaged carbon into Krebs */
export function advanceACS() {
    if (!simState.oxygenAvailable || store.aceticAcid < 2 || store.atp < 2) return false;
    store.aceticAcid -= 2; store.atp -= 2; store.acetylCoA += 2;
    return { enzyme: 'ACS', reaction: '2 Acetic Acid + 2 ATP → 2 Acetyl-CoA', yields: { atpConsume: 2 } };
}
