// Membrane — the specimen's cross-section above the map. layout() places the
// membrane and its complexes for the current specimen in world pixels;
// drawStatic() paints everything that doesn't move (frame, lipids, protein
// bodies), which the renderer caches; drawLive() paints the turning rotors
// and the labels. Positions in nanometres become pixels through `s`.
import { SPECIMENS, WIDTH } from './specimens.js';
import * as K from './complexes.js';

const TAU = Math.PI * 2;
const MEM = 5;        // bilayer thickness, nm
const LUMEN = 12;     // lumen width, nm
const BELOW = 21;     // depth reserved on the stroma side, nm

// Vertical frame of each specimen, nm: room above the cut (outer), the lumen
// between a sac's two membranes, or for a single membrane where the cell
// wall or S-layer ends (edge, from the top).
const FRAME = {
    sac: { outer: 6, lumen: 10 },
    granum: { outer: 19.5, lumen: 10 },
    cristae: { outer: 9, lumen: 10.5 },
    wall: { outer: 25, single: true, edge: 13 },
    slayer: { outer: 17, single: true, edge: 4.5 },
};
const GAP = 3;        // lipids between neighbouring complexes, nm
const LIPID = 0.85;   // spacing of lipids along a leaflet, nm

export const Membrane = {
    specId: 'thylakoid', spec: SPECIMENS.thylakoid,
    s: 6, x0: 0, x1: 0, top: 0, mid: 0, memTop: 0, memBot: 0, upperMid: 0, bottom: 0,
    pos: {},          // engine key → { x, y } electron anchor, plus drawing data
    items: [],        // [{ key, x, n }] complexes in order along the straight membrane
    paths: [],        // membrane midlines as point lists (for lipids)
    lumen: null,      // { x0, x1, y0, y1, neck? } where lumen protons live
    labels: [],       // [{ text, x, y, key }]
    hit: [],          // [{ key, x, y, w, h }]
    tip: null,        // cristae: { x, y, r } and the dimer's transforms
    narrow: false,

    layout(specId, x0, x1, top, narrow, budget) {
        const spec = SPECIMENS[specId] || SPECIMENS.thylakoid;
        this.specId = specId; this.spec = spec; this.narrow = narrow;
        this.x0 = x0; this.x1 = x1; this.top = top;
        const F = this.F = FRAME[spec.frame];
        const order = spec.order.filter(k => !(spec.frame === 'cristae' && k === 'atpSyn'));
        let foot = order.reduce((a, k) => a + WIDTH[k], 0) + GAP * (order.length - 1);
        const endL = spec.frame === 'cristae' ? 48 : 6, endR = spec.frame === 'cristae' ? 26 : spec.frame === 'sac' || spec.frame === 'granum' ? 14 : 6;
        const blockNm = F.outer + MEM + (F.single ? 0 : F.lumen + MEM) + BELOW;
        const s = this.s = Math.max(2.1, Math.min(narrow ? 3.4 : 7, (x1 - x0) / (foot + endL + endR), budget / blockNm));
        if (F.single) { this.mid = top + (F.outer + MEM / 2) * s; this.upperMid = top + F.edge * s; }
        else { this.upperMid = top + (F.outer + MEM / 2) * s; this.mid = this.upperMid + (MEM + F.lumen) * s; }
        this.memTop = this.mid - MEM / 2 * s; this.memBot = this.mid + MEM / 2 * s;
        this.bottom = this.mid + BELOW * s;

        // Complexes along the straight membrane, centred in the space between the ends
        const span = x1 - x0 - (endL + endR) * s, spare = Math.max(0, span - foot * s);
        const extra = order.length > 1 ? Math.min(10 * s, spare / (order.length - 1)) : 0;
        let x = x0 + endL * s + (spare - extra * (order.length - 1)) / 2;
        this.items = []; this.pos = {};
        const yOf = { pq: this.mid, pc: this.memTop - 2.6 * s, fd: this.memBot + 2.4 * s, sdh: this.mid + 4 * s, fnr: this.mid + 4.6 * s };
        let nL = 0;
        for (const k of order) {
            const w = WIDTH[k] * s, cx = x + w / 2;
            this.items.push({ key: k, x: cx, n: k === 'lhcii' ? nL++ : 0 });
            if (k !== 'lhcii') this.pos[k] = { x: cx, y: yOf[k] ?? this.mid };
            x += w + GAP * s + extra;
        }
        if (this.pos.psi) this.pos.fd = this.pos.fd || { x: this.pos.psi.x + 12 * s, y: yOf.fd };
        this._frame();
        this._hitsAndLabels();
        return this.bottom;
    },

    /** Midline paths, the lumen region and, for cristae, the tip. */
    _frame() {
        const { spec, s, x0, x1, mid, upperMid } = this;
        const pad = 40, line = (a, b, y) => [[a, y], [b, y]];
        this.paths = []; this.tip = null; this.discs = null;
        const R = (mid - upperMid) / 2, cy = (mid + upperMid) / 2;
        if (spec.frame === 'sac' || spec.frame === 'granum') {
            const xr = x1 - 12 * s;
            this.paths.push([...line(x0 - pad, xr, mid), ...arcPts(xr, cy, R, Math.PI / 2, -Math.PI / 2), [x0 - pad, upperMid]]);
            this.lumen = { x0: x0 + 2, x1: xr + R * 0.6, y0: upperMid + MEM / 2 * s, y1: mid - MEM / 2 * s };
            if (spec.frame === 'granum') this._granum(xr);
        } else if (spec.frame === 'cristae') {
            // A crista: the tip on the left, lined with ATP synthase dimers; the
            // junction on the right, where the crista lumen opens toward the boundary membrane
            const xt = x0 + 36 * s, xn = x1 - 14 * s, wn = 9 * s, r = 4 * s, R2 = mid - upperMid;
            this.tip = { x: xt, y: cy, r: R };
            this.paths.push([...arcPts(xt, cy, R, -Math.PI / 2, -3 * Math.PI / 2),
                ...arcPts(xn + wn / 2 - R2, mid - R2, R2, Math.PI / 2, 0), [xn + wn / 2, this.top - pad]]);
            this.paths.push([[xt, upperMid], ...arcPts(xn - wn / 2 - r, upperMid - r, r, Math.PI / 2, 0), [xn - wn / 2, this.top - pad]]);
            this.lumen = { x0: xt - R * 0.5, x1: xn + wn / 2 - MEM / 2 * s, y0: upperMid + MEM / 2 * s, y1: mid - MEM / 2 * s,
                neck: { x0: xn - wn / 2 + MEM / 2 * s, x1: xn + wn / 2 - MEM / 2 * s, y0: this.top } };
            this.tip.dimer = [0.5, -0.5].map(d => { const a = Math.PI + d; return { x: xt + R * Math.cos(a), y: cy + R * Math.sin(a), rot: a - Math.PI / 2 }; });
            const lower = this.tip.dimer[0];
            this.pos.atpSyn = { x: lower.x, y: lower.y, rot: lower.rot };
        } else {
            this.paths.push(line(x0 - pad, x1 + pad, mid));
            this.lumen = { x0: x0 + 2, x1: x1 - 2, y0: upperMid + 2.2 * s, y1: mid - MEM / 2 * s };
        }
    },

    /** Chloroplast: stacked discs above the right end of the sac. */
    _granum(xr) {
        const { s, mid, upperMid, top } = this;
        const gx0 = this.pos.psii ? this.pos.psii.x - 15 * s : xr - 50 * s;
        const h = (MEM + 4.5) * s, gapM = (MEM + 3.6) * s;   // a disc midline to midline; across a partition gap
        this.discs = [];
        const disc = (yLow) => {
            const r = h / 2, cy = yLow - r;
            this.paths.push([[gx0, yLow], [xr, yLow], ...arcPts(xr, cy, r, Math.PI / 2, -Math.PI / 2), [gx0, yLow - h], ...arcPts(gx0, cy, r, -Math.PI / 2, -3 * Math.PI / 2)]);
            this.discs.push({ y: yLow, h, x0: gx0, x1: xr });
        };
        for (let y = upperMid - gapM; y - h > top - 1 * s; y -= h + gapM) disc(y);
        disc(mid + gapM + h);
    },

    _hitsAndLabels() {
        const { s, pos, spec, narrow } = this;
        this.hit = []; this.labels = [];
        const box = (key, x, y, w, h) => this.hit.push({ key, x, y, w, h });
        for (const it of this.items) {
            const k = it.key; if (k === 'lhcii') continue;
            const p = pos[k], w = WIDTH[k] * s;
            if (k === 'pq') box(k, p.x, p.y, 6 * s, 5 * s);
            else if (k === 'pc' || k === 'fd') box(k, p.x, p.y, 5 * s, 5 * s);
            else if (k === 'fnr') box(k, p.x, p.y, 7 * s, 6 * s);
            else if (k === 'sdh') box(k, p.x, this.mid + 3 * s, w + 2 * s, 12 * s);
            else box(k, p.x, this.mid + 2 * s, w, 12 * s);
        }
        if (this.tip) for (const d of this.tip.dimer) box('atpSyn', d.x, d.y, 12 * s, 12 * s);
        else if (pos.atpSyn) box('atpSyn', pos.atpSyn.x, this.mid + 8 * s, 11 * s, 22 * s);
        // Labels: in the lumen under its upper wall, or below for stroma-side carriers
        const fs = narrow ? 10 : 12;
        const ly = this.lumen.y0 + fs + 2;
        const rows = [];
        const add = (key, x, y, text) => this.labels.push({ key, x, y, text });
        for (const it of this.items) {
            const k = it.key;
            if (k === 'lhcii' || (narrow && (k === 'pq' || k === 'pc' || k === 'fd'))) continue;
            let text = spec.names[k];
            if (narrow) text = NARROW[text] || text;
            const below = k === 'fd' || k === 'fnr';
            if (below) { add(k, pos[k].x, this.mid + (k === 'fd' ? 7 : 11) * s + fs, text); continue; }
            const w = text.length * fs * 0.6;
            let row = 0;
            while (rows[row] && rows[row] > pos[k].x - w / 2 - 6) row++;
            rows[row] = pos[k].x + w / 2;
            // On phones the lumen holds one row; the rest go under the membrane
            if (narrow && row > 0) add(k, pos[k].x, this.memBot + 4 * s + fs + (row - 1) * (fs + 2), text);
            else add(k, pos[k].x, ly + row * (fs + 3), text);
        }
        if (this.tip) add('atpSyn', this.tip.x + 2 * s, this.tip.y - this.tip.r - 4 * s, spec.names.atpSyn);
    },

    /** Everything that doesn't move. */
    drawStatic(c) {
        const { spec, s } = this;
        if (spec.frame === 'wall') this._wall(c);
        if (spec.frame === 'slayer') this._slayer(c, true);
        for (const path of this.paths) drawLipids(c, path, s, spec.lipid, spec.frame === 'granum' && path !== this.paths[0]);
        if (spec.frame === 'slayer') this._slayer(c, false);
        if (this.discs) this._discProteins(c);
        const at = (x, y, f, rot) => { c.save(); c.translate(x, y); if (rot) c.rotate(rot); f(); c.restore(); };
        for (const it of this.items) {
            const k = it.key, x = it.x, y = this.mid;
            switch (k) {
                case 'psii': at(x, y, () => { if (spec.antenna === 'phycobilisome') K.phycobilisome(c, s); K.psii(c, s); }); break;
                case 'lhcii': at(x, y, () => K.lhcii(c, s, it.n)); break;
                case 'ndh1': at(x, y, () => K.ndh1(c, s, this.specId === 'cristae')); break;
                case 'sdh': at(x, y, () => K.sdh(c, s)); break;
                case 'cytb6f': at(x, y, () => K.b6f(c, s)); break;
                case 'cytOx': at(x, y, () => K.cytOx(c, s)); break;
                case 'psi': at(x, y, () => K.psi(c, s, spec.psiTrimer, spec.antenna === 'lhcii')); break;
                case 'fnr': at(x, y, () => K.fnr(c, s)); break;
                case 'nnt': at(x, y, () => K.nnt(c, s)); break;
                case 'ucp': at(x, y, () => K.ucp(c, s)); break;
                case 'br': at(x, y, () => K.brPatch(c, s, 5)); break;
                case 'atpSyn': at(x, y, () => K.atpStator(c, s)); break;
            }
        }
        if (this.tip) for (const d of this.tip.dimer) at(d.x, d.y, () => K.atpStator(c, s), d.rot);
    },

    /** Rotors and labels, every frame. */
    drawLive(c, phase) {
        const { s } = this;
        if (this.tip) for (const d of this.tip.dimer) { c.save(); c.translate(d.x, d.y); c.rotate(d.rot); K.atpRotor(c, s, phase); c.restore(); }
        else if (this.pos.atpSyn) { c.save(); c.translate(this.pos.atpSyn.x, this.mid); K.atpRotor(c, s, phase); c.restore(); }
    },

    drawLabels(c, hoverKey) {
        const fs = this.narrow ? 10 : 12;
        c.font = `italic ${fs}px ${_FONT.text}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        c.lineJoin = 'round'; c.lineWidth = 3; c.strokeStyle = K.P.canvas;
        for (const L of this.labels) {
            c.fillStyle = L.key === hoverKey ? K.P.text : K.P.muted;
            c.strokeText(L.text, L.x, L.y); c.fillText(L.text, L.x, L.y);
        }
        // Compartment names
        c.textAlign = 'right'; c.fillStyle = K.P.muted;
        // Under a granum the stroma label moves left of the stack
        const sd = this.spec.sides, xr = this.discs ? this.discs[0].x0 - 12 * this.s : this.x1 - 4;
        if (!this.narrow) {
            c.strokeText(sd.below, xr, this.bottom - 4); c.fillText(sd.below, xr, this.bottom - 4);
        }
    },

    _wall(c) {
        // Peptidoglycan: glycan strands with peptide cross-links, a mesh above the membrane
        const { s, x0, x1, top, upperMid } = this;
        const col = K.mix(K.P.canvas, K.ink('umber'), 0.45);
        c.strokeStyle = col; c.lineWidth = Math.max(0.7, 0.18 * s);
        c.beginPath();
        for (let y = top + 1 * s, r = 0; y < upperMid; y += 1.7 * s, r++) {
            c.moveTo(x0, y); c.lineTo(x1, y);
            for (let x = x0 + (r % 2 ? 1.2 : 0) * s; x < x1; x += 2.4 * s) { c.moveTo(x, y); c.lineTo(x, y + 1.7 * s); }
        }
        c.stroke();
    },

    _slayer(c, stalks) {
        // S-layer glycoprotein: pillars anchored in the membrane under a lattice of canopies
        const { s, x0, x1, upperMid, memTop } = this;
        const u = K.ink('umber');
        for (let x = x0 + 7 * s; x < x1; x += 15 * s) {
            if (stalks) { c.fillStyle = K.shades(u).line; c.fillRect(x - 0.35 * s, upperMid, 0.7 * s, memTop - upperMid + 1 * s); }
            else K.blob(c, x, upperMid, 6.9 * s, 1.4 * s, x * 0.01, K.mix(u, K.P.canvas, 0.3), s);
        }
    },

    _discProteins(c) {
        // Appressed granum membranes are crowded with photosystem II and LHCII
        const { s } = this;
        c.save(); c.globalAlpha = 0.55;
        for (const d of this.discs) for (const y of [d.y, d.y - d.h]) {
            for (let x = d.x0 + 6 * s, i = 0; x < d.x1 - 4 * s; x += 9 * s, i++) K.blob(c, x, y, (i % 3 ? 3.4 : 4.6) * s, 2.7 * s, i + y * 0.01, K.ink(i % 3 ? 'sap' : 'viridian'), s);
        }
        c.restore();
    },
};

function arcPts(cx, cy, r, a0, a1) {
    const pts = [], n = Math.max(8, Math.ceil(Math.abs(a1 - a0) * r / 3));
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return pts;
}

const NARROW = { 'ATP synthase': 'ATP syn.', 'cyt oxidase': 'cyt ox.', 'bacteriorhodopsin': 'BR', 'complex I': 'I', 'complex II': 'II', 'complex III': 'III', 'complex IV': 'IV', 'halocyanin': 'HC' };

/**
 * Lipids along a midline: a head on each leaflet and two tails toward the
 * middle. Galactolipid heads are sugar rings, phospholipid heads round, and
 * archaeal ether lipids carry methyl branches on their tails.
 */
function drawLipids(c, path, s, kind, faint) {
    const lip = K.ink(kind === 'ether' ? 'umber' : 'ochre');
    const head = K.mix(lip, K.P.canvas, K.P.dark ? 0.15 : 0.38), rim = K.shades(lip).line;
    const tail = K.mix(K.P.canvas, lip, K.P.dark ? 0.42 : 0.5);
    const step = LIPID * s, off = (MEM / 2 - 0.42) * s, rH = 0.4 * s;
    const pts = [];
    let carry = 0;
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1], b = path[i], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
        if (!L) continue;
        const nx = -dy / L, ny = dx / L;
        for (let d = carry; d < L; d += step) pts.push([a[0] + dx * d / L, a[1] + dy * d / L, nx, ny]);
        carry = (carry - L) % step; if (carry < 0) carry += step;
    }
    c.save(); if (faint) c.globalAlpha = 0.6;
    c.strokeStyle = tail; c.lineWidth = Math.max(0.6, 0.13 * s); c.lineCap = 'round';
    c.beginPath();
    for (let i = 0; i < pts.length; i++) {
        const [x, y, nx, ny] = pts[i];
        for (const sg of [-1, 1]) {
            const hx = x + nx * off * sg, hy = y + ny * off * sg;
            for (const t of [-0.22, 0.22]) {
                const tx = -ny * t * s, ty = nx * t * s;
                const ex = x + nx * 0.15 * s * sg + tx, ey = y + ny * 0.15 * s * sg + ty;
                const w = Math.sin(i * 1.7 + t * 9 + sg) * 0.18 * s;
                c.moveTo(hx + tx - nx * rH * sg, hy + ty - ny * rH * sg);
                c.quadraticCurveTo((hx + ex) / 2 - ny * w, (hy + ey) / 2 + nx * w, ex, ey);
                if (kind === 'ether') {
                    for (const f of [0.35, 0.65]) {
                        const bx = hx + (ex - hx) * f, by = hy + (ey - hy) * f;
                        c.moveTo(bx, by); c.lineTo(bx + Math.sign(t) * -ny * 0.35 * s, by + Math.sign(t) * nx * 0.35 * s);
                    }
                }
            }
        }
    }
    c.stroke();
    c.beginPath();
    for (const [x, y, nx, ny] of pts) for (const sg of [-1, 1]) {
        const hx = x + nx * off * sg, hy = y + ny * off * sg;
        if (kind === 'galacto') {
            c.moveTo(hx + rH * 1.15, hy);
            for (let k = 1; k <= 6; k++) { const a = k / 6 * TAU; c.lineTo(hx + Math.cos(a) * rH * 1.15, hy + Math.sin(a) * rH * 1.15); }
        } else { c.moveTo(hx + rH, hy); c.arc(hx, hy, rH, 0, TAU); }
    }
    c.fillStyle = head; c.fill(); c.lineWidth = Math.max(0.4, 0.08 * s); c.strokeStyle = rim; c.stroke();
    c.restore();
}
