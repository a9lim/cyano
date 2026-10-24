// Complexes — the membrane proteins, drawn in David Goodsell's register:
// a flat fill, a darker outline and a soft lighter body, at roughly true
// relative size. Every shape draws at the local origin, which is the
// membrane midline under the complex's centre; y grows toward the stroma,
// matrix or cytoplasm (down) and shrinks toward the lumen (up). The caller
// translates and, on curved membranes, rotates. `s` is pixels per nanometre.

const TAU = Math.PI * 2;

// ─── Colour ───
const _rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export function mix(a, b, t) {
    const x = _rgb(a), y = _rgb(b);
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
export function rgba(h, a) { const [r, g, b] = _rgb(h); return `rgba(${r},${g},${b},${a})`; }

/** The palette the scene draws with, rebuilt on theme change. */
export const P = { dark: false, canvas: '#FCFCFB', text: '#161514', text2: '#42413F', muted: '#666463', accent: '#983432', inks: {} };
const _shadeCache = new Map();
export function readPalette() {
    const T = _themePalette();
    P.dark = T === _PALETTE.dark;
    P.canvas = T.canvas; P.text = T.text; P.text2 = T.textSecondary; P.muted = T.textMuted;
    P.accent = T.accent; P.panel = T.panelSolid; P.inks = T.inks;
    _shadeCache.clear();
}

/** Fill, outline and highlight for an ink (or any hex). */
export function shades(base) {
    let s = _shadeCache.get(base);
    if (!s) {
        const fill = mix(base, P.canvas, P.dark ? 0.16 : 0.3);
        s = P.dark
            ? { fill, line: mix(base, '#000000', 0.5), hi: mix(fill, '#ffffff', 0.14) }
            : { fill, line: mix(base, '#1a1410', 0.42), hi: mix(fill, '#ffffff', 0.45) };
        _shadeCache.set(base, s);
    }
    return s;
}
export const ink = (n) => P.inks[n];

// ─── Blobs ───
function smoothClosed(c, pts) {
    const n = pts.length;
    let mx = (pts[n - 1][0] + pts[0][0]) / 2, my = (pts[n - 1][1] + pts[0][1]) / 2;
    c.moveTo(mx, my);
    for (let i = 0; i < n; i++) {
        const p = pts[i], q = pts[(i + 1) % n];
        c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    c.closePath();
}

/** A lumpy protein body: fill, outline, and an offset lighter body. */
export function blob(c, x, y, rx, ry, seed, base, s) {
    const pts = [], hi = [], n = 24;
    for (let i = 0; i < n; i++) {
        const a = i / n * TAU;
        const r = 1 + 0.07 * Math.sin(2 * a + seed * 1.7) + 0.05 * Math.sin(3 * a + seed * 2.3) + 0.035 * Math.sin(5 * a + seed * 3.1);
        const px = rx * r * Math.cos(a), py = ry * r * Math.sin(a);
        pts.push([x + px, y + py]);
        hi.push([x - rx * 0.12 + px * 0.6, y - ry * 0.16 + py * 0.56]);
    }
    const sh = shades(base);
    c.beginPath(); smoothClosed(c, pts); c.fillStyle = sh.fill; c.fill();
    c.lineWidth = Math.max(0.7, 0.16 * s); c.strokeStyle = sh.line; c.stroke();
    c.save(); c.globalAlpha *= 0.55;
    c.beginPath(); smoothClosed(c, hi); c.fillStyle = sh.hi; c.fill();
    c.restore();
}

/** A blob in nanometres about the local origin. */
const B = (c, s, dx, dy, rx, ry, seed, base) => blob(c, dx * s, dy * s, rx * s, ry * s, seed, base, s);

// ─── Photosynthetic complexes ───
export function psii(c, s) {
    const g = ink('sap'), v = ink('violet');
    B(c, s, -5.2, 0.2, 5.4, 3.5, 3.3, g); B(c, s, 5.2, 0.2, 5.4, 3.5, 4.1, g);
    // Oxygen-evolving complex on the lumenal face
    B(c, s, -4.4, -4.6, 3.1, 1.7, 5.2, v); B(c, s, 4.4, -4.6, 3.1, 1.7, 5.9, v);
}

export function lhcii(c, s, seed) { B(c, s, 0, 0, 3.6, 2.7, 1.3 + seed, mix(ink('sap'), P.canvas, 0.25)); }

/** Cyanobacterial phycobilisome: a core of three cylinders and a fan of rods. */
export function phycobilisome(c, s) {
    const rod = ink('indigo'), core = ink('prussian');
    for (const a of [-58, -29, 0, 29, 58]) {
        const r = a * Math.PI / 180, ux = Math.sin(r), uy = Math.cos(r);
        for (let k = 0; k < 3; k++) {
            const d = 9.8 + k * 2.9;
            c.save(); c.translate((ux * d) * s, (6.4 + uy * d) * s); c.rotate(-r);
            B(c, s, 0, 0, 2.9, 1.25, 20 + k + a, rod);
            c.restore();
        }
    }
    B(c, s, -3.1, 6.1, 2.9, 2.6, 30, core); B(c, s, 3.1, 6.1, 2.9, 2.6, 31, core); B(c, s, 0, 9.9, 2.9, 2.6, 32, core);
}

export function psi(c, s, trimer, lhci) {
    const g = ink('viridian');
    if (lhci) { B(c, s, -11.2, 0, 2.6, 2.6, 8.8, mix(ink('sap'), P.canvas, 0.25)); B(c, s, -16.2, 0, 2.6, 2.6, 8.9, mix(ink('sap'), P.canvas, 0.25)); }
    if (trimer) { B(c, s, -4.9, 0, 5.2, 3.4, 9.4, g); B(c, s, 4.9, 0, 5.2, 3.4, 9.9, g); }
    else B(c, s, 0, 0, 7.6, 3.4, 9.4, g);
    // Stromal ridge (PsaC, D, E) where ferredoxin docks
    B(c, s, 1.5, 4.2, 3.1, 1.5, 10.2, g);
}

export function b6f(c, s) {
    const b = ink('prussian');
    B(c, s, -2.4, 0, 2.7, 3.4, 6.7, b); B(c, s, 2.4, 0, 2.7, 3.4, 7.3, b);
    // Cytochrome f and the Rieske protein on the lumenal side
    B(c, s, 0, -4.4, 3.9, 1.6, 8.1, mix(b, P.canvas, 0.25));
}

export function fnr(c, s) { B(c, s, 0, 4.6, 2.7, 2.2, 11.6, ink('umber')); }

// ─── Respiratory complexes ───
export function ndh1(c, s, mito) {
    const b = ink('indigo');
    B(c, s, -1.5, 0.1, 8.6, 3.2, 5.7, b);
    // Hydrophilic arm: small in cyanobacterial NDH-1, a long one in complex I
    if (mito) B(c, s, 5.5, 7.2, 3.7, 6.2, 6.1, b);
    else B(c, s, 5.2, 5.4, 3.3, 4.2, 6.1, b);
}

export function sdh(c, s) {
    const b = ink('violet');
    B(c, s, 0, 0.2, 2.5, 3.2, 12.1, b);
    B(c, s, 0.4, 5.6, 3.3, 3.0, 12.7, b);
}

export function cytOx(c, s) {
    const b = ink('verdigris');
    B(c, s, 0, -0.2, 4.4, 3.6, 8.8, b);
    B(c, s, -1, -4, 2.5, 1.3, 9.1, b);
}

export function nnt(c, s) {
    const b = ink('madder');
    B(c, s, 0, 0, 4.8, 3.2, 14.2, b);
    B(c, s, -2.5, 5.6, 2.4, 2.4, 14.6, b); B(c, s, 2.5, 5.6, 2.4, 2.4, 14.9, b);
}

export function ucp(c, s) { B(c, s, 0, 0, 1.8, 3.2, 15.5, ink('sienna')); }

/** Bacteriorhodopsin trimers in their hexagonal lattice, cut through. */
export function brPatch(c, s, n) {
    const b = ink('violet'), w = WIDTH_BR / n;
    for (let i = 0; i < n; i++) {
        const x = (-WIDTH_BR / 2 + w * (i + 0.5));
        B(c, s, x, 0, w * 0.43, 2.7, 16 + i * 0.7, b);
        // Retinal, the chromophore that makes the membrane purple
        c.strokeStyle = shades(ink('mulberry')).line; c.lineWidth = Math.max(0.8, 0.22 * s); c.lineCap = 'round';
        c.beginPath(); c.moveTo((x - 0.6) * s, -0.6 * s); c.lineTo((x + 0.5) * s, 0.5 * s); c.stroke();
    }
}
const WIDTH_BR = 33;

// ─── ATP synthase ───
/** The stator: a subunit, peripheral stalk, and the α₃β₃ head. */
export function atpStator(c, s) {
    const m = ink('mulberry'), sh = shades(m);
    B(c, s, 4.3, 0, 1.4, 3, 12.4, m);
    c.fillStyle = sh.line; c.fillRect(4.6 * s, 2.6 * s, 0.85 * s, 12.4 * s);
    const hy = 12.6;
    B(c, s, -3.1, hy, 2.6, 4.1, 13.1, m);
    B(c, s, 3.1, hy, 2.6, 4.1, 13.9, m);
    B(c, s, 0, hy + 0.3, 2.8, 4.3, 14.6, mix(m, '#ffffff', P.dark ? 0.08 : 0.18));
    B(c, s, 1.6, hy + 4.6, 1.5, 1.1, 15.2, m);
}

/** The rotor: twelve c subunits and the central stalk, at angle phase. */
export function atpRotor(c, s, phase) {
    const m = ink('mulberry'), sh = shades(m), r = 3, h = 4.6;
    const ring = [];
    for (let k = 0; k < 12; k++) {
        const th = phase + k * TAU / 12;
        ring.push({ x: r * Math.sin(th), w: Math.abs(Math.cos(th)), z: Math.cos(th) });
    }
    ring.sort((a, b) => a.z - b.z);
    c.lineWidth = Math.max(0.6, 0.14 * s); c.strokeStyle = sh.line;
    for (const q of ring) {
        const wd = (0.35 + 0.75 * q.w) * s;
        c.fillStyle = q.z < 0 ? mix(sh.fill, P.canvas, 0.35) : sh.fill;
        c.beginPath(); c.roundRect(q.x * s - wd / 2, -h / 2 * s, wd, h * s, 0.4 * s); c.fill(); c.stroke();
    }
    // Central stalk (γε), its sway and the ε marker turning with it
    const sway = 0.45 * Math.sin(phase);
    c.strokeStyle = sh.line; c.lineWidth = 0.95 * s; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 2.3 * s); c.quadraticCurveTo(sway * s, 5.5 * s, 0, 9 * s); c.stroke();
    c.fillStyle = sh.fill;
    c.beginPath(); c.ellipse(1.1 * Math.sin(phase) * s, 3.3 * s, (0.5 + 0.35 * Math.abs(Math.cos(phase))) * s, 0.7 * s, 0, 0, TAU); c.fill(); c.stroke();
}

// ─── Small molecules and carriers ───
/** Plastoquinone (or ubiquinone, menaquinone): a ring head and an isoprenoid tail. */
export function quinone(c, s, reduced) {
    const o = ink('ochre'), sh = shades(o);
    c.strokeStyle = sh.line; c.lineWidth = Math.max(0.8, 0.22 * s); c.lineJoin = 'round';
    c.beginPath(); c.moveTo(0.6 * s, 0);
    for (let k = 1; k <= 6; k++) c.lineTo((0.6 + k * 0.55) * s, (k % 2 ? 0.35 : -0.35) * s);
    c.stroke();
    c.beginPath();
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; c.lineTo(Math.cos(a) * 0.62 * s, Math.sin(a) * 0.62 * s); }
    c.closePath(); c.fillStyle = reduced ? sh.line : sh.fill; c.fill(); c.stroke();
}

export function carrier(c, s, x, y, r, seed, base) { blob(c, x, y, r * s, r * 0.9 * s, seed, base, s); }

/** ATP: an adenosine body and three phosphates, drawn at (x, y). */
export function atp(c, s, x, y, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    blob(c, 0, 0, 0.75 * s, 0.6 * s, 23, ink('umber'), s);
    const ph = shades(ink('ochre'));
    for (let k = 1; k <= 3; k++) {
        c.beginPath(); c.arc((0.7 + k * 0.62) * s, 0, 0.32 * s, 0, TAU);
        c.fillStyle = ph.fill; c.fill(); c.lineWidth = Math.max(0.5, 0.1 * s); c.strokeStyle = ph.line; c.stroke();
    }
    c.restore();
}

/** O₂: two joined atoms. */
export function o2(c, s, x, y, rot) {
    const sh = shades(ink('prussian'));
    for (const d of [-0.33, 0.33]) {
        c.beginPath(); c.arc(x + Math.cos(rot) * d * s, y + Math.sin(rot) * d * s, 0.42 * s, 0, TAU);
        c.fillStyle = mix(sh.fill, P.canvas, 0.25); c.fill(); c.lineWidth = Math.max(0.5, 0.1 * s); c.strokeStyle = sh.line; c.stroke();
    }
}
