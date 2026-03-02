// ─── Simulation State ───
import { Anim } from './anim.js';

export const simState = {
    time: 0, speed: 1, lightOn: true, oxygenAvailable: true, fermenting: false,
    glycolysisEnabled: true, pppEnabled: true, calvinEnabled: true, krebsEnabled: true,
    betaoxEnabled: true,
    oxphosEnabled: true, linearLightEnabled: true, cyclicLightEnabled: true,
    autoPlay: false,
    store: null,
    // Animation state
    calvinRot: Anim.rotAccum(),
    krebsRot: Anim.rotAccum(),
    pppRot: Anim.rotAccum(),
    betaoxRot: Anim.rotAccum(),
    glycolysisFade: Anim.fade(1),
    calvinFade: Anim.fade(1),
    krebsFade: Anim.fade(1),
    pppFade: Anim.fade(1),
    betaoxFade: Anim.fade(1),
    respEtcFade: Anim.fade(1),
    photoEtcFade: Anim.fade(1),
    fermentFade: Anim.fade(0),
};

export const store = {
    // Core energy (realistic resting ratios)
    atp: 36, nadh: 4, nadph: 4, fadh2: 2,
    totalAtpAdp: 40, totalNad: 40, totalNadp: 40, totalFad: 20,
    // Active tracking
    protonGradient: 0, protonsPumped: 0, o2Produced: 0, o2Consumed: 0, h2oSplit: 0, h2oProduced: 0, electronsTransferred: 0, co2Fixed: 0, co2Produced: 0,

    // Glycolysis / Gluconeogenesis
    glucose: 3, g6p: 6, f6p: 0, f16bp: 0, g3p: 0, bpg: 0, pga3: 0, pga2: 0, pep: 0, pyruvate: 0, ethanol: 0, acetaldehyde: 0, aceticAcid: 0,
    // PPP
    pgl6: 0, pga6: 0, xu5p: 0, s7p: 0, r5p: 0,
    // Calvin
    rubp: 6,
    // Krebs
    acetylCoA: 0, citrate: 0, isocitrate: 0, akg: 0, succoa: 0, succinate: 0, fumarate: 0, malate: 0, oaa: 2,
    // Beta Oxidation
    fattyAcid: 4, enoylCoA: 0, hydroxyCoA: 0, ketoCoA: 0,
};
simState.store = store;

export const counters = { krebsTurns: 0, calvinTurns: 0, glycRuns: 0, pppRuns: 0, betaoxRuns: 0 };

export function resetState() {
    Object.keys(store).forEach(k => store[k] = 0);
    store.atp = 36; store.nadh = 4; store.nadph = 4; store.fadh2 = 2;
    store.glucose = 3; store.g6p = 6; store.oaa = 2; store.rubp = 6; store.fattyAcid = 4;
    store.totalAtpAdp = 40; store.totalNad = 40; store.totalNadp = 40; store.totalFad = 20;
    counters.krebsTurns = 0; counters.calvinTurns = 0; counters.glycRuns = 0; counters.pppRuns = 0; counters.betaoxRuns = 0;
    simState.time = 0; simState.fermenting = false;
}

export function updateAnimations(dt) {
    simState.calvinRot.update(dt, simState.calvinEnabled && simState.autoPlay);
    simState.krebsRot.update(dt, simState.krebsEnabled && simState.oxygenAvailable && simState.autoPlay, -1.5);
    simState.pppRot.update(dt, simState.pppEnabled && simState.autoPlay);
    simState.betaoxRot.update(dt, simState.betaoxEnabled && simState.autoPlay, simState.lightOn ? -1.5 : 1.5);
    simState.glycolysisFade.update(dt, simState.glycolysisEnabled ? 1 : 0);
    simState.calvinFade.update(dt, simState.calvinEnabled ? 1 : 0);
    simState.krebsFade.update(dt, (simState.krebsEnabled && simState.oxygenAvailable) ? 1 : 0);
    simState.pppFade.update(dt, simState.pppEnabled ? 1 : 0);
    simState.betaoxFade.update(dt, simState.betaoxEnabled ? 1 : 0);
    simState.respEtcFade.update(dt, simState.oxygenAvailable ? 1 : 0);
    simState.photoEtcFade.update(dt, simState.lightOn ? 1 : 0);
    simState.fermentFade.update(dt, (!simState.oxygenAvailable && simState.glycolysisEnabled) ? 1 : 0);
}
