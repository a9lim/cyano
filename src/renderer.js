/* ===================================================================
   renderer.js — the scene: the specimen's cross-section above, the carbon
   network as a transit map below, one world under one camera. Desktop fits
   the world to the canvas; phones turn the map upright and pan and zoom it.
   The reactions call spawnProton / spawnPhoton / spawnElectronChain and read
   etcComplexes, as they always have.
   =================================================================== */
import { Membrane } from './membrane.js';
import { MapView, FLIP } from './map.js';
import { drawMap, mapTags } from './mapdraw.js';
import { LINES } from './maplayout.js';
import Particles from './particles.js';
import { SPECIMENS, CLICK, specimenCan } from './specimens.js';
import { simState, store } from './state.js';
import { flux, onFlux } from './flux.js';
import { ENZYMES, METABOLITES } from './info.js';
import * as K from './complexes.js';

const TAU = Math.PI * 2;
const _ETC_INFO = { psii: 'PSII', ndh1: 'NDH1', sdh: 'SDH', pq: 'PQ', cytb6f: 'Cytb6f', pc: 'PC', cytOx: 'CytOx', psi: 'PSI', fd: 'Fd', fnr: 'FNR', atpSyn: 'ATPSyn', br: 'BR', nnt: 'NNT', ucp: 'UCP' };
const _SEG_INFO = { g0: 'HK', g1: 'PGI', g2: 'PFK', g3: 'ALDO', g5: 'GAPDH', g6: 'PGK', g7: 'PGM', g8: 'ENO', g9: 'PK', c7: 'PRK', c0: 'RuBisCO',
    c6: 'PGK', c5: 'GAPDH', c3: 'ALDO', c2: 'FBPase', c10: 'TKT', p0: 'G6PDH', p2: '6PGDH', p10: 'TKT', pdh: 'PDH', pdc: 'PDC', adh: 'ADH',
    aldh: 'ALDH', acs: 'ACS', kin: 'CS', k0: 'CS', k1: 'ACO', k2: 'IDH', k3: 'KGDH', k4: 'SCS', k5: 'SDH', k6: 'FUM', k7: 'MDH',
    b0: 'ACAD', b1: 'ECH', b2: 'HACD', b3: 'ACAT', bspur: 'ACAT' };
const _REV_INFO = { g0: 'G6Pase', g2: 'FBPase' };
const buzz = () => { if (typeof _haptics !== 'undefined') _haptics.trigger('light'); };
const _YIELD = { atp: 'ATP', nadh: 'NADH', nadph: 'NADPH', fadh2: 'FADH₂', co2Fixed: 'CO₂' };

const Renderer = {
    canvas: null, ctx: null, W: 0, H: 0, dpr: 1, camera: null,
    worldW: 0, worldH: 0, narrow: false,
    etcComplexes: {}, membraneY: 0, membraneH: 0,
    specId: 'thylakoid',
    onEnzymeClick: null, onInteract: null,
    hover: null, warm: false, _warmUntil: 0,
    rotor: { phase: 0, target: 0, seen: 0, made: 0 },
    _o2: { out: 0, in: 0 },
    _cache: null, _cacheKey: '', _wantKey: '', _wantT: 0,

    init(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = createCamera({ width: 100, height: 100, zoom: 1, minZoom: 1, maxZoom: 4, clamp: (c) => this._clamp(c) });
        this.resize();
        this.camera.bindWheel(canvas);
        this.camera.bindZoomButtons({
            zoomIn: document.getElementById('zoom-in-btn'), zoomOut: document.getElementById('zoom-out-btn'),
            reset: document.getElementById('zoom-reset-btn'), display: document.getElementById('zoom-indicator'),
            onReset: () => this.resetView(),
        });
        this._initInteraction();
        onFlux((key, step, rev, res, segs) => this._yieldTag(key, res, segs));
        K.readPalette();
    },

    resize() {
        const r = this.canvas.parentElement.getBoundingClientRect();
        this.dpr = Math.min(2, window.devicePixelRatio || 1);
        this.W = Math.max(10, Math.round(r.width)); this.H = Math.max(10, Math.round(r.height));
        this.canvas.width = Math.round(this.W * this.dpr); this.canvas.height = Math.round(this.H * this.dpr);
        this.canvas.style.width = this.W + 'px'; this.canvas.style.height = this.H + 'px';
        this.layout();
        this.camera.viewportW = this.W; this.camera.viewportH = this.H;
        this.resetView();
    },

    /** Lay out the membrane and the map for the current specimen and size. */
    layout() {
        const W = this.W, H = this.H, narrow = this.narrow = W < 640;
        const pad = narrow ? 12 : 18, top = narrow ? 14 : 66;
        const memBottom = Membrane.layout(this.specId, pad, W - pad, top, narrow, narrow ? 1e9 : Math.max(180, H * 0.42 - top));
        const mapTop = memBottom + (narrow ? 26 : 30);
        const mh = MapView.build(pad, mapTop, W - 2 * pad, Math.max(200, H - mapTop - 12), narrow);
        this.worldW = W; this.worldH = Math.max(H, mapTop + mh + (narrow ? 24 : 14));
        this.etcComplexes = {};
        for (const [k, p] of Object.entries(Membrane.pos)) this.etcComplexes[k] = { cx: p.x, cy: p.y };
        this.membraneY = Membrane.memTop; this.membraneH = Membrane.memBot - Membrane.memTop;
        Particles.fill();
        this._cacheKey = '';
    },

    setSpecimen(id) {
        if (!SPECIMENS[id] || id === this.specId) return;
        this.specId = id;
        Particles.clear();
        this.layout();
    },

    resetView() {
        const c = this.camera;
        c.zoom = 1; c.x = this.W / 2; c.y = this.H / 2;
        this._clamp(c);
    },

    _clamp(cam) {
        const vw = cam.viewportW / cam.zoom, vh = cam.viewportH / cam.zoom;
        cam.zoom = Math.max(cam.minZoom, cam.zoom);
        cam.x = this.worldW <= vw ? this.worldW / 2 : Math.max(vw / 2, Math.min(this.worldW - vw / 2, cam.x));
        cam.y = this.worldH <= vh ? vh / 2 : Math.max(vh / 2, Math.min(this.worldH - vh / 2, cam.y));
    },

    themeChanged() { K.readPalette(); this._cacheKey = ''; },

    // ─── Engine hooks ───
    spawnProton(cx, dir) {
        if (this.warm || performance.now() < this._warmUntil) return;
        Particles.spawnProton(cx, dir);
    },
    spawnPhoton(key) { if (!this.warm) Particles.spawnPhoton(key); },
    spawnElectronChain(keys, type, callbacks) {
        // Warming up, or a chain this specimen can't draw: its effects land at once
        if (this.warm || !Particles.spawnElectronChain(keys, type, callbacks)) {
            for (let i = 0; i < keys.length; i++) if (callbacks && callbacks[i]) callbacks[i]();
        }
    },
    endWarm() { this.warm = false; this._warmUntil = performance.now() + 1300; this.rotor.seen = store.atpOxidative; this._o2.out = Math.floor(store.o2Produced); this._o2.in = Math.floor(store.o2Consumed); Particles.fill(); Particles.seed(); },

    // ─── Per frame ───
    update(dt) {
        const R = this.rotor, s = Membrane.s;
        if (store.atpOxidative < R.seen) R.seen = store.atpOxidative;
        if (store.atpOxidative > R.seen) { R.target += (store.atpOxidative - R.seen) * TAU / 3; R.seen = store.atpOxidative; }
        if (R.target - R.phase > 2 * TAU) R.phase = R.target - 2 * TAU;
        const before = Math.floor(R.phase / (TAU / 3));
        R.phase += (R.target - R.phase) * Math.min(1, dt * simState.speed * 2.5);
        const after = Math.floor(R.phase / (TAU / 3));
        if (after > before && Membrane.pos.atpSyn) {
            const p = Membrane.pos.atpSyn, rot = p.rot || 0;
            for (let k = before; k < after; k++) { Particles.emit('atp', p.x - Math.sin(rot) * 17 * s, p.y + Math.cos(rot) * 17 * s); R.made++; }
        }
        const o = Math.floor(store.o2Produced), i = Math.floor(store.o2Consumed);
        if (o < this._o2.out || i < this._o2.in) { this._o2.out = o; this._o2.in = i; }
        if (o > this._o2.out && Membrane.pos.psii) Particles.emit('o2out', Membrane.pos.psii.x, Membrane.memTop - 5 * s);
        if (i > this._o2.in && Membrane.pos.cytOx) Particles.emit('o2in', Membrane.pos.cytOx.x, Membrane.memBot + 2 * s);
        this._o2.out = o; this._o2.in = i;
        Particles.update(dt);
        MapView.update(dt * simState.speed);
    },

    draw(dt) {
        const c = this.ctx;
        MapView.updateVis();
        c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        c.fillStyle = K.P.canvas; c.fillRect(0, 0, this.W, this.H);
        c.save();
        this.camera.applyToCanvas(c);
        this._drawCache(c);
        Membrane.drawLive(c, this.rotor.phase);
        drawMap(c, this.hover && this.hover.kind !== 'mem' ? (this.hover.seg || this.hover.loop) : null, dt);
        Particles.draw(c);
        Membrane.drawLabels(c, this.hover && this.hover.kind === 'mem' ? this.hover.key : null);
        c.restore();
    },

    /** The membrane's still parts, painted once per layout, theme and zoom. */
    _drawCache(c) {
        const z = this.camera.zoom, sc = Math.min(z * this.dpr, Math.sqrt(9e6 / (this.worldW * (Membrane.bottom + 4))));
        const key = [this.specId, this.W, this.H, K.P.dark, Math.round(sc * 4) / 4].join();
        if (key !== this._cacheKey) {
            // While a zoom is still changing, keep scaling the old paint; repaint once it has held for 140 ms
            const now = performance.now();
            if (key !== this._wantKey) { this._wantKey = key; this._wantT = now; }
            const sameScene = this._cache && this._cacheKey && this._cacheKey.split(',').slice(0, 4).join() === key.split(',').slice(0, 4).join();
            if (!sameScene || now - this._wantT >= 140) {
                const w = Math.ceil(this.worldW * sc), h = Math.ceil((Membrane.bottom + 4) * sc);
                const cv = this._cache && this._cache.width === w && this._cache.height === h ? this._cache : Object.assign(document.createElement('canvas'), { width: w, height: h });
                const x = cv.getContext('2d');
                x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, w, h); x.setTransform(sc, 0, 0, sc, 0, 0);
                Membrane.drawStatic(x);
                this._cache = cv; this._cacheKey = key; this._cacheScale = sc;
            }
        }
        if (this._cache) c.drawImage(this._cache, 0, 0, this._cache.width / this._cacheScale, this._cache.height / this._cacheScale);
    },

    _yieldTag(key, res, segs) {
        if (this.warm || !res || !res.yields) return;
        let text = '';
        for (const k in res.yields) {
            const v = res.yields[k], name = _YIELD[k.replace('Consume', '')] || k;
            text += (text ? ' ' : '') + (k.includes('Consume') ? '−' : '+') + v + ' ' + name;
        }
        const loop = MapView.loops.find(L => L.key === key);
        let x, y, line;
        if (loop) { [x, y] = loop.pos; y -= 15; line = loop.line; }
        else {
            const sg = segs && segs.length && MapView.segs[segs[0][0]];
            if (!sg) return;
            const p = sg.lab || { x: sg.pts[sg.pts.length >> 1][0], y: sg.pts[sg.pts.length >> 1][1] };
            x = p.x; y = p.y - 13; line = sg.line;
        }
        mapTags.push({ text, x, y, color: K.ink(LINES[line].ink), age: 0, life: 1.5 });
    },

    // ─── Input ───
    _pick(clientX, clientY) {
        const r = this.canvas.getBoundingClientRect();
        const w = this.camera.screenToWorld(clientX - r.left, clientY - r.top);
        const tol = 9 / this.camera.zoom;
        for (const h of Membrane.hit) {
            if (Math.abs(w.x - h.x) < h.w / 2 && Math.abs(w.y - h.y) < h.h / 2) return { kind: 'mem', key: h.key };
        }
        return MapView.hitTest(w.x, w.y, tol);
    },

    _info(hit) {
        if (!hit) return null;
        if (hit.kind === 'mem') {
            const info = ENZYMES[_ETC_INFO[hit.key]];
            if (!info) return null;
            const name = Membrane.spec.names[hit.key];
            const can = CLICK[hit.key] ? specimenCan(Membrane.spec, CLICK[hit.key][0]) : true;
            return { ...info, name: info.name + (name && !info.name.includes(name) ? ' (' + name + ')' : ''), note: can ? null : 'Not active in this specimen.' };
        }
        if (hit.kind === 'seg') {
            const s = hit.seg, rev = (flux[s.id] || 0) < -0.02;
            return ENZYMES[(rev && _REV_INFO[s.id]) || _SEG_INFO[s.id]] || null;
        }
        if (hit.kind === 'loop') return ENZYMES[hit.loop.info] || null;
        if (hit.kind === 'station') return METABOLITES[hit.st.id] || null;
        return null;
    },

    /** Fire what's under the pointer; forward is the way the clicked line runs. */
    _fire(hit, forward) {
        if (!hit || !this.onEnzymeClick) return false;
        if (this.onInteract) this.onInteract();
        if (hit.kind === 'mem') {
            const cl = CLICK[hit.key];
            if (!cl || !specimenCan(Membrane.spec, cl[0])) return false;
            this.onEnzymeClick(cl[0], cl[1], forward ? 'forward' : 'reverse');
            return true;
        }
        if (hit.kind === 'seg') {
            const s = hit.seg, f = FLIP.has(s.id) ? !forward : forward;
            this.onEnzymeClick(s.key, s.step, f ? 'forward' : 'reverse');
            return true;
        }
        if (hit.kind === 'loop') { this.onEnzymeClick(hit.loop.key, null, forward ? undefined : 'reverse'); return true; }
        return false;
    },

    _tip(x, y, info) {
        if (!this._tooltip) { this._tooltip = createSimTooltip(); this._tooltip.el.classList.add('canvas-tip'); }
        let html = '<strong>' + info.name + '</strong>';
        if (info.full) html += '<br><span class="ct-full">' + info.full + '</span>';
        if (info.eq) html += '<br><span class="ct-eq">' + info.eq + '</span>';
        html += '<br>' + info.desc;
        if (info.regulation) html += '<br><em>' + info.regulation + '</em>';
        if (info.note) html += '<br><em>' + info.note + '</em>';
        this._tooltip.el.innerHTML = html;
        this._tooltip.show(x, y);
    },

    _initInteraction() {
        const c = this.canvas;
        let down = null, moved = false;
        c.addEventListener('mousedown', (e) => { down = { x: e.clientX, y: e.clientY, b: e.button }; moved = false; });
        window.addEventListener('mousemove', (e) => {
            if (down && down.b === 0) {
                if (Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 4) moved = true;
                if (moved) { this.camera.panBy(e.movementX, e.movementY); this._tooltip?.hide(); return; }
            }
            if (e.target !== c) return;
            const hit = this._pick(e.clientX, e.clientY);
            this.hover = hit;
            const info = this._info(hit);
            c.style.cursor = hit && (hit.kind === 'seg' || hit.kind === 'loop' || (hit.kind === 'mem' && CLICK[hit.key])) ? 'pointer' : hit ? 'help' : (this.camera.zoom > 1.001 || this.worldH > this.H + 1 ? 'grab' : '');
            if (info) this._tip(e.clientX, e.clientY, info); else this._tooltip?.hide();
        });
        window.addEventListener('mouseup', (e) => {
            if (down && !moved && e.target === c) {
                if (this._fire(this._pick(e.clientX, e.clientY), e.button === 0)) buzz();
            }
            down = null;
        });
        c.addEventListener('contextmenu', (e) => e.preventDefault());
        c.addEventListener('mouseleave', () => { this.hover = null; this._tooltip?.hide(); });

        // Touch: one finger pans and taps, two pinch
        let t0 = null, tap = false, pinch = 0;
        c.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                const [a, b] = e.touches; pinch = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); tap = false;
            } else if (e.touches.length === 1) { t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY, lx: e.touches[0].clientX, ly: e.touches[0].clientY }; tap = true; }
        }, { passive: true });
        c.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const r = c.getBoundingClientRect();
            if (e.touches.length === 2 && pinch) {
                const [a, b] = e.touches, d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
                this.camera.zoomBy(d / pinch, (a.clientX + b.clientX) / 2 - r.left, (a.clientY + b.clientY) / 2 - r.top); pinch = d;
            } else if (e.touches.length === 1 && t0) {
                const t = e.touches[0];
                if (Math.abs(t.clientX - t0.x) + Math.abs(t.clientY - t0.y) > 8) tap = false;
                this.camera.panBy(t.clientX - t0.lx, t.clientY - t0.ly); t0.lx = t.clientX; t0.ly = t.clientY;
            }
        }, { passive: false });
        c.addEventListener('touchend', (e) => {
            if (tap && e.changedTouches.length === 1 && e.touches.length === 0) {
                const t = e.changedTouches[0];
                const rev = typeof window._lumenReverseMode === 'function' && window._lumenReverseMode();
                if (this._fire(this._pick(t.clientX, t.clientY), !rev)) buzz();
            }
            if (e.touches.length < 2) pinch = 0;
            if (!e.touches.length) { tap = false; t0 = null; }
        });
        if (window.matchMedia('(pointer: coarse)').matches && typeof bindTooltipTouch === 'function') {
            if (!this._tooltip) { this._tooltip = createSimTooltip(); this._tooltip.el.classList.add('canvas-tip'); }
            bindTooltipTouch(c, (x, y) => {
                const info = this._info(this._pick(x, y));
                return info ? { text: info.name + (info.eq ? '\n' + info.eq : '') + '\n' + info.desc, screenX: x, screenY: y } : null;
            }, this._tooltip);
        }
    },
};

export default Renderer;
