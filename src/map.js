// Map — builds the transit map in world pixels from maplayout.js, decides
// what each segment shows (hidden, switched off, idle, running), hit-tests
// clicks, and advances the trains. Drawing is in mapdraw.js.
import { STATIONS, TRACKS, LOOPS, LINES, GRID, GRID_NARROW, KC, KR, NARROW_LABEL, NARROW_SIDE, PAIR, offsetPts, rounded, withLengths } from './maplayout.js';
import { simState } from './state.js';
import { flux } from './flux.js';

/** Segments whose running direction is the engine's reverse (left click runs the line's way). */
export const FLIP = new Set(['adh', 'c6', 'c5', 'c3', 'c2', 'c10']);

/** Label anchor offsets from a segment's grid midpoint, or absolute grid points (abs). */
const LABEL_AT = {
    g0: [0, -0.45], g1: [0, -0.45], g2: [0, -0.45], g3: [0, -0.45], g5: [0, -0.45], g6: [0, -0.45], g7: [0, -0.45], g8: [0, -0.45], g9: [0, -0.45],
    c7: [0, -0.38], c0: [-0.2, 0], p10: { abs: [6.7, 1.95], align: 'left' },
    p0: [-0.25, -0.3], p1: { abs: [2.75, 0.5] }, p2: { abs: [5.35, 0.42] },
    pdh: [0.2, 0.05], pdc: [0, -0.42], adh: [0, 0.42], aldh: [0.2, 0], acs: [0, -0.4], kin: [0.3, 0.12],
    b0: [0, -0.4], b1: [0.22, 0], b2: [0, 0.42], b3: [-0.22, 0],
};
/** Phone overrides, in the same grid (it is transposed after). */
const NARROW_LABEL_AT = {
    p0: { abs: [2.55, 2.25] }, p1: { abs: [2.55, 0.7] }, b1: [-0.22, 0], b3: [0.22, 0],
};

export const MapView = {
    G: null,            // { ox, oy, U, rot, us, gap }
    grid: GRID,
    st: {},             // station id → { id, x, y, label, side, kind, count key }
    segs: {},           // segment id → { id, track, line, key, step, label, rev, pts, L, len, from, to, lab:{x,y,align} }
    tracks: {},         // track id → { line, segs: [ids] }
    loops: [],
    phase: {},          // segment id → train phase (px)
    vis: {},            // segment id → { a: fade 0..1, hidden: bool }
    bounds: null,

    T(x, y) { const G = this.G, R = this.grid; return G.rot ? [G.ox + (y - R.y0) * G.U, G.oy + (x - R.x0) * G.U] : [G.ox + (x - R.x0) * G.U, G.oy + (y - R.y0) * G.U]; },
    Tdir(dx, dy) { return this.G.rot ? [dy, dx] : [dx, dy]; },

    /** Lay the map out in the box (x, y, w, h); rot turns it upright. Returns its height. */
    build(x, y, w, h, rot) {
        const GR = this.grid = rot ? GRID_NARROW : GRID;
        const gw = GR.x1 - GR.x0, gh = GR.y1 - GR.y0;
        const U = rot ? w / gh : Math.min(w / gw, h / gh);
        const ox = rot ? x : x + (w - U * gw) / 2;
        this.G = { ox, oy: y, U, rot, us: Math.max(0.55, Math.min(1.25, U / 46)), gap: Math.max(3.5, Math.min(8, U * 0.16)) };
        this.segs = {}; this.tracks = {}; this.st = {};
        for (const [id, def] of Object.entries(TRACKS)) this._track(id, def);
        for (const [id, v] of Object.entries(STATIONS)) {
            const [gx, gy, label, side, kind] = v;
            this.st[id] = { id, gx, gy, pos: this.T(gx, gy), label: (rot && NARROW_LABEL[id]) || label, side: (rot && NARROW_SIDE[id]) || side, kind: kind || 'tick' };
        }
        // Which track and heading each single-line station takes its tick from
        for (const seg of Object.values(this.segs)) for (const [end, idx] of [[seg.from, 0], [seg.to, seg.pts.length - 1]]) {
            const S = this.st[end];
            if (S.kind !== 'tick' || S.seg) continue;
            const a = seg.pts[Math.max(0, idx - 1)], b = seg.pts[Math.min(seg.pts.length - 1, idx + 1)];
            S.seg = seg.id; S.anchor = seg.pts[idx]; S.ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        }
        this.loops = LOOPS.map(l => ({ ...l, pos: this.T(...(rot && l.narrowAt ? l.narrowAt : l.at)), span: l.span ? [this.T(l.span[0], l.at[1] - 0.2), this.T(l.span[1], l.at[1] - 0.2)] : null }));
        for (const id in this.segs) if (!(id in this.phase)) this.phase[id] = 0;
        const c0 = this.T(GR.x0, GR.y0), c1 = this.T(GR.x1, GR.y1);
        this.bounds = { x0: Math.min(c0[0], c1[0]), y0: Math.min(c0[1], c1[1]), x1: Math.max(c0[0], c1[0]), y1: Math.max(c0[1], c1[1]) };
        return this.bounds.y1 - y;
    },

    _track(id, def) {
        const G = this.G, line = LINES[def.line];
        const tr = this.tracks[id] = { line: def.line, segs: [] };
        let pts;
        if (def.circle) {
            pts = [];
            for (let a = -90; a <= 270.01; a += 2) pts.push(this.T(KC[0] + KR * Math.cos(a * Math.PI / 180), KC[1] + KR * Math.sin(a * Math.PI / 180)));
        } else {
            let raw = def.pts.map(q => typeof q === 'string' ? this.T(STATIONS[q][0], STATIONS[q][1]) : this.T(q[0], q[1]));
            if (def.off) {
                if (def.closed) { const u = offsetPts(raw.slice(0, -1), G.gap / 2, true); raw = [...u, u[0]]; }
                else raw = offsetPts(raw, G.gap / 2, false);
            }
            pts = rounded(raw, G.U * 0.42);
        }
        const L = withLengths(pts);
        // Segment boundaries: the dense point nearest each end station, searched in order
        let from = 0;
        def.segs.forEach(([sid, a, b, key, step, label, rev], i) => {
            let i0 = from, i1;
            if (def.circle) { i0 = Math.round((angleOf(a) + 90) / 2); i1 = Math.round((angleOf(b) + 90 + (angleOf(b) < angleOf(a) ? 360 : 0)) / 2); }
            else {
                const target = this.T(STATIONS[b][0], STATIONS[b][1]);
                if (i === def.segs.length - 1) i1 = pts.length - 1;
                else { let best = from, bd = 1e9; for (let k = from + 1; k < pts.length; k++) { const d = Math.hypot(pts[k][0] - target[0], pts[k][1] - target[1]); if (d < bd) { bd = d; best = k; } } i1 = best; }
            }
            from = i1;
            const sp = pts.slice(i0, i1 + 1), sl = withLengths(sp);
            const seg = { id: sid, track: id, line: def.line, ink: line.ink, key, step, label, rev, from: a, to: b, pts: sp, L: sl, len: sl[sl.length - 1] };
            seg.lab = this._labelAt(seg, def.circle);
            this.segs[sid] = seg; tr.segs.push(sid);
        });
    },

    _labelAt(seg, circle) {
        if (!seg.label) return null;
        let gx, gy;
        if (circle) {
            const a0 = angleOf(seg.from), a1 = angleOf(seg.to) + (angleOf(seg.to) < a0 ? 360 : 0), m = (a0 + a1) / 2 * Math.PI / 180, r = KR + 0.42;
            gx = KC[0] + r * Math.cos(m); gy = KC[1] + r * Math.sin(m);
        } else {
            const o = (this.G.rot && NARROW_LABEL_AT[seg.id]) || LABEL_AT[seg.id] || [0, -0.4];
            if (o.abs) [gx, gy] = o.abs;
            else { const A = STATIONS[seg.from], B = STATIONS[seg.to]; gx = (A[0] + B[0]) / 2 + o[0]; gy = (A[1] + B[1]) / 2 + o[1]; }
        }
        const p = this.T(gx, gy), mid = seg.pts[Math.floor(seg.pts.length / 2)];
        const dx = p[0] - mid[0], dy = p[1] - mid[1];
        const o = (this.G.rot && NARROW_LABEL_AT[seg.id]) || LABEL_AT[seg.id];
        const align = o && o.align && !this.G.rot ? o.align : Math.abs(dx) > Math.abs(dy) * 1.2 ? (dx > 0 ? 'left' : 'right') : 'center';
        return { x: p[0], y: p[1], align };
    },

    /** Fade and hidden state per segment, from the pathway switches and locks. */
    updateVis() {
        const s = simState, lk = s.lockedPathways || {};
        const gA = s.glycolysisFade.value, cA = s.calvinFade.value, pA = s.pppFade.value, kA = s.krebsFade.value, bA = s.betaoxFade.value, fmA = s.fermentFade.value;
        const set = (id, a, hidden) => { this.vis[id] = { a, hidden }; };
        for (const id of ['g0', 'g2', 'g3', 'g5', 'g6', 'g7', 'g8', 'g9']) set(id, gA, !!lk.glycolysis);
        set('g1', Math.max(gA, pA), !!lk.glycolysis && !!lk.ppp);
        for (const id of ['c7', 'c0', 'c6', 'c5', 'c3', 'c2', 'c10']) set(id, cA, !!lk.calvin);
        for (const id of ['p0', 'p1', 'p2', 'p10']) set(id, pA, !!lk.ppp);
        set('pdh', Math.max(kA, bA), !!lk.krebs && !!lk.betaox);
        set('pdc', fmA, !!lk.glycolysis);
        set('adh', Math.max(fmA, kA), !!lk.glycolysis && !!lk.krebs);
        for (const id of ['aldh', 'acs']) set(id, Math.max(kA, bA), !!lk.krebs && !!lk.betaox);
        for (const id of ['kin', 'k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7']) set(id, kA, !!lk.krebs);
        for (const id of ['b0', 'b1', 'b2', 'b3', 'bspur']) set(id, bA, !!lk.betaox);
        for (const S of Object.values(this.st)) S.hidden = true;
        for (const seg of Object.values(this.segs)) if (!this.vis[seg.id].hidden) { this.st[seg.from].hidden = false; this.st[seg.to].hidden = false; }
    },

    /** Trains move at a speed set by each segment's flux. */
    update(dt) {
        const sp = 42 * this.G.us * dt;
        for (const id in this.segs) this.phase[id] += (flux[id] || 0) * sp * 6;
    },

    /** The segment, loop or station under world point (x, y); tol in world px. */
    hitTest(x, y, tol) {
        for (const L of this.loops) {
            if (L.hidden) continue;
            if (Math.abs(x - L.pos[0]) < L.hw + 4 && Math.abs(y - L.pos[1]) < 11) return { kind: 'loop', loop: L };
        }
        const usable = (id) => { const v = this.vis[id]; return v && !v.hidden && v.a >= 0.35; };
        for (const seg of Object.values(this.segs)) {
            const b = seg.lab && seg.lab.box;
            if (!b || !(x > b[0] && x < b[2] && y > b[1] && y < b[3])) continue;
            if (usable(seg.id)) return { kind: 'seg', seg };
            if (PAIR[seg.id] && usable(PAIR[seg.id])) return { kind: 'seg', seg: this.segs[PAIR[seg.id]] };
        }
        let best = null, bd = tol;
        for (const seg of Object.values(this.segs)) {
            if (!usable(seg.id)) continue;
            const d = distToPolyline(x, y, seg.pts);
            if (d < bd) { bd = d; best = seg; }
        }
        if (best) return { kind: 'seg', seg: best };
        for (const S of Object.values(this.st)) {
            if (S.hidden || !S.box) continue;
            const b = S.box; if (x > b[0] && x < b[2] && y > b[1] && y < b[3]) return { kind: 'station', st: S };
        }
        return null;
    },
};

function angleOf(id) { const v = STATIONS[id]; let a = Math.atan2(v[1] - KC[1], v[0] - KC[0]) * 180 / Math.PI; if (a < -90.5) a += 360; return a; }

function distToPolyline(x, y, pts) {
    let best = 1e9;
    for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
        const d = Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t);
        if (d < best) best = d;
    }
    return best;
}

