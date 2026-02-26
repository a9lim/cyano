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
  orange: '#d9924c',
  blue:   '#5898ba',
  green:  '#52a87a',
  purple: '#a882bc',
  rose:   '#c85c74',
  brown:  '#9e6842',
  red:    '#cc4c3c',
  cyan:   '#48b4aa',
  yellow: '#dbb850',
  slate:  '#847a70',

  // Cofactor bar colors
  atp:   '#cc9e30',
  nadh:  '#40a2b0',
  nadph: '#3a9e82',
  fadh2: '#bc6e78',

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
    togBg:         '#c8ccd4',
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

  // Themed vars: [css-name, palette-key]             → direct value
  //              [css-name, palette-key, alpha]       → same alpha both themes
  //              [css-name, palette-key, lightA, darkA] → per-theme alpha
  const themed = [
    ['bg-canvas',      'canvas'],
    ['bg-panel',       'panelSolid',    0.55,  0.58],
    ['bg-panel-solid', 'panelSolid'],
    ['bg-elevated',    'elevated'],
    ['bg-hover',       'text',          0.039, 0.051],
    ['border',         'text',          0.078, 0.059],
    ['border-strong',  'text',          0.141, 0.122],
    ['text',           'text'],
    ['text-secondary', 'textSecondary'],
    ['text-muted',     'textMuted'],
  ];

  // Mode-independent vars (emitted once in :root)
  const shared = [
    ['text-on-accent', 'textOnAccent'],
    ['accent',         'accent'],
    ['accent-light',   'accentLight'],
    ['accent-glow',    'accent',   0.18],
    ['accent-subtle',  'accent',   0.078],
    ['pw-glyc',        'orange'],
    ['pw-krebs',       'blue'],
    ['pw-calvin',      'green'],
    ['pw-ppp',         'rose'],
    ['pw-cyclic',      'purple'],
    ['pw-ferment',     'brown'],
    ['co-atp',         'atp'],
    ['co-nadh',        'nadh'],
    ['co-nadph',       'nadph'],
    ['co-fadh2',       'fadh2'],
    ['pw-electron',    'cyan'],
    ['pw-proton',      'red'],
    ['pw-photon',      'yellow'],
  ];

  const gen = (T, dark) => themed.map(([name, key, lA, dA]) => {
    const a = dark ? (dA ?? lA) : lA;
    return `  --${name}: ${a != null ? _r(T[key], a) : T[key]};`;
  }).join('\n');

  const genShared = () => shared.map(([name, key, a]) =>
    `  --${name}: ${a != null ? _r(P[key], a) : P[key]};`
  ).join('\n');

  const style = document.createElement('style');
  style.id = 'palette-vars';
  style.textContent =
`:root {
  --font-display:     ${_FONT.display};
  --font-body:        ${_FONT.body};
  --font-mono:        ${_FONT.mono};

${gen(L, false)}
${genShared()}

  --bg-scrim:         #ffffff33;
  --bg-track:         #00000014;
  --metab-card-bg:    #00000005;

  --shadow-sm:        0 1px 4px #0000000a, 0 0 0 1px #00000005;
  --shadow-md:        0 4px 20px #0000000f, 0 0 0 1px #00000005;
  --shadow-lg:        0 12px 48px #0000001a, 0 0 0 1px #00000005;

  --tog-bg:           ${L.togBg};
  --tog-thumb-on:     #ffffff;
  --tog-border:       #0000000f;
  --tog-inset:        #00000014;
  --track-shadow:     inset 0 1px 1px #0000000f;
}
[data-theme="dark"] {
${gen(D, true)}

  --bg-scrim:         #00000026;
  --bg-track:         #ffffff0a;
  --metab-card-bg:    transparent;

  --shadow-sm:        0 1px 4px #00000033, 0 0 0 1px #ffffff08;
  --shadow-md:        0 4px 20px #0000004d, 0 0 0 1px #ffffff08;
  --shadow-lg:        0 12px 48px #00000066, 0 0 0 1px #ffffff08;

  --tog-bg:           ${D.panelSolid};
  --tog-thumb-on:     var(--text);
  --tog-border:       #ffffff0f;
  --tog-inset:        #00000059;
  --tog-thumb-shadow: #00000073;
  --tog-checked-inset: #00000033;
  --tog-checked-extra: #0000004d;
  --track-shadow:     none;
}`;
  document.head.appendChild(style);
})();
