// Flux — how much carbon each section of the map has carried lately.
// Every reaction that fires (dispatch.js onReaction) is routed onto the map
// segments it moves carbon along, signed by direction. Each segment keeps a
// leaky integral of those events (events per second, time constant TAU) and
// a smoothed copy for drawing, so line weight and train speed read flux.
import { simState } from './state.js';

const TAU = 6;      // s, memory of the integrator
const SMOOTH = 1.6; // s, smoothing of the drawn value

export const flux = {};   // segment id → signed events per second (drawn)
const raw = {};           // segment id → signed events per second (integrator)
const _listeners = [];

/** Segments a reaction moves carbon along: [segment id, signed amount]. */
function route(key, step, rev) {
    const s = rev ? -1 : 1;
    switch (key) {
        case 'glycolysis':
            if (step === 10) return rev ? [['c10', 1]] : [['p10', 1]];
            // Reversed shared steps run on the Calvin track while the Calvin cycle is on
            if (rev && (step === 2 || step === 3 || step === 5 || step === 6) && simState.calvinEnabled) return [['c' + step, 1]];
            return [['g' + step, s]];
        case 'calvin':
            return step === 0 ? [['c0', 1]] : step === 7 ? [['c7', 1]] : step === 5 ? [['c2', 1]] : [];
        case 'ppp': return [['p' + step, 1]];
        case 'krebs': return step === 0 ? [['k0', s], ['kin', s]] : [['k' + step, s]];
        case 'betaox': return step === 3 ? [['b3', s], ['bspur', s]] : [['b' + step, s]];
        case 'pdh': return [['pdh', 1]];
        case 'pdc': return [['pdc', 1]];
        case 'fermentation': return [['pdc', 1], ['adh', 1]];
        case 'adh': return [['adh', rev ? 1 : -1]];   // the track runs acetaldehyde → ethanol
        case 'aldh': return [['aldh', 1]];
        case 'acs': return [['acs', 1]];
        case 'run_glycolysis_upper': return ['g0', 'g1', 'g2', 'g3'].map(k => [k, 2 * s]);
        case 'run_glycolysis_lower': return rev ? [['g9', -2]] : ['g5', 'g6', 'g7', 'g8', 'g9'].map(k => [k, 2]);
        case 'run_calvin': return ['c0', 'c6', 'c5', 'c3', 'c2', 'c10', 'c7'].map(k => [k, 3]);
        case 'run_ppp': return ['p0', 'p1', 'p2', 'p10'].map(k => [k, 3]);
        case 'run_krebs': return ['kin', 'k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7'].map(k => [k, 2]);
        case 'run_betaox': return ['b0', 'b1', 'b2', 'b3', 'bspur'].map(k => [k, 3 * s]);
    }
    return [];
}

// Per-step handlers called without a direction try forward, then reverse;
// the result says which ran.
const _REV_NAME = /reverse|G6Pase|FBPase|PC\+PEPCK|TK\+SBPase|^ACC\+ER$|^DH$|^KR$|^KAS$/;
function isReverse(key, step, direction, res) {
    if (direction === 'reverse') return true;
    if (direction === 'forward') return false;
    if (key === 'run_glycolysis_upper' || key === 'run_glycolysis_lower' || key === 'run_betaox') return false;
    if (key === 'adh') return res.reaction.startsWith('2 Acetaldehyde');
    if (key === 'glycolysis' && step === 1) return res.reaction.startsWith('F6P');
    return _REV_NAME.test(res.enzyme || '');
}

/** Observer for dispatch.js onReaction. */
export function recordReaction(key, step, direction, res) {
    const rev = isReverse(key, step, direction, res);
    const segs = route(key, step, rev);
    for (const [id, a] of segs) raw[id] = (raw[id] || 0) + a / TAU;
    for (const fn of _listeners) fn(key, step, rev, res, segs);
}

/** Listen for routed reactions (the map uses this for yield labels). */
export function onFlux(fn) { _listeners.push(fn); }

/** Advance the integrators by dt seconds. */
export function updateFlux(dt) {
    const k = Math.exp(-dt / TAU), ks = 1 - Math.exp(-dt / SMOOTH);
    for (const id in raw) {
        raw[id] *= k;
        const f = flux[id] || 0;
        flux[id] = f + (raw[id] - f) * ks;
    }
}

export function resetFlux() {
    for (const id in raw) raw[id] = 0;
    for (const id in flux) flux[id] = 0;
}
