// Enzyme and ETC complex drawing — shapes, palettes, arrows, and particle visuals.
// Color pipeline: _PALETTE -> _BASE families -> _ROLE semantics -> _pal() palettes -> _THEME modes.
import { _TWO_PI } from './anim.js';

const _FONT = window._FONT;
const _PALETTE = window._PALETTE;
const _r = window._r;
const _BASE = window._BASE;
const _darkFill = window._darkFill;

// ── Pre-computed Font Strings ──
// Frozen cache eliminates per-frame template-literal allocation for ctx.font.
// Every face is the shared text stack; nothing on the canvas is below 10px.
// _labelFont() handles the uncommon ETC-complex label sizes on first use.
const _TEXT = _FONT.text;
export const _F = Object.freeze({
  node:        `600 11px ${_TEXT}`,         // metabolite pill label
  nodeBadge:   `700 10px ${_TEXT}`,         // pool count on the pill's accent badge
  nodeNote:    `500 10px ${_TEXT}`,         // "2x" marker and per-node yield badge
  tag:         `500 10px ${_TEXT}`,         // enzyme tag, idle
  tagActive:   `700 10px ${_TEXT}`,         // enzyme tag, next step
  yield:       `500 11px ${_TEXT}`,         // +NADH / -ATP yield beside an arrow or complex
  proton:      `600 11px ${_TEXT}`,         // 4H⁺ over a pumping complex
  protonDot:   `600 10px ${_TEXT}`,         // "+" inside a travelling proton
  cycle:       `600 13px ${_TEXT}`,         // batch cycle target and the long glycolysis arrows
  complex:     `600 13px ${_TEXT}`,         // default ETC-complex label
  section:     `italic 400 12px ${_TEXT}`,  // cytoplasm section label
  indicator:   `italic 400 15px ${_TEXT}`,  // Light / Dark word above the sun
  emoji:       `38px ${_FONT.emoji}`,       // ☀ / ☾
});

const _labelFonts = {};
/** Returns cached font string for ETC-complex label sizes (≥10px). */
export function _labelFont(size) {
  return _labelFonts[size] || (_labelFonts[size] = `600 ${size}px ${_TEXT}`);
}

let _measureCache = {};
export function _cachedMeasure(ctx, text) {
    const key = ctx.font + '|' + text;
    if (_measureCache[key] === undefined) _measureCache[key] = ctx.measureText(text).width;
    return _measureCache[key];
}

// Widths measured while a webfont is still loading belong to the fallback face;
// drop them once the real faces (Newsreader, STIX Two for subscripts and
// Greek, the emoji face) are in so pills re-measure.
if (document.fonts) {
  const reset = () => { _measureCache = {}; };
  Promise.all([
    window._loadTextFonts(),
    document.fonts.load(`38px ${_FONT.emoji}`, '\u2600\u263E'),
  ]).then(reset, reset);
}

const _gradCache = {};

// ── Drawing Constants ──
export const CFG = {
  arrowHeadLen: 8,
  arrowHeadAngle: 0.35,
  arrowLineWidth: 2.5,
  arrowStopGap: 5,
  cycleTargetRadius: 42,
  cycleStrokeWidth: 5,
  cycleTipLen: 16,
  cycleFinLen: 10,
  enzymeTagPad: 3,
  metabNodeHeight: 22,
  metabBadgeRadius: 8,
  electronRadius: 4,
  protonRadius: 3.5,
  trailMaxLen: 10,
};

// ── Semantic Role -> Base Color Family ──
// Maps logical roles to _BASE color families from colors.js.
export const _ROLE = {
  glycolysis: _BASE.orange,
  calvin: _BASE.green,
  ppp: _BASE.rose,
  krebs: _BASE.blue,
  fermentation: _BASE.brown,
  respiratory: _BASE.blue,
  photosynthetic: _BASE.green,
  shared: _BASE.orange,
  atpSynthase: _BASE.orange,
  cyclic: _BASE.purple,
  bacteriorhodopsin: _BASE.purple,
  nnt: _BASE.orange,
  uncoupling: _BASE.red,
  electron: _BASE.cyan,
  proton: _BASE.red,
  photon: _BASE.yellow,
  betaox: _BASE.yellow,
  lightIndicator: _BASE.orange,
  nightIndicator: _BASE.slate,
};

/** Build a palette tuple from a base family. glowA controls glow alpha. */
function _pal(b, fill, glowA) {
  return { fill, stroke: b.stroke, glow: _r(b.stroke, glowA), strokeLight: b.strokeLight };
}

// ── Theme Colors ──
// Mode-dependent canvas colors derived from _PALETTE.light / _PALETTE.dark, so
// the per-theme accent is read from the theme it belongs to.
// EnzymeStyles.t(lightMode) returns the active set.
export const _THEME = {
  protonText: _PALETTE.dark.text,

  dark: {
    textPrimary:          _PALETTE.dark.text,
    textSecondary:        _PALETTE.dark.textSecondary,
    textMuted:            _PALETTE.dark.textMuted,
    textOnAccent:         _PALETTE.dark.elevated,
    surfacePrimary:       _r(_PALETTE.dark.panelSolid, 0.88),
    surfaceSecondary:     _r(_PALETTE.dark.panelSolid, 0.65),
    surfaceElevated:      _r(_PALETTE.dark.elevated, 0.92),
    surfaceMuted:         _r(_PALETTE.dark.panelSolid, 0.78),
    accentBadge:          _r(_PALETTE.dark.accent, 0.9),
    metabActiveStroke:    _PALETTE.dark.text,
    metabInactiveStroke:  _r(_PALETTE.dark.textSecondary, 0.4),
    membraneHead:         _r(_PALETTE.dark.text, 0.15),
    membraneTail:         _r(_PALETTE.dark.text, 0.06),
    chromophoreAlpha:     0.5,
  },

  light: {
    textPrimary:          _PALETTE.light.text,
    textSecondary:        _PALETTE.light.textSecondary,
    textMuted:            _PALETTE.light.textMuted,
    textOnAccent:         _PALETTE.light.elevated,
    surfacePrimary:       _r(_PALETTE.light.panelSolid, 0.95),
    surfaceSecondary:     _r(_PALETTE.light.canvas, 0.85),
    surfaceElevated:      _r(_PALETTE.light.elevated, 0.95),
    surfaceMuted:         _r(_PALETTE.light.canvas, 0.9),
    accentBadge:          _r(_PALETTE.light.accent, 0.85),
    metabActiveStroke:    _PALETTE.light.text,
    metabInactiveStroke:  _PALETTE.light.textSecondary,
    membraneHead:         _r(_PALETTE.light.textSecondary, 0.3),
    membraneTail:         _r(_PALETTE.light.textSecondary, 0.15),
    chromophoreAlpha:     0.6,
  },
};

function _cycleArrowhead(ctx, cx, cy, radius, eAngle, tAngle, color, parentAlpha) {
  ctx.beginPath();
  const ax = cx + radius * Math.cos(eAngle);
  const ay = cy + radius * Math.sin(eAngle);
  const tipX = ax + CFG.cycleTipLen * Math.cos(tAngle);
  const tipY = ay + CFG.cycleTipLen * Math.sin(tAngle);
  const pAngle = tAngle + Math.PI / 2;
  const fin1X = ax + CFG.cycleFinLen * Math.cos(pAngle);
  const fin1Y = ay + CFG.cycleFinLen * Math.sin(pAngle);
  const fin2X = ax - CFG.cycleFinLen * Math.cos(pAngle);
  const fin2Y = ay - CFG.cycleFinLen * Math.sin(pAngle);
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(fin1X, fin1Y);
  ctx.lineTo(fin2X, fin2Y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = parentAlpha;
  ctx.fill();
}

export const EnzymeStyles = {
  roleColors: _ROLE,
  theme: _THEME,
  /** Shorthand: returns dark or light theme color set. */
  t(lm) { return lm ? _THEME.light : _THEME.dark; },

  // ── Per-role palettes ──
  // "Active" variants use darkened fill for highlighted-state contrast.
  colors: {
    respiratory:        _pal(_ROLE.respiratory,       _r(_ROLE.respiratory.stroke, 0.22), 0.15),
    photosynthetic:     _pal(_ROLE.photosynthetic,    _r(_ROLE.photosynthetic.stroke, 0.22), 0.15),
    shared:             _pal(_ROLE.shared,            _r(_ROLE.shared.stroke, 0.20), 0.12),
    atpSynthase:        _pal(_ROLE.atpSynthase,       _r(_ROLE.atpSynthase.stroke, 0.22), 0.15),
    glycolysis:         _pal(_ROLE.glycolysis,        _r(_ROLE.glycolysis.stroke, 0.20), 0.12),
    glycolysisActive:   _pal(_ROLE.glycolysis,        _r(_ROLE.glycolysis.stroke, 0.32), 0.18),
    krebs:              _pal(_ROLE.krebs,             _r(_ROLE.krebs.stroke, 0.20), 0.12),
    krebsActive:        _pal(_ROLE.krebs,             _r(_ROLE.krebs.stroke, 0.32), 0.18),
    calvin:             _pal(_ROLE.calvin,            _r(_ROLE.calvin.stroke, 0.20), 0.12),
    calvinActive:       _pal(_ROLE.calvin,            _r(_ROLE.calvin.stroke, 0.32), 0.18),
    ppp:                _pal(_ROLE.ppp,               _r(_ROLE.ppp.stroke, 0.20), 0.12),
    pppActive:          _pal(_ROLE.ppp,               _r(_ROLE.ppp.stroke, 0.32), 0.18),
    bacteriorhodopsin:  _pal(_ROLE.bacteriorhodopsin, _r(_ROLE.bacteriorhodopsin.stroke, 0.22), 0.15),
    cyclic:             _pal(_ROLE.cyclic,            _r(_ROLE.cyclic.stroke, 0.22), 0.15),
    fermentation:       _pal(_ROLE.fermentation,      _r(_ROLE.fermentation.stroke, 0.20), 0.12),
    nnt:                _pal(_ROLE.nnt,               _r(_ROLE.nnt.stroke, 0.22), 0.12),
    uncoupling:         _pal(_ROLE.uncoupling,        _r(_ROLE.uncoupling.stroke, 0.22), 0.12),
    betaox:             _pal(_ROLE.betaox,            _r(_ROLE.betaox.stroke, 0.20), 0.12),
    betaoxActive:       _pal(_ROLE.betaox,            _r(_ROLE.betaox.stroke, 0.32), 0.18),
  },

  /**
   * Get mode-aware palette. In light mode, swaps fill to light surface
   * and uses strokeLight for better contrast against light backgrounds.
   */
  getPalette(key, lightMode, glowIntensity = 0) {
    const p = this.colors[key];
    if (!lightMode) return p;
    const strokeC = p.strokeLight || p.stroke;
    return {
      fill: _r(strokeC, 0.18),
      stroke: strokeC,
      glow: glowIntensity > 0 ? _r(strokeC, glowIntensity * 0.04) : ''
    };
  },

  /* ═══════════════════════════════════════
     Generic Shape Helpers
     ═══════════════════════════════════════ */

  roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  },

  diamond(ctx, cx, cy, w, h) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy);
    ctx.lineTo(cx, cy + h / 2);
    ctx.lineTo(cx - w / 2, cy);
    ctx.closePath();
  },

  pill(ctx, cx, cy, w, h) {
    const r = h / 2;
    ctx.beginPath();
    ctx.arc(cx - w / 2 + r, cy, r, Math.PI * 0.5, Math.PI * 1.5);
    ctx.lineTo(cx + w / 2 - r, cy - r);
    ctx.arc(cx + w / 2 - r, cy, r, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
  },

  /** Flat fill with optional subtle ambient glow. No stroke. */
  applyStyle(ctx, palette, glowAmount) {
    if (glowAmount > 0) {
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = glowAmount * 0.6;
    }
    ctx.fillStyle = palette.fill;
    ctx.fill();
    ctx.shadowBlur = 0;
  },

  drawLabel(ctx, text, cx, cy, color, fontSize) {
    ctx.font = fontSize ? _labelFont(fontSize) : _F.complex;
    ctx.fillStyle = color || _THEME.dark.textPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy);
  },

  /** Chromophore dot inside PSII/PSI/BR — colored by role. */
  _drawChromophore(ctx, cx, cy, role, lightMode) {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, _TWO_PI);
    ctx.fillStyle = _r(role.stroke, this.t(lightMode).chromophoreAlpha);
    ctx.fill();
  },

  /* ═══════════════════════════════════════
     ETC Complex Shapes
     All share signature (ctx, cx, cy, w, h, glow, lightMode).
     Renderer positions/sizes are independent of shape internals.
     ═══════════════════════════════════════ */

  /** NDH-1 / Complex I — T-shaped: narrow neck (lumen), wide base (matrix). */
  drawNDH1(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('respiratory', lightMode, glow);
    const top = cy - h / 2, bot = cy + h / 2;
    const neckW = w * 0.44, headH = h * 0.6, r = 5;
    const headTop = top + (h - headH);
    ctx.beginPath();
    ctx.moveTo(cx - neckW / 2 + r, top);
    ctx.lineTo(cx + neckW / 2 - r, top);
    ctx.quadraticCurveTo(cx + neckW / 2, top, cx + neckW / 2, top + r);
    ctx.lineTo(cx + neckW / 2, headTop);
    ctx.lineTo(cx + w / 2, headTop);
    ctx.lineTo(cx + w / 2, bot - r);
    ctx.quadraticCurveTo(cx + w / 2, bot, cx + w / 2 - r, bot);
    ctx.lineTo(cx - w / 2 + r, bot);
    ctx.quadraticCurveTo(cx - w / 2, bot, cx - w / 2, bot - r);
    ctx.lineTo(cx - w / 2, headTop);
    ctx.lineTo(cx - neckW / 2, headTop);
    ctx.lineTo(cx - neckW / 2, top + r);
    ctx.quadraticCurveTo(cx - neckW / 2, top, cx - neckW / 2 + r, top);
    ctx.closePath();
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'CI', cx, top + (h - headH) / 2, p.stroke, 10);
    this.drawLabel(ctx, 'NDH-1', cx, headTop + headH / 2, p.stroke, 10);
  },

  /** SDH / Complex II — tapered trapezoid. Anchors into matrix (offset in layout). */
  drawSDH(ctx, cx, cy, size, glow, lightMode) {
    const p = this.getPalette('respiratory', lightMode, glow);
    const s = size * 1.3, topW = s * 0.65, botW = s, hh = s / 2, r = 4;
    ctx.beginPath();
    ctx.moveTo(cx - topW / 2, cy - hh);
    ctx.lineTo(cx + topW / 2, cy - hh);
    ctx.lineTo(cx + botW / 2, cy + hh - r);
    ctx.quadraticCurveTo(cx + botW / 2, cy + hh, cx + botW / 2 - r, cy + hh);
    ctx.lineTo(cx - botW / 2 + r, cy + hh);
    ctx.quadraticCurveTo(cx - botW / 2, cy + hh, cx - botW / 2, cy + hh - r);
    ctx.closePath();
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'SDH', cx, cy - 4, p.stroke, 10);
    this.drawLabel(ctx, 'CII', cx, cy + 8, p.stroke, 10);
  },

  /** PSII — ellipse with P680 chromophore. */
  drawPSII(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('photosynthetic', lightMode, glow);
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, _TWO_PI);
    this.applyStyle(ctx, p, glow);
    this._drawChromophore(ctx, cx, cy + 2, _ROLE.photosynthetic, lightMode);
    this.drawLabel(ctx, 'PSII', cx, cy - 14, p.stroke, 12);
    this.drawLabel(ctx, 'P680', cx, cy + 16, p.stroke, 10);
  },

  /** PSI — ellipse with P700 chromophore. */
  drawPSI(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('photosynthetic', lightMode, glow);
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, _TWO_PI);
    this.applyStyle(ctx, p, glow);
    this._drawChromophore(ctx, cx, cy + 2, _ROLE.photosynthetic, lightMode);
    this.drawLabel(ctx, 'PSI', cx, cy - 12, p.stroke, 12);
    this.drawLabel(ctx, 'P700', cx, cy + 16, p.stroke, 10);
  },

  /** Cyt b6f — hourglass shape (bezier pinch). Shared between respiratory and photosynthetic chains. */
  drawCytB6f(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('shared', lightMode, glow);
    const hw = w / 2, hh = h / 2, pinch = w * 0.3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.bezierCurveTo(cx + hw, cy - hh, cx + hw, cy - hh * 0.3, cx + pinch, cy);
    ctx.bezierCurveTo(cx + hw, cy + hh * 0.3, cx + hw, cy + hh, cx, cy + hh);
    ctx.bezierCurveTo(cx - hw, cy + hh, cx - hw, cy + hh * 0.3, cx - pinch, cy);
    ctx.bezierCurveTo(cx - hw, cy - hh * 0.3, cx - hw, cy - hh, cx, cy - hh);
    ctx.closePath();
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'Cyt', cx, cy - 7, p.stroke, 12);
    this.drawLabel(ctx, 'b6f', cx, cy + 8, p.stroke, 10);
  },

  /** Cyt c Oxidase — inverted trapezoid (narrow top, wide bottom). */
  drawCytOx(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('respiratory', lightMode, glow);
    const topW = w * 0.7, hh = h / 2, r = 5;
    ctx.beginPath();
    ctx.moveTo(cx - topW / 2, cy - hh);
    ctx.lineTo(cx + topW / 2, cy - hh);
    ctx.lineTo(cx + w / 2, cy + hh - r);
    ctx.quadraticCurveTo(cx + w / 2, cy + hh, cx + w / 2 - r, cy + hh);
    ctx.lineTo(cx - w / 2 + r, cy + hh);
    ctx.quadraticCurveTo(cx - w / 2, cy + hh, cx - w / 2, cy + hh - r);
    ctx.closePath();
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'Cyt c', cx, cy - 5, p.stroke, 10);
    this.drawLabel(ctx, 'Ox', cx, cy + 8, p.stroke, 10);
  },

  /** Plastocyanin — circle. Mobile electron carrier. */
  drawPC(ctx, cx, cy, radius, glow, lightMode) {
    const p = this.getPalette('shared', lightMode, glow);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, _TWO_PI);
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'PC', cx, cy, p.stroke, 10);
  },

  /** Ferredoxin — diamond. Mobile electron carrier below membrane. */
  drawFd(ctx, cx, cy, radius, glow, lightMode) {
    const p = this.getPalette('photosynthetic', lightMode, glow);
    const s = radius * 1.8;
    this.diamond(ctx, cx, cy, s, s);
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'Fd', cx, cy, p.stroke, 10);
  },

  /** FNR — ellipse. Reduces NADP+ using electrons from Fd. */
  drawFNR(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('photosynthetic', lightMode, glow);
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, _TWO_PI);
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'FNR', cx, cy, p.stroke, 10);
  },

  /** Plastoquinone — diamond. Mobile carrier in the lipid bilayer. */
  drawPQ(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('shared', lightMode, glow);
    this.diamond(ctx, cx, cy, w * 0.85, h);
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'PQ', cx, cy, p.stroke, 10);
  },

  /** ATP Synthase — Fo channel (rectangle) + stalk + F1 head (arc). */
  drawATPSynthase(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('atpSynthase', lightMode, glow);
    const top = cy - h / 2;
    const foW = w * 0.6, foH = h * 0.28;
    const halfStalk = w * 0.09;
    const f1R = h * 0.24;
    const f1CY = cy + h / 2 - f1R - 1;
    const foBot = top + foH;
    const r = 5;
    // Arc join angle so stalk meets F1 head tangentially
    const joinA = Math.asin(Math.min(halfStalk / f1R, 1));
    const arcStart = -Math.PI / 2 + joinA;
    const arcEnd = -Math.PI / 2 - joinA;
    ctx.beginPath();
    ctx.moveTo(cx - foW / 2 + r, top);
    ctx.lineTo(cx + foW / 2 - r, top);
    ctx.quadraticCurveTo(cx + foW / 2, top, cx + foW / 2, top + r);
    ctx.lineTo(cx + foW / 2, foBot);
    ctx.lineTo(cx + halfStalk, foBot);
    ctx.arc(cx, f1CY, f1R, arcStart, arcEnd, false);
    ctx.lineTo(cx - halfStalk, foBot);
    ctx.lineTo(cx - foW / 2, foBot);
    ctx.lineTo(cx - foW / 2, top + r);
    ctx.quadraticCurveTo(cx - foW / 2, top, cx - foW / 2 + r, top);
    ctx.closePath();
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'Fo', cx, top + foH / 2, p.stroke, 10);
    this.drawLabel(ctx, 'ATP', cx, f1CY - 4, p.stroke, 11);
    this.drawLabel(ctx, 'Syn', cx, f1CY + 9, p.stroke, 10);
  },

  /** Bacteriorhodopsin — rounded rect with retinal chromophore. */
  drawBR(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('bacteriorhodopsin', lightMode, glow);
    const r = w * 0.35;
    this.roundedRect(ctx, cx - w / 2, cy - h / 2, w, h, r);
    this.applyStyle(ctx, p, glow);
    this._drawChromophore(ctx, cx, cy, _ROLE.bacteriorhodopsin, lightMode);
    this.drawLabel(ctx, 'BR', cx, cy - 14, p.stroke, 12);
  },

  /** NNT (transhydrogenase) — rounded rect. */
  drawNNT(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('nnt', lightMode, glow);
    const r = w * 0.25;
    this.roundedRect(ctx, cx - w / 2, cy - h / 2, w, h, r);
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'NNT', cx, cy, p.stroke, 11);
  },

  /** UCP — narrow barrel channel. */
  drawUCP(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('uncoupling', lightMode, glow);
    const chanW = w * 0.5, chanH = h * 0.85;
    const r = 6;
    this.roundedRect(ctx, cx - chanW / 2, cy - chanH / 2, chanW, chanH, r);
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'UCP', cx, cy, p.stroke, 10);
  },

  /* ═══════════════════════════════════════
     Metabolite Node
     ═══════════════════════════════════════ */

  /** Width of a metabolite pill: measured label plus padding, never narrower than 32. */
  nodeWidth(ctx, label) {
    ctx.font = _F.node;
    return Math.max(_cachedMeasure(ctx, label) + 16, 32);
  },

  /** Width of an enzyme tag pill: measured label plus padding, in the active or idle weight. */
  tagWidth(ctx, label, active) {
    ctx.font = active ? _F.tagActive : _F.tag;
    return _cachedMeasure(ctx, label) + CFG.enzymeTagPad * 2;
  },

  /** Pill-shaped metabolite with optional "2x" stoichiometry marker. The pool-count badge is drawn separately (drawNodeBadge). */
  drawMetaboliteNode(ctx, cx, cy, label, active, lightMode, show2x) {
    const w = this.nodeWidth(ctx, label);
    const h = CFG.metabNodeHeight;
    this.pill(ctx, cx, cy, w, h);
    const th = this.t(lightMode);
    ctx.fillStyle = active ? th.surfaceElevated : th.surfaceMuted;
    ctx.fill();
    ctx.font = _F.node;
    ctx.fillStyle = active ? th.textPrimary : th.textSecondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
    // "2x" marker for metabolites produced in pairs (C6 -> 2x C3)
    if (show2x) {
      ctx.font = _F.nodeNote;
      ctx.fillStyle = th.textMuted;
      ctx.fillText('2x', cx, cy + 18);
    }
  },

  /** Accent badge on a pill's top-right corner showing the current pool count. */
  drawNodeBadge(ctx, cx, cy, label, lightMode, count) {
    const th = this.t(lightMode);
    const bx = cx + this.nodeWidth(ctx, label) / 2 - 2, by = cy - CFG.metabNodeHeight / 2 - 4;
    ctx.beginPath();
    ctx.arc(bx, by, CFG.metabBadgeRadius, 0, _TWO_PI);
    ctx.fillStyle = th.accentBadge;
    ctx.fill();
    ctx.font = _F.nodeBadge;
    ctx.fillStyle = th.textOnAccent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(count, bx, by);
  },

  /**
   * Enzyme tag pill — clickable label on arrows.
   * Dual-color gradient when the enzyme serves two pathways (color vs color2).
   * Returns the pill width (the hitbox follows it).
   */
  drawEnzymeTag(ctx, cx, cy, label, color, active, lightMode, color2) {
    const w = this.tagWidth(ctx, label, active);
    const h = 15;
    ctx.beginPath();
    const r = h / 2;
    ctx.arc(cx - w / 2 + r, cy, r, Math.PI * 0.5, Math.PI * 1.5);
    ctx.lineTo(cx + w / 2 - r, cy - r);
    ctx.arc(cx + w / 2 - r, cy, r, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
    // Flat translucent fill tinted by pathway color
    const useDual = color2 && color2 !== color;
    if (useDual) {
        const gk = color2 + color + '_fill';
        const cached = _gradCache[gk];
        if (cached && cached._cx === cx && cached._w === w && cached._cy === cy) {
            ctx.fillStyle = cached;
        } else {
            const grad = ctx.createLinearGradient(cx - w / 2, cy, cx + w / 2, cy);
            grad.addColorStop(0, _r(color2, active ? 0.22 : 0.14));
            grad.addColorStop(1, _r(color, active ? 0.22 : 0.14));
            grad._cx = cx; grad._w = w; grad._cy = cy;
            _gradCache[gk] = grad;
            ctx.fillStyle = grad;
        }
    } else {
        ctx.fillStyle = _r(color, active ? 0.22 : 0.14);
    }
    ctx.fill();
    // Text in pathway color
    let textStyle;
    if (useDual) {
        const gk = color2 + color;
        const cached = _gradCache[gk];
        if (cached && cached._cx === cx && cached._w === w && cached._cy === cy) {
            textStyle = cached;
        } else {
            textStyle = ctx.createLinearGradient(cx - w / 2, cy, cx + w / 2, cy);
            textStyle.addColorStop(0, color2); textStyle.addColorStop(1, color);
            textStyle._cx = cx; textStyle._w = w; textStyle._cy = cy;
            _gradCache[gk] = textStyle;
        }
    } else {
        textStyle = color;
    }
    ctx.fillStyle = textStyle;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
    return w;
  },

  /* ═══════════════════════════════════════
     Membrane Band
     ═══════════════════════════════════════ */

  /** Draw the membrane as a smooth translucent gradient band with soft edges. */
  drawMembrane(ctx, x, y, w, h, lightMode, time) {
    // Use raw hex (6-digit) so we can vary alpha in the gradient
    const rawHex = lightMode ? _PALETTE.light.textSecondary : _PALETTE.dark.text;
    const peakAlpha = lightMode ? 0.10 : 0.12;
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, _r(rawHex, 0));
    grad.addColorStop(0.18, _r(rawHex, peakAlpha));
    grad.addColorStop(0.5, _r(rawHex, peakAlpha));
    grad.addColorStop(0.82, _r(rawHex, peakAlpha));
    grad.addColorStop(1, _r(rawHex, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  },

  /* ═══════════════════════════════════════
     Particle Renderers
     ═══════════════════════════════════════ */

  drawElectron(ctx, x, y, intensity, type, fade) {
    const hex = _ROLE.electron.stroke;
    const a = fade != null ? fade : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(x, y, CFG.electronRadius + 0.5, 0, _TWO_PI);
    ctx.fillStyle = _r(hex, 0.55 + 0.35 * intensity);
    ctx.fill();
    ctx.restore();
  },

  drawProton(ctx, x, y, intensity, fade) {
    const a = fade != null ? fade : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(x, y, CFG.protonRadius + 0.5, 0, _TWO_PI);
    ctx.fillStyle = _r(_ROLE.proton.stroke, 0.5 + 0.4 * intensity);
    ctx.fill();
    // "+" label centered on proton
    ctx.font = _F.protonDot;
    ctx.fillStyle = _r(_THEME.protonText, a);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', x, y);
    ctx.restore();
  },

  /* ═══════════════════════════════════════
     Arrow Primitives
     ═══════════════════════════════════════ */

  /**
   * Core arrow renderer — straight or curved, with optional bidirectional heads.
   * Dual-color gradient when color2 != color (shared enzyme serving two pathways).
   */
  _drawArrowCore(ctx, x1, y1, x2, y2, opts) {
    ctx.save();
    const o = opts || {};
    const a = o.alpha != null ? o.alpha : 1.0;
    const c = o.color || _ROLE.shared.stroke;
    // Gap = arrowhead depth so line body ends at the arrowhead base
    const headDepth = CFG.arrowHeadLen * 0.85 * Math.cos(CFG.arrowHeadAngle * 1.15);
    const gap = headDepth;
    let angle;
    if (o.curved) {
      angle = Math.atan2(y2 - o.cpy, x2 - o.cpx);
    } else {
      angle = Math.atan2(y2 - y1, x2 - x1);
    }
    const stopX = x2 - gap * Math.cos(angle);
    const stopY = y2 - gap * Math.sin(angle);
    const startX = o.bidir ? x1 + gap * Math.cos(angle) : x1;
    const startY = o.bidir ? y1 + gap * Math.sin(angle) : y1;
    ctx.beginPath();
    if (o.dashed) ctx.setLineDash([6, 5]);
    ctx.moveTo(startX, startY);
    if (o.curved) ctx.quadraticCurveTo(o.cpx, o.cpy, stopX, stopY);
    else ctx.lineTo(stopX, stopY);
    if (o.bidir && o.color2 && o.color2 !== c) {
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, o.color2); grad.addColorStop(1, c);
      ctx.strokeStyle = grad;
    } else {
      ctx.strokeStyle = c;
    }
    ctx.globalAlpha = a;
    ctx.lineWidth = CFG.arrowLineWidth;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
    ctx.stroke();
    if (o.dashed) ctx.setLineDash([]);
    this._arrowhead(ctx, x2, y2, angle, c, a);
    if (o.bidir) {
      const rAngle = Math.atan2(y1 - y2, x1 - x2);
      this._arrowhead(ctx, x1, y1, rAngle, o.color2 || c, a);
    }
    ctx.restore();
  },

  _arrowhead(ctx, x, y, angle, color, alpha) {
    const hl = CFG.arrowHeadLen * 0.85, ha = CFG.arrowHeadAngle * 1.15;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - hl * Math.cos(angle - ha), y - hl * Math.sin(angle - ha));
    ctx.lineTo(x - hl * Math.cos(angle + ha), y - hl * Math.sin(angle + ha));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
  },

  drawCurvedArrow(ctx, x1, y1, x2, y2, color, alpha, curveDir) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    // Perpendicular offset (18px) creates the curve
    const nx = -dy / len * 18 * (curveDir || 1);
    const ny = dx / len * 18 * (curveDir || 1);
    this._drawArrowCore(ctx, x1, y1, x2, y2, { color, alpha, curved: true, cpx: mx + nx, cpy: my + ny });
  },

  drawArrow(ctx, x1, y1, x2, y2, color, alpha) {
    this._drawArrowCore(ctx, x1, y1, x2, y2, { color, alpha });
  },

  /**
   * Circular arrow for batch reactions (Krebs, Calvin, PPP, beta-ox cycle targets).
   * bidir adds arrowheads at both ends for reversible cycles (e.g. beta-ox/FA synthesis).
   * Rotation animates smoothly via rotAccum in state.
   */
  drawCycleTarget(ctx, cx, cy, color, label, dir = 1, rotation = 0, bidir = false) {
    const radius = CFG.cycleTargetRadius;
    const parentAlpha = ctx.globalAlpha;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);
    ctx.beginPath();
    if (dir === 1) {
      ctx.arc(cx, cy, radius, 0.4, _TWO_PI - 0.4, false);
    } else {
      ctx.arc(cx, cy, radius, _TWO_PI - 0.4, 0.4, true);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = CFG.cycleStrokeWidth;
    ctx.globalAlpha = parentAlpha;
    ctx.stroke();

    if (dir === 1) {
      _cycleArrowhead(ctx, cx, cy, radius, _TWO_PI - 0.4, _TWO_PI - 0.4 + Math.PI / 2, color, parentAlpha);
    } else {
      _cycleArrowhead(ctx, cx, cy, radius, 0.4, 0.4 - Math.PI / 2, color, parentAlpha);
    }

    if (bidir) {
      if (dir === 1) {
        _cycleArrowhead(ctx, cx, cy, radius, 0.4, 0.4 - Math.PI / 2, color, parentAlpha);
      } else {
        _cycleArrowhead(ctx, cx, cy, radius, _TWO_PI - 0.4, _TWO_PI - 0.4 + Math.PI / 2, color, parentAlpha);
      }
    }

    ctx.restore();
    ctx.font = _F.cycle;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
  },

  drawBidirectionalArrow(ctx, x1, y1, x2, y2, color1, color2, alpha) {
    this._drawArrowCore(ctx, x1, y1, x2, y2, { color: color1, color2, alpha, bidir: true });
  },

  drawDashedArrow(ctx, x1, y1, x2, y2, color, alpha) {
    this._drawArrowCore(ctx, x1, y1, x2, y2, { color, alpha, dashed: true });
  },
};
