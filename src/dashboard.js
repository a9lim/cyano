// Dashboard — the margin's Stats tab: last reaction, counters, cofactor
// pools with their 60-second sparklines, the gradient, oxidative stress,
// ATP source and net exchange. Updates are rAF-coalesced.
import { store, counters, histories } from './state.js';

let _dom;
export function initDashboard(dom) { _dom = dom; }

let _dirty = false;
export function markDashboardDirty() {
    if (_dirty) return;
    _dirty = true;
    requestAnimationFrame(() => { _dirty = false; updateDashboard(); });
}

// The last reaction's enzyme takes its line's ink
const _pwColor = {
    glycolysis: '--pw-glyc', run_glycolysis_upper: '--pw-glyc', run_glycolysis_lower: '--pw-glyc',
    krebs: '--pw-krebs', run_krebs: '--pw-krebs',
    calvin: '--pw-calvin', run_calvin: '--pw-calvin',
    ppp: '--pw-ppp', run_ppp: '--pw-ppp',
    pdh: '--pw-pdh', pdc: '--pw-ferment', adh: '--pw-ferment',
    aldh: '--pw-ferment', acs: '--pw-ferment', fermentation: '--pw-ferment',
    betaox: '--pw-betaox', run_betaox: '--pw-betaox',
    ros: '--pw-ros', sod: '--pw-ros', catalase: '--pw-ros', gpx: '--pw-ros', run_ros_scavenge: '--pw-ros',
};

const _YIELD_NAME = { atp: 'ATP', nadh: 'NADH', nadph: 'NADPH', fadh2: 'FADH₂', co2Fixed: 'CO₂ fixed' };
const _yieldName = (k) => _YIELD_NAME[k] || k;

/** Show the last reaction: enzyme, equation, and yields. */
export function showActiveStep(enzyme, reaction, yields, pathway) {
    if (!_dom) return;
    _dom.krebsEnzyme.textContent = enzyme;
    _dom.krebsEnzyme.style.color = pathway && _pwColor[pathway] ? 'var(' + _pwColor[pathway] + ')' : '';
    _dom.krebsReaction.textContent = reaction;
    if (!yields) { _dom.krebsYield.textContent = '—'; return; }
    let text = '';
    for (const k in yields) {
        if (text) text += ' ';
        const v = yields[k];
        text += k.includes('Consume') ? `−${v} ${_yieldName(k.replace('Consume', ''))}` : `+${v} ${_yieldName(k)}`;
    }
    _dom.krebsYield.textContent = text;
}

const _set = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
function updateBar(bar, ratio, val, total) {
    const pct = Math.round(val / total * 100) + '%';
    if (bar) bar.style.width = pct;
    _set(ratio, pct);
}

/** A sparkline in the margin's medium: a hairline in the pool's ink over a baseline. */
function spark(id, h, color) {
    const cv = document.getElementById(id);
    if (!cv || !cv.offsetWidth) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.offsetWidth, ht = cv.offsetHeight;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(ht * dpr); }
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, ht);
    const T = _themePalette();
    c.strokeStyle = T.text + '26'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, ht - 0.5); c.lineTo(w, ht - 0.5); c.stroke();
    if (h.count < 2) return;
    c.strokeStyle = color; c.lineWidth = 1.3; c.lineJoin = 'round';
    c.beginPath();
    for (let i = 0; i < h.count; i++) {
        const v = h.data[(h.head - h.count + i + h.cap) % h.cap];
        const x = w * (i + h.cap - h.count) / (h.cap - 1), y = 2 + (ht - 4) * (1 - v);
        i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
}

/** Full refresh — after every reaction and on timer ticks. */
export function updateDashboard() {
    if (!_dom) return;
    updateBar(_dom.atpBar, _dom.atpRatio, store.atp, store.totalAtpAdp);
    updateBar(_dom.nadhBar, _dom.nadhRatio, store.nadh, store.totalNad);
    updateBar(_dom.nadphBar, _dom.nadphRatio, store.nadph, store.totalNadp);
    updateBar(_dom.fadh2Bar, _dom.fadh2Ratio, store.fadh2, store.totalFad);

    _set(_dom.protonGradient, '' + store.protonGradient);
    _set(_dom.protonsLeaked, '' + store.protonsLeaked);
    _set(_dom.co2Net, '' + (store.co2Produced - store.co2Fixed));
    _set(_dom.o2Net, (store.o2Produced - store.o2Consumed).toFixed(1));
    _set(_dom.h2oNet, '' + (store.h2oProduced - store.h2oSplit));

    _set(_dom.krebsTurn, '' + counters.krebsTurns);
    _set(_dom.calvinTurn, '' + counters.calvinTurns);
    _set(_dom.glycolysisRun, '' + counters.glycRuns);
    _set(_dom.pppRun, '' + counters.pppRuns);
    _set(_dom.betaoxRun, '' + counters.betaoxRuns);

    _set(_dom.atpSubstrate, '' + store.atpSubstrate);
    _set(_dom.atpOxidative, '' + store.atpOxidative);
    const made = store.atpSubstrate + store.atpOxidative;
    if (made > 0 && _dom.atpSourceSub) {
        _dom.atpSourceSub.style.width = (store.atpSubstrate / made * 100) + '%';
        _dom.atpSourceOx.style.width = (store.atpOxidative / made * 100) + '%';
    }

    const activeROS = store.rosProduced - store.rosScavenged;
    _set(_dom.rosProduced, '' + store.rosProduced);
    _set(_dom.rosScavenged, '' + store.rosScavenged);
    _set(_dom.activeROS, '' + activeROS);
    if (_dom.healthBar) {
        _dom.healthBar.style.width = store.cellHealth + '%';
        _dom.healthBar.dataset.level = store.cellHealth > 50 ? 'ok' : store.cellHealth > 20 ? 'low' : 'critical';
    }
    _set(_dom.healthRatio, Math.round(store.cellHealth) + '%');

    if (_dom.statsVisible && !_dom.statsVisible()) return;
    const T = _themePalette();
    spark('spark-atp', histories.atp, T.atp);
    spark('spark-nadh', histories.nadh, T.nadh);
    spark('spark-nadph', histories.nadph, T.nadph);
    spark('spark-fadh2', histories.fadh2, T.fadh2);
    spark('spark-gradient', histories.gradient, T.accent);
}
