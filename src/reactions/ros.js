// Reactive Oxygen Species scavenging — three defense layers against
// superoxide produced by electron leak at Complex I and the Q-cycle.
import { store } from '../state.js';
import { showActiveStep } from '../dashboard.js';

/** SOD: dismutates superoxide → H2O2 (no cofactor cost) */
export function advanceSOD() {
    if (store.rosProduced - store.rosScavenged < 2) return false;
    store.rosScavenged += 2;
    showActiveStep('SOD', '2 O₂⁻ → H₂O₂ + ½O₂', {}, 'ros');
    return { enzyme: 'SOD', reaction: '2 O₂⁻ → H₂O₂ + ½O₂', yields: {} };
}

/** Catalase: decomposes H2O2 → H2O + O2 (no cofactor cost) */
export function advanceCatalase() {
    if (store.rosProduced - store.rosScavenged < 2) return false;
    store.rosScavenged += 2;
    store.o2Produced += 0.5;
    showActiveStep('Catalase', '2 H₂O₂ → 2 H₂O + O₂', {}, 'ros');
    return { enzyme: 'Catalase', reaction: '2 H₂O₂ → 2 H₂O + O₂', yields: {} };
}

/** GPx: glutathione peroxidase — consumes NADPH via glutathione reductase.
 *  Links PPP NADPH production directly to antioxidant defense. */
export function advanceGPx() {
    if (store.rosProduced - store.rosScavenged < 1 || store.nadph < 1) return false;
    store.rosScavenged += 1;
    store.nadph -= 1;
    showActiveStep('GPx', 'ROS + NADPH → scavenged', { nadphConsume: 1 }, 'ros');
    return { enzyme: 'GPx', reaction: 'ROS + NADPH → scavenged', yields: { nadphConsume: 1 } };
}

/** Batch: run all available scavenging in priority order (SOD → Catalase → GPx) */
export function runROSScavenging() {
    const activeROS = store.rosProduced - store.rosScavenged;
    if (activeROS <= 0) return false;

    let scavenged = 0;

    // SOD first (free, highest capacity)
    if (activeROS >= 2) { store.rosScavenged += 2; scavenged += 2; }

    // Catalase (free, recovers O2)
    const remaining1 = store.rosProduced - store.rosScavenged;
    if (remaining1 >= 2) { store.rosScavenged += 2; store.o2Produced += 0.5; scavenged += 2; }

    // GPx last (costs NADPH — only used when free pathways insufficient)
    const remaining2 = store.rosProduced - store.rosScavenged;
    if (remaining2 > 0 && store.nadph > 0) {
        const gpxCount = Math.min(remaining2, store.nadph);
        store.rosScavenged += gpxCount;
        store.nadph -= gpxCount;
        scavenged += gpxCount;
    }

    if (scavenged > 0) {
        showActiveStep('ROS Scav.', `Scavenged ${scavenged} ROS`, {}, 'ros');
        return { enzyme: 'ROS Scav.', reaction: `Scavenged ${scavenged} ROS`, yields: {} };
    }
    return false;
}
