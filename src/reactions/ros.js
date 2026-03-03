// ─── Reactive Oxygen Species Scavenging ───
import { store } from '../state.js';
import { showActiveStep } from '../dashboard.js';

// SOD: 2 O₂⁻ → H₂O₂ + ½O₂
export function advanceSOD() {
    if (store.rosProduced - store.rosScavenged < 2) return false;
    store.rosScavenged += 2;
    showActiveStep('SOD', '2 O₂⁻ → H₂O₂ + ½O₂', {}, 'ros');
    return { enzyme: 'SOD', reaction: '2 O₂⁻ → H₂O₂ + ½O₂', yields: {} };
}

// Catalase: 2 H₂O₂ → 2 H₂O + O₂
export function advanceCatalase() {
    if (store.rosProduced - store.rosScavenged < 2) return false;
    store.rosScavenged += 2;
    store.o2Produced += 0.5;
    showActiveStep('Catalase', '2 H₂O₂ → 2 H₂O + O₂', {}, 'ros');
    return { enzyme: 'Catalase', reaction: '2 H₂O₂ → 2 H₂O + O₂', yields: {} };
}

// GPx: H₂O₂ + NADPH → scavenged
export function advanceGPx() {
    if (store.rosProduced - store.rosScavenged < 1 || store.nadph < 1) return false;
    store.rosScavenged += 1;
    store.nadph -= 1;
    showActiveStep('GPx', 'ROS + NADPH → scavenged', { nadphConsume: 1 }, 'ros');
    return { enzyme: 'GPx', reaction: 'ROS + NADPH → scavenged', yields: { nadphConsume: 1 } };
}

// Batch: run all available scavenging
export function runROSScavenging() {
    const activeROS = store.rosProduced - store.rosScavenged;
    if (activeROS <= 0) return false;

    let scavenged = 0;

    // SOD first
    if (activeROS >= 2) { store.rosScavenged += 2; scavenged += 2; }

    // Catalase
    const remaining1 = store.rosProduced - store.rosScavenged;
    if (remaining1 >= 2) { store.rosScavenged += 2; store.o2Produced += 0.5; scavenged += 2; }

    // GPx (uses NADPH)
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
