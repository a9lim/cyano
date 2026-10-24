// Map layout — the carbon network as a transit map, on an octilinear grid
// laid out by hand (x right, y down; one unit is one station spacing).
// Stations are store keys. Tracks are the drawn lines, one ink each; their
// segments are the enzymes, each bound to the reaction it fires. Shared
// intermediates are interchanges: capsules across the glycolysis/Calvin
// corridor, rings elsewhere. On phones the whole grid is transposed upright.

export const KC = [16.46, 7.54], KR = 2.6;   // the Krebs circle line
const kp = (a) => [KC[0] + KR * Math.cos(a * Math.PI / 180), KC[1] + KR * Math.sin(a * Math.PI / 180)];

/** id → [x, y, label, label side, kind]. kind: tick | hub | corr. Side 'in' faces the Krebs centre. */
export const STATIONS = {
    glucose: [1, 3, 'Glucose', 'b'], g6p: [3, 3, 'G6P', 'b', 'hub'], f6p: [5, 3, 'F6P', 'b', 'corr'],
    f16bp: [7, 3, 'F1,6BP', 'b', 'corr'], g3p: [9, 3, 'G3P', 'b', 'corr'], bpg: [11, 3, '1,3-BPG', 'b', 'corr'],
    pga3: [13, 3, '3-PGA', 'b', 'corr'], pga2: [15, 3, '2-PGA', 'b'], pep: [17, 3, 'PEP', 'b'], pyruvate: [19, 3, 'Pyruvate', 'bl', 'hub'],
    pgl6: [3, 1.5, '6-PGL', 'l'], pga6: [4.5, 0, '6-PGA', 't'], r5p: [7, 1, 'R5P', 'tr', 'hub'], rubp: [13, 1, 'RuBP', 't'],
    acetaldehyde: [21, 3, 'Acetaldehyde', 'tr', 'hub'], ethanol: [23, 3, 'Ethanol', 'r'], aceticAcid: [21, 5, 'Acetic acid', 'r'],
    acetylCoA: [19, 5, 'Acetyl-CoA', 'tl', 'hub'],
    fattyAcid: [21, 7, 'Fatty acid', 'l', 'hub'], enoylCoA: [23, 7, 'Enoyl-CoA', 'r'], hydroxyCoA: [23, 9, 'OH-CoA', 'r'], ketoCoA: [21, 9, 'Keto-CoA', 'b'],
    citrate: [...kp(-45), 'Citrate', 'in', 'hub'], isocitrate: [...kp(0), 'Isocitrate', 'in'], akg: [...kp(45), 'α-KG', 'in'],
    succoa: [...kp(90), 'Suc-CoA', 'in'], succinate: [...kp(135), 'Succinate', 'in'], fumarate: [...kp(180), 'Fumarate', 'in'],
    malate: [...kp(225), 'Malate', 'in'], oaa: [...kp(270), 'OAA', 'in'],
};

/** Phone overrides: shorter names, other sides. */
export const NARROW_LABEL = { isocitrate: 'Isocit.', succinate: 'Succ.', fumarate: 'Fum.', malate: 'Mal.', acetaldehyde: 'Acetald.', aceticAcid: 'Acetate', enoylCoA: 'Enoyl', hydroxyCoA: 'OH-acyl', ketoCoA: 'Keto' };
export const NARROW_SIDE = { acetylCoA: 'tl', aceticAcid: 'b', fattyAcid: 'bl', ketoCoA: 'b', pga6: 'l', pgl6: 'r', pyruvate: 'r' };

/** The lines: ink, the name in the key, and the name when trains run backward. */
export const LINES = {
    glyc: { ink: 'sienna', name: 'Glycolysis', rev: 'Gluconeogenesis', toggle: 'glycolysis' },
    ppp: { ink: 'madder', name: 'Pentose phosphate', toggle: 'ppp' },
    calvin: { ink: 'viridian', name: 'Calvin cycle', toggle: 'calvin' },
    pdh: { ink: 'indigo', name: 'Pyruvate dehydrogenase' },
    krebs: { ink: 'prussian', name: 'Krebs cycle', toggle: 'krebs' },
    ferm: { ink: 'umber', name: 'Fermentation', rev: 'Ethanol salvage' },
    box: { ink: 'ochre', name: 'β-oxidation', rev: 'Fatty-acid synthesis', toggle: 'betaox' },
};

/**
 * Tracks: line, the stations (or bare grid points) in running order, whether
 * it closes, whether it runs offset to its right (parallel corridors), and
 * its segments: [id, from, to, dispatch key, step, label, reversed label].
 */
export const TRACKS = {
    glyc: { line: 'glyc', pts: ['glucose', 'g6p', 'f6p', 'f16bp', 'g3p', 'bpg', 'pga3', 'pga2', 'pep', 'pyruvate'], off: true, segs: [
        ['g0', 'glucose', 'g6p', 'glycolysis', 0, 'HK', 'G6Pase'], ['g1', 'g6p', 'f6p', 'glycolysis', 1, 'PGI'],
        ['g2', 'f6p', 'f16bp', 'glycolysis', 2, 'PFK', 'FBPase'], ['g3', 'f16bp', 'g3p', 'glycolysis', 3, 'ALDO'],
        ['g5', 'g3p', 'bpg', 'glycolysis', 5, 'GAPDH'], ['g6', 'bpg', 'pga3', 'glycolysis', 6, 'PGK'],
        ['g7', 'pga3', 'pga2', 'glycolysis', 7, 'PGM'], ['g8', 'pga2', 'pep', 'glycolysis', 8, 'ENO'],
        ['g9', 'pep', 'pyruvate', 'glycolysis', 9, 'PK', 'PC + PEPCK']] },
    calvin: { line: 'calvin', pts: ['r5p', 'rubp', 'pga3', 'bpg', 'g3p', 'f16bp', 'f6p', 'r5p'], off: true, closed: true, segs: [
        ['c7', 'r5p', 'rubp', 'calvin', 7, 'PRK'], ['c0', 'rubp', 'pga3', 'calvin', 0, 'RuBisCO'],
        ['c6', 'pga3', 'bpg', 'glycolysis', 6, ''], ['c5', 'bpg', 'g3p', 'glycolysis', 5, ''],
        ['c3', 'g3p', 'f16bp', 'glycolysis', 3, ''], ['c2', 'f16bp', 'f6p', 'glycolysis', 2, ''],
        ['c10', 'f6p', 'r5p', 'glycolysis', 10, '']] },
    ppp: { line: 'ppp', pts: ['g6p', [3, 0], [6, 0], 'r5p', 'f6p'], off: true, segs: [
        ['p0', 'g6p', 'pgl6', 'ppp', 0, 'G6PDH'], ['p1', 'pgl6', 'pga6', 'ppp', 1, '6PGL'],
        ['p2', 'pga6', 'r5p', 'ppp', 2, '6PGDH'], ['p10', 'r5p', 'f6p', 'glycolysis', 10, 'TKT + TAL', 'TK + SBPase']] },
    pdh: { line: 'pdh', pts: ['pyruvate', 'acetylCoA'], segs: [['pdh', 'pyruvate', 'acetylCoA', 'pdh', 0, 'PDH']] },
    ferm: { line: 'ferm', pts: ['pyruvate', 'acetaldehyde', 'ethanol'], segs: [
        ['pdc', 'pyruvate', 'acetaldehyde', 'pdc', 0, 'PDC'], ['adh', 'acetaldehyde', 'ethanol', 'adh', 0, 'ADH']] },
    acet: { line: 'ferm', pts: ['acetaldehyde', 'aceticAcid', 'acetylCoA'], segs: [
        ['aldh', 'acetaldehyde', 'aceticAcid', 'aldh', 0, 'ALDH'], ['acs', 'aceticAcid', 'acetylCoA', 'acs', 0, 'ACS']] },
    kin: { line: 'krebs', pts: ['acetylCoA', 'citrate'], segs: [['kin', 'acetylCoA', 'citrate', 'krebs', 0, 'CS']] },
    krebs: { line: 'krebs', circle: true, segs: [
        ['k0', 'oaa', 'citrate', 'krebs', 0, ''], ['k1', 'citrate', 'isocitrate', 'krebs', 1, 'ACO'],
        ['k2', 'isocitrate', 'akg', 'krebs', 2, 'IDH'], ['k3', 'akg', 'succoa', 'krebs', 3, 'KGDH'],
        ['k4', 'succoa', 'succinate', 'krebs', 4, 'SCS'], ['k5', 'succinate', 'fumarate', 'krebs', 5, 'SDH'],
        ['k6', 'fumarate', 'malate', 'krebs', 6, 'FUM'], ['k7', 'malate', 'oaa', 'krebs', 7, 'MDH']] },
    box: { line: 'box', pts: ['fattyAcid', 'enoylCoA', 'hydroxyCoA', 'ketoCoA', 'fattyAcid'], closed: true, segs: [
        ['b0', 'fattyAcid', 'enoylCoA', 'betaox', 0, 'ACAD', 'ACC + ER'], ['b1', 'enoylCoA', 'hydroxyCoA', 'betaox', 1, 'ECH', 'DH'],
        ['b2', 'hydroxyCoA', 'ketoCoA', 'betaox', 2, 'HACD', 'KR'], ['b3', 'ketoCoA', 'fattyAcid', 'betaox', 3, 'Thiolase', 'KAS']] },
    bspur: { line: 'box', pts: ['fattyAcid', 'acetylCoA'], segs: [['bspur', 'fattyAcid', 'acetylCoA', 'betaox', 3, '']] },
};

/** Corridor enzymes that serve two tracks: the glycolysis segment and its Calvin or PPP twin. */
export const PAIR = { g2: 'c2', g3: 'c3', g5: 'c5', g6: 'c6', p10: 'c10' };

/** Batch services: whole-cycle reactions, clicked on the loop's name. */
export const LOOPS = [
    { key: 'run_calvin', line: 'calvin', at: [10, 1.85], name: 'Calvin cycle', short: 'Calvin', times: '×6', info: 'run_calvin' },
    { key: 'run_ppp', line: 'ppp', at: [4.75, 1.45], narrowAt: [5.2, 1.75], name: 'Pentose P', short: 'PPP', times: '×6', info: 'run_ppp' },
    { key: 'run_krebs', line: 'krebs', at: [KC[0], KC[1] + 0.1], name: 'Krebs cycle', short: 'Krebs', times: '×2', info: 'run_krebs' },
    { key: 'run_betaox', line: 'box', at: [22, 8], name: 'β-oxidation', short: 'β-ox', times: '×7', info: 'run_betaox' },
    { key: 'run_glycolysis_upper', line: 'glyc', at: [5, 4.2], narrowAt: [12.15, 6.3], span: [1, 9], name: 'Glucose ⇌ G3P', short: 'Glc ⇌ G3P', info: 'run_glyc_upper' },
    { key: 'run_glycolysis_lower', line: 'glyc', at: [14, 4.2], narrowAt: [12.15, 8.9], span: [9, 19], name: 'G3P ⇌ pyruvate', short: 'G3P ⇌ Pyr', info: 'run_glyc_lower' },
];

/** CO₂ leaving or entering at a segment: [segment, from, to]. */
export const CO2 = [
    ['c0', [13, 2], [13.7, 2], [13, 1.3], [13.65, 1.3]], ['pdc', [20, 3], [20, 3.62]], ['pdh', [19, 4], [18.35, 4]],
    ['p2', [5.85, 0.15], [6.4, -0.4]],
];   // optional 4th and 5th entries: where the spur goes on phones

/** Where the flux key sits on the grid, and the empty field it owns. */
export const KEY_BOX = [1, 5.2, 12.6, 10.4];
export const GRID = { x0: 0, x1: 24.6, y0: -0.75, y1: 10.5 };
/** On phones the grid turns upright and keeps a little more room across, for the Krebs labels. */
export const GRID_NARROW = { x0: 0, x1: 24.6, y0: -0.75, y1: 11.3 };

// ─── Geometry ───
export function offsetPts(pts, d, closed) {
    const n = pts.length, out = [];
    const nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [-dy / L, dx / L]; };
    for (let i = 0; i < n; i++) {
        const prev = closed ? pts[(i - 1 + n) % n] : pts[i - 1], next = closed ? pts[(i + 1) % n] : pts[i + 1];
        if (prev && next) {
            const n1 = nrm(prev, pts[i]), n2 = nrm(pts[i], next);
            let mx = n1[0] + n2[0], my = n1[1] + n2[1]; const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
            const k = d / Math.max(0.5, mx * n1[0] + my * n1[1]);
            out.push([pts[i][0] + mx * k, pts[i][1] + my * k]);
        } else { const q = prev ? nrm(prev, pts[i]) : nrm(pts[i], next); out.push([pts[i][0] + q[0] * d, pts[i][1] + q[1] * d]); }
    }
    return out;
}

/** Round each interior corner with radius r; returns dense points. */
export function rounded(pts, r) {
    const n = pts.length, out = [pts[0]];
    const line = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(L / 3)); for (let j = 1; j <= k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]); };
    let cur = pts[0];
    for (let i = 1; i < n - 1; i++) {
        const A = pts[i - 1], Bp = pts[i], C = pts[i + 1];
        const l1 = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]) || 1, l2 = Math.hypot(C[0] - Bp[0], C[1] - Bp[1]) || 1, rr = Math.min(r, l1 / 2, l2 / 2);
        const p1 = [Bp[0] + (A[0] - Bp[0]) * rr / l1, Bp[1] + (A[1] - Bp[1]) * rr / l1], p2 = [Bp[0] + (C[0] - Bp[0]) * rr / l2, Bp[1] + (C[1] - Bp[1]) * rr / l2];
        line(cur, p1);
        for (let j = 1; j <= 10; j++) {
            const t = j / 10, v = 1 - t;
            out.push([v * v * p1[0] + 2 * v * t * Bp[0] + t * t * p2[0], v * v * p1[1] + 2 * v * t * Bp[1] + t * t * p2[1]]);
        }
        cur = p2;
    }
    line(cur, pts[n - 1]);
    return out;
}

export function withLengths(pts) {
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return L;
}

/** Point and heading at arc length v along a sampled path. */
export function pointAt(pts, L, v) {
    let lo = 0, hi = L.length - 1;
    v = Math.max(0, Math.min(L[hi], v));
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] <= v) lo = m; else hi = m; }
    const a = pts[lo], b = pts[hi], t = (v - L[lo]) / ((L[hi] - L[lo]) || 1);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])];
}
