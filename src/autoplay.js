// ─── Autoplay tick logic ───
import { simState, store } from './state.js';
import { updateDashboard } from './dashboard.js';
import { advanceStep } from './reactions/dispatch.js';
import Particles from './particles.js';
import Renderer from './renderer.js';

let etcTimer = 0;
let metabolicTimer = 0;
let autoPlayStepIndex = 0;
let passiveDrainTimer = 0;
let leakTimer = 0;

export function resetAutoplayTimers() {
    etcTimer = 0;
    metabolicTimer = 0;
    autoPlayStepIndex = 0;
    passiveDrainTimer = 0;
    leakTimer = 0;
}

export function autoplayTick(dt) {
    if (!simState.autoPlay) return;

    etcTimer += dt;
    metabolicTimer += dt;
    passiveDrainTimer += dt;

    // Passive ATP drain to mimic cellular maintenance
    if (passiveDrainTimer > 1.6) {
        passiveDrainTimer = 0;
        if (store.atp > 2) store.atp -= 3;
        updateDashboard();
    }

    // ETC + ATP synthase — fast tick (continuous membrane processes)
    if (etcTimer > 0.4) {
        etcTimer = 0;
        advanceStep('atp_syn');
        advanceStep('atp_syn');
        advanceStep('atp_syn');
        advanceStep('etc_resp');
        advanceStep('etc_photo');
        advanceStep('nnt');
    }

    // Metabolic pathways — slow tick, round-robin
    if (metabolicTimer > 0.8) {
        metabolicTimer = 0;
        const metabolicSteps = [
            () => advanceStep('run_krebs'),
            () => advanceStep('pdh'),
            () => { if (!simState.lightOn) advanceStep('run_glycolysis_lower'); },
            () => advanceStep('run_glycolysis_upper', null, simState.lightOn ? 'reverse' : undefined),
            () => advanceStep('run_calvin'),
            () => advanceStep('run_ppp'),
            () => {
                if (simState.oxygenAvailable) {
                    advanceStep('adh', null, 'forward');
                    advanceStep('aldh');
                    advanceStep('acs');
                } else {
                    advanceStep('fermentation');
                    advanceStep('adh', null, 'reverse');
                }
            },
            () => advanceStep('run_betaox', null, simState.lightOn ? 'reverse' : undefined),
            () => {
                // Gluconeogenesis: run reverse glycolysis when glucose is low and pyruvate is available
                if (store.glucose < 2 && store.pyruvate >= 2) {
                    advanceStep('run_glycolysis_lower', null, 'reverse');
                    advanceStep('run_glycolysis_upper', null, 'reverse');
                }
            },
        ];
        metabolicSteps[autoPlayStepIndex % metabolicSteps.length]();
        autoPlayStepIndex++;
    }
}

export function protonLeakTick(dt) {
    leakTimer += dt;
    if (leakTimer > 0.5) {
        leakTimer = 0;
        const leakRate = simState.uncouplingEnabled ? 0.10 : 0.02;
        const leaked = Math.floor(store.protonGradient * leakRate);
        if (leaked > 0) {
            store.protonGradient = Math.max(0, store.protonGradient - leaked);
            store.protonsLeaked += leaked;
            // Visual: spawn downward protons through UCP when uncoupling active
            if (simState.uncouplingEnabled && Renderer.etcComplexes.ucp) {
                const count = Math.min(leaked, 3);
                for (let i = 0; i < count; i++) {
                    setTimeout(() => {
                        Particles.spawnProton(Renderer.membraneY, Renderer.membraneH, Renderer.etcComplexes.ucp.cx, 'down');
                    }, i * 120);
                }
            }
        }

        // ROS damage & auto-scavenging
        const activeROS = store.rosProduced - store.rosScavenged;
        if (activeROS > 0) {
            store.cellHealth = Math.max(0, store.cellHealth - activeROS * 0.3);
            // Auto-scavenge: SOD + catalase (free)
            const freeScavenge = Math.min(activeROS, 2);
            store.rosScavenged += freeScavenge;
            // GPx uses NADPH
            const remaining = store.rosProduced - store.rosScavenged;
            if (remaining > 0 && store.nadph > 0) {
                const gpx = Math.min(remaining, store.nadph, 1);
                store.rosScavenged += gpx;
                store.nadph -= gpx;
            }
            if (store.cellHealth < 20 && typeof showToast === 'function') {
                showToast('Cell health critical \u2014 ROS damage!');
            }
        } else if (store.cellHealth < 100) {
            store.cellHealth = Math.min(100, store.cellHealth + 0.5);
        }
    }
}
