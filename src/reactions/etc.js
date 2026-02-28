// ─── Electron Transport Chain, ATP Synthase, BR, NNT ───
import { store, simState } from '../state.js';
import { showActiveStep, updateDashboard } from '../dashboard.js';
import Renderer from '../renderer.js';

function pumpProtons(count, complexKey) {
    store.protonGradient += count; store.protonsPumped += count;
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const cx = Renderer.etcComplexes[complexKey]?.cx;
            if (cx) Renderer.spawnProton(cx, 'up');
        }, i * 80);
    }
}

export function advanceETC(pathway, stepIndex) {
    const D = 550;
    if (pathway === 'etc_resp') {
        if (!simState.oxygenAvailable || !simState.oxphosEnabled) return false;
        let src = null;
        if (stepIndex === 1) {
            if (store.fadh2 > 0) { store.fadh2--; src = 'sdh'; }
            else return false;
        } else if (stepIndex === 0) {
            if (store.nadh > 0) { store.nadh--; src = 'ndh1'; pumpProtons(4, 'ndh1'); }
            else return false;
        } else {
            if (store.nadh > 0) { store.nadh--; src = 'ndh1'; pumpProtons(4, 'ndh1'); }
            else if (store.fadh2 > 0) { store.fadh2--; src = 'sdh'; }
        }
        if (src) {
            store.electronsTransferred += 2;
            Renderer.spawnElectron(src, 'pq', 'resp');
            setTimeout(() => { Renderer.spawnElectron('pq', 'cytb6f', 'resp'); pumpProtons(4, 'cytb6f'); updateDashboard(); }, D);
            setTimeout(() => Renderer.spawnElectron('cytb6f', 'pc', 'resp'), D * 2);
            setTimeout(() => { Renderer.spawnElectron('pc', 'cytOx', 'resp'); pumpProtons(2, 'cytOx'); store.o2Consumed += 0.5; store.h2oProduced++; updateDashboard(); }, D * 3);
            return true;
        }
    } else if (pathway === 'etc_photo') {
        if (!simState.lightOn || !simState.linearLightEnabled) return false;
        store.h2oSplit++; store.o2Produced += 0.5; store.electronsTransferred += 2;
        pumpProtons(2, 'psii');
        Renderer.spawnPhoton('psii');
        Renderer.spawnElectron('psii', 'pq', 'photo');
        setTimeout(() => { Renderer.spawnElectron('pq', 'cytb6f', 'photo'); pumpProtons(4, 'cytb6f'); updateDashboard(); }, D);
        setTimeout(() => Renderer.spawnElectron('cytb6f', 'pc', 'photo'), D * 2);
        setTimeout(() => Renderer.spawnElectron('pc', 'psi', 'photo'), D * 3);
        setTimeout(() => { Renderer.spawnPhoton('psi'); Renderer.spawnElectron('psi', 'fd', 'photo'); }, D * 4);
        setTimeout(() => {
            Renderer.spawnElectron('fd', 'fnr', 'photo');
            if (store.nadph < store.totalNadp) store.nadph++;
            updateDashboard();
        }, D * 5);
        return true;
    } else if (pathway === 'etc_cyclic') {
        if (!simState.lightOn || !simState.cyclicLightEnabled) return false;
        store.electronsTransferred += 2;
        Renderer.spawnPhoton('psi');
        Renderer.spawnElectron('psi', 'fd', 'cyclic');
        setTimeout(() => Renderer.spawnElectron('fd', 'pq', 'cyclic'), D);
        setTimeout(() => { Renderer.spawnElectron('pq', 'cytb6f', 'cyclic'); pumpProtons(4, 'cytb6f'); updateDashboard(); }, D * 2);
        setTimeout(() => Renderer.spawnElectron('cytb6f', 'pc', 'cyclic'), D * 3);
        setTimeout(() => Renderer.spawnElectron('pc', 'psi', 'cyclic'), D * 4);
        return true;
    }
    return false;
}

export function advanceATPSynthase() {
    if (store.protonGradient >= 4 && store.atp < store.totalAtpAdp) {
        store.protonGradient -= 4; store.atp++;
        const cx = Renderer.etcComplexes.atpSyn?.cx;
        if (cx) for (let i = 0; i < 4; i++) setTimeout(() => Renderer.spawnProton(cx, 'down'), i * 200);
        return true;
    }
    return false;
}

export function advanceBacteriorhodopsin() {
    if (!simState.lightOn) return false;
    store.protonGradient += 1; store.protonsPumped += 1;
    Renderer.spawnPhoton('br');
    const cx = Renderer.etcComplexes.br?.cx;
    if (cx) Renderer.spawnProton(cx, 'up');
    return true;
}

export function advanceNNT() {
    if (store.protonGradient < 1 || store.nadh < 1 || store.nadph >= store.totalNadp) return false;
    store.protonGradient -= 1;
    store.nadh -= 1;
    store.nadph += 1;
    const cx = Renderer.etcComplexes.nnt?.cx;
    if (cx) Renderer.spawnProton(cx, 'down');
    return true;
}
