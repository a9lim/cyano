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

// ---------- Base Color Groups ----------
// Single source of truth — all pathway palettes derive from these color families
const _BASE = {
  orange: { stroke: '#fb923c', strokeLight: '#ea580c', rgb: '251,146,60' },
  blue:   { stroke: '#38bdf8', strokeLight: '#0284c7', rgb: '56,189,248' },
  green:  { stroke: '#10b981', strokeLight: '#059669', rgb: '16,185,129' },
  purple: { stroke: '#c084fc', strokeLight: '#9333ea', rgb: '192,132,252' },
  rose:   { stroke: '#f43f5e', strokeLight: '#e11d48', rgb: '244,63,94' },
  brown:  { stroke: '#a0694a', strokeLight: '#7a4a2a', rgb: '160,105,74' },
  red:    { stroke: '#ef4444', strokeLight: '#dc2626', rgb: '239,68,68' },
  cyan:   { stroke: '#67e8f9', strokeLight: '#22d3ee', rgb: '103,232,249' },
};

// ---------- Semantic Role → Base Family ----------
// Change a role's color here and it propagates everywhere
const _ROLE = {
  glycolysis: _BASE.orange, calvin: _BASE.green, ppp: _BASE.rose,
  krebs: _BASE.blue, fermentation: _BASE.brown,
  respiratory: _BASE.blue, photosynthetic: _BASE.green,
  shared: _BASE.orange, atpSynthase: _BASE.rose,
  cyclic: _BASE.purple, bacteriorhodopsin: _BASE.purple, nnt: _BASE.brown,
  link: _BASE.orange,
  electron: _BASE.cyan,
  electronResp: _BASE.cyan, electronPhoto: _BASE.cyan, electronCyclic: _BASE.cyan,
  proton: _BASE.red,
  lightIndicator: _BASE.orange,
};

// ---------- Palette Fill Colors (dark mode) ----------
// Background fills for enzyme shapes — extracted from _pal() calls
const _FILL = {
  respiratory:      '#091c38',
  photosynthetic:   '#061e15',
  shared:           '#1a1208',
  atpSynthase:      '#1e0a14',
  glycolysis:       '#1a1208',
  glycolysisActive: '#291c0b',
  krebs:            '#091c38',
  krebsActive:      '#0e2a52',
  calvin:           '#061e15',
  calvinActive:     '#0a3020',
  ppp:              '#1e0a14',
  pppActive:        '#33101e',
  cyclic:           '#150a28',
  fermentation:     '#1a1108',
  nnt:              '#1a1108',
};

function _pal(b, fill, glowA) {
  return { fill, stroke: b.stroke, glow: `rgba(${b.rgb},${glowA})`, strokeLight: b.strokeLight, glowRgba: b.rgb };
}

// ---------- Theme Colors ----------
// Centralised UI colors for canvas drawing — change here, propagates everywhere
const _THEME = {
  // Mode-independent
  feSIron:        'rgba(180,120,60,0.5)',
  feSSulfur:      'rgba(220,200,60,0.4)',
  hemeStroke:     'rgba(220,60,60,0.5)',
  hemeFill:       'rgba(220,60,60,0.35)',
  cofactorDot:    'rgba(251,191,36,0.5)',
  photonFill:     '#fde68a',
  photonGlow:     '#fbbf24',
  protonTextRgb:  '255,255,255',
  fallbackGlowRgb:'148,163,184',

  dark: {
    textPrimary:          '#e0e5ee',
    textSecondary:        '#8892a4',
    textMuted:            '#7c859c',
    textOnAccent:         '#0a0c14',

    surfacePrimary:       'rgba(10,16,28,0.88)',
    surfaceSecondary:     'rgba(10,16,28,0.65)',
    surfaceElevated:      'rgba(38,48,66,0.92)',
    surfaceMuted:         'rgba(18,26,42,0.78)',

    accentBadge:          'rgba(232,168,56,0.9)',
    accentGlow:           'rgba(232,168,56,0.2)',

    metabActiveStroke:    '#e0e5ee',
    metabInactiveStroke:  'rgba(130,142,168,0.4)',

    membraneHead:         'rgba(130,175,215,0.15)',
    membraneTail:         'rgba(130,175,215,0.06)',
    membraneMid:          'rgba(14,24,42,0.2)',

    sectionLabel:         'rgba(124,133,156,0.25)',
    sectionLabelAlt:      'rgba(124,133,156,0.2)',
    nightText:            'rgba(124,133,156,0.3)',
    nightIcon:            'rgba(124,133,156,0.2)',
    protonPoolLabel:      'rgba(56,189,248,0.2)',

    chromophoreAlpha:     0.5,
  },

  light: {
    textPrimary:          '#0f172a',
    textSecondary:        '#334155',
    textMuted:            '#64748b',
    textOnAccent:         '#f1f5f9',

    surfacePrimary:       'rgba(255,255,255,0.95)',
    surfaceSecondary:     'rgba(241,245,249,0.85)',
    surfaceElevated:      'rgba(255,255,255,0.95)',
    surfaceMuted:         'rgba(241,245,249,0.9)',

    accentBadge:          'rgba(30,41,59,0.85)',
    accentGlow:           'rgba(30,41,59,0.2)',

    metabActiveStroke:    '#1e293b',
    metabInactiveStroke:  '#475569',

    membraneHead:         'rgba(20,120,140,0.3)',
    membraneTail:         'rgba(20,120,140,0.15)',
    membraneMid:          'rgba(160,195,215,0.1)',

    sectionLabel:         'rgba(30,41,59,0.25)',
    sectionLabelAlt:      'rgba(30,41,59,0.2)',
    nightText:            'rgba(124,133,156,0.3)',
    nightIcon:            'rgba(124,133,156,0.2)',
    protonPoolLabel:      'rgba(14,116,144,0.25)',

    chromophoreAlpha:     0.6,
  },
};

const EnzymeStyles = {
  baseColors: _BASE,
  roleColors: _ROLE,
  theme: _THEME,
  t(lm) { return lm ? _THEME.light : _THEME.dark; },

  colors: {
    respiratory:        _pal(_ROLE.respiratory,       _FILL.respiratory, 0.35),
    photosynthetic:     _pal(_ROLE.photosynthetic,    _FILL.photosynthetic, 0.35),
    shared:             _pal(_ROLE.shared,            _FILL.shared, 0.3),
    atpSynthase:        _pal(_ROLE.atpSynthase,       _FILL.atpSynthase, 0.35),
    glycolysis:         _pal(_ROLE.glycolysis,        _FILL.glycolysis, 0.3),
    glycolysisActive:   _pal(_ROLE.glycolysis,        _FILL.glycolysisActive, 0.5),
    krebs:              _pal(_ROLE.krebs,             _FILL.krebs, 0.25),
    krebsActive:        _pal(_ROLE.krebs,            _FILL.krebsActive, 0.5),
    calvin:             _pal(_ROLE.calvin,            _FILL.calvin, 0.3),
    calvinActive:       _pal(_ROLE.calvin,           _FILL.calvinActive, 0.5),
    ppp:                _pal(_ROLE.ppp,               _FILL.ppp, 0.25),
    pppActive:          _pal(_ROLE.ppp,              _FILL.pppActive, 0.5),
    bacteriorhodopsin:  _pal(_ROLE.bacteriorhodopsin, _FILL.cyclic, 0.35),
    cyclic:             _pal(_ROLE.cyclic,            _FILL.cyclic, 0.35),
    fermentation:       _pal(_ROLE.fermentation,      _FILL.fermentation, 0.3),
    nnt:                _pal(_ROLE.nnt,               _FILL.nnt, 0.3),
  },

  getPalette(key, lightMode, glowIntensity = 0) {
    const p = this.colors[key];
    if (!lightMode) return p;
    return {
      fill: _THEME.light.surfacePrimary,
      stroke: p.strokeLight || p.stroke,
      glow: glowIntensity > 0 ? `rgba(${p.glowRgba || _THEME.fallbackGlowRgb},${glowIntensity * 0.05})` : ''
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

  hexagon(ctx, cx, cy, radius) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + radius * Math.cos(angle);
      const py = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
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

  octagon(ctx, cx, cy, radius) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i - Math.PI / 8;
      const px = cx + radius * Math.cos(angle);
      const py = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
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

  /* ---- Cofactor detail helpers ---- */

  /** Iron-sulfur cluster: two overlapping circles with Fe-S coloring */
  drawFeS(ctx, x, y, radius) {
    ctx.beginPath(); ctx.arc(x - 2, y, radius, 0, _TWO_PI);
    ctx.fillStyle = _THEME.feSIron; ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2, y, radius, 0, _TWO_PI);
    ctx.fillStyle = _THEME.feSSulfur; ctx.fill();
  },

  /** Heme group: ring with colored center */
  drawHeme(ctx, x, y, radius, hemeColor) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, _TWO_PI);
    ctx.strokeStyle = hemeColor || _THEME.hemeStroke;
    ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, radius * 0.4, 0, _TWO_PI);
    ctx.fillStyle = hemeColor || _THEME.hemeFill; ctx.fill();
  },

  /** Quinone / cofactor indicator dot */
  drawCofactorDot(ctx, x, y, color) {
    ctx.beginPath(); ctx.arc(x, y, 2, 0, _TWO_PI);
    ctx.fillStyle = color || _THEME.cofactorDot; ctx.fill();
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

  /* ====================================================================
     ETC Complex Drawers — enzyme shapes that span/sit inside membrane
     ==================================================================== */

  /** Generic ETC complex — consistent rounded rect with label */
  _drawETCComplex(ctx, cx, cy, w, h, glow, lightMode, paletteKey, label1, label2) {
    const p = this.getPalette(paletteKey, lightMode, glow);
    this.roundedRect(ctx, cx - w / 2, cy - h / 2, w, h, Math.min(w, h) * 0.3);
    this.applyStyle(ctx, p, glow);
    if (label2) {
      this.drawLabel(ctx, label1, cx, cy - 7, p.stroke, 13);
      this.drawLabel(ctx, label2, cx, cy + 8, p.stroke, 11);
    } else {
      this.drawLabel(ctx, label1, cx, cy, p.stroke, 13);
    }
  },

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
    const cA = this.t(lightMode).chromophoreAlpha;
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
    // P680 chromophore
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 6, 0, _TWO_PI);
    ctx.fillStyle = `rgba(${_ROLE.photosynthetic.rgb},${cA})`; ctx.fill();
    this.drawLabel(ctx, 'PSII', cx, cy - 14, p.stroke, 12);
    this.drawLabel(ctx, 'P680', cx, cy + 16, p.stroke, 9);
  },

  /** PSI — ellipse with P700 chromophore */
  drawPSI(ctx, cx, cy, w, h, glow, lightMode) {
    const p = this.getPalette('photosynthetic', lightMode, glow);
    const cA = this.t(lightMode).chromophoreAlpha;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, _TWO_PI);
    this.applyStyle(ctx, p, glow);
    // P700 chromophore
    ctx.beginPath();
    ctx.arc(cx, cy + 2, 6, 0, _TWO_PI);
    ctx.fillStyle = `rgba(${_ROLE.photosynthetic.rgb},${cA})`; ctx.fill();
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

  /** Plastocyanin — circle with copper center (small mobile carrier) */
  drawPC(ctx, cx, cy, radius, glow, lightMode) {
    const p = this.getPalette('shared', lightMode, glow);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, _TWO_PI);
    this.applyStyle(ctx, p, glow);
    ctx.beginPath();
    ctx.arc(cx, cy + 5, 3, 0, _TWO_PI);
    ctx.fillStyle = _THEME.cofactorDot; ctx.fill();
    this.drawLabel(ctx, 'PC', cx, cy - 4, p.stroke, 10);
  },

  /** Ferredoxin — diamond with Fe-S cluster (small mobile carrier) */
  drawFd(ctx, cx, cy, radius, glow, lightMode) {
    const p = this.getPalette('photosynthetic', lightMode, glow);
    const s = radius * 1.8;
    this.diamond(ctx, cx, cy, s, s);
    this.applyStyle(ctx, p, glow);
    this.drawFeS(ctx, cx, cy + 5, 2.5);
    this.drawLabel(ctx, 'Fd', cx, cy - 5, p.stroke, 10);
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
    const cA = this.t(lightMode).chromophoreAlpha;
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
    // Retinal chromophore
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, _TWO_PI);
    ctx.fillStyle = `rgba(${_ROLE.bacteriorhodopsin.rgb},${cA})`; ctx.fill();
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

  /* ==== Krebs Cycle ==== */
  drawKrebsEnzyme(ctx, cx, cy, radius, label, active, pulsePhase) {
    const glow = active ? 10 + 3 * Math.sin(pulsePhase) : 0;
    const palette = active ? this.colors.krebsActive : this.colors.krebs;
    this.hexagon(ctx, cx, cy, radius);
    this.applyStyle(ctx, palette, glow);
    this.drawLabel(ctx, label, cx, cy, palette.stroke, 8);
  },

  /* ==== Calvin Cycle ==== */
  drawCalvinEnzyme(ctx, cx, cy, radius, label, active, pulsePhase) {
    const glow = active ? 10 + 3 * Math.sin(pulsePhase) : 0;
    const palette = active ? this.colors.calvinActive : this.colors.calvin;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, _TWO_PI);
    ctx.closePath();
    this.applyStyle(ctx, palette, glow);
    this.drawLabel(ctx, label, cx, cy, palette.stroke, 8);
  },

  /* ==== Pentose Phosphate Pathway ==== */
  drawPPPEnzyme(ctx, cx, cy, radius, label, active, pulsePhase) {
    const glow = active ? 10 + 3 * Math.sin(pulsePhase) : 0;
    const palette = active ? this.colors.pppActive : this.colors.ppp;
    // Pentagon shape for PPP (pentose = 5)
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (_TWO_PI / 5) * i - Math.PI / 2;
      const px = cx + radius * Math.cos(angle);
      const py = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    this.applyStyle(ctx, palette, glow);
    this.drawLabel(ctx, label, cx, cy, palette.stroke, 7);
  },

  /* ==== Glycolysis ==== */
  drawGlycolysisEnzyme(ctx, cx, cy, w, h, label, active, pulsePhase) {
    const glow = active ? 10 + 3 * Math.sin(pulsePhase) : 0;
    const palette = active ? this.colors.glycolysisActive : this.colors.glycolysis;
    this.roundedRect(ctx, cx - w / 2, cy - h / 2, w, h, 4);
    this.applyStyle(ctx, palette, glow);
    this.drawLabel(ctx, label, cx, cy, palette.stroke, 7);
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
    if (useDual) {
      // Match arrow body: color2 on left (backward), color on right (forward)
      const grad = ctx.createLinearGradient(cx - w / 2, cy, cx + w / 2, cy);
      grad.addColorStop(0, color2);
      grad.addColorStop(1, color);
      ctx.strokeStyle = grad;
    } else {
      ctx.strokeStyle = color;
    }
    ctx.lineWidth = 1.0;
    ctx.stroke();

    if (useDual) {
      const grad = ctx.createLinearGradient(cx - w / 2, cy, cx + w / 2, cy);
      grad.addColorStop(0, color2);
      grad.addColorStop(1, color);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = color;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy);
  },

  /* ---- Membrane band ---- */
  drawMembrane(ctx, x, y, w, h, lightMode, time) {
    const t = time || 0;
    const headSpacing = 6;
    const headRadius = 2.5;
    const tailLen = h * 0.32;

    const th = this.t(lightMode);
    const headColor = th.membraneHead;
    const tailColor = th.membraneTail;
    const midColor  = th.membraneMid;

    // Subtle interior tint (very faint — just enough to define the membrane zone)
    ctx.fillStyle = midColor;
    ctx.fillRect(x, y + h * 0.25, w, h * 0.5);

    // Draw phospholipid bilayer as the primary visual
    for (let lx = x + 6; lx < x + w; lx += headSpacing) {
      const wobble = Math.sin(t * 2 + lx * 0.1) * 1.2;

      // ── Outer leaflet (top) ──
      const topHeadY = y + 3 + wobble;
      // Head
      ctx.beginPath();
      ctx.arc(lx, topHeadY, headRadius, 0, _TWO_PI);
      ctx.fillStyle = headColor; ctx.fill();
      // Twin tails pointing inward
      ctx.beginPath();
      ctx.moveTo(lx - 1, topHeadY + headRadius);
      ctx.lineTo(lx - 1.5, topHeadY + headRadius + tailLen);
      ctx.moveTo(lx + 1, topHeadY + headRadius);
      ctx.lineTo(lx + 1.5, topHeadY + headRadius + tailLen);
      ctx.strokeStyle = tailColor; ctx.lineWidth = 0.7; ctx.stroke();

      // ── Inner leaflet (bottom) ──
      const botHeadY = y + h - 3 - wobble;
      const bx = lx + headSpacing / 2;
      // Head
      ctx.beginPath();
      ctx.arc(bx, botHeadY, headRadius, 0, _TWO_PI);
      ctx.fillStyle = headColor; ctx.fill();
      // Twin tails pointing inward
      ctx.beginPath();
      ctx.moveTo(bx - 1, botHeadY - headRadius);
      ctx.lineTo(bx - 1.5, botHeadY - headRadius - tailLen);
      ctx.moveTo(bx + 1, botHeadY - headRadius);
      ctx.lineTo(bx + 1.5, botHeadY - headRadius - tailLen);
      ctx.strokeStyle = tailColor; ctx.lineWidth = 0.7; ctx.stroke();
    }
  },

  /* ---- Particles ---- */
  drawElectron(ctx, x, y, intensity, type, fade) {
    const rgb = _ROLE.electron.rgb;
    const a = fade != null ? fade : 1;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(x, y, CFG.electronRadius, 0, _TWO_PI);
    ctx.fillStyle = `rgba(${rgb},${0.7 + 0.3 * intensity})`;
    ctx.shadowColor = `rgba(${rgb},0.8)`;
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
    ctx.fillStyle = `rgba(${_ROLE.proton.rgb},${0.6 + 0.4 * intensity})`;
    ctx.shadowColor = `rgba(${_ROLE.proton.rgb},0.7)`;
    ctx.shadowBlur = 5 * intensity;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = `600 8px ${_FONT.mono}`;
    ctx.fillStyle = `rgba(${_THEME.protonTextRgb},${a})`;
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
