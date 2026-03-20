// Autoplay tick logic — two independent timers drive continuous metabolism.
// Fast tick (400ms): ETC + ATP synthase (membrane-bound, continuous).
// Slow tick (800ms): metabolic round-robin (one pathway per tick).
import { simState, store } from './state.js';
import { markDashboardDirty } from './dashboard.js';
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

/** Main autoplay driver — called every frame with delta time. */
export function autoplayTick(dt) {
    if (!simState.autoPlay) return;

    etcTimer += dt;
    metabolicTimer += dt;
    passiveDrainTimer += dt;

    // Passive ATP drain (1.6s) — mimics cellular maintenance energy cost
    if (passiveDrainTimer > 1.6) {
        passiveDrainTimer = 0;
        if (store.atp > 2) store.atp -= 3;
        markDashboardDirty();
    }

    // ── ETC fast tick (400ms) — continuous membrane processes ──
    // Triple ATP synthase reflects ~3:1 H+ consumption vs single ETC reaction
    if (etcTimer > 0.4) {
        etcTimer = 0;
        advanceStep('atp_syn');
        advanceStep('atp_syn');
        advanceStep('atp_syn');
        advanceStep('etc_resp');
        advanceStep('etc_photo');
        advanceStep('nnt');
    }

    // ── Metabolic slow tick (800ms) — round-robin one pathway per tick ──
    if (metabolicTimer > 0.8) {
        metabolicTimer = 0;
        const metabolicSteps = [
            () => advanceStep('run_krebs'),
            () => advanceStep('pdh'),
            // Glycolysis lower only in dark; upper reverses under light (gluconeogenesis feeds Calvin)
            () => { if (!simState.lightOn) advanceStep('run_glycolysis_lower'); },
            () => advanceStep('run_glycolysis_upper', null, simState.lightOn ? 'reverse' : undefined),
            () => advanceStep('run_calvin'),
            () => advanceStep('run_ppp'),
            () => {
                // Aerobic: ethanol salvage pathway (ADH forward + ALDH + ACS)
                // Anaerobic: fermentation (NAD+ regeneration via ADH reverse)
                if (simState.oxygenAvailable) {
                    advanceStep('adh', null, 'forward');
                    advanceStep('aldh');
                    advanceStep('acs');
                } else {
                    advanceStep('fermentation');
                    advanceStep('adh', null, 'reverse');
                }
            },
            // Beta-ox reverses under light (FA synthesis stores photosynthetic surplus)
            () => advanceStep('run_betaox', null, simState.lightOn ? 'reverse' : undefined),
            () => {
                // Gluconeogenesis: rebuild glucose from pyruvate when glucose is depleted
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

/**
 * Proton leak + ROS damage tick (500ms) — runs independently of autoplay.
 * Base leak 2%/tick; with UCP enabled 10%/tick (thermogenesis).
 */
export function protonLeakTick(dt) {
    leakTimer += dt;
    if (leakTimer > 0.5) {
        leakTimer = 0;
        const leakRate = simState.uncouplingEnabled ? 0.10 : 0.02;
        const leaked = Math.floor(store.protonGradient * leakRate);
        if (leaked > 0) {
            store.protonGradient = Math.max(0, store.protonGradient - leaked);
            store.protonsLeaked += leaked;
            // Visual: UCP spawns downward protons through the channel
            if (simState.uncouplingEnabled && Renderer.etcComplexes.ucp) {
                const count = Math.min(leaked, 3);
                for (let i = 0; i < count; i++) {
                    setTimeout(() => {
                        Particles.spawnProton(Renderer.membraneY, Renderer.membraneH, Renderer.etcComplexes.ucp.cx, 'down');
                    }, i * 120);
                }
            }
        }

        // ── ROS damage and auto-scavenging ──
        const activeROS = store.rosProduced - store.rosScavenged;
        if (activeROS > 0) {
            // 0.3 health per active ROS per tick
            store.cellHealth = Math.max(0, store.cellHealth - activeROS * 0.3);
            // Tier 1: SOD + catalase (no cofactor cost)
            const freeScavenge = Math.min(activeROS, 2);
            store.rosScavenged += freeScavenge;
            // Tier 2: GPx consumes NADPH (links PPP to antioxidant defense)
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
            // Passive health regeneration when no active ROS
            store.cellHealth = Math.min(100, store.cellHealth + 0.5);
        }
    }
}
