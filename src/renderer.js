/* ===================================================================
   renderer.js — Canvas 2D draw pipeline for the metabolic network.
   Draw order: membrane → ETC → cytoplasm → Krebs → beta-ox → particles → labels.
   Hitbox arrays pooled each frame (count reset, slots reused) for click-to-react and hover tooltips.
   =================================================================== */

import { EnzymeStyles, CFG, _F, _cachedMeasure } from './enzymes.js';
import { computeLayout, MIN_CONTENT_W, MIN_CONTENT_H } from './layout.js';
import Particles from './particles.js';
import { canReact } from './reactions/dispatch.js';
import { getRegulationFactor } from './regulation.js';
import { store } from './state.js';
import { ENZYMES, METABOLITES } from './info.js';

const _r = window._r;

let _lightGlow, _nightDim, _nightDimmer, _respDashed;
function _initColorCache() {
    const R = EnzymeStyles.roleColors;
    _lightGlow   = _r(R.lightIndicator.stroke, 0.4);
    _nightDim    = _r(R.nightIndicator.stroke, 0.3);
    _nightDimmer = _r(R.nightIndicator.stroke, 0.2);
    _respDashed  = _r(R.respiratory.stroke, 0.15);
}

// ─── Info lookup maps ───
// Translate canvas label text → ENZYMES dict key (handles slash-delimited bidir names)
const _enzymeInfoKey = {
    'HK/G6Pase': 'HK', 'PGI': 'PGI', 'PFK/FBPase': 'PFK', 'ALDO': 'ALDO',
    'GAPDH': 'GAPDH', 'PGK': 'PGK', 'PGM': 'PGM', 'ENO': 'ENO', 'PK/PC+PEPCK': 'PK',
    'TKT+TAL/TK+SBP': 'TKT', 'PDH': 'PDH', 'PDC': 'PDC', 'ADH': 'ADH',
    'ALDH': 'ALDH', 'ACS': 'ACS', 'RuBisCO': 'RuBisCO', 'PRK': 'PRK',
    'ACAD/ACC+ER': 'ACAD', 'ECH/DH': 'ECH', 'HACD/KR': 'HACD', 'Thiolase/KAS': 'ACAT',
    'G6PDH': 'G6PDH', '6PGL': '6PGL', '6PGDH': '6PGDH',
    'KREBS×2': 'run_krebs', 'CALVIN×6': 'run_calvin', 'PPP×6': 'run_ppp',
    'β-OX×7': 'run_betaox', 'Glc⇌G3P': 'run_glyc_upper', 'G3P⇌Pyr': 'run_glyc_lower',
    'CS': 'CS', 'ACO': 'ACO', 'IDH': 'IDH', 'KGDH': 'KGDH',
    'SCS': 'SCS', 'SDH': 'SDH', 'FUM': 'FUM', 'MDH': 'MDH',
};
// ETC complexes use pathway:stepIndex as key since they lack canvas labels
const _etcInfoKey = {
    'etc_resp:0': 'NDH1', 'etc_resp:1': 'SDH', 'etc_photo:0': 'PSII',
    'etc_cyclic:0': 'PSI', 'atp_syn:0': 'ATPSyn', 'br:0': 'BR', 'nnt:0': 'NNT', 'ucp:0': 'UCP',
};

// ─── Hot-path sets (avoid per-frame allocation) ───
// Metabolites drawn with "×2" badge (C3 intermediates appear twice per glucose)
const _TWO_X = new Set(['g3p', 'bpg', 'pga3', 'pga2', 'pep', 'pyruvate', 'acetylCoA', 'ethanol', 'acetaldehyde', 'aceticAcid']);
const _KREBS_METABS = new Set(['citrate', 'isocitrate', 'akg', 'succoa', 'succinate', 'fumarate', 'malate', 'oaa']);

// Static lookup table: metabolite key → fade alpha fn(gA, cA, pA, kA, state).
// Each metabolite fades with the max alpha of its owning pathway(s).
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
    pyruvate:     (g) => g,
    acetylCoA:    (g, c, p, k, s) => Math.max(k, s.betaoxFade ? s.betaoxFade.value : (s.betaoxEnabled ? 1 : 0)),
    ethanol:      (g, c, p, k, s) => Math.max(_fermentAlpha(s), g),
    acetaldehyde: (g, c, p, k, s) => Math.max(_fermentAlpha(s), g),
    aceticAcid:   (g) => g,
    pgl6:         (g, c, p) => p,
    pga6:         (g, c, p) => p,
    r5p:          (g, c, p) => Math.max(p, c),
    rubp:         (g, c) => c,
    fattyAcid:    (g, c, p, k, s) => s.betaoxFade ? s.betaoxFade.value : (s.betaoxEnabled ? 1 : 0),
    enoylCoA:     (g, c, p, k, s) => s.betaoxFade ? s.betaoxFade.value : (s.betaoxEnabled ? 1 : 0),
    hydroxyCoA:   (g, c, p, k, s) => s.betaoxFade ? s.betaoxFade.value : (s.betaoxEnabled ? 1 : 0),
    ketoCoA:      (g, c, p, k, s) => s.betaoxFade ? s.betaoxFade.value : (s.betaoxEnabled ? 1 : 0),
};

const Renderer = {
    canvas: null, ctx: null, W: 0, H: 0, dpr: 1,
    camera: null,
    isPanning: false, lastMX: 0, lastMY: 0,
    membraneY: 0, membraneH: 0,
    // Sidebar inset animation mirrors the CSS panel transition (0.45s ease)
    sidebarInset: 0, _sidebarInsetCurrent: 0,
    _sidebarAnimStart: 0, _sidebarAnimFrom: 0, _sidebarAnimTo: 0, _sidebarAnimating: false,
    etcComplexes: {}, metab: {},
    enzymeHitboxes: [],  // pooled each frame; used for click-to-react + hover tooltips
    metabHitboxes: [],   // pooled each frame; used for hover tooltips
    _enzymeHBCount: 0,
    _metabHBCount: 0,
    metabPulse: {},      // scale pulse on metabolite count change
    onEnzymeClick: null, // wired by main.js → advanceStep
    hoveredEnzyme: null,
    hoveredMetab: null,
    _tooltipEl: null,

    pathwayColors: null,

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
        const zoomEl = document.getElementById('zoom-indicator');
        const R = EnzymeStyles.roleColors;
        this.pathwayColors = {
            glycolysis:   R.glycolysis.stroke,
            calvin:       R.calvin.stroke,
            ppp:          R.ppp.stroke,
            krebs:        R.krebs.stroke,

            fermentation: R.fermentation.stroke,
            shared:       R.shared.stroke,
            betaox:       R.betaox.stroke,
        };
        this.resize();
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => this.resize(), 100);
        });

        // Center-point camera; clamping left/top-aligns when content fits viewport
        const initZoom = this._minZoom();
        const cw = this._LW || MIN_CONTENT_W;
        const ch = this._contentH || MIN_CONTENT_H;
        this.camera = createCamera({
            width: this.W,
            height: this.H,
            x: this.W / (2 * initZoom),
            y: this.H / (2 * initZoom),
            zoom: initZoom,
            minZoom: initZoom,
            maxZoom: 3,
            clamp: (cam) => this._clampCamera(cam),
        });
        this.camera.bindWheel(this.canvas);
        this.camera.bindMousePan(this.canvas);
        this.camera.bindZoomButtons({
            zoomIn: document.getElementById('zoom-in-btn'),
            zoomOut: document.getElementById('zoom-out-btn'),
            reset: document.getElementById('zoom-reset-btn'),
            display: zoomEl,
            onReset: () => {
                this._updateLayout();
                const mz = this._minZoom();
                this.camera.reset(this.W / (2 * mz), this.H / (2 * mz), mz);
            },
        });
        this._initInteraction();
        _initColorCache();
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
        this._updateLayout();
        if (this.camera) {
            const minZ = this._minZoom();
            this.camera.minZoom = minZ;
            this.camera.viewportW = this.W;
            this.camera.viewportH = this.H;
            this._clampCamera(this.camera);
        }
    },

    _clampCamera(cam) {
        const vw = cam.viewportW, vh = cam.viewportH;
        const cw = this._LW || Math.max(vw, MIN_CONTENT_W);
        const ch = this._contentH || Math.max(vh, MIN_CONTENT_H);
        const sw = cw * cam.zoom, sh = ch * cam.zoom;
        // Left/top-align when content fits; free-scroll otherwise
        if (sw <= vw) cam.x = vw / (2 * cam.zoom);
        else cam.x = clamp(cam.x, vw / (2 * cam.zoom), cw - vw / (2 * cam.zoom));
        if (sh <= vh) cam.y = vh / (2 * cam.zoom);
        else cam.y = clamp(cam.y, vh / (2 * cam.zoom), ch - vh / (2 * cam.zoom));
    },

    /** Minimum zoom: allow zooming out enough to fit full content width & height */
    _minZoom() {
        const cw = this._LW || MIN_CONTENT_W;
        const ch = this._contentH || MIN_CONTENT_H;
        return Math.min(1, this.W / cw, this.H / ch);
    },

    /** Convert screen coordinates to world coordinates via camera */
    _screenToWorld(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return this.camera.screenToWorld(clientX - rect.left, clientY - rect.top);
    },

    /** Hit-test enzyme hitboxes at world coordinates. */
    _hitTestEnzyme(wx, wy) {
        for (let i = 0; i < this._enzymeHBCount; i++) {
            const hb = this.enzymeHitboxes[i];
            if (Math.abs(wx - hb.cx) < hb.w / 2 && Math.abs(wy - hb.cy) < hb.h / 2) return hb;
        }
        return null;
    },

    /** Hit-test metabolite nodes at world coordinates. */
    _hitTestMetab(wx, wy) {
        for (let i = 0; i < this._metabHBCount; i++) {
            const hb = this.metabHitboxes[i];
            if (Math.abs(wx - hb.cx) < hb.w / 2 && Math.abs(wy - hb.cy) < hb.h / 2) return hb;
        }
        return null;
    },

    /** Look up info data for an enzyme hitbox. Label-based first, then pathway:step for ETC. */
    _getEnzymeInfo(hb) {
        if (hb.enzyme) {
            const key = _enzymeInfoKey[hb.enzyme];
            if (key && ENZYMES[key]) return ENZYMES[key];
            if (ENZYMES[hb.enzyme]) return ENZYMES[hb.enzyme];
        }
        const etcKey = `${hb.pathway}:${hb.stepIndex}`;
        const k2 = _etcInfoKey[etcKey];
        if (k2 && ENZYMES[k2]) return ENZYMES[k2];
        return null;
    },

    /** Position and populate the canvas tooltip near the cursor, clamped to viewport. */
    _showTooltip(screenX, screenY, info, isMetab) {
        if (!this._tooltipEl) {
            this._tooltipEl = document.getElementById('canvas-tooltip');
            if (!this._tooltipEl) return;
        }
        const el = this._tooltipEl;
        let html = `<strong>${info.name}</strong>`;
        if (info.full) html += `<br><span class="ct-full">${info.full}</span>`;
        if (info.eq) html += `<br><span class="ct-eq">${info.eq}</span>`;
        html += `<br>${info.desc}`;
        if (info.regulation) html += `<br><em>${info.regulation}</em>`;
        el.innerHTML = html;
        el.hidden = false;

        // Flip to opposite side of cursor when approaching viewport edges
        const pad = 12;
        let x = screenX + pad, y = screenY + pad;
        const rect = el.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        if (x + rect.width > vw - pad) x = screenX - rect.width - pad;
        if (y + rect.height > vh - pad) y = screenY - rect.height - pad;
        if (x < pad) x = pad;
        if (y < pad) y = pad;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
    },

    _hideTooltip() {
        if (this._tooltipEl) this._tooltipEl.hidden = true;
    },

    /* ── Mouse/touch interaction: pan, click-to-react, hover tooltips ── */
    _initInteraction() {
        const c = this.canvas;

        // Left-click drag pans; hover shows tooltip; cursor changes on enzyme/metabolite
        c.addEventListener('mousedown', (e) => {
            if (e.button === 0) { this.isPanning = true; this.lastMX = e.clientX; this.lastMY = e.clientY; }
        });
        window.addEventListener('mousemove', (e) => {
            if (!this.isPanning) {
                const w = this._screenToWorld(e.clientX, e.clientY);
                const enzymeHit = this._hitTestEnzyme(w.x, w.y);
                const metabHit = !enzymeHit ? this._hitTestMetab(w.x, w.y) : null;
                this.hoveredEnzyme = enzymeHit;
                this.hoveredMetab = metabHit;
                c.style.cursor = enzymeHit ? 'pointer' : metabHit ? 'help' : 'grab';

                if (enzymeHit) {
                    const info = this._getEnzymeInfo(enzymeHit);
                    if (info) this._showTooltip(e.clientX, e.clientY, info, false);
                    else this._hideTooltip();
                } else if (metabHit) {
                    const info = METABOLITES[metabHit.key];
                    if (info) this._showTooltip(e.clientX, e.clientY, info, true);
                    else this._hideTooltip();
                } else {
                    this._hideTooltip();
                }
                return;
            }
            this._hideTooltip();
            this.camera.panBy(e.clientX - this.lastMX, e.clientY - this.lastMY);
            this.lastMX = e.clientX; this.lastMY = e.clientY;
        });
        window.addEventListener('mouseup', () => { this.isPanning = false; });
        c.addEventListener('mouseleave', () => { this._hideTooltip(); this.hoveredEnzyme = null; this.hoveredMetab = null; });

        // Left click = forward reaction, middle/right click = reverse
        c.addEventListener('contextmenu', (e) => e.preventDefault());
        const handleClick = (e) => {
            if (!this.onEnzymeClick) return;
            const w = this._screenToWorld(e.clientX, e.clientY);
            const hb = this._hitTestEnzyme(w.x, w.y);
            if (hb) {
                e.preventDefault();
                this.onEnzymeClick(hb.pathway, hb.stepIndex, e.button === 0 ? 'forward' : 'reverse');
            }
        };
        c.addEventListener('click', handleClick);
        c.addEventListener('auxclick', handleClick);

        // Touch: 2-finger pinch zoom, 1-finger pan, tap = forward reaction
        let touchStartDist = 0;
        let touchStartX = 0, touchStartY = 0;
        let isTap = false;

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
                const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                const rect = c.getBoundingClientRect();
                this.camera.zoomBy(dist / touchStartDist, mx - rect.left, my - rect.top);
                touchStartDist = dist;
            } else if (e.touches.length === 1) {
                const dx = e.touches[0].clientX - touchStartX;
                const dy = e.touches[0].clientY - touchStartY;
                if (Math.abs(dx) > 8 || Math.abs(dy) > 8) isTap = false;
                this.camera.panBy(e.touches[0].clientX - this.lastMX, e.touches[0].clientY - this.lastMY);
                this.lastMX = e.touches[0].clientX;
                this.lastMY = e.touches[0].clientY;
            }
        }, { passive: false });

        c.addEventListener('touchend', (e) => {
            touchStartDist = 0;
            if (isTap && e.changedTouches.length === 1 && e.touches.length === 0) {
                const touch = e.changedTouches[0];
                const w = this._screenToWorld(touch.clientX, touch.clientY);
                const hb = this._hitTestEnzyme(w.x, w.y);
                if (hb && this.onEnzymeClick) {
                    this.onEnzymeClick(hb.pathway, hb.stepIndex, 'forward');
                }
            }
            isTap = false;
        });
    },

    _updateLayout() {
        // Two-pass layout: first pass gets contentH, then if vertical zoom < 1,
        // second pass widens so content fills viewport edge-to-edge at that zoom
        const pre = computeLayout(this.W, this.H, this._sidebarInsetCurrent);
        const vz = Math.min(1, this.H / pre.contentH);
        const layout = vz < 1
            ? computeLayout(this.W, this.H, this._sidebarInsetCurrent, vz)
            : pre;
        this._LW = layout.LW;
        this._contentH = layout.contentH;
        this.membraneY = layout.membraneY;
        this.membraneH = layout.membraneH;
        this.etcComplexes = layout.etcComplexes;
        this.metab = layout.metab;
        this._metabKeys = layout.metabKeys;
    },

    /** Pool helper: write or reuse slot i in enzymeHitboxes. */
    _pushEnzymeHB(cx, cy, w, h, pathway, stepIndex, enzyme) {
        const i = this._enzymeHBCount++;
        const arr = this.enzymeHitboxes;
        if (i < arr.length) {
            const hb = arr[i];
            hb.cx = cx; hb.cy = cy; hb.w = w; hb.h = h;
            hb.pathway = pathway; hb.stepIndex = stepIndex; hb.enzyme = enzyme || '';
        } else {
            arr.push({ cx, cy, w, h, pathway, stepIndex, enzyme: enzyme || '' });
        }
    },

    /** Pool helper: write or reuse slot i in metabHitboxes. */
    _pushMetabHB(cx, cy, w, h, key) {
        const i = this._metabHBCount++;
        const arr = this.metabHitboxes;
        if (i < arr.length) {
            const hb = arr[i];
            hb.cx = cx; hb.cy = cy; hb.w = w; hb.h = h; hb.key = key;
        } else {
            arr.push({ cx, cy, w, h, key });
        }
    },

    /* ═══ MAIN DRAW ═══ */
    draw(state) {
        const ctx = this.ctx;
        const lm = state.visualLightMode !== undefined ? state.visualLightMode : state.lightOn;
        this._currentLightMode = lm;
        this._th = EnzymeStyles.t(lm);

        // Animate sidebar inset to match CSS panel transition: 0.45s cubic-bezier(0.23,1,0.32,1)
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
                if (!this._sidebarEase) this._sidebarEase = cubicBezier(0.23, 1, 0.32, 1);
                const ease = this._sidebarEase(elapsed);
                this._sidebarInsetCurrent = this._sidebarAnimFrom + (this._sidebarAnimTo - this._sidebarAnimFrom) * ease;
            }
            this._updateLayout();
        }

        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, this.W, this.H);
        ctx.save();
        this.camera.applyToCanvas(ctx);

        this._enzymeHBCount = 0;
        this._metabHBCount = 0;
        this.drawMembrane(ctx, lm, state.time);
        this.drawETCChain(ctx, state, lm);
        this.drawCytoplasmNetwork(ctx, state, lm);
        this.drawKrebsCycle(ctx, state, lm);
        this.drawBetaOxCycle(ctx, state, lm);
        Particles.draw(ctx, state);
        this.drawLabels(ctx, state, lm);

        ctx.restore();
    },

    drawMembrane(ctx, lm, time) {
        // +400px extends behind translucent sidebar glass so membrane doesn't cut off
        EnzymeStyles.drawMembrane(ctx, 0, this.membraneY, this._LW + 400, this.membraneH, lm, time);
    },

    drawLabels(ctx, state, lm) {
        ctx.font = _F.body300_9;
        const th = this._th;
        ctx.fillStyle = th.sectionLabel;
        ctx.textAlign = 'center';
        const cx = (this._LW || this.W) * 0.5;

        const lightY = this.membraneY * 0.5;
        if (state.lightOn) {
            ctx.save();
            ctx.font = _F.body500_14; ctx.fillStyle = EnzymeStyles.roleColors.lightIndicator.stroke;
            ctx.fillText('LIGHT', cx, lightY - 24);
            ctx.font = _F.emoji38;
            ctx.shadowColor = _lightGlow; ctx.shadowBlur = 16;
            ctx.fillText('☀', cx, lightY + 14); ctx.shadowBlur = 0;
            ctx.restore();
        } else {
            ctx.font = _F.body500_14; ctx.fillStyle = _nightDim;
            ctx.fillText('DARK', cx, lightY - 24);
            ctx.font = _F.emoji38; ctx.fillStyle = _nightDimmer;
            ctx.fillText('☾', cx, lightY + 14);
        }
    },

    /* ── ETC CHAIN — 14 complexes, respiratory/photosynthetic/shared arrow groups ── */
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

        // ── Respiratory arrows (blue) — NDH-1/SDH → PQ, PC → CytOx ──
        if (rA > 0.01) {
            const prevAlpha = ctx.globalAlpha;
            ctx.globalAlpha = rA;
            EnzymeStyles.drawArrow(ctx, c.ndh1.cx, c.ndh1.cy, c.pq.cx - 22, c.pq.cy, respC, rA);
            EnzymeStyles.drawArrow(ctx, c.sdh.cx, c.sdh.cy, c.pq.cx - 22, c.pq.cy, respC, rA);
            EnzymeStyles.drawArrow(ctx, c.pc.cx, c.pc.cy, c.cytOx.cx - 29, c.cytOx.cy, respC, rA);
            ctx.globalAlpha = prevAlpha;
        }

        // ── Shared arrows (orange) — PQ → Cyt b6f → PC — used by both chains ──
        if (shA > 0.01) {
            const prevAlpha = ctx.globalAlpha;
            ctx.globalAlpha = shA;
            EnzymeStyles.drawArrow(ctx, c.pq.cx, c.pq.cy, c.cytb6f.cx - 20, c.cytb6f.cy, sharedC, shA);
            EnzymeStyles.drawArrow(ctx, c.cytb6f.cx, c.cytb6f.cy, c.pc.cx - sR, c.pc.cy, sharedC, shA);
            ctx.globalAlpha = prevAlpha;
        }

        // ── Photosynthetic arrows (green) — PSII→PQ, PC→PSI→Fd→FNR, cyclic Fd→PQ ──
        if (phA > 0.01) {
            const prevAlpha = ctx.globalAlpha;
            ctx.globalAlpha = phA;
            EnzymeStyles.drawArrow(ctx, c.psii.cx, c.psii.cy, c.pq.cx - 22, c.pq.cy, photoC, phA);
            EnzymeStyles.drawArrow(ctx, c.pc.cx, c.pc.cy, c.psi.cx - cxW / 2, c.psi.cy, photoC, phA);
            EnzymeStyles.drawArrow(ctx, c.psi.cx, c.psi.cy, c.fd.cx - 18, c.fd.cy, photoC, phA);
            if (state.linearLightEnabled) EnzymeStyles.drawArrow(ctx, c.fd.cx, c.fd.cy, c.fnr.cx - 26, c.fnr.cy, photoC, phA);
            // Cyclic return path curves below membrane
            if (state.cyclicLightEnabled) {
                const cStartX = c.fd.cx, cStartY = c.fd.cy + 18 + 2;
                const cEndX = c.pq.cx, cEndY = c.pq.cy + 13 + 2;
                const cCpx = (cStartX + cEndX) / 2, cCpy = this.membraneY + this.membraneH + 80;
                EnzymeStyles._drawArrowCore(ctx, cStartX, cStartY, cEndX, cEndY, { color: cyclicC, alpha: phA, curved: true, cpx: cCpx, cpy: cCpy });
            }
            ctx.globalAlpha = prevAlpha;
        }

        if (rA > 0.01) {
            const prevAlpha = ctx.globalAlpha;
            ctx.globalAlpha = rA;
            this.drawSmallProtonArrow(ctx, c.ndh1.cx, c.ndh1.cy - cxH * 0.6 / 2 - 18, '4H⁺');
            this.drawSmallProtonArrow(ctx, c.cytOx.cx, c.cytOx.cy - cxH * 0.6 / 2 - 18, '2H⁺');
            ctx.globalAlpha = prevAlpha;
        }
        if (shA > 0.01) {
            const prevAlpha = ctx.globalAlpha;
            ctx.globalAlpha = shA;
            this.drawSmallProtonArrow(ctx, c.cytb6f.cx, c.cytb6f.cy - cxH * 0.68 / 2 - 18, '4H⁺');
            ctx.globalAlpha = prevAlpha;
        }
        if (phA > 0.01) {
            const prevAlpha = ctx.globalAlpha;
            ctx.globalAlpha = phA;
            this.drawSmallProtonArrow(ctx, c.psii.cx, c.psii.cy - cxH * 0.8 / 2 - 18, '2H⁺');
            ctx.globalAlpha = prevAlpha;
        }

        ctx.beginPath(); ctx.setLineDash([2, 2]);
        ctx.moveTo(c.atpSyn.cx, this.membraneY - 2); ctx.lineTo(c.atpSyn.cx, this.membraneY + this.membraneH + 2);
        ctx.strokeStyle = _respDashed; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([]);

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

        // NNT always visible; glows when proton gradient drives the transhydrogenase
        const nntGlow = state.protonGradient > 0 ? pulse : 0;
        EnzymeStyles.drawNNT(ctx, c.nnt.cx, c.nnt.cy, cxW - 4, cxH * 0.6, nntGlow, lm);

        // Yield labels inside synced alpha blocks — dim with their parent complex
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

        // ATP Synthase: downward H+ flow through rotor → ATP production
        const atpBotY = c.atpSyn.cy + cxH * 0.8 / 2;
        this.drawSmallProtonArrow(ctx, c.atpSyn.cx, atpBotY + 3, '4H⁺', 'down');
        ctx.font = _F.mono500_10;
        ctx.fillStyle = atpSynC; ctx.textAlign = 'center';
        ctx.fillText('+ATP', c.atpSyn.cx, atpBotY + 47);

        // NNT: H+-driven NADH→NADPH transhydrogenation
        {
            const nntBotY = c.nnt.cy + cxH * 0.6 / 2;
            this.drawSmallProtonArrow(ctx, c.nnt.cx, nntBotY + 3, '1H⁺', 'down');
            ctx.font = _F.mono500_10;
            ctx.fillStyle = nntC; ctx.textAlign = 'center';
            ctx.fillText('+NADPH', c.nnt.cx, nntBotY + 47);
            ctx.fillText('-NADH', c.nnt.cx, nntBotY + 59);
        }

        // UCP: dimmed when disabled, glows when actively leaking protons as heat
        {
            const ucpAlpha = state.uncouplingEnabled ? 1 : 0.3;
            const ucpGlow = (state.uncouplingEnabled && state.protonGradient > 0) ? pulse : 0;
            ctx.save();
            ctx.globalAlpha = ucpAlpha;
            EnzymeStyles.drawUCP(ctx, c.ucp.cx, c.ucp.cy, cxW - 4, cxH * 0.6, ucpGlow, lm);
            if (state.uncouplingEnabled && state.protonGradient > 0) {
                const ucpBotY = c.ucp.cy + cxH * 0.6 / 2;
                this.drawSmallProtonArrow(ctx, c.ucp.cx, ucpBotY + 3, 'H⁺', 'down');
                ctx.font = _F.mono500_10;
                ctx.fillStyle = EnzymeStyles.roleColors.uncoupling.stroke;
                ctx.textAlign = 'center';
                ctx.fillText('heat', c.ucp.cx, ucpBotY + 47);
            }
            ctx.restore();
        }

        // ── ETC hitboxes ──
        if (rA > 0.1) {
            this._pushEnzymeHB(c.ndh1.cx, c.ndh1.cy, cxW + 10, cxH + 10, 'etc_resp', 0);
            this._pushEnzymeHB(c.sdh.cx, c.sdh.cy, cxW + 10, cxH + 10, 'etc_resp', 1);
        }
        this._pushEnzymeHB(c.nnt.cx, c.nnt.cy, cxW + 10, cxH + 10, 'nnt', 0);
        this._pushEnzymeHB(c.psii.cx, c.psii.cy, cxW + 10, cxH + 10, 'etc_photo', 0);
        this._pushEnzymeHB(c.atpSyn.cx, c.atpSyn.cy, cxW + 10, cxH + 10, 'atp_syn', 0);
        this._pushEnzymeHB(c.br.cx, c.br.cy, cxW + 10, cxH + 10, 'br', 0);
        this._pushEnzymeHB(c.ucp.cx, c.ucp.cy, cxW + 10, cxH + 10, 'ucp', 0);
        this._pushEnzymeHB(c.psi.cx, c.psi.cy, cxW + 10, cxH + 10, 'etc_cyclic', 0);
        // Mobile carriers / non-clickable complexes — tooltip-only via '_info' pathway
        if (shA > 0.1) {
            this._pushEnzymeHB(c.pq.cx, c.pq.cy, 56, 30, '_info', 0, 'PQ');
            this._pushEnzymeHB(c.cytb6f.cx, c.cytb6f.cy, cxW + 10, cxH + 10, '_info', 0, 'Cytb6f');
            this._pushEnzymeHB(c.pc.cx, c.pc.cy, sR * 2 + 10, sR * 2 + 10, '_info', 0, 'PC');
        }
        if (rA > 0.1) {
            this._pushEnzymeHB(c.cytOx.cx, c.cytOx.cy, cxW + 10, cxH + 10, '_info', 0, 'CytOx');
        }
        if (phA > 0.1) {
            this._pushEnzymeHB(c.fd.cx, c.fd.cy, sR * 2 + 10, sR * 2 + 10, '_info', 0, 'Fd');
            this._pushEnzymeHB(c.fnr.cx, c.fnr.cy, 56, 30, '_info', 0, 'FNR');
        }
    },

    /** Horizontal run-arrow with centered label and hitbox. bidir adds a left-pointing arrowhead for gluconeogenesis. */
    _drawRunArrow(ctx, fromX, toX, y, color, alpha, lineW, headLen, label, pathway, bidir) {
        const midX = (fromX + toX) / 2;
        const halfW = (toX - fromX) / 2 - 16;
        const x1 = midX - halfW, x2 = midX + halfW;
        ctx.beginPath();
        ctx.moveTo(bidir ? x1 + headLen : x1, y); ctx.lineTo(midX - 38, y);
        ctx.moveTo(midX + 38, y); ctx.lineTo(x2 - headLen, y);
        ctx.strokeStyle = color; ctx.lineWidth = lineW; ctx.globalAlpha = alpha; ctx.stroke();
        // Arrowheads
        ctx.beginPath();
        ctx.moveTo(x2, y);
        ctx.lineTo(x2 - headLen, y - headLen * 0.5);
        ctx.lineTo(x2 - headLen, y + headLen * 0.5);
        ctx.fillStyle = color; ctx.fill();
        if (bidir) {
            ctx.beginPath();
            ctx.moveTo(x1, y);
            ctx.lineTo(x1 + headLen, y - headLen * 0.5);
            ctx.lineTo(x1 + headLen, y + headLen * 0.5);
            ctx.fill();
        }
        ctx.font = _F.mono700_12;
        ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, midX, y);
        this._pushEnzymeHB(midX, y, halfW * 2, 30, pathway, 0, label);
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

    /* ═══ CYTOPLASM NETWORK — bidir arrows for shared enzymes ═══ */
    drawCytoplasmNetwork(ctx, state, lm) {
        const m = this.metab;
        const gS = state.glycolysisStep, cS = state.calvinStep, pS = state.pppStep;
        const gC = this.pathwayColors.glycolysis;
        const cC = this.pathwayColors.calvin;
        const pC = this.pathwayColors.ppp;
        const kC = this.pathwayColors.krebs;
        const fC = this.pathwayColors.fermentation;


        ctx.font = _F.body400_8;
        ctx.fillStyle = this._th.sectionLabelAlt;
        ctx.textAlign = 'left';
        ctx.fillText('CYTOPLASMIC CARBON METABOLISM', 5, this.membraneY + this.membraneH + 16);

        // ── Pathway fade alphas — shared enzymes use max of owning pathways ──
        const gA = state.glycolysisFade ? state.glycolysisFade.value : (state.glycolysisEnabled ? 1 : 0);
        const cA = state.calvinFade ? state.calvinFade.value : ((state.calvinEnabled && state.lightOn) ? 1 : 0);
        const pA = state.pppFade ? state.pppFade.value : (state.pppEnabled ? 1 : 0);
        const kA = state.krebsFade ? state.krebsFade.value : ((state.krebsEnabled && state.oxygenAvailable) ? 1 : 0);
        const betaoxAlpha = state.betaoxFade ? state.betaoxFade.value : (state.betaoxEnabled ? 1 : 0);
        const gcA = Math.max(gA, cA);
        const gpA = Math.max(gA, pA);
        const pcA = Math.max(pA, cA);

        // ── Glucose → G6P (glycolysis only) ──
        if (gA > 0.01) {
            ctx.save(); ctx.globalAlpha = gA;
            this.drawBidirArrow(ctx, m.glucose, m.g6p, 'HK/G6Pase', gC, gC, gS === 0, 'glycolysis', 0);
            this.drawFloatLabel(ctx, (m.glucose.cx + m.g6p.cx) / 2, (m.glucose.cy + m.g6p.cy) / 2 + 24, '-ATP', gC);
            ctx.restore();
        }

        // ── G6P → F6P (shared glycolysis / PPP) ──
        if (gpA > 0.01) {
            ctx.save(); ctx.globalAlpha = gpA;
            this.drawBidirArrow(ctx, m.g6p, m.f6p, 'PGI', gC, pC, gS === 1, 'glycolysis', 1);
            ctx.restore();
        }

        // ── F6P → F1,6BP (shared glycolysis / Calvin) ──
        if (gcA > 0.01) {
            ctx.save(); ctx.globalAlpha = gcA;
            this.drawBidirArrow(ctx, m.f6p, m.f16bp, 'PFK/FBPase', gC, cC, gS === 2 || cS === 5, 'glycolysis', 2);
            this.drawFloatLabel(ctx, (m.f6p.cx + m.f16bp.cx) / 2, (m.f6p.cy + m.f16bp.cy) / 2 + 24, '-ATP', gC);
            ctx.restore();
        }

        // ── Glycolysis-only arrows (lower half + batch run arrows) ──
        if (gA > 0.01) {
            ctx.save(); ctx.globalAlpha = gA;

            // Lower glycolysis: 3PG→2PG→PEP→Pyruvate
            this.drawBidirArrow(ctx, m.pga3, m.pga2, 'PGM', gC, gC, gS === 7, 'glycolysis', 7);
            this.drawBidirArrow(ctx, m.pga2, m.pep, 'ENO', gC, gC, gS === 8, 'glycolysis', 8);

            this.drawBidirArrow(ctx, m.pep, m.pyruvate, 'PK/PC+PEPCK', gC, gC, gS === 9, 'glycolysis', 9);
            this.drawFloatLabel(ctx, (m.pep.cx + m.pyruvate.cx) / 2, (m.pep.cy + m.pyruvate.cy) / 2 + 24, '+ATP', gC);

            // GAPDH yield badge
            if (gS === 5) this.drawYieldBadge(ctx, m.bpg, true, '+NADH', gC);

            // Batch run arrows: split at G3P with bidir arrowheads (gluconeogenesis capable)
            const runY = m.glucose.cy + 38;
            const splitX = m.g3p.cx;
            const glw = CFG.cycleStrokeWidth;
            const gAhL = CFG.cycleTipLen;

            this._drawRunArrow(ctx, m.glucose.cx, splitX, runY, gC, gA, glw, gAhL, 'Glc⇌G3P', 'run_glycolysis_upper', true);
            this._drawRunArrow(ctx, splitX, m.pyruvate.cx, runY, gC, gA, glw, gAhL, 'G3P⇌Pyr', 'run_glycolysis_lower', true);

            ctx.restore();
        }

        // ── Shared bidir arrows: glycolysis ↔ Calvin (ALDO, GAPDH, PGK) ──
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

        // ── PPP ↔ Calvin shared arrow (R5P ↔ F6P via TKT+TAL) ──
        if (pcA > 0.01) {
            ctx.save(); ctx.globalAlpha = pcA;
            const tkActive = (state.calvinEnabled && cS === 6) || (state.pppEnabled && pS === 3);
            this.drawBidirArrow(ctx, m.r5p, m.f6p, 'TKT+TAL/TK+SBP', pC, cC, tkActive, 'glycolysis', 10);
            this.drawDualFloatLabel(ctx, (m.r5p.cx + m.f6p.cx) / 2, (m.r5p.cy + m.f6p.cy) / 2 + 26, '6', pC, '⇌ 5', cC);
            ctx.restore();
        }

        // ── PDH: Pyruvate → Acetyl-CoA (visible when Krebs or beta-ox active) ──
        {
            const pdhA = Math.max(kA, betaoxAlpha);
            if (pdhA > 0.01) {
                ctx.save(); ctx.globalAlpha = pdhA;
                this.drawEnzymeArrow(ctx, m.pyruvate, m.acetylCoA, 'PDH', gC, false, 'pdh', 0);
                this.drawFloatLabel(ctx, m.pyruvate.cx - 30, (m.pyruvate.cy + m.acetylCoA.cy) / 2 - 2, '+NADH', gC);
                this.drawFloatLabel(ctx, m.pyruvate.cx - 30, (m.pyruvate.cy + m.acetylCoA.cy) / 2 + 10, '+CO₂', gC);
                ctx.restore();
            }
        }

        // ── Fermentation branch: PDC, ADH, ALDH, ACS ──
        {
            const fmA = state.fermentFade ? state.fermentFade.value : ((!state.oxygenAvailable && state.glycolysisEnabled) ? 1 : 0);
            if (fmA > 0.01) {
                ctx.save(); ctx.globalAlpha = fmA;
                this.drawEnzymeArrow(ctx, m.pyruvate, m.acetaldehyde, 'PDC', fC, state.fermenting, 'pdc', 0);
                this.drawFloatLabel(ctx, (m.pyruvate.cx + m.acetaldehyde.cx) / 2, (m.pyruvate.cy + m.acetaldehyde.cy) / 2 + 24, '+CO₂', fC);
                ctx.restore();
            }
        }
        // ADH bidirectional: forward (oxidation, blue) / reverse (fermentation, brown)
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
        // ALDH + ACS: aerobic ethanol salvage → acetyl-CoA
        {
            const acsA = Math.max(kA, betaoxAlpha);
            if (acsA > 0.01) {
                ctx.save(); ctx.globalAlpha = acsA;
                this.drawEnzymeArrow(ctx, m.acetaldehyde, m.aceticAcid, 'ALDH', gC, false, 'aldh', 0);
                this.drawFloatLabel(ctx, m.acetaldehyde.cx - 42, (m.acetaldehyde.cy + m.aceticAcid.cy) / 2 + 4, '+NADH', gC);
                this.drawEnzymeArrow(ctx, m.aceticAcid, m.acetylCoA, 'ACS', gC, false, 'acs', 0);
                this.drawFloatLabel(ctx, (m.aceticAcid.cx + m.acetylCoA.cx) / 2, (m.aceticAcid.cy + m.acetylCoA.cy) / 2 + 24, '-2 ATP', gC);
                ctx.restore();
            }
        }

        // ── Calvin cycle-only arrows (green) ──
        if (cA > 0.01) {
            ctx.save(); ctx.globalAlpha = cA;
            this.drawEnzymeArrow(ctx, m.rubp, m.pga3, 'RuBisCO', cC, cS === 0, 'calvin', 0);
            this.drawFloatLabel(ctx, m.rubp.cx - 40, (m.rubp.cy + m.pga3.cy) / 2, '-CO₂', cC);

            // PRK regenerates RuBP to close the cycle
            this.drawEnzymeArrow(ctx, m.r5p, m.rubp, 'PRK', cC, cS === 7, 'calvin', 7);
            this.drawFloatLabel(ctx, (m.r5p.cx + m.rubp.cx) / 2, (m.r5p.cy + m.rubp.cy) / 2 - 18, '-ATP', cC);

            // Batch cycle target centered in the Calvin mesh
            const ccx = (m.r5p.cx + m.rubp.cx) / 2;
            const ccy = (m.r5p.cy + m.f6p.cy) / 2;
            EnzymeStyles.drawCycleTarget(ctx, ccx, ccy, cC, 'CALVIN×6', 1, state.calvinRot ? state.calvinRot.angle : 0);
            this._pushEnzymeHB(ccx, ccy, 50, 50, 'run_calvin', 0, 'CALVIN×6');
            ctx.restore();
        }

        // ── PPP oxidative phase (rose) — shares R5P node with Calvin ──
        if (pA > 0.01) {
            ctx.save(); ctx.globalAlpha = pA;
            // G6P → 6-PGL → 6-PGA → R5P (oxidative phase generates NADPH)
            this.drawEnzymeArrow(ctx, m.g6p, m.pgl6, 'G6PDH', pC, pS === 0, 'ppp', 0);
            this.drawFloatLabel(ctx, m.g6p.cx - 42, (m.g6p.cy + m.pgl6.cy) / 2 + 4, '+NADPH', pC);

            this.drawEnzymeArrow(ctx, m.pgl6, m.pga6, '6PGL', pC, pS === 1, 'ppp', 1);

            this.drawEnzymeArrow(ctx, m.pga6, m.r5p, '6PGDH', pC, pS === 2, 'ppp', 2);
            this.drawFloatLabel(ctx, (m.pga6.cx + m.r5p.cx) / 2, m.pga6.cy + 24, '+NADPH, +CO₂', pC);

            // Batch cycle target centered in PPP loop
            const cx = (m.g6p.cx + m.r5p.cx) / 2;
            const cy = (m.g6p.cy + m.pga6.cy) / 2;
            EnzymeStyles.drawCycleTarget(ctx, cx, cy, pC, 'PPP×6', 1, state.pppRot ? state.pppRot.angle : 0);
            this._pushEnzymeHB(cx, cy, 50, 50, 'run_ppp', 0, 'PPP×6');
            ctx.restore();
        }

        // ── Metabolite nodes (drawn last, on top of arrows) ──
        ctx.font = _F.mono600_9;
        for (const key of this._metabKeys) {
            const mA = this.getMetabAlpha(key, gA, cA, pA, kA, state);
            if (mA > 0.01) {
                const count = state.store ? (state.store[key] || 0) : 0;

                // Scale pulse on count change (0.3s decay)
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
                this._pushMetabHB(m[key].cx, m[key].cy, 56, 28, key);
            }
        }
    },

    /** Fade alpha (0–1) for a metabolite based on its owning pathway(s). Falls back to Krebs set membership. */
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

    /** Compute padded endpoints between metabolite nodes. Mutates _ep, returns false if nodes overlap. */
    _ep: { x1: 0, y1: 0, x2: 0, y2: 0, nx: 0, ny: 0 },
    _calcEndpoints(from, to) {
        const dx = to.cx - from.cx, dy = to.cy - from.cy;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1) return false;
        const nx = dx / len, ny = dy / len;
        // Elliptical pad: larger horizontally (28px half-width) than vertically (14px half-height)
        const pad = Math.min(36, 1.0 / Math.sqrt((nx / 28) ** 2 + (ny / 14) ** 2) + 8);
        const ep = this._ep;
        ep.x1 = from.cx + nx * pad; ep.y1 = from.cy + ny * pad;
        ep.x2 = to.cx - nx * pad;   ep.y2 = to.cy - ny * pad;
        ep.nx = nx; ep.ny = ny;
        return true;
    },

    /** Draw enzyme tag label and register hitbox. */
    _tagAndHitbox(ctx, tagX, tagY, enzyme, color, active, pathway, stepIndex, color2) {
        EnzymeStyles.drawEnzymeTag(ctx, tagX, tagY, enzyme, color, active, this._currentLightMode || false, color2);
        if (pathway !== undefined) {
            this._pushEnzymeHB(tagX, tagY, 40, 14, pathway, stepIndex, enzyme);
        }
    },

    /** Regulation-based alpha: 0.4 when blocked, 0.7 when partially inhibited, 1.0 when available. */
    _regAlpha(pathway, stepIndex) {
        if (pathway === undefined) return 1;
        const factor = getRegulationFactor(pathway, stepIndex, store);
        if (factor <= 0) return 0.4;
        if (factor < 1) return 0.7;
        return 1;
    },

    /** Single unidirectional enzyme arrow with hitbox. */
    drawEnzymeArrow(ctx, from, to, enzyme, color, active, pathway, stepIndex) {
        if (!this._calcEndpoints(from, to)) return;
        const { x1, y1, x2, y2 } = this._ep;
        const alpha = ctx.globalAlpha * this._regAlpha(pathway, stepIndex);
        EnzymeStyles.drawArrow(ctx, x1, y1, x2, y2, color, alpha);
        if (enzyme) this._tagAndHitbox(ctx, (x1 + x2) / 2, (y1 + y2) / 2 - 6, enzyme, color, active, pathway, stepIndex);
    },

    /** Curved unidirectional arrow with hitbox. */
    drawEnzymeCurvedArrow(ctx, from, to, enzyme, color, active, dir, off, pathway, stepIndex) {
        if (!this._calcEndpoints(from, to)) return;
        const { x1, y1, x2, y2, nx, ny } = this._ep;
        const d = dir || 1;
        const alpha = ctx.globalAlpha * this._regAlpha(pathway, stepIndex);
        EnzymeStyles.drawCurvedArrow(ctx, x1, y1, x2, y2, color, alpha, d);
        if (enzyme) {
            const o = off || 0;
            this._tagAndHitbox(ctx, (x1 + x2) / 2 + o * d * (-ny), (y1 + y2) / 2 - 6 + o * d * nx, enzyme, color, active, pathway, stepIndex);
        }
    },

    /** Bidirectional arrow for shared reversible enzymes. colorA=forward, colorB=reverse. */
    drawBidirArrow(ctx, nodeA, nodeB, enzyme, colorA, colorB, active, pathway, stepIndex) {
        if (!this._calcEndpoints(nodeA, nodeB)) return;
        const { x1, y1, x2, y2 } = this._ep;
        const alpha = ctx.globalAlpha * this._regAlpha(pathway, stepIndex);
        EnzymeStyles.drawBidirectionalArrow(ctx, x1, y1, x2, y2, colorA, colorB, alpha);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 6;
        if (enzyme) this._tagAndHitbox(ctx, mx, my, enzyme, colorA, active, pathway, stepIndex, colorB);
    },

    drawYieldBadge(ctx, node, active, text, color) {
        if (!active) return;
        ctx.font = _F.mono500_9; ctx.fillStyle = color;
        ctx.textAlign = 'center'; ctx.fillText(text, node.cx, node.cy + 19);
    },

    /* ── KREBS CYCLE — counterclockwise: CS→ACO→IDH→KGDH→SCS→SDH→FUM→MDH ── */
    drawKrebsCycle(ctx, state, lm) {
        const m = this.metab;
        const kC = this.pathwayColors.krebs;
        const kS = state.krebsStep;

        const krebsAlpha = state.krebsFade ? state.krebsFade.value : ((state.oxygenAvailable && state.krebsEnabled) ? 1 : 0);
        if (krebsAlpha < 0.01) return;
        ctx.save();
        ctx.globalAlpha = krebsAlpha;

        ctx.font = _F.body400_8;
        ctx.fillStyle = this._th.protonPoolLabel; ctx.textAlign = 'center';

        // CS: two input arrows (AcCoA + OAA) converge on citrate
        this.drawEnzymeArrow(ctx, m.acetylCoA, m.citrate, '', kC, kS === 0, undefined, undefined);
        this.drawEnzymeArrow(ctx, m.oaa, m.citrate, 'CS', kC, kS === 0, 'krebs', 0);

        this.drawEnzymeArrow(ctx, m.citrate, m.isocitrate, 'ACO', kC, kS === 1, 'krebs', 1);

        this.drawEnzymeArrow(ctx, m.isocitrate, m.akg, 'IDH', kC, kS === 2, 'krebs', 2);
        this.drawFloatLabel(ctx, (m.isocitrate.cx + m.akg.cx) / 2, m.isocitrate.cy + 24, '+NADH +CO₂', kC);

        this.drawEnzymeArrow(ctx, m.akg, m.succoa, 'KGDH', kC, kS === 3, 'krebs', 3);
        this.drawFloatLabel(ctx, (m.akg.cx + m.succoa.cx) / 2, m.akg.cy + 24, '+NADH +CO₂', kC);

        this.drawBidirArrow(ctx, m.succoa, m.succinate, 'SCS', kC, kC, kS === 4, 'krebs', 4);
        this.drawFloatLabel(ctx, m.succoa.cx - 32, (m.succoa.cy + m.succinate.cy) / 2 + 4, '+ATP', kC);

        // Return leg: SDH→FUM→MDH closes the cycle at OAA
        this.drawBidirArrow(ctx, m.succinate, m.fumarate, 'SDH', kC, kC, kS === 5, 'krebs', 5);
        this.drawFloatLabel(ctx, (m.succinate.cx + m.fumarate.cx) / 2, m.succinate.cy + 24, '+FADH₂', kC);

        this.drawEnzymeArrow(ctx, m.fumarate, m.malate, 'FUM', kC, kS === 6, 'krebs', 6);

        this.drawBidirArrow(ctx, m.malate, m.oaa, 'MDH', kC, kC, kS === 7, 'krebs', 7);
        this.drawFloatLabel(ctx, (m.malate.cx + m.oaa.cx) / 2, m.malate.cy + 24, '+NADH', kC);

        // Batch cycle target: -1 direction = counterclockwise rotation
        const centerKx = (m.succoa.cx + m.oaa.cx) / 2;
        const centerKy = (m.akg.cy + m.succinate.cy) / 2;
        EnzymeStyles.drawCycleTarget(ctx, centerKx, centerKy, kC, 'KREBS×2', -1, state.krebsRot ? state.krebsRot.angle : 0);
        this._pushEnzymeHB(centerKx, centerKy, 50, 50, 'run_krebs', 0, 'KREBS×2');

        ctx.restore();
    },

    /* ── BETA OXIDATION — 2×2 grid, clockwise. bidir=true for FA synthesis reverse ── */
    drawBetaOxCycle(ctx, state, lm) {
        const m = this.metab;
        const bC = this.pathwayColors.betaox;
        const bA = state.betaoxFade ? state.betaoxFade.value : (state.betaoxEnabled ? 1 : 0);

        if (bA < 0.01) return;
        ctx.save();
        ctx.globalAlpha = bA;

        ctx.font = _F.body400_8;
        ctx.fillStyle = this._th.sectionLabelAlt; ctx.textAlign = 'center';

        // Step 0: ACAD (forward) / ACC+ER (reverse FA synthesis)
        this.drawBidirArrow(ctx, m.fattyAcid, m.enoylCoA, 'ACAD/ACC+ER', bC, bC, false, 'betaox', 0);
        this.drawFloatLabel(ctx, (m.fattyAcid.cx + m.enoylCoA.cx) / 2, m.fattyAcid.cy - 14, '+FADH₂/−NADPH,ATP', bC);

        // Step 1: hydration/dehydration
        this.drawBidirArrow(ctx, m.enoylCoA, m.hydroxyCoA, 'ECH/DH', bC, bC, false, 'betaox', 1);

        // Step 2: NAD+-linked oxidation (forward) / NADPH-linked reduction (reverse)
        this.drawBidirArrow(ctx, m.hydroxyCoA, m.ketoCoA, 'HACD/KR', bC, bC, false, 'betaox', 2);
        this.drawFloatLabel(ctx, (m.hydroxyCoA.cx + m.ketoCoA.cx) / 2, m.hydroxyCoA.cy + 24, '+NADH/−NADPH', bC);

        // Step 3: thiolytic cleavage (forward) / condensation (reverse)
        this.drawBidirArrow(ctx, m.ketoCoA, m.fattyAcid, 'Thiolase/KAS', bC, bC, false, 'betaox', 3);

        // Product flow: each round releases one acetyl-CoA
        this.drawBidirArrow(ctx, m.fattyAcid, m.acetylCoA, '', bC, bC, false, undefined, undefined);

        // Batch cycle target with bidir arrowheads (FA synthesis runs in reverse)
        const centerX = (m.fattyAcid.cx + m.enoylCoA.cx) / 2;
        const centerY = (m.fattyAcid.cy + m.ketoCoA.cy) / 2;
        EnzymeStyles.drawCycleTarget(ctx, centerX, centerY, bC, 'β-OX×7', 1, state.betaoxRot ? state.betaoxRot.angle : 0, true);
        this._pushEnzymeHB(centerX, centerY, 50, 50, 'run_betaox', 0, 'β-OX×7');

        ctx.restore();
    },

    drawFloatLabel(ctx, x, y, text, color) {
        ctx.font = _F.mono500_10;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(text, x, y - 10);
    },

    /** Two-part float label for bidir enzymes: forward yield in colorA, reverse yield in colorB. */
    drawDualFloatLabel(ctx, x, y, text1, color1, text2, color2) {
        ctx.font = _F.mono500_10;
        const w1 = _cachedMeasure(ctx, text1);
        const gap = _cachedMeasure(ctx, ' ');
        const w2 = _cachedMeasure(ctx, text2);
        const totalW = w1 + gap + w2;
        const startX = x - totalW / 2;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = color1;
        ctx.fillText(text1, startX, y - 10);
        ctx.fillStyle = color2;
        ctx.fillText(text2, startX + w1 + gap, y - 10);
    },

    /* ── Particle spawn delegates (forward position context to Particles module) ── */
    spawnElectron(fk, tk, tp) { Particles.spawnElectron(this.etcComplexes, fk, tk, tp); },
    spawnElectronChain(keys, type, callbacks) { Particles.spawnElectronChain(this.etcComplexes, keys, type, callbacks); },
    spawnProton(cx, dir) { Particles.spawnProton(this.membraneY, this.membraneH, cx, dir); },
    spawnPhoton(targetKey) { Particles.spawnPhoton(this.etcComplexes, targetKey); },
};

export default Renderer;
