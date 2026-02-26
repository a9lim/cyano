/* ===================================================================
   colors.js — Single source of truth for shared hex values
   Loads in <head> before body renders. Injects CSS custom properties.
   =================================================================== */

// ---------- Alpha helper (used by both CSS injection and enzymes.js) ----------
const _r = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, '0');

// ---------- Font Constants ----------
// Shared by canvas drawing (enzymes.js / renderer.js) and injected as CSS vars
const _FONT = Object.freeze({
  display: "'Instrument Serif', Georgia, 'Times New Roman', serif",
  mono:    "'Geist Mono', 'SF Mono', 'Menlo', monospace",
  body:    "'Geist', system-ui, -apple-system, sans-serif",
  emoji:   "sans-serif",
});

// ---------- Palette ----------
const _PALETTE = Object.freeze({
  // Pathway / particle base hues
  orange: '#fb923c',
  blue:   '#38bdf8',
  green:  '#10b981',
  purple: '#c084fc',
  rose:   '#f43f5e',
  brown:  '#a0694a',
  red:    '#ef4444',
  cyan:   '#67e8f9',
  yellow: '#fde68a',
  slate:  '#7c859c',

  // Cofactor bar colors
  atp:   '#fbbf24',
  nadh:  '#22d3ee',
  nadph: '#14b8a6',
  fadh2: '#fb7185',

  // Mode-independent accent & text-on-accent
  accent:      '#FE3B01',
  accentLight: '#FF6B3D',
  textOnAccent:'#FDFBF5',

  // Mode-dependent surfaces & text
  dark: Object.freeze({
    canvas:        '#0C0B09',
    panelSolid:    '#181612',
    elevated:      '#1E1C18',
    text:          '#E8E2D4',
    textSecondary: '#8A8278',
    textMuted:     '#5A544C',
  }),

  light: Object.freeze({
    canvas:        '#F0EDE4',
    panelSolid:    '#FCFAF4',
    elevated:      '#FDFBF5',
    text:          '#1A1612',
    textSecondary: '#78706A',
    textMuted:     '#A8A098',
  }),
});

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

// _darkFill: same hue, fixed sat (0.55), custom lightness — for dark-mode fills
function _darkFill(base, lightness) {
  const [h] = _rgb2hsl(..._parseHex(base.stroke));
  return _hsl2hex(h, 0.55, lightness / 100);
}

// _strokeDark: same hue, reduced sat/lightness — for light-mode stroke variants
function _strokeDark(hex) {
  const [h, s, l] = _rgb2hsl(..._parseHex(hex));
  return _hsl2hex(h, s * 0.92, l * 0.75);
}

function _makeBase(stroke, fillL) {
  const o = { stroke, strokeLight: _strokeDark(stroke) };
  if (fillL != null) o.fill = _darkFill(o, fillL);
  return o;
}

// ---------- Base Color Families ----------
const _BASE = {
  orange: _makeBase(_PALETTE.orange, 7),
  blue:   _makeBase(_PALETTE.blue, 13),
  green:  _makeBase(_PALETTE.green, 7),
  purple: _makeBase(_PALETTE.purple, 10),
  rose:   _makeBase(_PALETTE.rose, 8),
  brown:  _makeBase(_PALETTE.brown, 7),
  red:    _makeBase(_PALETTE.red),
  cyan:   _makeBase(_PALETTE.cyan),
  yellow: _makeBase(_PALETTE.yellow),
  slate:  _makeBase(_PALETTE.slate),
};

// ---------- CSS Custom Property Injection ----------
(function injectPaletteVars() {
  const P = _PALETTE, D = P.dark, L = P.light;

  const style = document.createElement('style');
  style.id = 'palette-vars';
  style.textContent =
`:root {
  --font-display:     ${_FONT.display};
  --font-body:        ${_FONT.body};
  --font-mono:        ${_FONT.mono};

  --bg-canvas:        ${D.canvas};
  --bg-panel:         ${_r(D.panelSolid, 0.58)};
  --bg-panel-solid:   ${D.panelSolid};
  --bg-elevated:      ${D.elevated};
  --bg-hover:         ${_r(D.text, 0.051)};

  --border:           ${_r(D.text, 0.059)};
  --border-strong:    ${_r(D.text, 0.122)};

  --text:             ${D.text};
  --text-secondary:   ${D.textSecondary};
  --text-muted:       ${D.textMuted};
  --text-on-accent:   ${P.textOnAccent};

  --accent:           ${P.accent};
  --accent-light:     ${P.accentLight};
  --accent-glow:      ${_r(P.accent, 0.18)};
  --accent-subtle:    ${_r(P.accent, 0.078)};

  --pw-glyc:          ${P.orange};
  --pw-krebs:         ${P.blue};
  --pw-calvin:        ${P.green};
  --pw-ppp:           ${P.rose};
  --pw-cyclic:        ${P.purple};
  --pw-ferment:       ${P.brown};

  --co-atp:           ${P.atp};
  --co-nadh:          ${P.nadh};
  --co-nadph:         ${P.nadph};
  --co-fadh2:         ${P.fadh2};

  --pw-electron:      ${P.cyan};
  --pw-proton:        ${P.red};
  --pw-photon:        ${P.yellow};
}
body.light-mode {
  --bg-canvas:        ${L.canvas};
  --bg-panel:         ${_r(L.panelSolid, 0.55)};
  --bg-panel-solid:   ${L.panelSolid};
  --bg-elevated:      ${L.elevated};
  --bg-hover:         ${_r(L.text, 0.039)};

  --border:           ${_r(L.text, 0.078)};
  --border-strong:    ${_r(L.text, 0.141)};

  --text:             ${L.text};
  --text-secondary:   ${L.textSecondary};
  --text-muted:       ${L.textMuted};
}`;
  document.head.appendChild(style);
})();
