/* ===================================================================
   enzymes.js — Stylized enzyme and complex drawing functions
   =================================================================== */

// ---------- Font Constants ----------
// Single source of truth for all canvas font families
const _FONT = {
  mono:  "'JetBrains Mono', monospace",
  body:  "'Sora', sans-serif",
  emoji: "sans-serif",
};

// ---------- Drawing Constants ----------
const CFG = {
  arrowHeadLen: 8,
  arrowHeadAngle: 0.35,
  arrowLineWidth: 2.5,
  arrowStopGap: 5,
  cycleTargetRadius: 42,
  cycleStrokeWidth: 5,
  cycleTipLen: 16,
  cycleFinLen: 10,
  enzymeTagPad: 5,
  enzymeTagFont: 8.5,
  metabNodeHeight: 22,
  metabBadgeRadius: 7,
  electronRadius: 4,
  protonRadius: 3.5,
  trailMaxLen: 10,
};

// ---------- Color Math Helpers ----------
const _parseHex = (hex) => [
  parseInt(hex.slice(1, 3), 16) / 255,
  parseInt(hex.slice(3, 5), 16) / 255,
  parseInt(hex.slice(5, 7), 16) / 255
];

function _rgb2hsl(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

function _hsl2hex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0');
  return '#' + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
}

// ---------- Palette Fill Colors ----------
// _darkFill: same hue, fixed sat (0.55), custom lightness — for dark-mode fills
// _strokeDark: same hue, reduced sat/lightness — for light-mode stroke variants

function _darkFill(base, lightness) {
  const [h] = _rgb2hsl(..._parseHex(base.stroke));
  return _hsl2hex(h, 0.55, lightness / 100);
}

function _strokeDark(hex) {
  const [h, s, l] = _rgb2hsl(..._parseHex(hex));
  return _hsl2hex(h, s * 0.92, l * 0.75);
}

function _makeBase(stroke, fillL) {
  const o = { stroke, strokeLight: _strokeDark(stroke) };
  if (fillL != null) o.fill = _darkFill(o, fillL);
  return o;
}

const _BASE = {
  orange: _makeBase('#fb923c', 7),
  blue:   _makeBase('#38bdf8', 13),
  green:  _makeBase('#10b981', 7),
  purple: _makeBase('#c084fc', 10),
  rose:   _makeBase('#f43f5e', 8),
  brown:  _makeBase('#a0694a', 7),
  red:    _makeBase('#ef4444'),
  cyan:   _makeBase('#67e8f9'),
};

// ---------- Semantic Role → Base Family ----------
// Change a role's color here and it propagates everywhere
const _ROLE = {
  glycolysis: _BASE.orange, calvin: _BASE.green, ppp: _BASE.rose,
  krebs: _BASE.blue, fermentation: _BASE.brown,
  respiratory: _BASE.blue, photosynthetic: _BASE.green,
  shared: _BASE.orange, atpSynthase: _BASE.rose,
  cyclic: _BASE.purple, bacteriorhodopsin: _BASE.purple, nnt: _BASE.brown,
  electron: _BASE.cyan,
  proton: _BASE.red,
  lightIndicator: _BASE.orange,
};

function _pal(b, fill, glowA) {
  return { fill, stroke: b.stroke, glow: _r(b.stroke, glowA), strokeLight: b.strokeLight };
}

// ---------- Theme Colors ----------
// Centralised UI colors for canvas drawing — change here, propagates everywhere
const _r = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, '0');

// Shared hex bases (only extracted when used 3+ times)
const _night = '#7c859c';
const _lAccent = '#1e293b';
const _dAccent = '#e8a838';

const _THEME = {
  // Mode-independent
  photonFill:     '#fde68a',
  photonGlow:     '#fbbf24',
  protonText:     '#ffffff',
  nightText:      _r(_night, 0.3),
  nightIcon:      _r(_night, 0.2),

  dark: {
    textPrimary:          '#e0e5ee',
    textSecondary:        '#8892a4',
    textMuted:            '#7c859c',
    textOnAccent:         '#0a0c14',

    surfacePrimary:       _r('#0a101c', 0.88),
    surfaceSecondary:     _r('#0a101c', 0.65),
    surfaceElevated:      _r('#263042', 0.92),
    surfaceMuted:         _r('#121a2a', 0.78),

    accentBadge:          _r(_dAccent, 0.9),
    accentGlow:           _r(_dAccent, 0.2),

    metabActiveStroke:    '#e0e5ee',
    metabInactiveStroke:  _r('#828ea8', 0.4),

    membraneHead:         _r('#82afd7', 0.15),
    membraneTail:         _r('#82afd7', 0.06),

    sectionLabel:         _r(_dAccent, 0.25),
    sectionLabelAlt:      _r(_dAccent, 0.2),
    protonPoolLabel:      _r(_BASE.blue.stroke, 0.2),

    chromophoreAlpha:     0.5,
  },

  light: {
    textPrimary:          '#0f172a',
    textSecondary:        '#334155',
    textMuted:            '#64748b',
    textOnAccent:         '#f1f5f9',

    surfacePrimary:       _r('#ffffff', 0.95),
    surfaceSecondary:     _r('#f1f5f9', 0.85),
    surfaceElevated:      _r('#ffffff', 0.95),  // intentionally same as surfacePrimary
    surfaceMuted:         _r('#f1f5f9', 0.9),

    accentBadge:          _r(_lAccent, 0.85),
    accentGlow:           _r(_lAccent, 0.2),

    metabActiveStroke:    '#1e293b',
    metabInactiveStroke:  '#475569',

    membraneHead:         _r('#14788c', 0.3),
    membraneTail:         _r('#14788c', 0.15),

    sectionLabel:         _r(_lAccent, 0.25),
    sectionLabelAlt:      _r(_lAccent, 0.2),
    protonPoolLabel:      _r(_BASE.blue.strokeLight, 0.25),

    chromophoreAlpha:     0.6,
  },
};

const EnzymeStyles = {
  roleColors: _ROLE,
  theme: _THEME,
  t(lm) { return lm ? _THEME.light : _THEME.dark; },

  colors: {
    respiratory:        _pal(_ROLE.respiratory,       _BASE.blue.fill, 0.35),
    photosynthetic:     _pal(_ROLE.photosynthetic,    _BASE.green.fill, 0.35),
    shared:             _pal(_ROLE.shared,            _BASE.orange.fill, 0.3),
    atpSynthase:        _pal(_ROLE.atpSynthase,       _BASE.rose.fill, 0.35),
    glycolysis:         _pal(_ROLE.glycolysis,        _BASE.orange.fill, 0.3),
    glycolysisActive:   _pal(_ROLE.glycolysis,        _darkFill(_BASE.orange, 12), 0.5),
    krebs:              _pal(_ROLE.krebs,             _BASE.blue.fill, 0.25),
    krebsActive:        _pal(_ROLE.krebs,             _darkFill(_BASE.blue,   18), 0.5),
    calvin:             _pal(_ROLE.calvin,            _BASE.green.fill, 0.3),
    calvinActive:       _pal(_ROLE.calvin,            _darkFill(_BASE.green,  12), 0.5),
    ppp:                _pal(_ROLE.ppp,               _BASE.rose.fill, 0.25),
    pppActive:          _pal(_ROLE.ppp,               _darkFill(_BASE.rose,   13), 0.5),
    bacteriorhodopsin:  _pal(_ROLE.bacteriorhodopsin, _BASE.purple.fill, 0.35),
    cyclic:             _pal(_ROLE.cyclic,            _BASE.purple.fill, 0.35),
    fermentation:       _pal(_ROLE.fermentation,      _BASE.brown.fill, 0.3),
    nnt:                _pal(_ROLE.nnt,               _BASE.brown.fill, 0.3),
  },

  getPalette(key, lightMode, glowIntensity = 0) {
    const p = this.colors[key];
    if (!lightMode) return p;
    return {
      fill: _THEME.light.surfacePrimary,
      stroke: p.strokeLight || p.stroke,
      glow: glowIntensity > 0 ? _r(p.stroke, glowIntensity * 0.05) : ''
    };
  },

  /* ---- Generic shape helpers ---- */
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

  /* ---- Style + glow ---- */
  applyStyle(ctx, palette, glowAmount) {
    if (glowAmount > 0) {
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = glowAmount;
    }
    ctx.fillStyle = palette.fill;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = palette.stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  },

  drawLabel(ctx, text, cx, cy, color, fontSize) {
    ctx.font = `700 ${fontSize || 13}px ${_FONT.mono}`;
    ctx.fillStyle = color || _THEME.dark.textPrimary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy);
  },

  _drawChromophore(ctx, cx, cy, role, lightMode) {
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, _TWO_PI);
    ctx.fillStyle = _r(role.stroke, this.t(lightMode).chromophoreAlpha);
    ctx.fill();
  },

  /* ====================================================================
     ETC Complex Drawers — enzyme shapes that span/sit inside membrane
     ==================================================================== */

  /** NDH-1 / Complex I — T-shape: narrow membrane neck + wide peripheral head below */
  drawNDH1(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('respiratory', lightMode, glow);
    const top = cy - h / 2, bot = cy + h / 2;
    const neckW = w * 0.44, headH = h * 0.6, r = 5;
    const headTop = top + (h - headH);
    ctx.beginPath();
    // Narrow neck (membrane section) at top
    ctx.moveTo(cx - neckW / 2 + r, top);
    ctx.lineTo(cx + neckW / 2 - r, top);
    ctx.quadraticCurveTo(cx + neckW / 2, top, cx + neckW / 2, top + r);
    ctx.lineTo(cx + neckW / 2, headTop);
    // Step out to wide head (peripheral arm in matrix/stroma)
    ctx.lineTo(cx + w / 2, headTop);
    ctx.lineTo(cx + w / 2, bot - r);
    ctx.quadraticCurveTo(cx + w / 2, bot, cx + w / 2 - r, bot);
    ctx.lineTo(cx - w / 2 + r, bot);
    ctx.quadraticCurveTo(cx - w / 2, bot, cx - w / 2, bot - r);
    ctx.lineTo(cx - w / 2, headTop);
    // Step in to neck left
    ctx.lineTo(cx - neckW / 2, headTop);
    ctx.lineTo(cx - neckW / 2, top + r);
    ctx.quadraticCurveTo(cx - neckW / 2, top, cx - neckW / 2 + r, top);
    ctx.closePath();
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'CI', cx, top + (h - headH) / 2, p.stroke, 10);
    this.drawLabel(ctx, 'NDH-1', cx, headTop + headH / 2, p.stroke, 10);
  },

  /** SDH / Complex II — trapezoid: narrow membrane anchor + wider catalytic head */
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
    this.drawLabel(ctx, 'SDH', cx, cy - 4, p.stroke, 9);
    this.drawLabel(ctx, 'CII', cx, cy + 8, p.stroke, 8);
  },

  /** PSII — ellipse with dimer interface line and P680 chromophore */
  drawPSII(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('photosynthetic', lightMode, glow);
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, _TWO_PI);
    this.applyStyle(ctx, p, glow);
    // Dimer interface
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy - h * 0.38);
    ctx.lineTo(cx, cy + h * 0.38);
    ctx.strokeStyle = p.stroke; ctx.globalAlpha *= 0.2;
    ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
    this._drawChromophore(ctx, cx, cy + 2, _ROLE.photosynthetic, lightMode);
    this.drawLabel(ctx, 'PSII', cx, cy - 14, p.stroke, 12);
    this.drawLabel(ctx, 'P680', cx, cy + 16, p.stroke, 9);
  },

  /** PSI — ellipse with P700 chromophore */
  drawPSI(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('photosynthetic', lightMode, glow);
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, _TWO_PI);
    this.applyStyle(ctx, p, glow);
    this._drawChromophore(ctx, cx, cy + 2, _ROLE.photosynthetic, lightMode);
    this.drawLabel(ctx, 'PSI', cx, cy - 12, p.stroke, 12);
    this.drawLabel(ctx, 'P700', cx, cy + 16, p.stroke, 9);
  },

  /** Cyt b6f — hourglass: wider top and bottom, pinched at membrane center */
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

  /** Cyt c Oxidase / Complex IV — trapezoid wider at matrix side (bottom) */
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

  /** Plastocyanin — circle (small mobile carrier) */
  drawPC(ctx, cx, cy, radius, glow, lightMode) {
    const p = this.getPalette('shared', lightMode, glow);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, _TWO_PI);
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'PC', cx, cy, p.stroke, 10);
  },

  /** Ferredoxin — diamond (small mobile carrier) */
  drawFd(ctx, cx, cy, radius, glow, lightMode) {
    const p = this.getPalette('photosynthetic', lightMode, glow);
    const s = radius * 1.8;
    this.diamond(ctx, cx, cy, s, s);
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'Fd', cx, cy, p.stroke, 10);
  },

  /** FNR — horizontal ellipse (peripheral membrane enzyme) */
  drawFNR(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('photosynthetic', lightMode, glow);
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, _TWO_PI);
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'FNR', cx, cy, p.stroke, 10);
  },

  /** Plastoquinone — diamond (small lipid-soluble mobile carrier) */
  drawPQ(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('shared', lightMode, glow);
    this.diamond(ctx, cx, cy, w * 0.85, h);
    this.applyStyle(ctx, p, glow);
    this.drawLabel(ctx, 'PQ', cx, cy, p.stroke, 10);
  },

  /** ATP Synthase — mushroom: Fo rotor (membrane) + stalk + F1 head (matrix) */
  drawATPSynthase(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('atpSynthase', lightMode, glow);
    const top = cy - h / 2;
    const foW = w * 0.6, foH = h * 0.28;
    const halfStalk = w * 0.09;
    const f1R = h * 0.24;
    const f1CY = cy + h / 2 - f1R - 1;
    const foBot = top + foH;
    const r = 5;
    // Angle where stalk meets F1 circle
    const joinA = Math.asin(Math.min(halfStalk / f1R, 1));
    const arcStart = -Math.PI / 2 + joinA;
    const arcEnd = -Math.PI / 2 - joinA;
    // Compound path: Fo rect → stalk → F1 circle
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
    // Fo/stalk divider
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - foW / 2 + 3, foBot);
    ctx.lineTo(cx + foW / 2 - 3, foBot);
    ctx.strokeStyle = p.stroke; ctx.globalAlpha *= 0.25;
    ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    this.drawLabel(ctx, 'Fo', cx, top + foH / 2, p.stroke, 10);
    this.drawLabel(ctx, 'ATP', cx, f1CY - 4, p.stroke, 11);
    this.drawLabel(ctx, 'Syn', cx, f1CY + 9, p.stroke, 9);
  },

  /** Bacteriorhodopsin — barrel with 7-TM helix hints + retinal chromophore */
  drawBR(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('bacteriorhodopsin', lightMode, glow);
    const r = w * 0.35;
    this.roundedRect(ctx, cx - w / 2, cy - h / 2, w, h, r);
    this.applyStyle(ctx, p, glow);
    // 7-TM helix hints
    ctx.save();
    ctx.globalAlpha *= 0.15;
    ctx.strokeStyle = p.stroke; ctx.lineWidth = 1;
    const sp = w / 8;
    for (let i = 1; i <= 7; i++) {
      const hx = cx - w / 2 + sp * i;
      ctx.beginPath();
      ctx.moveTo(hx, cy - h * 0.3);
      ctx.lineTo(hx, cy + h * 0.3);
      ctx.stroke();
    }
    ctx.restore();
    this._drawChromophore(ctx, cx, cy, _ROLE.bacteriorhodopsin, lightMode);
    this.drawLabel(ctx, 'BR', cx, cy - 14, p.stroke, 12);
  },

  /** NNT (Nicotinamide Nucleotide Transhydrogenase) — rounded rect with two subunit lines */
  drawNNT(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('nnt', lightMode, glow);
    const r = w * 0.25;
    this.roundedRect(ctx, cx - w / 2, cy - h / 2, w, h, r);
    this.applyStyle(ctx, p, glow);
    // Two subunit dividers
    ctx.save();
    ctx.globalAlpha *= 0.18;
    ctx.strokeStyle = p.stroke; ctx.lineWidth = 1;
    const third = w / 3;
    for (let i = 1; i <= 2; i++) {
      const hx = cx - w / 2 + third * i;
      ctx.beginPath();
      ctx.moveTo(hx, cy - h * 0.32);
      ctx.lineTo(hx, cy + h * 0.32);
      ctx.stroke();
    }
    ctx.restore();
    this.drawLabel(ctx, 'NNT', cx, cy, p.stroke, 11);
  },

  /* ==== Shared Metabolite Node ==== */
  drawMetaboliteNode(ctx, cx, cy, label, active, lightMode, show2x, count) {
    const w = Math.max(ctx.measureText(label).width + 16, 32);
    const h = CFG.metabNodeHeight;
    this.pill(ctx, cx, cy, w, h);
    const th = this.t(lightMode);
    let palette;
    if (active) {
      palette = { fill: th.surfaceElevated, stroke: th.metabActiveStroke, glow: th.accentGlow };
    } else {
      palette = { fill: th.surfaceMuted, stroke: th.metabInactiveStroke, glow: '' };
    }
    ctx.lineWidth = 1.0;
    this.applyStyle(ctx, palette, active ? 6 : 0);
    ctx.font = `600 9px ${_FONT.mono}`;
    ctx.fillStyle = active ? th.textPrimary : th.textSecondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
    // Count badge above node
    if (count > 0) {
      const badgeR = CFG.metabBadgeRadius;
      const bx = cx + w / 2 - 2, by = cy - h / 2 - 4;
      ctx.beginPath();
      ctx.arc(bx, by, badgeR, 0, _TWO_PI);
      ctx.fillStyle = th.accentBadge;
      ctx.fill();
      ctx.font = `700 8px ${_FONT.mono}`;
      ctx.fillStyle = th.textOnAccent;
      ctx.fillText(count, bx, by);
    }
    if (show2x) {
      ctx.font = `600 8px ${_FONT.mono}`;
      ctx.fillStyle = th.textMuted;
      ctx.fillText('2x', cx, cy + 18);
    }
  },

  /** Small enzyme label badge drawn on an arrow midpoint.
   *  color2 (optional) — when provided and different from color,
   *  the pill border and text use a left→right gradient of both pathway colors. */
  drawEnzymeTag(ctx, cx, cy, label, color, active, lightMode, color2) {
    const pad = CFG.enzymeTagPad;
    ctx.font = `${active ? 700 : 500} ${CFG.enzymeTagFont}px ${_FONT.mono}`;
    const tw = ctx.measureText(label).width;
    const w = tw + pad * 2;
    const h = 15;

    // Background pill
    ctx.beginPath();
    const r = h / 2;
    ctx.arc(cx - w / 2 + r, cy, r, Math.PI * 0.5, Math.PI * 1.5);
    ctx.lineTo(cx + w / 2 - r, cy - r);
    ctx.arc(cx + w / 2 - r, cy, r, Math.PI * 1.5, Math.PI * 0.5);
    ctx.closePath();
    const th = this.t(lightMode);
    ctx.fillStyle = active ? th.surfacePrimary : th.surfaceSecondary;
    ctx.fill();

    const useDual = color2 && color2 !== color;
    const style = useDual ? (() => {
      const g = ctx.createLinearGradient(cx - w / 2, cy, cx + w / 2, cy);
      g.addColorStop(0, color2); g.addColorStop(1, color);
      return g;
    })() : color;
    ctx.strokeStyle = style;
    ctx.lineWidth = 1.0;
    ctx.stroke();
    ctx.fillStyle = style;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
  },

  /* ---- Membrane band ---- */
  drawMembrane(ctx, x, y, w, h, lightMode, time) {
    const t = time || 0;
    const headSpacing = 6;
    const headRadius = 2.5;
    const tailLen = (h - 6 - headRadius * 2) / 2;

    const th = this.t(lightMode);
    const headColor = th.membraneHead;
    const tailColor = th.membraneTail;

    // Draw phospholipid bilayer — set styles once before loop
    ctx.fillStyle = headColor;
    ctx.strokeStyle = tailColor;
    ctx.lineWidth = 0.7;
    for (let lx = x + 6; lx < x + w; lx += headSpacing) {
      const wobble = Math.sin(t * 2 + lx * 0.1) * 1.2;

      // ── Outer leaflet (top) ──
      const topHeadY = y + 3 + wobble;
      ctx.beginPath();
      ctx.arc(lx, topHeadY, headRadius, 0, _TWO_PI);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(lx - 1, topHeadY + headRadius);
      ctx.lineTo(lx - 1.5, topHeadY + headRadius + tailLen);
      ctx.moveTo(lx + 1, topHeadY + headRadius);
      ctx.lineTo(lx + 1.5, topHeadY + headRadius + tailLen);
      ctx.stroke();

      // ── Inner leaflet (bottom) ──
      const botHeadY = y + h - 3 - wobble;
      const bx = lx + headSpacing / 2;
      ctx.beginPath();
      ctx.arc(bx, botHeadY, headRadius, 0, _TWO_PI);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx - 1, botHeadY - headRadius);
      ctx.lineTo(bx - 1.5, botHeadY - headRadius - tailLen);
      ctx.moveTo(bx + 1, botHeadY - headRadius);
      ctx.lineTo(bx + 1.5, botHeadY - headRadius - tailLen);
      ctx.stroke();
    }
  },

  /* ---- Particles ---- */
  drawElectron(ctx, x, y, intensity, type, fade) {
    const hex = _ROLE.electron.stroke;
    const a = fade != null ? fade : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(x, y, CFG.electronRadius, 0, _TWO_PI);
    ctx.fillStyle = _r(hex, 0.7 + 0.3 * intensity);
    ctx.shadowColor = _r(hex, 0.8);
    ctx.shadowBlur = 8 * intensity;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  },

  drawProton(ctx, x, y, intensity, fade) {
    const a = fade != null ? fade : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(x, y, CFG.protonRadius, 0, _TWO_PI);
    ctx.fillStyle = _r(_ROLE.proton.stroke, 0.6 + 0.4 * intensity);
    ctx.shadowColor = _r(_ROLE.proton.stroke, 0.7);
    ctx.shadowBlur = 5 * intensity;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = `600 8px ${_FONT.mono}`;
    ctx.fillStyle = _r(_THEME.protonText, a);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', x, y);
    ctx.restore();
  },

  /* ---- Arrows ---- */

  /** Core arrow renderer — all arrow variants delegate here */
  _drawArrowCore(ctx, x1, y1, x2, y2, opts) {
    ctx.save();
    const o = opts || {};
    const a = o.alpha != null ? o.alpha : 1.0;
    const c = o.color || _ROLE.shared.stroke;
    const hl = CFG.arrowHeadLen, ha = CFG.arrowHeadAngle, gap = CFG.arrowStopGap;

    let angle;
    if (o.curved) {
      angle = Math.atan2(y2 - o.cpy, x2 - o.cpx);
    } else {
      angle = Math.atan2(y2 - y1, x2 - x1);
    }
    const stopX = x2 - gap * Math.cos(angle);
    const stopY = y2 - gap * Math.sin(angle);

    // For bidir arrows, shorten start so line doesn't extend past backward arrowhead
    const startX = o.bidir ? x1 + gap * Math.cos(angle) : x1;
    const startY = o.bidir ? y1 + gap * Math.sin(angle) : y1;

    // Line
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
    ctx.stroke();
    if (o.dashed) ctx.setLineDash([]);

    // Forward arrowhead
    this._arrowhead(ctx, x2, y2, angle, c, a);

    // Backward arrowhead (bidirectional)
    if (o.bidir) {
      const rAngle = Math.atan2(y1 - y2, x1 - x2);
      this._arrowhead(ctx, x1, y1, rAngle, o.color2 || c, a);
    }
    ctx.restore();
  },

  _arrowhead(ctx, x, y, angle, color, alpha) {
    const hl = CFG.arrowHeadLen, ha = CFG.arrowHeadAngle;
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
    const nx = -dy / len * 18 * (curveDir || 1);
    const ny = dx / len * 18 * (curveDir || 1);
    this._drawArrowCore(ctx, x1, y1, x2, y2, { color, alpha, curved: true, cpx: mx + nx, cpy: my + ny });
  },

  drawArrow(ctx, x1, y1, x2, y2, color, alpha) {
    this._drawArrowCore(ctx, x1, y1, x2, y2, { color, alpha });
  },

  drawCycleTarget(ctx, cx, cy, color, label, dir = 1, rotation = 0) {
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

    // Tangential arrowhead
    ctx.beginPath();
    let tangentAngle, endAngle;
    if (dir === 1) {
      endAngle = _TWO_PI - 0.4;
      tangentAngle = endAngle + Math.PI / 2;
    } else {
      endAngle = 0.4;
      tangentAngle = endAngle - Math.PI / 2;
    }
    const ax = cx + radius * Math.cos(endAngle);
    const ay = cy + radius * Math.sin(endAngle);

    const tipX = ax + CFG.cycleTipLen * Math.cos(tangentAngle);
    const tipY = ay + CFG.cycleTipLen * Math.sin(tangentAngle);

    const pAngle = tangentAngle + Math.PI / 2;
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

    ctx.restore();

    // Label in the middle (drawn outside rotation so text stays upright)
    ctx.font = `700 12px ${_FONT.mono}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
  },

  /** Thick Bidirectional arrow for metabolic flow connections */
  drawBidirectionalArrow(ctx, x1, y1, x2, y2, color1, color2, alpha) {
    this._drawArrowCore(ctx, x1, y1, x2, y2, { color: color1, color2, alpha, bidir: true });
  },

  /** Thick Dashed arrow for metabolic flow connections */
  drawDashedArrow(ctx, x1, y1, x2, y2, color, alpha) {
    this._drawArrowCore(ctx, x1, y1, x2, y2, { color, alpha, dashed: true });
  },
};
