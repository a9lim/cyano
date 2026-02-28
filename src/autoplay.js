// ─── Autoplay tick logic ───
import { simState, store } from './state.js';
import { updateDashboard } from './dashboard.js';
import { advanceStep } from './reactions/dispatch.js';

let etcTimer = 0;
let metabolicTimer = 0;
let autoPlayStepIndex = 0;
let passiveDrainTimer = 0;

export function resetAutoplayTimers() {
    etcTimer = 0;
    metabolicTimer = 0;
    autoPlayStepIndex = 0;
    passiveDrainTimer = 0;
}

export function autoplayTick(dt) {
    if (!simState.autoPlay) return;

    etcTimer += dt;
    metabolicTimer += dt;
    passiveDrainTimer += dt;

    // Passive ATP/NADPH drain to mimic cellular maintenance
    if (passiveDrainTimer > 1.6) {
        passiveDrainTimer = 0;
        if (store.atp > 2) store.atp -= 3;
        if (store.nadph > 1) store.nadph -= 2;
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
            () => advanceStep('run_glycolysis_upper'),
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
        ];
        metabolicSteps[autoPlayStepIndex % metabolicSteps.length]();
        autoPlayStepIndex++;
    }
}
