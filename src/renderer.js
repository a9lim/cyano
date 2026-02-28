/* ===================================================================
   renderer.js — Integrated Metabolic Network with Zoom/Pan
   Shared metabolite nodes, bidirectional arrows for shared enzymes,
   R5P shared between PPP and Calvin, Calvin in cytoplasm
   =================================================================== */

import { _TWO_PI, Anim } from './anim.js';
import { EnzymeStyles, CFG, _F } from './enzymes.js';

const _r = window._r;

// Pre-computed constants for hot render paths (avoid per-frame allocations)
const _TWO_X = new Set(['g3p', 'bpg', 'pga3', 'pga2', 'pep', 'pyruvate', 'acetylCoA', 'ethanol', 'acetaldehyde', 'aceticAcid']);
const _KREBS_METABS = new Set(['acetylCoA', 'citrate', 'isocitrate', 'akg', 'succoa', 'succinate', 'fumarate', 'malate', 'oaa']);
const _fadeCurve = (t) => t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1;

// Static lookup for metabolite fade alpha — replaces 17-branch if/else in getMetabAlpha
const _fermentAlpha = (state) => state.fermentFade ? state.fermentFade.value : ((!state.oxygenAvailable && state.glycolysisEnabled) ? 1 : 0);
const _METAB_ALPHA = {
    glucose:      (g) => g,
    g6p:          (g, c, p) => Math.max(g, p),
    f6p:          (g, c, p) => Math.max(g, c, p),
    f16bp:        (g, c) => Math.max(g, c),
    g3p:          (g, c) => Math.max(g, c),
    bpg:          (g, c) => Math.max(g, c),
    pga3:         (g, c) => Math.max(g, c),
    pga2:         (g) => g,
    pep:          (g) => g,
    pyruvate:     (g, c, p, k) => Math.max(g, k),
    ethanol:      (g, c, p, k, s) => Math.max(_fermentAlpha(s), k),
    acetaldehyde: (g, c, p, k, s) => Math.max(_fermentAlpha(s), k),
    aceticAcid:   (g, c, p, k) => k,
    pgl6:         (g, c, p) => p,
    pga6:         (g, c, p) => p,
    r5p:          (g, c, p) => Math.max(p, c),
    rubp:         (g, c) => c,
};

const Renderer = {
    canvas: null, ctx: null, W: 0, H: 0, dpr: 1,
    zoom: 1, panX: 0, panY: 0,
    isPanning: false, lastMX: 0, lastMY: 0,
    electrons: [], protons: [], photons: [],
    membraneY: 0, membraneH: 0,
    sidebarInset: 0, _sidebarInsetCurrent: 0,
    _sidebarAnimStart: 0, _sidebarAnimFrom: 0, _sidebarAnimTo: 0, _sidebarAnimating: false,
    etcComplexes: {}, metab: {},
    enzymeHitboxes: [],  // [{cx, cy, w, h, pathway, stepIndex}]
    metabPulse: {},      // { key: { startTime, prevCount } } for scale pulse on count change
    onEnzymeClick: null, // callback set by sim.js

    pathwayColors: null, // initialized in init() from EnzymeStyles.roleColors

    krebsSteps: [
        { abbr: 'CS', product: 'Citrate' },
        { abbr: 'ACO', product: 'Isocitrate' },
        { abbr: 'IDH', product: 'α-KG' },
        { abbr: 'KGDH', product: 'Suc-CoA' },
        { abbr: 'SCS', product: 'Succinate' },
        { abbr: 'SDH', product: 'Fumarate' },
        { abbr: 'FUM', product: 'Malate' },
        { abbr: 'MDH', product: 'OAA' },
    ],

    init(canvasEl) {
        this.canvas = canvasEl;
        this.ctx = canvasEl.getContext('2d');
        this._zoomEl = document.getElementById('zoom-indicator');
        const R = EnzymeStyles.roleColors;
        this.pathwayColors = {
            glycolysis:   R.glycolysis.stroke,
            calvin:       R.calvin.stroke,
            ppp:          R.ppp.stroke,
            krebs:        R.krebs.stroke,

            fermentation: R.fermentation.stroke,
            shared:       R.shared.stroke,
        };
        this.resize();
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => this.resize(), 100);
        });
        this.initZoomPan();
        this.initTouch();
    },

    resize() {
        this.dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.W = Math.floor(rect.width);
        this.H = Math.floor(rect.height);
        this.canvas.width = this.W * this.dpr;
        this.canvas.height = this.H * this.dpr;
        this.canvas.style.width = this.W + 'px';
        this.canvas.style.height = this.H + 'px';
        this.computeLayout();
        // On first init or orientation change, fit zoom to content
        if (!this._hasInitZoom) {
            this._hasInitZoom = true;
            this.zoom = this._minZoom();
            this.panX = 0; this.panY = 0;
            this.clampPan();
            if (this._zoomEl) this._zoomEl.textContent = Math.round(this.zoom * 100) + '%';
        }
    },

    clampPan() {
        const vw = this.W, vh = this.H;
        // Content dimensions use the same minimums as computeLayout
        const cw = Math.max(vw, 900);
        const ch = Math.max(vh, 600);
        const sw = cw * this.zoom, sh = ch * this.zoom;
        // If scaled content fits within viewport, center it; otherwise clamp edges
        if (sw <= vw) {
            this.panX = (vw - sw) / 2;
        } else {
            this.panX = Math.min(0, Math.max(vw - sw, this.panX));
        }
        if (sh <= vh) {
            this.panY = (vh - sh) / 2;
        } else {
            this.panY = Math.min(0, Math.max(vh - sh, this.panY));
        }
    },

    initZoomPan() {
        const c = this.canvas;
        c.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = c.getBoundingClientRect();
            this._applyZoom(this.zoom * (e.deltaY > 0 ? 0.92 : 1.08), e.clientX - rect.left, e.clientY - rect.top);
        }, { passive: false });
        c.addEventListener('mousedown', (e) => { if (e.button === 0) { this.isPanning = true; this.lastMX = e.clientX; this.lastMY = e.clientY; } });
        window.addEventListener('mousemove', (e) => {
            if (!this.isPanning) {
                // Hover detection for cursor change
                const rect = c.getBoundingClientRect();
                const mx = (e.clientX - rect.left - this.panX) / this.zoom;
                const my = (e.clientY - rect.top - this.panY) / this.zoom;
                let hovering = false;
                for (const hb of this.enzymeHitboxes) {
                    if (Math.abs(mx - hb.cx) < hb.w / 2 && Math.abs(my - hb.cy) < hb.h / 2) {
                        hovering = true; break;
                    }
                }
                c.style.cursor = hovering ? 'pointer' : (this.isPanning ? 'grabbing' : 'grab');
                return;
            }
            this.panX += e.clientX - this.lastMX; this.panY += e.clientY - this.lastMY;
            this.lastMX = e.clientX; this.lastMY = e.clientY;
            this.clampPan();
        });
        window.addEventListener('mouseup', () => { this.isPanning = false; });

        // Click-to-react: left=forward, middle/right=reverse
        c.addEventListener('contextmenu', (e) => e.preventDefault());
        const handleClick = (e) => {
            if (!this.onEnzymeClick) return;
            const rect = c.getBoundingClientRect();
            const mx = (e.clientX - rect.left - this.panX) / this.zoom;
            const my = (e.clientY - rect.top - this.panY) / this.zoom;
            const dir = (e.button === 0) ? 'forward' : 'reverse';
            for (const hb of this.enzymeHitboxes) {
                if (Math.abs(mx - hb.cx) < hb.w / 2 && Math.abs(my - hb.cy) < hb.h / 2) {
                    e.preventDefault();
                    this.onEnzymeClick(hb.pathway, hb.stepIndex, dir);
                    return;
                }
            }
        };
        c.addEventListener('click', handleClick);
        c.addEventListener('auxclick', handleClick);
    },

    /* ---- Touch support for pinch-zoom and tap ---- */
    initTouch() {
        const c = this.canvas;
        let touchStartDist = 0;
        let touchStartX = 0, touchStartY = 0;
        let isTap = false;
        const _mid = { x: 0, y: 0 };

        c.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                touchStartDist = Math.sqrt(dx * dx + dy * dy);
            } else if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                this.lastMX = touchStartX;
                this.lastMY = touchStartY;
                isTap = true;
            }
        }, { passive: false });

        c.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length === 2 && touchStartDist > 0) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                _mid.x = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                _mid.y = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                const rect = c.getBoundingClientRect();
                this._applyZoom(this.zoom * (dist / touchStartDist), _mid.x - rect.left, _mid.y - rect.top);
                touchStartDist = dist;
            } else if (e.touches.length === 1) {
                const dx = e.touches[0].clientX - touchStartX;
                const dy = e.touches[0].clientY - touchStartY;
                if (Math.abs(dx) > 8 || Math.abs(dy) > 8) isTap = false;
                this.panX += e.touches[0].clientX - this.lastMX;
                this.panY += e.touches[0].clientY - this.lastMY;
                this.lastMX = e.touches[0].clientX;
                this.lastMY = e.touches[0].clientY;
                this.clampPan();
            }
        }, { passive: false });

        c.addEventListener('touchend', (e) => {
            touchStartDist = 0;
            if (isTap && e.changedTouches.length === 1 && e.touches.length === 0) {
                const touch = e.changedTouches[0];
                const rect = c.getBoundingClientRect();
                const mx = (touch.clientX - rect.left - this.panX) / this.zoom;
                const my = (touch.clientY - rect.top - this.panY) / this.zoom;
                if (this.onEnzymeClick) {
                    for (const hb of this.enzymeHitboxes) {
                        if (Math.abs(mx - hb.cx) < hb.w / 2 && Math.abs(my - hb.cy) < hb.h / 2) {
                            this.onEnzymeClick(hb.pathway, hb.stepIndex, 'forward');
                            break;
                        }
                    }
                }
            }
            isTap = false;
        });
    },

    /* ---- Zoom helpers ---- */
    _minZoom() {
        // Allow zooming out enough to fit the full content width
        const MIN_CONTENT_W = 900;
        return Math.min(1, this.W / MIN_CONTENT_W);
    },

    _applyZoom(newZoom, cx, cy) {
        const oldZ = this.zoom;
        this.zoom = Math.max(this._minZoom(), Math.min(3, newZoom));
        this.panX = cx - (cx - this.panX) * (this.zoom / oldZ);
        this.panY = cy - (cy - this.panY) * (this.zoom / oldZ);
        this.clampPan();
        this._zoomEl.textContent = Math.round(this.zoom * 100) + '%';
    },
    zoomIn()    { this._applyZoom(this.zoom * 1.25, this.W / 2, this.H / 2); },
    zoomOut()   { this._applyZoom(this.zoom / 1.25, this.W / 2, this.H / 2); },
    resetZoom() {
        this.zoom = this._minZoom();
        this.panX = 0; this.panY = 0;
        this.clampPan();
        this._zoomEl.textContent = Math.round(this.zoom * 100) + '%';
    },

    computeLayout() {
        const W = this.W, H = this.H;
        // Effective layout width accounts for sidebar inset (content shifts left)
        // Use a minimum content width so pathways never get compressed below readable size
        const MIN_CONTENT_W = 900;
        const rawLW = W - this._sidebarInsetCurrent;
        const LW = Math.max(rawLW, MIN_CONTENT_W);
        this._LW = LW; // store for label drawing
        // Use minimum content height so vertical spacing stays readable
        const LH = Math.max(H, 600);

        // ── MEMBRANE ──
        this.membraneY = LH * 0.22;
        this.membraneH = 60;
        const memMid = this.membraneY + this.membraneH / 2;
        const mPad = LW * 0.02, mW = LW - mPad * 2;

        // Linearly distribute 13 complexes across the available membrane width
        const numComplexes = 13;
        const step = mW / (numComplexes + 1);
        const colW = (i) => mPad + step * i;

        this.etcComplexes = {
            psii: { cx: colW(1), cy: memMid },
            ndh1: { cx: colW(2), cy: memMid },
            sdh: { cx: colW(3), cy: memMid + this.membraneH * 0.3 },
            pq: { cx: colW(4), cy: memMid },
            cytb6f: { cx: colW(5), cy: memMid },
            pc: { cx: colW(6), cy: memMid - this.membraneH * 0.3 },
            cytOx: { cx: colW(7), cy: memMid },
            psi: { cx: colW(8), cy: memMid },
            fd: { cx: colW(9), cy: memMid + this.membraneH * 0.3 },
            fnr: { cx: colW(10), cy: memMid + this.membraneH * 0.3 },
            atpSyn: { cx: colW(11), cy: memMid },
            br: { cx: colW(12), cy: memMid },
            nnt: { cx: colW(13), cy: memMid },
        };

        // ── CYTOPLASM — Orthogonal Layout ──
        // Clear below the tallest ETC complex (cxH * 0.8 / 2 extends below memMid)
        const top = this.membraneY + this.membraneH + 120;
        const rowH = (LH - top + 200) / 5;
        const col = (i) => LW * (0.04 + i * 0.082);
        const r = [top, top + rowH, top + rowH * 2, top + rowH * 3, top + rowH * 4, top + rowH * 5];

        this.metab = {
            // Row 0
            pgl6: { cx: col(1), cy: r[0], label: '6-PGL' },
            pga6: { cx: col(2), cy: r[0], label: '6-PGA' },
            r5p: { cx: col(3), cy: r[0], label: 'R5P' },
            rubp: { cx: col(7), cy: r[0], label: 'RuBP' },

            // Row 1 (Glycolysis Backbone)
            glucose: { cx: col(0), cy: r[1], label: 'Glucose' },
            g6p: { cx: col(1), cy: r[1], label: 'G6P' },
            f6p: { cx: col(3), cy: r[1], label: 'F6P' },
            f16bp: { cx: col(4), cy: r[1], label: 'F1,6BP' },
            g3p: { cx: col(5), cy: r[1], label: 'G3P' },
            bpg: { cx: col(6), cy: r[1], label: '1,3-BPG' },
            pga3: { cx: col(7), cy: r[1], label: '3-PGA' },
            pga2: { cx: col(8), cy: r[1], label: '2-PGA' },
            pep: { cx: col(9), cy: r[1], label: 'PEP' },
            pyruvate: { cx: col(10), cy: r[1], label: 'Pyruvate' },
            ethanol: { cx: col(11), cy: r[0], label: 'Ethanol' },
            acetaldehyde: { cx: col(11), cy: r[1], label: 'Acetaldehyde' },

            // Row 2-4 (Krebs Cycle Orthogonal Loop under Pyruvate)
            acetylCoA: { cx: col(10), cy: r[2], label: 'Acetyl-CoA' },
            aceticAcid: { cx: col(11), cy: r[2], label: 'Acetic Acid' },
            citrate: { cx: col(9), cy: r[2], label: 'Citrate' },
            isocitrate: { cx: col(8), cy: r[2], label: 'Isocitrate' },
            akg: { cx: col(7), cy: r[2], label: 'α-KG' },
            succoa: { cx: col(6), cy: r[2], label: 'Suc-CoA' },
            succinate: { cx: col(6), cy: r[3], label: 'Succinate' },
            fumarate: { cx: col(7), cy: r[3], label: 'Fumarate' },
            malate: { cx: col(8), cy: r[3], label: 'Malate' },
            oaa: { cx: col(9), cy: r[3], label: 'OAA' },
        };
        this._metabKeys = Object.keys(this.metab);
    },

    /* ==== MAIN DRAW ==== */
    draw(state) {
        const ctx = this.ctx;
        const lm = state.visualLightMode !== undefined ? state.visualLightMode : state.lightOn;
        this._currentLightMode = lm;

        // Smoothly animate sidebar inset — matches CSS transition exactly:
        // 0.45s cubic-bezier(0.23, 1, 0.32, 1)
        if (this.sidebarInset !== this._sidebarAnimTo) {
            this._sidebarAnimFrom = this._sidebarInsetCurrent;
            this._sidebarAnimTo = this.sidebarInset;
            this._sidebarAnimStart = performance.now();
            this._sidebarAnimating = true;
        }
        if (this._sidebarAnimating) {
            const elapsed = (performance.now() - this._sidebarAnimStart) / 450; // 0.45s
            if (elapsed >= 1) {
                this._sidebarInsetCurrent = this._sidebarAnimTo;
                this._sidebarAnimating = false;
            } else {
                // cubic-bezier(0.23, 1, 0.32, 1) — sampled via De Casteljau
                const t = elapsed;
                const p1x = 0.23, p1y = 1, p2x = 0.32, p2y = 1;
                // Newton-Raphson to solve bezier x(s) = t for s
                let s = t;
                for (let i = 0; i < 8; i++) {
                    const s2 = s * s, s3 = s2 * s;
                    const x = 3 * p1x * s * (1 - s) * (1 - s) + 3 * p2x * s2 * (1 - s) + s3 - t;
                    const dx = 3 * p1x * (1 - s) * (1 - s) - 6 * p1x * s * (1 - s) + 6 * p2x * s * (1 - s) - 3 * p2x * s2 + 3 * s2;
                    if (Math.abs(dx) < 1e-6) break;
                    s -= x / dx;
                }
                s = Math.max(0, Math.min(1, s));
                const s2 = s * s, s3 = s2 * s;
                const ease = 3 * p1y * s * (1 - s) * (1 - s) + 3 * p2y * s2 * (1 - s) + s3;
                this._sidebarInsetCurrent = this._sidebarAnimFrom + (this._sidebarAnimTo - this._sidebarAnimFrom) * ease;
            }
            this.computeLayout();
        }

        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, this.W, this.H);
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);

        this.enzymeHitboxes.length = 0; // reset each frame (reuse array)
        this.drawMembrane(ctx, lm, state.time);
        this.drawETCChain(ctx, state, lm);
        this.drawCytoplasmNetwork(ctx, state, lm);
        this.drawKrebsCycle(ctx, state, lm);
        this.drawParticles(ctx, state);
        this.drawLabels(ctx, state, lm);

        ctx.restore();
    },

    drawMembrane(ctx, lm, time) {
        // Extend membrane 400px past the right edge so it's visible behind the translucent sidebar
        EnzymeStyles.drawMembrane(ctx, 0, this.membraneY, this._LW + 400, this.membraneH, lm, time);
    },

    drawLabels(ctx, state, lm) {
        ctx.font = _F.body300_9;
        const th = EnzymeStyles.t(lm);
        ctx.fillStyle = th.sectionLabel;
        ctx.textAlign = 'center';
        const cx = (this._LW || this.W) * 0.5;

        const lightY = this.membraneY * 0.5;
        if (state.lightOn) {
            ctx.save();
            ctx.font = _F.body500_14; ctx.fillStyle = EnzymeStyles.roleColors.lightIndicator.stroke;
            ctx.fillText('LIGHT', cx, lightY - 24);
            ctx.font = _F.emoji38;
            ctx.shadowColor = _r(EnzymeStyles.roleColors.lightIndicator.stroke, 0.4); ctx.shadowBlur = 16;
            ctx.fillText('☀', cx, lightY + 14); ctx.shadowBlur = 0;
            ctx.restore();
        } else {
            ctx.font = _F.body500_14; ctx.fillStyle = _r(EnzymeStyles.roleColors.nightIndicator.stroke, 0.3);
            ctx.fillText('DARK', cx, lightY - 24);
            ctx.font = _F.emoji38; ctx.fillStyle = _r(EnzymeStyles.roleColors.nightIndicator.stroke, 0.2);
            ctx.fillText('☾', cx, lightY + 14);
        }
    },

    /* ---- ETC CHAIN ---- */
    drawETCChain(ctx, state, lm) {
        const c = this.etcComplexes;
        const lightOn = state.lightOn, t = state.time;
        const pulse = 5 + 3 * Math.sin(t * 3);
        const rA = state.respEtcFade ? state.respEtcFade.value : (state.oxygenAvailable ? 1 : 0);
        const phA = state.photoEtcFade ? state.photoEtcFade.value : (state.lightOn ? 1 : 0);
        const shA = Math.max(rA, phA);
        const photoPulse = lightOn ? pulse : 0;
        const respPulse = state.oxygenAvailable ? pulse * 0.7 : 0;
        const cxH = 140, cxW = 68, sR = 20;
        const R = EnzymeStyles.roleColors;
        const respC = R.respiratory.stroke, photoC = R.photosynthetic.stroke, sharedC = R.shared.stroke, cyclicC = R.cyclic.stroke, nntC = R.nnt.stroke, atpSynC = R.atpSynthase.stroke;

        // ── Respiratory chain arrows (blue) ──
        if (rA > 0.01) {
            ctx.save(); ctx.globalAlpha = rA;
            // NDH-1 → PQ (center → diamond left tip)
            EnzymeStyles.drawArrow(ctx, c.ndh1.cx, c.ndh1.cy, c.pq.cx - 22, c.pq.cy, respC, rA);
            // SDH → PQ (center → diamond left tip)
            EnzymeStyles.drawArrow(ctx, c.sdh.cx, c.sdh.cy, c.pq.cx - 22, c.pq.cy, respC, rA);
            // PC → CytOx (center → trapezoid left edge at center)
            EnzymeStyles.drawArrow(ctx, c.pc.cx, c.pc.cy, c.cytOx.cx - 29, c.cytOx.cy, respC, rA);
            ctx.restore();
        }

        // ── Shared arrows: PQ → Cyt b6f → PC (orange, used by both chains) ──
        if (shA > 0.01) {
            ctx.save(); ctx.globalAlpha = shA;
            // PQ → Cyt b6f (center → hourglass pinch left edge)
            EnzymeStyles.drawArrow(ctx, c.pq.cx, c.pq.cy, c.cytb6f.cx - 20, c.cytb6f.cy, sharedC, shA);
            // Cyt b6f → PC (center → circle left edge)
            EnzymeStyles.drawArrow(ctx, c.cytb6f.cx, c.cytb6f.cy, c.pc.cx - sR, c.pc.cy, sharedC, shA);
            ctx.restore();
        }

        // ── Photosynthetic chain arrows (green) ──
        if (phA > 0.01) {
            ctx.save(); ctx.globalAlpha = phA;
            // PSII → PQ (center → diamond left tip)
            EnzymeStyles.drawArrow(ctx, c.psii.cx, c.psii.cy, c.pq.cx - 22, c.pq.cy, photoC, phA);
            // PC → PSI (center → ellipse left edge)
            EnzymeStyles.drawArrow(ctx, c.pc.cx, c.pc.cy, c.psi.cx - cxW / 2, c.psi.cy, photoC, phA);
            // PSI → Fd (center → diamond left tip)
            EnzymeStyles.drawArrow(ctx, c.psi.cx, c.psi.cy, c.fd.cx - 18, c.fd.cy, photoC, phA);
            // Fd → FNR (center → ellipse left edge)
            if (state.linearLightEnabled) EnzymeStyles.drawArrow(ctx, c.fd.cx, c.fd.cy, c.fnr.cx - 26, c.fnr.cy, photoC, phA);
            // Cyclic: Fd bottom → PQ bottom (curves below membrane)
            if (state.cyclicLightEnabled) {
                const cStartX = c.fd.cx, cStartY = c.fd.cy + 18 + 2;
                const cEndX = c.pq.cx, cEndY = c.pq.cy + 13 + 2;
                const cCpx = (cStartX + cEndX) / 2, cCpy = this.membraneY + this.membraneH + 80;
                EnzymeStyles._drawArrowCore(ctx, cStartX, cStartY, cEndX, cEndY, { color: cyclicC, alpha: phA, curved: true, cpx: cCpx, cpy: cCpy });
            }
            ctx.restore();
        }

        if (rA > 0.01) {
            ctx.save(); ctx.globalAlpha = rA;
            this.drawSmallProtonArrow(ctx, c.ndh1.cx, c.ndh1.cy - cxH * 0.6 / 2 - 18, '4H⁺');
            this.drawSmallProtonArrow(ctx, c.cytOx.cx, c.cytOx.cy - cxH * 0.6 / 2 - 18, '2H⁺');
            ctx.restore();
        }
        if (shA > 0.01) {
            ctx.save(); ctx.globalAlpha = shA;
            this.drawSmallProtonArrow(ctx, c.cytb6f.cx, c.cytb6f.cy - cxH * 0.68 / 2 - 18, '4H⁺');
            ctx.restore();
        }
        if (phA > 0.01) {
            ctx.save(); ctx.globalAlpha = phA;
            this.drawSmallProtonArrow(ctx, c.psii.cx, c.psii.cy - cxH * 0.8 / 2 - 18, '2H⁺');
            ctx.restore();
        }

        ctx.beginPath(); ctx.setLineDash([2, 2]);
        ctx.moveTo(c.atpSyn.cx, this.membraneY - 2); ctx.lineTo(c.atpSyn.cx, this.membraneY + this.membraneH + 2);
        ctx.strokeStyle = _r(EnzymeStyles.roleColors.respiratory.stroke, 0.15); ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);

        ctx.save(); ctx.globalAlpha = rA;
        EnzymeStyles.drawNDH1(ctx, c.ndh1.cx, c.ndh1.cy, cxW, cxH * 0.6, respPulse, lm);
        EnzymeStyles.drawSDH(ctx, c.sdh.cx, c.sdh.cy, cxW * 0.6, respPulse * 0.3, lm);
        EnzymeStyles.drawCytOx(ctx, c.cytOx.cx, c.cytOx.cy, cxW, cxH * 0.6, respPulse, lm);
        ctx.restore();

        ctx.save(); ctx.globalAlpha = shA;
        EnzymeStyles.drawPQ(ctx, c.pq.cx, c.pq.cy, 52, 26, pulse * 0.35, lm);
        EnzymeStyles.drawCytB6f(ctx, c.cytb6f.cx, c.cytb6f.cy, cxW, cxH * 0.68, pulse * 0.4, lm);
        ctx.restore();

        ctx.save(); ctx.globalAlpha = shA;
        EnzymeStyles.drawPC(ctx, c.pc.cx, c.pc.cy, sR, shA > 0.5 ? pulse * 0.3 : 0, lm);
        ctx.restore();

        ctx.save(); ctx.globalAlpha = phA;
        EnzymeStyles.drawPSII(ctx, c.psii.cx, c.psii.cy, cxW, cxH * 0.8, photoPulse, lm);
        EnzymeStyles.drawPSI(ctx, c.psi.cx, c.psi.cy, cxW, cxH * 0.7, photoPulse, lm);
        EnzymeStyles.drawFd(ctx, c.fd.cx, c.fd.cy, sR, photoPulse * 0.25, lm);
        EnzymeStyles.drawFNR(ctx, c.fnr.cx, c.fnr.cy, 52, 26, photoPulse * 0.35, lm);
        ctx.restore();

        const atpGlow = state.protonGradient > 0 ? pulse : 0;
        EnzymeStyles.drawATPSynthase(ctx, c.atpSyn.cx, c.atpSyn.cy, cxW + 4, cxH * 0.8, atpGlow, lm);

        ctx.save(); ctx.globalAlpha = phA;
        EnzymeStyles.drawBR(ctx, c.br.cx, c.br.cy, cxW - 4, cxH * 0.6, phA > 0.5 ? 5 + 3 * Math.sin(t * 4) : 0, lm);
        if (phA > 0.01) this.drawSmallProtonArrow(ctx, c.br.cx, c.br.cy - cxH * 0.6 / 2 - 18, '1H⁺');
        ctx.restore();

        // NNT — transhydrogenase, always visible, glows when gradient available
        const nntGlow = state.protonGradient > 0 ? pulse : 0;
        EnzymeStyles.drawNNT(ctx, c.nnt.cx, c.nnt.cy, cxW - 4, cxH * 0.6, nntGlow, lm);

        // Yield labels: moved inside synced alpha blocks to dim instead of disappearing
        ctx.font = _F.mono500_10; ctx.textAlign = 'center';

        ctx.save();
        ctx.globalAlpha = phA;
        ctx.fillStyle = photoC;
        ctx.fillText('+½O₂', c.psii.cx, c.psii.cy + cxH * 0.8 / 2 + 12);
        ctx.fillText('+NADPH', c.fnr.cx, c.fnr.cy + 26 / 2 + 14);
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = rA;
        ctx.fillStyle = respC;
        ctx.fillText('-NADH', c.ndh1.cx, c.ndh1.cy + cxH * 0.6 / 2 + 18);
        ctx.fillText('-FADH₂', c.sdh.cx, c.sdh.cy + cxH * 0.3 / 2 + 22);
        ctx.fillText('-½O₂', c.cytOx.cx, c.cytOx.cy + cxH * 0.6 / 2 + 12);
        ctx.restore();

        // ATP Synthase: downward 4H⁺ arrow (protons flowing through to make ATP) + +ATP label below
        const atpBotY = c.atpSyn.cy + cxH * 0.8 / 2;
        this.drawSmallProtonArrow(ctx, c.atpSyn.cx, atpBotY + 3, '4H⁺', 'down');
        ctx.font = _F.mono500_10;
        ctx.fillStyle = atpSynC; ctx.textAlign = 'center';
        ctx.fillText('+ATP', c.atpSyn.cx, atpBotY + 47);

        // NNT: downward 1H⁺ arrow + yield labels below (always visible)
        {
            const nntBotY = c.nnt.cy + cxH * 0.6 / 2;
            this.drawSmallProtonArrow(ctx, c.nnt.cx, nntBotY + 3, '1H⁺', 'down');
            ctx.font = _F.mono500_10;
            ctx.fillStyle = nntC; ctx.textAlign = 'center';
            ctx.fillText('+NADPH', c.nnt.cx, nntBotY + 47);
            ctx.fillText('-NADH', c.nnt.cx, nntBotY + 59);
        }

        // ETC hitboxes for click-to-react
        if (rA > 0.1) {
            this.enzymeHitboxes.push({ cx: c.ndh1.cx, cy: c.ndh1.cy, w: cxW + 10, h: cxH + 10, pathway: 'etc_resp', stepIndex: 0 });
            this.enzymeHitboxes.push({ cx: c.sdh.cx, cy: c.sdh.cy, w: cxW + 10, h: cxH + 10, pathway: 'etc_resp', stepIndex: 1 });
        }
        this.enzymeHitboxes.push({ cx: c.nnt.cx, cy: c.nnt.cy, w: cxW + 10, h: cxH + 10, pathway: 'nnt', stepIndex: 0 });
        this.enzymeHitboxes.push({ cx: c.psii.cx, cy: c.psii.cy, w: cxW + 10, h: cxH + 10, pathway: 'etc_photo', stepIndex: 0 });
        this.enzymeHitboxes.push({ cx: c.atpSyn.cx, cy: c.atpSyn.cy, w: cxW + 10, h: cxH + 10, pathway: 'atp_syn', stepIndex: 0 });
        this.enzymeHitboxes.push({ cx: c.br.cx, cy: c.br.cy, w: cxW + 10, h: cxH + 10, pathway: 'br', stepIndex: 0 });
        this.enzymeHitboxes.push({ cx: c.psi.cx, cy: c.psi.cy, w: cxW + 10, h: cxH + 10, pathway: 'etc_cyclic', stepIndex: 0 });
    },

    /** Horizontal labeled run-arrow with arrowhead and hitbox (used for glycolysis upper/lower) */
    _drawRunArrow(ctx, fromX, toX, y, color, alpha, lineW, headLen, label, pathway) {
        const midX = (fromX + toX) / 2;
        const halfW = (toX - fromX) / 2 - 16;
        const x1 = midX - halfW, x2 = midX + halfW;
        ctx.beginPath();
        ctx.moveTo(x1, y); ctx.lineTo(midX - 38, y);
        ctx.moveTo(midX + 38, y); ctx.lineTo(x2 - headLen, y);
        ctx.strokeStyle = color; ctx.lineWidth = lineW; ctx.globalAlpha = alpha; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x2, y);
        ctx.lineTo(x2 - headLen, y - headLen * 0.5);
        ctx.lineTo(x2 - headLen, y + headLen * 0.5);
        ctx.fillStyle = color; ctx.fill();
        ctx.font = _F.mono700_12;
        ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, midX, y);
        this.enzymeHitboxes.push({ cx: midX, cy: y, w: halfW * 2, h: 30, pathway, stepIndex: 0 });
    },

    drawSmallProtonArrow(ctx, x, y, label, dir = 'up') {
        const protonC = EnzymeStyles.roleColors.proton.stroke;
        ctx.strokeStyle = protonC; ctx.lineWidth = 2;
        ctx.font = _F.mono600_10; ctx.fillStyle = protonC; ctx.textAlign = 'center';
        if (dir === 'down') {
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 14); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x, y + 17); ctx.lineTo(x - 5, y + 11); ctx.lineTo(x + 5, y + 11); ctx.closePath(); ctx.fill();
            ctx.fillText(label, x, y + 28);
        } else {
            ctx.beginPath(); ctx.moveTo(x, y + 14); ctx.lineTo(x, y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x - 5, y + 3); ctx.lineTo(x + 5, y + 3); ctx.closePath(); ctx.fill();
            ctx.fillText(label, x, y - 7);
        }
    },

    /* ================================================================
       CYTOPLASM NETWORK — with bidirectional shared enzyme arrows
       ================================================================ */
    drawCytoplasmNetwork(ctx, state, lm) {
        const m = this.metab;
        const gS = state.glycolysisStep, cS = state.calvinStep, pS = state.pppStep;
        const gC = this.pathwayColors.glycolysis;
        const cC = this.pathwayColors.calvin;
        const pC = this.pathwayColors.ppp;
        const kC = this.pathwayColors.krebs;
        const fC = this.pathwayColors.fermentation;


        ctx.font = _F.body400_8;
        ctx.fillStyle = EnzymeStyles.t(lm).sectionLabelAlt;
        ctx.textAlign = 'left';
        ctx.fillText('CYTOPLASMIC CARBON METABOLISM', 5, this.membraneY + this.membraneH + 16);

        // ══════════════════════════════════════════════════
        // FADE ALPHAS for smooth pathway enable/disable
        // ══════════════════════════════════════════════════
        const gA = state.glycolysisFade ? state.glycolysisFade.value : (state.glycolysisEnabled ? 1 : 0);
        const cA = state.calvinFade ? state.calvinFade.value : ((state.calvinEnabled && state.lightOn) ? 1 : 0);
        const pA = state.pppFade ? state.pppFade.value : (state.pppEnabled ? 1 : 0);
        const kA = state.krebsFade ? state.krebsFade.value : ((state.krebsEnabled && state.oxygenAvailable) ? 1 : 0);
        const gcA = Math.max(gA, cA);  // shared glycolysis ↔ Calvin
        const gpA = Math.max(gA, pA);  // shared glycolysis ↔ PPP
        const pcA = Math.max(pA, cA);  // shared PPP ↔ Calvin

        // ══════════════════════════════════════════════════
        // GLUCOSE → G6P (glycolysis only)
        // ══════════════════════════════════════════════════
        if (gA > 0.01) {
            ctx.save(); ctx.globalAlpha = gA;
            this.drawBidirArrow(ctx, m.glucose, m.g6p, 'HK/G6Pase', gC, gC, gS === 0, 'glycolysis', 0);
            this.drawFloatLabel(ctx, (m.glucose.cx + m.g6p.cx) / 2, (m.glucose.cy + m.g6p.cy) / 2 + 24, '-ATP', gC);
            ctx.restore();
        }

        // ══════════════════════════════════════════════════
        // G6P → F6P (shared glycolysis / PPP)
        // ══════════════════════════════════════════════════
        if (gpA > 0.01) {
            ctx.save(); ctx.globalAlpha = gpA;
            this.drawBidirArrow(ctx, m.g6p, m.f6p, 'PGI', gC, pC, gS === 1, 'glycolysis', 1);
            ctx.restore();
        }

        // ══════════════════════════════════════════════════
        // F6P → F1,6BP (shared glycolysis / Calvin)
        // ══════════════════════════════════════════════════
        if (gcA > 0.01) {
            ctx.save(); ctx.globalAlpha = gcA;
            this.drawBidirArrow(ctx, m.f6p, m.f16bp, 'PFK/FBPase', gC, cC, gS === 2 || cS === 5, 'glycolysis', 2);
            this.drawFloatLabel(ctx, (m.f6p.cx + m.f16bp.cx) / 2, (m.f6p.cy + m.f16bp.cy) / 2 + 24, '-ATP', gC);
            ctx.restore();
        }

        // ══════════════════════════════════════════════════
        // GLYCOLYSIS-ONLY arrows (lower glycolysis + run arrows)
        // ══════════════════════════════════════════════════
        if (gA > 0.01) {
            ctx.save(); ctx.globalAlpha = gA;

            // Lower glycolysis
            this.drawBidirArrow(ctx, m.pga3, m.pga2, 'PGM', gC, gC, gS === 7, 'glycolysis', 7);
            this.drawBidirArrow(ctx, m.pga2, m.pep, 'ENO', gC, gC, gS === 8, 'glycolysis', 8);

            this.drawEnzymeArrow(ctx, m.pep, m.pyruvate, 'PK', gC, gS === 9, 'glycolysis', 9);
            this.drawFloatLabel(ctx, (m.pep.cx + m.pyruvate.cx) / 2, (m.pep.cy + m.pyruvate.cy) / 2 + 24, '+ATP', gC);

            // Yield badges
            if (gS === 5) this.drawYieldBadge(ctx, m.bpg, true, '+NADH', gC);

            // Split glycolysis arrows: Upper (Glc → G3P) and Lower (G3P → Pyr)
            const runY = m.glucose.cy + 38;
            const splitX = m.g3p.cx;
            const glw = CFG.cycleStrokeWidth; // match cycle target thickness
            const gAhL = CFG.cycleTipLen;      // arrowhead length matching cycles

            this._drawRunArrow(ctx, m.glucose.cx, splitX, runY, gC, gA, glw, gAhL, 'Glc→G3P', 'run_glycolysis_upper');
            this._drawRunArrow(ctx, splitX, m.pyruvate.cx, runY, gC, gA, glw, gAhL, 'G3P→Pyr', 'run_glycolysis_lower');

            ctx.restore();
        }

        // ══════════════════════════════════════════════════
        // SHARED BIDIRECTIONAL ARROWS (glycolysis ↔ Calvin)
        // ══════════════════════════════════════════════════
        if (gcA > 0.01) {
            ctx.save(); ctx.globalAlpha = gcA;
            const sharedActive_aldo = (state.glycolysisEnabled && (gS === 3 || gS === 4)) || (state.calvinEnabled && (cS === 4 || cS === 5));
            const sharedActive_gapdh = (state.glycolysisEnabled && gS === 5) || (state.calvinEnabled && cS === 2);
            const sharedActive_pgk = (state.glycolysisEnabled && gS === 6) || (state.calvinEnabled && cS === 1);

            this.drawBidirArrow(ctx, m.f16bp, m.g3p, 'ALDO', gC, cC, sharedActive_aldo, 'glycolysis', 3);

            this.drawBidirArrow(ctx, m.g3p, m.bpg, 'GAPDH', gC, cC, sharedActive_gapdh, 'glycolysis', 5);
            this.drawDualFloatLabel(ctx, (m.g3p.cx + m.bpg.cx) / 2, (m.g3p.cy + m.bpg.cy) / 2 + 24, '+NADH', gC, '-NADPH', cC);

            this.drawBidirArrow(ctx, m.bpg, m.pga3, 'PGK', gC, cC, sharedActive_pgk, 'glycolysis', 6);
            this.drawDualFloatLabel(ctx, (m.bpg.cx + m.pga3.cx) / 2, (m.bpg.cy + m.pga3.cy) / 2 + 24, '+ATP', gC, '-ATP', cC);
            ctx.restore();
        }

        // ══════════════════════════════════════════════════
        // PPP / CALVIN SHARED ARROW (F6P <-> R5P)
        // ══════════════════════════════════════════════════
        if (pcA > 0.01) {
            ctx.save(); ctx.globalAlpha = pcA;
            const tkActive = (state.calvinEnabled && cS === 6) || (state.pppEnabled && pS === 3);
            this.drawBidirArrow(ctx, m.r5p, m.f6p, 'TKT+TAL/TK+SBP', pC, cC, tkActive, 'glycolysis', 10);
            this.drawDualFloatLabel(ctx, (m.r5p.cx + m.f6p.cx) / 2, (m.r5p.cy + m.f6p.cy) / 2 + 26, '6', pC, '⇌ 5', cC);
            ctx.restore();
        }

        // ══════════════════════════════════════════════════
        // PYRUVATE → ACETYL-CoA (fades with Krebs / O₂)
        // ══════════════════════════════════════════════════
        if (kA > 0.01) {
            ctx.save(); ctx.globalAlpha = kA;
            this.drawEnzymeArrow(ctx, m.pyruvate, m.acetylCoA, 'PDH', gC, false, 'pdh', 0);
            this.drawFloatLabel(ctx, m.pyruvate.cx - 30, (m.pyruvate.cy + m.acetylCoA.cy) / 2 - 2, '+NADH', gC);
            this.drawFloatLabel(ctx, m.pyruvate.cx - 30, (m.pyruvate.cy + m.acetylCoA.cy) / 2 + 10, '+CO₂', gC);
            ctx.restore();
        }
        // PYRUVATE → ACETALDEHYDE (PDC, anaerobic fermentation)
        {
            const fmA = state.fermentFade ? state.fermentFade.value : ((!state.oxygenAvailable && state.glycolysisEnabled) ? 1 : 0);
            if (fmA > 0.01) {
                ctx.save(); ctx.globalAlpha = fmA;
                this.drawEnzymeArrow(ctx, m.pyruvate, m.acetaldehyde, 'PDC', fC, state.fermenting, 'pdc', 0);
                this.drawFloatLabel(ctx, (m.pyruvate.cx + m.acetaldehyde.cx) / 2, (m.pyruvate.cy + m.acetaldehyde.cy) / 2 + 24, '+CO₂', fC);
                ctx.restore();
            }
        }
        // ETHANOL ↔ ACETALDEHYDE (ADH, bidirectional: blue oxidation / rose fermentation)
        {
            const fmA = state.fermentFade ? state.fermentFade.value : ((!state.oxygenAvailable && state.glycolysisEnabled) ? 1 : 0);
            const adhA = Math.max(fmA, kA);
            if (adhA > 0.01) {
                ctx.save(); ctx.globalAlpha = adhA;
                this.drawBidirArrow(ctx, m.ethanol, m.acetaldehyde, 'ADH', gC, fC, false, 'adh', 0);
                this.drawFloatLabel(ctx, m.ethanol.cx - 30, (m.ethanol.cy + m.acetaldehyde.cy) / 2 - 2, '+NADH', gC);
                this.drawFloatLabel(ctx, m.ethanol.cx - 30, (m.ethanol.cy + m.acetaldehyde.cy) / 2 + 10, '-NADH', fC);
                ctx.restore();
            }
        }
        // ACETALDEHYDE → ACETIC ACID (ALDH, aerobic) and ACETIC ACID → ACETYL-COA (ACS)
        if (kA > 0.01) {
            ctx.save(); ctx.globalAlpha = kA;
            this.drawEnzymeArrow(ctx, m.acetaldehyde, m.aceticAcid, 'ALDH', gC, false, 'aldh', 0);
            this.drawFloatLabel(ctx, m.acetaldehyde.cx - 42, (m.acetaldehyde.cy + m.aceticAcid.cy) / 2 + 4, '+NADH', gC);
            this.drawEnzymeArrow(ctx, m.aceticAcid, m.acetylCoA, 'ACS', gC, false, 'acs', 0);
            this.drawFloatLabel(ctx, (m.aceticAcid.cx + m.acetylCoA.cx) / 2, (m.aceticAcid.cy + m.acetylCoA.cy) / 2 + 24, '-ATP', gC);
            ctx.restore();
        }

        // ══════════════════════════════════════════════════
        // CALVIN CYCLE-ONLY arrows (green)
        // ══════════════════════════════════════════════════
        if (cA > 0.01) {
            ctx.save(); ctx.globalAlpha = cA;
            this.drawEnzymeArrow(ctx, m.rubp, m.pga3, 'RuBisCO', cC, cS === 0, 'calvin', 0);
            this.drawFloatLabel(ctx, m.rubp.cx - 40, (m.rubp.cy + m.pga3.cy) / 2, '-CO₂', cC);

            // PRK: R5P → RuBP
            this.drawEnzymeArrow(ctx, m.r5p, m.rubp, 'PRK', cC, cS === 7, 'calvin', 7);
            this.drawFloatLabel(ctx, (m.r5p.cx + m.rubp.cx) / 2, (m.r5p.cy + m.rubp.cy) / 2 - 18, '-ATP', cC);

            // Calvin Cycle interaction target (Centered in the cycle mesh)
            const ccx = (m.r5p.cx + m.rubp.cx) / 2;
            const ccy = (m.r5p.cy + m.f6p.cy) / 2;
            EnzymeStyles.drawCycleTarget(ctx, ccx, ccy, cC, 'CALVIN×6', 1, state.calvinRot ? state.calvinRot.angle : 0);
            this.enzymeHitboxes.push({ cx: ccx, cy: ccy, w: 50, h: 50, pathway: 'run_calvin', stepIndex: 0 });
            ctx.restore();
        }

        // ══════════════════════════════════════════════════
        // PPP (indigo) — uses shared R5P node
        // ══════════════════════════════════════════════════
        if (pA > 0.01) {
            ctx.save(); ctx.globalAlpha = pA;
            // Oxidative phase: G6P → 6-PGL → 6-PGA → R5P
            this.drawEnzymeArrow(ctx, m.g6p, m.pgl6, 'G6PDH', pC, pS === 0, 'ppp', 0);
            this.drawFloatLabel(ctx, m.g6p.cx - 42, (m.g6p.cy + m.pgl6.cy) / 2 + 4, '+NADPH', pC);

            this.drawEnzymeArrow(ctx, m.pgl6, m.pga6, '6PGL', pC, pS === 1, 'ppp', 1);

            this.drawEnzymeArrow(ctx, m.pga6, m.r5p, '6PGDH', pC, pS === 2, 'ppp', 2);
            this.drawFloatLabel(ctx, (m.pga6.cx + m.r5p.cx) / 2, m.pga6.cy + 24, '+NADPH, +CO₂', pC);

            // PPP Cycle interaction target (Centered in the cycle)
            const cx = (m.g6p.cx + m.r5p.cx) / 2;
            const cy = (m.g6p.cy + m.pga6.cy) / 2;
            EnzymeStyles.drawCycleTarget(ctx, cx, cy, pC, 'PPP×6', 1, state.pppRot ? state.pppRot.angle : 0);
            this.enzymeHitboxes.push({ cx, cy, w: 50, h: 50, pathway: 'run_ppp', stepIndex: 0 });
            ctx.restore();
        }

        // ══════════════════════════════════════════════════
        // CONNECTING FLOWS
        // ══════════════════════════════════════════════════

        // ══════════════════════════════════════════════════
        // METABOLITE NODES (drawn last, on top)
        // ══════════════════════════════════════════════════
        ctx.font = _F.mono600_9;
        for (const key of this._metabKeys) {
            const mA = this.getMetabAlpha(key, gA, cA, pA, kA, state);
            if (mA > 0.01) {
                const count = state.store ? (state.store[key] || 0) : 0;

                // Pulse detection on count change
                if (!this.metabPulse[key]) this.metabPulse[key] = { startTime: 0, prevCount: count };
                if (count !== this.metabPulse[key].prevCount) {
                    this.metabPulse[key].startTime = state.time;
                    this.metabPulse[key].prevCount = count;
                }
                const pulseAge = Math.max(0, state.time - this.metabPulse[key].startTime);
                const pulseScale = pulseAge < 0.3 ? 1 + 0.15 * (1 - pulseAge / 0.3) : 1;

                ctx.save();
                ctx.globalAlpha = mA;
                if (pulseScale > 1.001) {
                    ctx.translate(m[key].cx, m[key].cy);
                    ctx.scale(pulseScale, pulseScale);
                    ctx.translate(-m[key].cx, -m[key].cy);
                }
                EnzymeStyles.drawMetaboliteNode(ctx, m[key].cx, m[key].cy, m[key].label, this.isMetabActive(key, state), lm, _TWO_X.has(key), count);
                ctx.restore();
            }
        }
    },

    /** Returns the fade alpha (0–1) for a metabolite based on its owning pathways */
    getMetabAlpha(key, gA, cA, pA, kA, state) {
        const fn = _METAB_ALPHA[key];
        if (fn) return fn(gA, cA, pA, kA, state);
        if (_KREBS_METABS.has(key)) return kA;
        return 1;
    },

    isMetabActive(key, state) {
        if (!state || !state.store) return false;
        return state.store[key] > 0;
    },

    /** Compute padded arrow endpoints between two metabolite nodes (shared by all arrow helpers).
     *  Returns false if nodes overlap; otherwise mutates this._ep and returns true. */
    _ep: { x1: 0, y1: 0, x2: 0, y2: 0, nx: 0, ny: 0 },
    _calcEndpoints(from, to) {
        const dx = to.cx - from.cx, dy = to.cy - from.cy;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return false;
        const nx = dx / len, ny = dy / len;
        const pad = Math.min(36, 1.0 / Math.sqrt((nx / 28) ** 2 + (ny / 14) ** 2) + 8);
        const ep = this._ep;
        ep.x1 = from.cx + nx * pad; ep.y1 = from.cy + ny * pad;
        ep.x2 = to.cx - nx * pad;   ep.y2 = to.cy - ny * pad;
        ep.nx = nx; ep.ny = ny;
        return true;
    },

    /** Attach enzyme tag + hitbox at a point */
    _tagAndHitbox(ctx, tagX, tagY, enzyme, color, active, pathway, stepIndex, color2) {
        EnzymeStyles.drawEnzymeTag(ctx, tagX, tagY, enzyme, color, active, this._currentLightMode || false, color2);
        if (pathway !== undefined) {
            this.enzymeHitboxes.push({ cx: tagX, cy: tagY, w: 40, h: 14, pathway, stepIndex });
        }
    },

    /** Single unidirectional enzyme arrow — stores hitbox */
    drawEnzymeArrow(ctx, from, to, enzyme, color, active, pathway, stepIndex) {
        if (!this._calcEndpoints(from, to)) return;
        const { x1, y1, x2, y2 } = this._ep;
        EnzymeStyles.drawArrow(ctx, x1, y1, x2, y2, color, ctx.globalAlpha);
        if (enzyme) this._tagAndHitbox(ctx, (x1 + x2) / 2, (y1 + y2) / 2 - 6, enzyme, color, active, pathway, stepIndex);
    },

    /** Curved unidirectional arrow — stores hitbox */
    drawEnzymeCurvedArrow(ctx, from, to, enzyme, color, active, dir, off, pathway, stepIndex) {
        if (!this._calcEndpoints(from, to)) return;
        const { x1, y1, x2, y2, nx, ny } = this._ep;
        const d = dir || 1;
        EnzymeStyles.drawCurvedArrow(ctx, x1, y1, x2, y2, color, ctx.globalAlpha, d);
        if (enzyme) {
            const o = off || 0;
            this._tagAndHitbox(ctx, (x1 + x2) / 2 + o * d * (-ny), (y1 + y2) / 2 - 6 + o * d * nx, enzyme, color, active, pathway, stepIndex);
        }
    },

    /** Bidirectional arrow for shared reversible enzymes — stores hitbox */
    drawBidirArrow(ctx, nodeA, nodeB, enzyme, colorA, colorB, active, pathway, stepIndex) {
        if (!this._calcEndpoints(nodeA, nodeB)) return;
        const { x1, y1, x2, y2 } = this._ep;
        EnzymeStyles.drawBidirectionalArrow(ctx, x1, y1, x2, y2, colorA, colorB, ctx.globalAlpha);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 6;
        if (enzyme) this._tagAndHitbox(ctx, mx, my, enzyme, colorA, active, pathway, stepIndex, colorB);
    },

    drawYieldBadge(ctx, node, active, text, color) {
        if (!active) return;
        ctx.font = _F.mono500_9; ctx.fillStyle = color;
        ctx.textAlign = 'center'; ctx.fillText(text, node.cx, node.cy + 19);
    },

    /* ---- KREBS CYCLE (UNROLLED) ---- */
    drawKrebsCycle(ctx, state, lm) {
        const m = this.metab;
        const kC = this.pathwayColors.krebs;
        const kS = state.krebsStep;

        const krebsAlpha = state.krebsFade ? state.krebsFade.value : ((state.oxygenAvailable && state.krebsEnabled) ? 1 : 0);
        if (krebsAlpha < 0.01) return;
        ctx.save();
        ctx.globalAlpha = krebsAlpha;

        ctx.font = _F.body400_8;
        ctx.fillStyle = EnzymeStyles.t(lm).protonPoolLabel; ctx.textAlign = 'center';

        // Citrate Synthase: AcCoA → Citrate + OAA → Citrate (both straight)
        this.drawEnzymeArrow(ctx, m.acetylCoA, m.citrate, '', kC, kS === 0, undefined, undefined);
        this.drawEnzymeArrow(ctx, m.oaa, m.citrate, 'CS', kC, kS === 0, 'krebs', 0);

        this.drawEnzymeArrow(ctx, m.citrate, m.isocitrate, 'ACO', kC, kS === 1, 'krebs', 1);

        this.drawEnzymeArrow(ctx, m.isocitrate, m.akg, 'IDH', kC, kS === 2, 'krebs', 2);
        this.drawFloatLabel(ctx, (m.isocitrate.cx + m.akg.cx) / 2, m.isocitrate.cy + 24, '+NADH +CO₂', kC);

        this.drawEnzymeArrow(ctx, m.akg, m.succoa, 'KGDH', kC, kS === 3, 'krebs', 3);
        this.drawFloatLabel(ctx, (m.akg.cx + m.succoa.cx) / 2, m.akg.cy + 24, '+NADH +CO₂', kC);

        this.drawBidirArrow(ctx, m.succoa, m.succinate, 'SCS', kC, kC, kS === 4, 'krebs', 4);
        this.drawFloatLabel(ctx, m.succoa.cx - 32, (m.succoa.cy + m.succinate.cy) / 2 + 4, '+ATP', kC);

        // Loop back
        this.drawBidirArrow(ctx, m.succinate, m.fumarate, 'SDH', kC, kC, kS === 5, 'krebs', 5);
        this.drawFloatLabel(ctx, (m.succinate.cx + m.fumarate.cx) / 2, m.succinate.cy + 24, '+FADH₂', kC);

        this.drawEnzymeArrow(ctx, m.fumarate, m.malate, 'FUM', kC, kS === 6, 'krebs', 6);

        this.drawBidirArrow(ctx, m.malate, m.oaa, 'MDH', kC, kC, kS === 7, 'krebs', 7);
        this.drawFloatLabel(ctx, (m.malate.cx + m.oaa.cx) / 2, m.malate.cy + 24, '+NADH', kC);

        // Krebs Cycle interaction target inside the loop
        const centerKx = (m.succoa.cx + m.oaa.cx) / 2;
        const centerKy = (m.akg.cy + m.succinate.cy) / 2;
        EnzymeStyles.drawCycleTarget(ctx, centerKx, centerKy, kC, 'KREBS×2', -1, state.krebsRot ? state.krebsRot.angle : 0);
        this.enzymeHitboxes.push({ cx: centerKx, cy: centerKy, w: 50, h: 50, pathway: 'run_krebs', stepIndex: 0 });

        ctx.restore();
    },

    drawFloatLabel(ctx, x, y, text, color) {
        ctx.font = _F.mono500_10;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(text, x, y - 10);
    },

    /** Two-part float label with separate colors, centered as a unit */
    drawDualFloatLabel(ctx, x, y, text1, color1, text2, color2) {
        ctx.font = _F.mono500_10;
        const w1 = ctx.measureText(text1).width;
        const gap = ctx.measureText(' ').width;
        const w2 = ctx.measureText(text2).width;
        const totalW = w1 + gap + w2;
        const startX = x - totalW / 2;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = color1;
        ctx.fillText(text1, startX, y - 10);
        ctx.fillStyle = color2;
        ctx.fillText(text2, startX + w1 + gap, y - 10);
    },

    /* ---- PARTICLES ---- */
    spawnElectron(fk, tk, tp) {
        const f = this.etcComplexes[fk], t = this.etcComplexes[tk];
        if (!f || !t) return;
        const type = tp || 'resp';
        const hex = EnzymeStyles.roleColors.electron.stroke;
        this.electrons.push({
            x: f.cx, y: f.cy, tx: t.cx, ty: t.cy,
            progress: 0, speed: 0.025,
            type, trail: Anim.trail(10),
            _trailColor: _r(hex, 0.5)
        });
    },
    spawnProton(cx, dir) {
        const memMid = this.membraneY + this.membraneH / 2;
        const sy = dir === 'up' ? memMid + 70 : memMid - 70;
        const ey = dir === 'up' ? memMid - 70 : memMid + 70;
        this.protons.push({ x: cx + (Math.random() - 0.5) * 5, y: sy, ty: ey, progress: 0, speed: 0.022 });
    },
    spawnPhoton(targetKey) {
        const t = this.etcComplexes[targetKey];
        if (!t) return;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        const dist = 120;
        this.photons.push({
            x: t.cx + Math.cos(angle) * dist,
            y: t.cy + Math.sin(angle) * dist,
            tx: t.cx, ty: t.cy,
            progress: 0, speed: 0.04
        });
    },

    drawParticles(ctx, state) {
        const spd = state.speed;

        // Electrons with glow trails
        for (let i = this.electrons.length - 1; i >= 0; i--) {
            const e = this.electrons[i];
            e.progress += e.speed * spd;
            if (e.progress >= 1) { this.electrons.splice(i, 1); continue; }
            const t = e.progress;
            const px = e.x + (e.tx - e.x) * t;
            const py = e.y + (e.ty - e.y) * t + Math.sin(t * Math.PI * 3) * 3;

            if (e.trail) {
                e.trail.push(px, py);
                e.trail.draw(ctx, 3, e._trailColor);
            }

            EnzymeStyles.drawElectron(ctx, px, py, 1 - Math.abs(t - 0.5) * 2, e.type, _fadeCurve(t));
        }
        // Protons
        for (let i = this.protons.length - 1; i >= 0; i--) {
            const p = this.protons[i];
            p.progress += p.speed * spd;
            if (p.progress >= 1) { this.protons.splice(i, 1); continue; }
            const t = p.progress;
            EnzymeStyles.drawProton(ctx,
                p.x + Math.sin(t * _TWO_PI) * 2,
                p.y + (p.ty - p.y) * t,
                1 - Math.abs(t - 0.5) * 2,
                _fadeCurve(t));
        }
        // Photons (manual alpha management avoids save/restore per particle)
        for (let i = this.photons.length - 1; i >= 0; i--) {
            const ph = this.photons[i];
            ph.progress += ph.speed * spd;
            if (ph.progress >= 1) { this.photons.splice(i, 1); continue; }
            const t = ph.progress;
            const fade = t < 0.3 ? t / 0.3 : (t > 0.7 ? (1 - t) / 0.3 : 1);
            ctx.globalAlpha = fade * 0.9;
            ctx.beginPath();
            ctx.arc(ph.x + (ph.tx - ph.x) * t, ph.y + (ph.ty - ph.y) * t, 3, 0, _TWO_PI);
            ctx.fillStyle = _r(EnzymeStyles.roleColors.photon.stroke, 0.9);
            ctx.shadowColor = _r(EnzymeStyles.roleColors.photon.stroke, 0.5);
            ctx.shadowBlur = 12;
            ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    },
};

export default Renderer;
